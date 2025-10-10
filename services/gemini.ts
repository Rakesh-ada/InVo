import AsyncStorage from '@react-native-async-storage/async-storage';
import { dbService, Product } from './database';

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

    const businessContext = await this.getComprehensiveBusinessContext();
    
    const contextMessage = `You are InVo AI - Advanced Inventory Intelligence Assistant

CORE CAPABILITIES:
🧠 Smart Analytics: Real-time inventory insights and predictions
📊 Demand Forecasting: Predict future demand using sales trends  
🔄 Stock Optimization: Prevent over/understocking
⚡ Automated Alerts: Smart restocking recommendations
💰 Profit Optimization: Pricing and profitability analysis
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

Ready to help optimize your inventory and boost business performance! What would you like to analyze?`;

    this.chatHistory = [];
  }

  async sendMessage(message: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Gemini API key not configured');
    }

    try {
      // Get comprehensive business intelligence
      const businessContext = await this.getComprehensiveBusinessContext();
      const analytics = await this.generateInventoryAnalytics();
      
      const enhancedPrompt = `${businessContext}

REAL-TIME ANALYTICS:
${this.formatAnalytics(analytics)}

USER QUERY: "${message}"

INSTRUCTIONS:
- Provide short, actionable responses (2-3 sentences max)
- Use data from the current inventory status
- Ask follow-up questions if clarification needed
- Focus on inventory optimization and business growth
- Give specific recommendations with numbers when possible
- Use emojis sparingly for clarity`;

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: enhancedPrompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 300, // Shorter responses
          }
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

      const aiResponse = data.candidates[0].content.parts[0].text;
      
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
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
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
      
      return `📊 BUSINESS OVERVIEW (${settings.businessName || 'Your Business'}):
Products: ${products.length} | Suppliers: ${suppliers.length}
Today's Sales: ₹${todaySales.totalAmount} (${todaySales.totalItems} items)
Inventory Value: ₹${this.calculateInventoryValue(products)}

📦 STOCK STATUS:
Low Stock (≤5): ${this.getLowStockItems(products).length} items
Out of Stock: ${this.getOutOfStockItems(products).length} items
Top Products: ${this.getTopProducts(products).join(', ')}

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
    return `📈 SMART INSIGHTS:
Stock Alert: ${analytics.lowStockCount} items need reordering
Restock Now: ${analytics.reorderSuggestions.slice(0, 3).join(', ')}
Demand Trend: ${analytics.demandForecast}
Profit Focus: ${analytics.profitabilityInsights}`;
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
    if (salesData.length === 0) return "No sales data available";
    
    const recentSales = salesData.filter(sale => {
      const saleDate = new Date(sale.saleDate);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return saleDate >= weekAgo;
    });

    if (recentSales.length === 0) return "Low activity this week";
    
    const avgDailySales = recentSales.length / 7;
    return avgDailySales > 5 ? "High demand trend" : avgDailySales > 2 ? "Moderate demand" : "Slow period";
  }

  private generateProfitabilityInsights(products: Product[]): string {
    const highMarginCount = products.filter(p => {
      const margin = ((p.sellingPrice - p.buyingPrice) / p.sellingPrice) * 100;
      return margin > 40;
    }).length;
    
    return highMarginCount > 5 ? "Strong profit margins" : highMarginCount > 2 ? "Good profitability" : "Review pricing strategy";
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
}

export const geminiService = new GeminiService();