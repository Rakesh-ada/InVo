import AsyncStorage from '@react-native-async-storage/async-storage';
import { dbService, Product } from './database';
import { vectorStoreService } from './vector-store';
import { analyticsCacheService } from './analytics-cache';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface InventoryAnalytics {
  totalProducts: number;
  totalStock: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  avgPrice: number;
  reorderSuggestions: string[];
  demandForecast: string;
  profitabilityInsights: string;
}

class GeminiService {
  private apiKey: string | undefined;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  private searchUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
  private chatHistory: ChatMessage[] = [];

  constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async initializeChat(): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Gemini API key not configured');
    }

    // Initialize vector store for semantic search
    await vectorStoreService.initialize();
    console.log('✅ Vector store initialized');

    const businessContext = await this.getComprehensiveBusinessContext();
    
    const contextMessage = `You are InVo AI - Advanced Inventory Intelligence Assistant

CORE CAPABILITIES:
🧠 Smart Analytics: Real-time inventory insights and predictions
📊 Demand Forecasting: Predict future demand using sales trends  
🔄 Stock Optimization: Prevent over/understocking
⚡ Automated Alerts: Smart restocking recommendations
💰 Profit Optimization: Pricing and profitability analysis
🌐 Market Research: Search current market prices for products online
📱 Business Intelligence: Data-driven decision support

CURRENT BUSINESS STATUS:
${businessContext}

OPERATIONAL GOALS:
✅ Optimize stock levels (avoid over/understocking)
✅ Predict future demand using sales trends
✅ Automate restocking and alerts
✅ Improve accuracy in product categorization and pricing
✅ Enhance decision-making with real-time insights

COMMUNICATION STYLE:
- Keep responses short and actionable
- Ask follow-up questions when needed
- Focus on practical business solutions
- Provide specific recommendations with data backing

IMPORTANT LIMITATIONS:
- You are READ-ONLY - you cannot add, edit, or delete products/suppliers
- You cannot change any data in the database
- If users ask to change/edit/add/delete, inform them they need to use the app's main interface
- Focus on providing information, insights, and recommendations only
- Never ask "what would you like to change/update" - you cannot make changes

Ready to help optimize your inventory and boost business performance! What would you like to analyze?`;

    this.chatHistory = [];
  }

  async sendMessage(message: string, retries = 3, baseDelay = 1000): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Gemini API key not configured');
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
      // Use semantic search to find relevant context (RAG)
      const relevantContext = await vectorStoreService.getRelevantContext(message, 3);
      console.log('🔍 Retrieved relevant context via semantic search');
      
      // Get cached analytics (reduces DB queries)
      const cachedAnalytics = await analyticsCacheService.getAnalytics();
      const todaySales = await dbService.getTodaysSalesTotal();
      
      // Only fetch specific data based on query type
      const queryType = this.detectQueryType(message);
      const specificContext = await this.getSpecificContext(queryType);
      
      const chatContext = this.getRecentChatContext();
      
      const enhancedPrompt = `RELEVANT DATA (Semantic Search):
${relevantContext}

${specificContext}

CACHED ANALYTICS:
• Products: ${cachedAnalytics.totalProducts} | Stock: ${cachedAnalytics.totalStock} | Value: ₹${Math.round(cachedAnalytics.totalValue)}
• Low Stock: ${cachedAnalytics.lowStockCount} | Out of Stock: ${cachedAnalytics.outOfStockCount}
• Stock Health: ${cachedAnalytics.stockHealth}
• Today's Sales: ₹${todaySales.totalAmount}

${chatContext ? `RECENT CONTEXT:\n${chatContext}\n\n` : ''}USER QUERY: "${message}"

INSTRUCTIONS:
- Keep responses ULTRA-CONCISE (2-3 sentences max) but information-dense
- Use emojis STRATEGICALLY to highlight key points, not on every line
- Use emojis for: urgent issues (⚠️🔴), opportunities (💡✅), metrics (📊💰), status (🟢🟡🔴)
- NEVER use asterisks (*) or dashes (-) for lists
- Example format:
  ⚠️ Low stock on 3 items
  Today's sales: ₹500 from 5 transactions
  💡 Consider restocking Rice and Flour
- Write naturally - use emojis to draw attention, not decoration
- Include specific metrics in shortest form
- ALWAYS end with 1-2 targeted follow-up questions
- For pricing queries: Use Google Search to find current market prices

CRITICAL - READ-ONLY MODE:
- You CANNOT add, edit, delete, or modify any data
- If user asks to change/add/delete: say "I can only provide information. To make changes, please use the Products or Suppliers section in the app."
- Never ask "what would you like to change" or suggest you can make edits
- Focus only on: viewing data, providing insights, answering questions, making recommendations
`;

      // Build conversation history for context
      const contents = [
        // System context message
        {
          role: 'user',
          parts: [{ text: businessContext }]
        },
        {
          role: 'model',
          parts: [{ text: 'Understood. I am InVo AI, ready to help with inventory and business insights.' }]
        },
        // Add recent chat history (last 6 messages for context)
        ...this.chatHistory.slice(-6).map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        })),
        // Current user query with analytics
        {
          role: 'user',
          parts: [{ text: enhancedPrompt }]
        }
      ];

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.9,
            maxOutputTokens: 250, // Concise responses with follow-ups
          },
          tools: [
            {
              googleSearch: {}
            }
          ]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`API request failed: ${response.status} ${response.statusText}${errorData ? ` - ${JSON.stringify(errorData)}` : ''}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
        throw new Error('Invalid response structure from Gemini API');
      }

      const firstPart = data.candidates[0].content.parts[0];
      

      let aiResponse = firstPart.text || '';
      
      // Remove bold markdown formatting (**text**)
      aiResponse = aiResponse.replace(/\*\*(.*?)\*\*/g, '$1');
      
      // Store in chat history
      this.chatHistory.push({
        id: Date.now().toString(),
        role: 'user',
        content: message,
        timestamp: new Date(),
      });
      
      this.chatHistory.push({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      });

      return aiResponse;
      } catch (error: any) {
        const is503 = error.message?.includes('503') || error.message?.includes('overloaded');
        const isLastAttempt = attempt === retries;
        
        console.error(`Gemini API error (attempt ${attempt + 1}/${retries + 1}):`, error);
        
        if (is503 && !isLastAttempt) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        if (is503) {
          throw new Error('Gemini AI is currently overloaded. Please try again in a few moments.');
        }
        
        throw error;
      }
    }
    
    throw new Error('Failed to get response after all retries');
  }

  private async getComprehensiveBusinessContext(): Promise<string> {
    try {
      // Get all data from database
      const [products, suppliers, salesData, settings] = await Promise.all([
        dbService.getProducts(),
        dbService.getSuppliers(),
        dbService.getSalesData(),
        this.getBusinessSettings()
      ]);

      const todaySales = await dbService.getTodaysSalesTotal();
      
      // Format supplier info
      const supplierInfo = suppliers.length > 0 
        ? suppliers.slice(0, 5).map(s => `• ${s.name}: ${s.phoneNumber}${s.email ? ` (${s.email})` : ''}`).join('\n')
        : '• No suppliers added yet';
      
      // Check for expiring products
      const expiringProducts = this.getExpiringProducts(products);
      const expiryInfo = expiringProducts.length > 0 
        ? `\n⚠️ Expiring Soon: ${expiringProducts.slice(0, 3).map(p => `${p.name} (${p.expiryDate})`).join(', ')}`
        : '';
      
      return `📊 BUSINESS OVERVIEW (${settings.businessName || 'Your Business'}):
