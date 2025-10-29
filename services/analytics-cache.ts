import AsyncStorage from '@react-native-async-storage/async-storage';
import { dbService, Product } from './database';

const CACHE_KEY = '@invo_analytics_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface CachedAnalytics {
  totalProducts: number;
  totalStock: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  avgPrice: number;
  avgMargin: number;
  topProducts: string[];
  highMarginProducts: string[];
  reorderSuggestions: string[];
  stockHealth: string;
  timestamp: number;
}

class AnalyticsCacheService {
  private cache: CachedAnalytics | null = null;
  private cacheTimestamp = 0;

  async getAnalytics(): Promise<CachedAnalytics> {
    const now = Date.now();
    
    // Check memory cache first
    if (this.cache && (now - this.cacheTimestamp) < CACHE_TTL) {
      console.log('📊 Using cached analytics from memory');
      return this.cache;
    }

    // Check persistent cache
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: CachedAnalytics = JSON.parse(cached);
        if ((now - parsed.timestamp) < CACHE_TTL) {
          console.log('📊 Using cached analytics from storage');
          this.cache = parsed;
          this.cacheTimestamp = now;
          return parsed;
        }
      }
    } catch (error) {
      console.warn('Failed to read analytics cache:', error);
    }

    // Cache miss - compute fresh analytics
    console.log('📊 Computing fresh analytics...');
    const analytics = await this.computeAnalytics();
    await this.saveCache(analytics);
    
    return analytics;
  }

  private async computeAnalytics(): Promise<CachedAnalytics> {
    const products = await dbService.getProducts();
    
    const totalStock = products.reduce((sum, p) => sum + p.quantity, 0);
    const totalValue = products.reduce((sum, p) => sum + (p.buyingPrice * p.quantity), 0);
    const lowStockItems = products.filter(p => p.quantity <= 5 && p.quantity > 0);
    const outOfStockItems = products.filter(p => p.quantity === 0);
    
    const margins = products.map(p => 
      ((p.sellingPrice - p.buyingPrice) / p.sellingPrice) * 100
    );
    const avgMargin = margins.length > 0 
      ? margins.reduce((sum, m) => sum + m, 0) / margins.length 
      : 0;
    
    const topProducts = products
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3)
      .map(p => p.name);
    
    const highMarginProducts = products
      .filter(p => {
        const margin = ((p.sellingPrice - p.buyingPrice) / p.sellingPrice) * 100;
        return margin > 30;
      })
      .slice(0, 3)
      .map(p => p.name);
    
    const reorderSuggestions = lowStockItems
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 5)
      .map(p => `${p.name} (${p.quantity} left)`);
    
    const stockHealth = this.calculateStockHealth(
      lowStockItems.length, 
      outOfStockItems.length, 
      products.length
    );

    return {
      totalProducts: products.length,
      totalStock,
      totalValue,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      avgPrice: products.length > 0 
        ? products.reduce((sum, p) => sum + p.sellingPrice, 0) / products.length 
        : 0,
      avgMargin,
      topProducts,
      highMarginProducts,
      reorderSuggestions,
      stockHealth,
      timestamp: Date.now()
    };
  }

  private calculateStockHealth(lowStock: number, outOfStock: number, total: number): string {
    if (total === 0) return '🟢 N/A';
    const healthScore = 100 - ((lowStock + outOfStock * 2) / total * 100);
    if (healthScore >= 90) return '🟢 Excellent';
    if (healthScore >= 75) return '🟡 Good';
    if (healthScore >= 60) return '🟠 Fair';
    return '🔴 Needs Attention';
  }

  private async saveCache(analytics: CachedAnalytics): Promise<void> {
    try {
      this.cache = analytics;
      this.cacheTimestamp = Date.now();
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(analytics));
      console.log('📊 Analytics cached successfully');
    } catch (error) {
      console.warn('Failed to save analytics cache:', error);
    }
  }

  async invalidateCache(): Promise<void> {
    console.log('📊 Invalidating analytics cache');
    this.cache = null;
    this.cacheTimestamp = 0;
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.warn('Failed to invalidate cache:', error);
    }
  }

  async forceRefresh(): Promise<CachedAnalytics> {
    await this.invalidateCache();
    return this.getAnalytics();
  }
}

export const analyticsCacheService = new AnalyticsCacheService();
