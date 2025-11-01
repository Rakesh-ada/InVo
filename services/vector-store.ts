import AsyncStorage from '@react-native-async-storage/async-storage';
import { dbService, Product } from './database';

const EMBEDDINGS_KEY = '@invo_embeddings';
const EMBEDDINGS_VERSION_KEY = '@invo_embeddings_version';
const CURRENT_VERSION = '1.0';

export interface DocumentEmbedding {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    type: 'product' | 'sale' | 'supplier';
    productId?: string;
    supplierId?: string;
    name?: string;
    category?: string;
  };
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: any;
}

class VectorStoreService {
  private embeddings: DocumentEmbedding[] = [];
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Check version
      const version = await AsyncStorage.getItem(EMBEDDINGS_VERSION_KEY);
      if (version !== CURRENT_VERSION) {
        console.log('🔄 Embeddings version mismatch, regenerating...');
        await this.regenerateEmbeddings();
        return;
      }

      // Load cached embeddings
      const cached = await AsyncStorage.getItem(EMBEDDINGS_KEY);
      if (cached) {
        this.embeddings = JSON.parse(cached);
        console.log(`✅ Loaded ${this.embeddings.length} embeddings from cache`);
      } else {
        await this.regenerateEmbeddings();
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize vector store:', error);
      await this.regenerateEmbeddings();
    }
  }

  async regenerateEmbeddings(): Promise<void> {
    console.log('🔄 Generating embeddings for all documents...');
    
    try {
      const products = await dbService.getProducts();
      const salesData = await dbService.getSalesData();
      const suppliers = await dbService.getSuppliers();

      const newEmbeddings: DocumentEmbedding[] = [];

      // Generate embeddings for products
      for (const product of products) {
        const content = this.generateProductContent(product);
        const embedding = await this.generateEmbedding(content);
        
        newEmbeddings.push({
          id: `product_${product.id}`,
          content,
          embedding,
          metadata: {
            type: 'product',
            productId: product.id,
            name: product.name,
            category: 'inventory'
          }
        });
      }

      // Generate embeddings for sales insights
      if (salesData.length > 0) {
        const salesContent = this.generateSalesContent(salesData);
        const salesEmbedding = await this.generateEmbedding(salesContent);
        
        newEmbeddings.push({
          id: 'sales_data',
          content: salesContent,
          embedding: salesEmbedding,
          metadata: {
            type: 'sale',
            category: 'analytics'
          }
        });
      }

      // Generate embeddings for suppliers
      for (const supplier of suppliers) {
        const content = this.generateSupplierContent(supplier);
        const embedding = await this.generateEmbedding(content);
        
        newEmbeddings.push({
          id: `supplier_${supplier.id}`,
          content,
          embedding,
          metadata: {
            type: 'supplier',
            supplierId: supplier.id,
            name: supplier.name,
            category: 'supplier'
          }
        });
      }

      this.embeddings = newEmbeddings;
      await this.saveEmbeddings();
      console.log(`✅ Generated ${newEmbeddings.length} embeddings`);
    } catch (error) {
      console.error('Failed to regenerate embeddings:', error);
    }
  }

  private generateProductContent(product: Product): string {
    const margin = ((product.sellingPrice - product.buyingPrice) / product.sellingPrice * 100).toFixed(1);
    const stockStatus = product.quantity === 0 ? 'out of stock' : 
                       product.quantity <= 5 ? 'low stock' : 'in stock';
    
    return `Product: ${product.name}
Buying Price: ₹${product.buyingPrice}
Selling Price: ₹${product.sellingPrice}
Profit Margin: ${margin}%
Quantity: ${product.quantity} (${stockStatus})
Expiry: ${product.expiryDate}
Total Value: ₹${product.buyingPrice * product.quantity}`;
  }

  private generateSalesContent(salesData: any[]): string {
    const totalSales = salesData.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalItems = salesData.reduce((sum, s) => sum + s.quantitySold, 0);
    const recentSales = salesData.slice(0, 10);
    
    return `Sales Summary:
Total Sales: ₹${totalSales}
Items Sold: ${totalItems}
Transactions: ${salesData.length}
Recent Activity: ${recentSales.length} recent transactions`;
  }

  private generateSupplierContent(supplier: any): string {
    const parts = [
      `Supplier: ${supplier.name}`,
      `Phone: ${supplier.phoneNumber}`,
      `WhatsApp: ${supplier.whatsappNumber}`
    ];
    
    if (supplier.email && supplier.email.trim()) {
      parts.push(`Email: ${supplier.email}`);
    }
    
    // Add context for better semantic search
    parts.push(`Contact information for ${supplier.name}`);
    parts.push(`Business contact details`);
    parts.push(`Supplier contact: call ${supplier.phoneNumber} or WhatsApp ${supplier.whatsappNumber}`);
    
    if (supplier.email && supplier.email.trim()) {
      parts.push(`Email communications: ${supplier.email}`);
    }
    
    return parts.join('\n');
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Try Gemini embedding API first, fallback to simple embedding
    try {
      const { geminiService } = await import('./gemini');
      if (geminiService.isConfigured()) {
        return await geminiService.generateEmbedding(text);
      }
    } catch (error) {
      console.warn('Gemini embedding failed, using simple embedding:', error);
    }
    
    // Fallback to simple embedding
    return this.simpleTextEmbedding(text);
  }

  private simpleTextEmbedding(text: string, dimensions: number = 128): number[] {
    const normalized = text.toLowerCase();
    const embedding = new Array(dimensions).fill(0);
    
    // Character frequency features
    for (let i = 0; i < normalized.length; i++) {
      const charCode = normalized.charCodeAt(i);
      const index = charCode % dimensions;
      embedding[index] += 1;
    }
    
    // Word-based features
    const words = normalized.split(/\s+/);
    words.forEach((word, idx) => {
      const wordHash = this.hashString(word) % dimensions;
      embedding[wordHash] += 2;
    });
    
    // Key term boosting
    const keyTerms = [
      'stock', 'price', 'sales', 'profit', 'supplier', 'quantity', 'margin',
      'contact', 'phone', 'email', 'whatsapp', 'call', 'reach', 'vendor'
    ];
    keyTerms.forEach((term, idx) => {
      if (normalized.includes(term)) {
        embedding[idx * 10 % dimensions] += 5;
      }
    });
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? embedding.map(val => val / magnitude) : embedding;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let magA = 0;
    let magB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    
    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);
    
    return magA === 0 || magB === 0 ? 0 : dotProduct / (magA * magB);
  }

  async semanticSearch(query: string, topK: number = 5): Promise<SearchResult[]> {
    await this.initialize();
    
    if (this.embeddings.length === 0) {
      console.log('No embeddings yet - will use direct database queries');
      return [];
    }

    const queryEmbedding = await this.generateEmbedding(query);
    
    const results = this.embeddings.map(doc => ({
      id: doc.id,
      content: doc.content,
      score: this.cosineSimilarity(queryEmbedding, doc.embedding),
      metadata: doc.metadata
    }));

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    
    return results.slice(0, topK);
  }

  // ==================== HYBRID SEARCH ====================
  async keywordSearch(query: string, topK: number = 5): Promise<SearchResult[]> {
    await this.initialize();
    
    if (this.embeddings.length === 0) {
      return [];
    }

    const queryLower = query.toLowerCase();
    const keywords = queryLower.split(/\s+/).filter(w => w.length > 2);
    
    const results = this.embeddings.map(doc => {
      const contentLower = doc.content.toLowerCase();
      let score = 0;
      
      // Exact phrase match (highest weight)
      if (contentLower.includes(queryLower)) {
        score += 10;
      }
      
      // Keyword matches
      keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = (contentLower.match(regex) || []).length;
        score += matches * 2;
      });
      
      // Title/name boost
      if (doc.metadata.name) {
        const nameLower = doc.metadata.name.toLowerCase();
        keywords.forEach(keyword => {
          if (nameLower.includes(keyword)) {
            score += 5;
          }
        });
      }
      
      return {
        id: doc.id,
        content: doc.content,
        score,
        metadata: doc.metadata
      };
    });

    // Filter out zero scores
    const filtered = results.filter(r => r.score > 0);
    filtered.sort((a, b) => b.score - a.score);
    
    return filtered.slice(0, topK);
  }

  async hybridSearch(query: string, topK: number = 5): Promise<SearchResult[]> {
    console.log('🔍 Running hybrid search (semantic + keyword)...');
    
    // Run both searches in parallel
    const [semanticResults, keywordResults] = await Promise.all([
      this.semanticSearch(query, topK * 2),
      this.keywordSearch(query, topK * 2)
    ]);

    // Merge and re-rank results
    const merged = this.mergeAndRank(semanticResults, keywordResults, topK);
    
    console.log(`✅ Hybrid search returned ${merged.length} results`);
    return merged;
  }

  private mergeAndRank(semanticResults: SearchResult[], keywordResults: SearchResult[], topK: number): SearchResult[] {
    const scoreMap = new Map<string, { semantic: number; keyword: number; content: string; metadata: any }>();

    // Collect semantic scores
    semanticResults.forEach((result, index) => {
      const normalizedScore = 1 - (index / semanticResults.length); // Rank-based normalization
      scoreMap.set(result.id, {
        semantic: normalizedScore,
        keyword: 0,
        content: result.content,
        metadata: result.metadata
      });
    });

    // Add keyword scores
    keywordResults.forEach((result, index) => {
      const normalizedScore = 1 - (index / keywordResults.length);
      const existing = scoreMap.get(result.id);
      if (existing) {
        existing.keyword = normalizedScore;
      } else {
        scoreMap.set(result.id, {
          semantic: 0,
          keyword: normalizedScore,
          content: result.content,
          metadata: result.metadata
        });
      }
    });

    // Calculate combined scores (weighted: semantic 60%, keyword 40%)
    const combined = Array.from(scoreMap.entries()).map(([id, scores]) => ({
      id,
      content: scores.content,
      score: (scores.semantic * 0.6) + (scores.keyword * 0.4),
      metadata: scores.metadata
    }));

    // Sort by combined score
    combined.sort((a, b) => b.score - a.score);
    
    return combined.slice(0, topK);
  }

  async getRelevantContext(query: string, maxResults: number = 3): Promise<string> {
    // Use hybrid search for better results
    const results = await this.hybridSearch(query, maxResults);
    
    if (results.length === 0) {
      return 'No relevant context found.';
    }

    return results
      .map((result, idx) => `[${idx + 1}] (Score: ${result.score.toFixed(2)}) ${result.content}`)
      .join('\n\n');
  }

  private async saveEmbeddings(): Promise<void> {
    try {
      await AsyncStorage.setItem(EMBEDDINGS_KEY, JSON.stringify(this.embeddings));
      await AsyncStorage.setItem(EMBEDDINGS_VERSION_KEY, CURRENT_VERSION);
      console.log('💾 Embeddings saved to storage');
    } catch (error) {
      console.error('Failed to save embeddings:', error);
    }
  }

  async invalidateCache(): Promise<void> {
    console.log('🗑️ Invalidating embeddings cache');
    this.embeddings = [];
    this.initialized = false;
    try {
      await AsyncStorage.removeItem(EMBEDDINGS_KEY);
      await AsyncStorage.removeItem(EMBEDDINGS_VERSION_KEY);
    } catch (error) {
      console.warn('Failed to clear embeddings cache:', error);
    }
  }

  async updateProductEmbedding(product: Product): Promise<void> {
    await this.initialize();
    
    const content = this.generateProductContent(product);
    const embedding = await this.generateEmbedding(content);
    
    const existingIndex = this.embeddings.findIndex(e => e.id === `product_${product.id}`);
    
    const newEmbedding: DocumentEmbedding = {
      id: `product_${product.id}`,
      content,
      embedding,
      metadata: {
        type: 'product',
        productId: product.id,
        name: product.name,
        category: 'inventory'
      }
    };

    if (existingIndex >= 0) {
      this.embeddings[existingIndex] = newEmbedding;
    } else {
      this.embeddings.push(newEmbedding);
    }

    await this.saveEmbeddings();
  }

  async updateSupplierEmbedding(supplier: any): Promise<void> {
    await this.initialize();
    
    const content = this.generateSupplierContent(supplier);
    const embedding = await this.generateEmbedding(content);
    
    const existingIndex = this.embeddings.findIndex(e => e.id === `supplier_${supplier.id}`);
    
    const newEmbedding: DocumentEmbedding = {
      id: `supplier_${supplier.id}`,
      content,
      embedding,
      metadata: {
        type: 'supplier',
        supplierId: supplier.id,
        name: supplier.name,
        category: 'supplier'
      }
    };

    if (existingIndex >= 0) {
      this.embeddings[existingIndex] = newEmbedding;
    } else {
      this.embeddings.push(newEmbedding);
    }

    await this.saveEmbeddings();
    console.log(`✅ Updated embedding for supplier: ${supplier.name}`);
  }

  async removeSupplierEmbedding(supplierId: string): Promise<void> {
    await this.initialize();
    
    const existingIndex = this.embeddings.findIndex(e => e.id === `supplier_${supplierId}`);
    
    if (existingIndex >= 0) {
      this.embeddings.splice(existingIndex, 1);
      await this.saveEmbeddings();
      console.log(`🗑️ Removed embedding for supplier: ${supplierId}`);
    }
  }
}

export const vectorStoreService = new VectorStoreService();