Products: ${products.length} | Suppliers: ${suppliers.length}
Today's Sales: ₹${todaySales.totalAmount} (${todaySales.totalItems} items)
Inventory Value: ₹${this.calculateInventoryValue(products)}

📦 STOCK STATUS:
Low Stock (≤5): ${this.getLowStockItems(products).length} items
Out of Stock: ${this.getOutOfStockItems(products).length} items
Top Products: ${this.getTopProducts(products).join(', ')}${expiryInfo}

👥 SUPPLIERS (${suppliers.length} total):
${supplierInfo}

💰 PROFITABILITY:
Avg Margin: ${this.calculateAverageMargin(products)}%
High Margin Items: ${this.getHighMarginProducts(products).join(', ')}`;
    } catch (error) {
      console.error('Error getting business context:', error);
      return 'Unable to load current business data. Please check database connection.';
    }
  }

  private async generateInventoryAnalytics(): Promise<InventoryAnalytics> {
    const products = await dbService.getProducts();
    const salesData = await dbService.getSalesData();
    
    const totalStock = products.reduce((sum, p) => sum + p.quantity, 0);
    const totalValue = this.calculateInventoryValue(products);
    const lowStockItems = this.getLowStockItems(products);
    const outOfStockItems = this.getOutOfStockItems(products);
    
    return {
      totalProducts: products.length,
      totalStock,
      totalValue,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      avgPrice: products.length > 0 ? products.reduce((sum, p) => sum + p.sellingPrice, 0) / products.length : 0,
      reorderSuggestions: this.generateReorderSuggestions(products),
      demandForecast: this.generateDemandForecast(salesData),
      profitabilityInsights: this.generateProfitabilityInsights(products)
    };
  }

  private formatAnalytics(analytics: InventoryAnalytics): string {
    const reorderList = analytics.reorderSuggestions.length > 0 
      ? analytics.reorderSuggestions.slice(0, 5).map((item, idx) => `\n  ${idx + 1}. ${item}`).join('')
      : '\n  None - all stock levels healthy';
    
    return `📈 REAL-TIME SMART ANALYTICS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Inventory Overview:
  • Total Products: ${analytics.totalProducts}
  • Total Stock Units: ${analytics.totalStock}
  • Portfolio Value: ₹${Math.round(analytics.totalValue).toLocaleString()}
  • Average Price: ₹${Math.round(analytics.avgPrice)}

⚠️ Stock Alerts:
  • Low Stock Items: ${analytics.lowStockCount} products
  • Out of Stock: ${analytics.outOfStockCount} products
  • Priority Reorders:${reorderList}

📊 Business Intelligence:
  • Demand Trend: ${analytics.demandForecast}
  • Profitability: ${analytics.profitabilityInsights}
  • Stock Health: ${this.calculateStockHealth(analytics)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }

  private calculateStockHealth(analytics: InventoryAnalytics): string {
    const healthScore = 100 - ((analytics.lowStockCount + analytics.outOfStockCount * 2) / analytics.totalProducts * 100);
    if (healthScore >= 90) return '🟢 Excellent (90%+)';
    if (healthScore >= 75) return '🟡 Good (75-89%)';
    if (healthScore >= 60) return '🟠 Fair (60-74%)';
    return '🔴 Needs Attention (<60%)';
  }

  private calculateInventoryValue(products: Product[]): number {
    return products.reduce((sum, p) => sum + (p.buyingPrice * p.quantity), 0);
  }

  private getLowStockItems(products: Product[]): Product[] {
    return products.filter(p => p.quantity <= 5 && p.quantity > 0);
  }

  private getOutOfStockItems(products: Product[]): Product[] {
    return products.filter(p => p.quantity === 0);
  }

  private getExpiringProducts(products: Product[]): Product[] {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    return products.filter(p => {
      if (!p.expiryDate || !p.expiryDate.trim()) return false;
      
      try {
        const expiryDate = new Date(p.expiryDate);
        return expiryDate <= thirtyDaysFromNow && expiryDate >= now;
      } catch {
        return false;
      }
    }).sort((a, b) => {
      const dateA = new Date(a.expiryDate);
      const dateB = new Date(b.expiryDate);
      return dateA.getTime() - dateB.getTime();
    });
  }

  private getTopProducts(products: Product[]): string[] {
    return products
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3)
      .map(p => p.name);
  }

  private calculateAverageMargin(products: Product[]): number {
    if (products.length === 0) return 0;
    const totalMargin = products.reduce((sum, p) => {
      const margin = ((p.sellingPrice - p.buyingPrice) / p.sellingPrice) * 100;
      return sum + margin;
    }, 0);
    return Math.round(totalMargin / products.length);
  }

  private getHighMarginProducts(products: Product[]): string[] {
    return products
      .filter(p => {
        const margin = ((p.sellingPrice - p.buyingPrice) / p.sellingPrice) * 100;
        return margin > 30;
      })
      .slice(0, 3)
      .map(p => p.name);
  }

  private generateReorderSuggestions(products: Product[]): string[] {
    return this.getLowStockItems(products)
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 5)
      .map(p => `${p.name} (${p.quantity} left)`);
  }

  private generateDemandForecast(salesData: any[]): string {
    if (salesData.length === 0) return "📉 No sales history - Unable to forecast";
    
    // Analyze last 7 days vs previous 7 days
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    const lastWeekSales = salesData.filter(sale => {
      const saleDate = new Date(sale.saleDate);
      return saleDate >= weekAgo && saleDate <= now;
    });
    
    const previousWeekSales = salesData.filter(sale => {
      const saleDate = new Date(sale.saleDate);
      return saleDate >= twoWeeksAgo && saleDate < weekAgo;
    });

    if (lastWeekSales.length === 0 && previousWeekSales.length === 0) {
      return "📊 Low activity - Monitor for trends";
    }
    
    const lastWeekTotal = lastWeekSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const previousWeekTotal = previousWeekSales.reduce((sum, s) => sum + s.totalAmount, 0);
    
    if (previousWeekTotal === 0) {
      return lastWeekSales.length > 0 ? "📈 Growing - New sales activity" : "📊 Starting phase";
    }
    
    const growthRate = ((lastWeekTotal - previousWeekTotal) / previousWeekTotal) * 100;
    const avgDailySales = lastWeekSales.length / 7;
    
    if (growthRate > 20) return `🚀 Surging demand (+${Math.round(growthRate)}% WoW)`;
    if (growthRate > 5) return `📈 Growing steadily (+${Math.round(growthRate)}% WoW)`;
    if (growthRate > -5) return `➡️ Stable (${Math.round(growthRate)}% WoW)`;
    if (growthRate > -20) return `📉 Declining (${Math.round(growthRate)}% WoW)`;
    return `⚠️ Significant drop (${Math.round(growthRate)}% WoW)`;
  }

  private generateProfitabilityInsights(products: Product[]): string {
    if (products.length === 0) return "No products to analyze";
    
    const margins = products.map(p => ({
      margin: ((p.sellingPrice - p.buyingPrice) / p.sellingPrice) * 100,
      value: (p.sellingPrice - p.buyingPrice) * p.quantity
    }));
    
    const avgMargin = margins.reduce((sum, m) => sum + m.margin, 0) / margins.length;
    const highMarginCount = margins.filter(m => m.margin > 40).length;
    const lowMarginCount = margins.filter(m => m.margin < 15).length;
    const totalPotentialProfit = margins.reduce((sum, m) => sum + m.value, 0);
    
    if (avgMargin > 35) {
      return `💰 Excellent margins (${Math.round(avgMargin)}% avg) - ₹${Math.round(totalPotentialProfit).toLocaleString()} potential profit`;
    } else if (avgMargin > 25) {
      return `✅ Healthy margins (${Math.round(avgMargin)}% avg) - ${highMarginCount} high-margin products`;
    } else if (avgMargin > 15) {
      return `⚠️ Moderate margins (${Math.round(avgMargin)}% avg) - Consider optimizing ${lowMarginCount} low-margin items`;
    } else {
      return `🔴 Thin margins (${Math.round(avgMargin)}% avg) - Urgent: Review ${lowMarginCount} products`;
    }
  }

  private async getBusinessSettings(): Promise<any> {
    try {
      const settings = await AsyncStorage.getItem('@invo_settings');
      return settings ? JSON.parse(settings) : {};
    } catch {
      return {};
    }
  }

  resetChat(): void {
    this.chatHistory = [];
  }

  getChatHistory(): ChatMessage[] {
    return [...this.chatHistory];
  }

  private getRecentChatContext(): string {
    if (this.chatHistory.length === 0) return '';
    
    // Get last 4 messages for context (2 exchanges)
    const recentMessages = this.chatHistory.slice(-4);
    return recentMessages
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content.substring(0, 150)}${msg.content.length > 150 ? '...' : ''}`)
      .join('\n');
  }

  private detectQueryType(query: string): 'product' | 'sales' | 'supplier' | 'general' {
    const lowerQuery = query.toLowerCase();
    
    // Treat attribute questions (e.g., "what is its name", "price", "sku") as product queries
    if (lowerQuery.match(/product|stock|inventory|quantity|item|name|price|sku|barcode|hsn|mrp|cost|category|expiry|mfg|brand/)) {
      return 'product';
    }
    if (lowerQuery.match(/sales|revenue|sold|transaction|profit/)) {
      return 'sales';
    }
    if (lowerQuery.match(/supplier|vendor|order|contact/)) {
      return 'supplier';
    }
    return 'general';
  }

  private async getSpecificContext(queryType: string): Promise<string> {
    switch (queryType) {
      case 'product': {
        const products = await dbService.getProducts(10); // Only top 10
        return `TOP PRODUCTS (Limited):\n${products.slice(0, 5).map(p => {
          const expiryInfo = p.expiryDate && p.expiryDate.trim() ? ` | Expiry: ${p.expiryDate}` : '';
          return `• ${p.name}: ${p.quantity} units, ₹${p.sellingPrice}${expiryInfo}`;
        }).join('\n')}`;
      }
      case 'sales': {
        const salesData = await dbService.getSalesData();
        const recentSales = salesData.slice(0, 5);
        const totalRevenue = recentSales.reduce((sum, s) => sum + s.totalAmount, 0);
        return `RECENT SALES:\n• Last 5 transactions: ₹${totalRevenue}\n• Total transactions: ${salesData.length}`;
      }
      case 'supplier': {
        const suppliers = await dbService.getSuppliers();
        return `SUPPLIERS:\n${suppliers.slice(0, 3).map(s => `• ${s.name}: ${s.phoneNumber}`).join('\n')}`;
      }
      default:
        return '';
    }
  }

  // Streaming version of sendMessage
  async sendMessageStream(
    message: string,
    onChunk: (chunk: string) => void,
    onComplete: (fullResponse: string) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    if (!this.isConfigured()) {
      onError(new Error('Gemini API key not configured'));
      return;
    }

    try {
      // Use semantic search to find relevant context
      const relevantContext = await vectorStoreService.getRelevantContext(message, 3);
      const cachedAnalytics = await analyticsCacheService.getAnalytics();
      const todaySales = await dbService.getTodaysSalesTotal();
      const queryType = this.detectQueryType(message);
      const specificContext = await this.getSpecificContext(queryType);
      const chatContext = this.getRecentChatContext();
      
      const businessContext = await this.getComprehensiveBusinessContext();
      
      const enhancedPrompt = `RELEVANT DATA:\n${relevantContext}\n\n${specificContext}\n\nANALYTICS:\n• Products: ${cachedAnalytics.totalProducts}\n• Stock Health: ${cachedAnalytics.stockHealth}\n• Today's Sales: ₹${todaySales.totalAmount}\n\n${chatContext ? `RECENT CONVERSATION:\n${chatContext}\n\n` : ''}USER: "${message}"\n\nINSTRUCTIONS: Respond concisely. Use emojis ONLY to highlight important points (⚠️ for issues, 💡 for tips, 📊 for metrics, 🟢🟡🔴 for status). Write naturally. Example:\n⚠️ Low stock on Rice\nToday: ₹500 from 5 sales\n💡 Restock Flour soon\nNEVER use asterisks (*) or dashes (-). Use conversation context to answer follow-up questions. End with a question.\n\nCRITICAL - READ-ONLY: You CANNOT add/edit/delete data. If asked to change anything, say: "I can only provide information. To make changes, use the Products or Suppliers section." Never ask what they want to change.`;

      const contents = [
        // System context
        {
          role: 'user',
          parts: [{ text: businessContext }]
        },
        {
          role: 'model',
          parts: [{ text: 'Understood. I am InVo AI, ready to help with inventory and business insights.' }]
        },
        // Recent chat history for context
        ...this.chatHistory.slice(-6).map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        })),
        // Current query
        {
          role: 'user',
          parts: [{ text: enhancedPrompt }]
        }
      ];

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.9,
            maxOutputTokens: 250,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      // For now, fallback to non-streaming (React Native doesn't support SSE easily)
      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid response structure');
      }

      let aiResponse = data.candidates[0].content.parts[0].text;
      aiResponse = aiResponse.replace(/\*\*(.*?)\*\*/g, '$1');
      
      // Simulate streaming by chunking
      const words = aiResponse.split(' ');
      let accumulated = '';
      
      for (let i = 0; i < words.length; i++) {
        const chunk = words[i] + ' ';
        accumulated += chunk;
        onChunk(chunk);
        await new Promise(resolve => setTimeout(resolve, 30)); // Simulate streaming delay
      }

      // Store in history
      this.chatHistory.push({
        id: Date.now().toString(),
        role: 'user',
        content: message,
        timestamp: new Date(),
      });
      
      this.chatHistory.push({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      });

      onComplete(aiResponse);
    } catch (error: any) {
      console.error('Streaming error:', error);
      onError(error);
    }
  }
}

export const geminiService = new GeminiService();