import { dbService, Product } from './database';

export interface OptimizationPlan {
  toReorder: Array<{
    product: Product;
    suggestedQuantity: number;
    priority: 'urgent' | 'high' | 'medium' | 'low';
    reason: string;
  }>;
  toDiscount: Array<{
    product: Product;
    suggestedDiscount: number;
    reason: string;
  }>;
  toLiquidate: Array<{
    product: Product;
    reason: string;
  }>;
  estimatedSavings: number;
  estimatedRevenue: number;
  recommendations: string[];
}

class InventoryOptimizationAgent {
  async optimizeStock(): Promise<OptimizationPlan> {
    console.log('🤖 Running inventory optimization agent...');
    
    try {
      const products = await dbService.getProducts();
      const salesData = await dbService.getSalesData();
      
      const plan: OptimizationPlan = {
        toReorder: [],
        toDiscount: [],
        toLiquidate: [],
        estimatedSavings: 0,
        estimatedRevenue: 0,
        recommendations: []
      };

      // Analyze each product
      for (const product of products) {
        await this.analyzeProduct(product, salesData, plan);
      }

      // Sort by priority
      plan.toReorder.sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      // Generate high-level recommendations
      plan.recommendations = await this.generateRecommendations(plan, products);

      console.log(`✅ Optimization complete: ${plan.toReorder.length} to reorder, ${plan.toDiscount.length} to discount`);
      
      return plan;
    } catch (error) {
      console.error('Optimization failed:', error);
      throw error;
    }
  }

  private async analyzeProduct(
    product: Product, 
    salesData: any[], 
    plan: OptimizationPlan
  ): Promise<void> {
    const stockLevel = product.quantity;
    const turnoverRate = this.calculateTurnoverRate(product, salesData);
    const daysOfStock = this.calculateDaysOfStock(product, salesData);
    
    // Check for reorder
    if (this.needsReorder(product, daysOfStock, turnoverRate)) {
      const suggestedQuantity = this.calculateReorderQuantity(product, salesData);
      const priority = this.getReorderPriority(stockLevel, daysOfStock);
      
      plan.toReorder.push({
        product,
        suggestedQuantity,
        priority,
        reason: this.getReorderReason(stockLevel, daysOfStock, turnoverRate)
      });
    }

    // Check for discount (slow-moving items)
    if (turnoverRate < 0.1 && stockLevel > 10) {
      const suggestedDiscount = this.calculateDiscountPercentage(turnoverRate, stockLevel);
      
      plan.toDiscount.push({
        product,
        suggestedDiscount,
        reason: `Slow-moving item (turnover: ${(turnoverRate * 100).toFixed(1)}%). Discount to clear stock.`
      });
      
      plan.estimatedRevenue += product.sellingPrice * product.quantity * (1 - suggestedDiscount / 100);
    }

    // Check for liquidation (expiring or dead stock)
    if (this.shouldLiquidate(product, turnoverRate, salesData)) {
      plan.toLiquidate.push({
        product,
        reason: this.getLiquidationReason(product, turnoverRate)
      });
    }

    // Calculate potential savings
    if (stockLevel === 0 && daysOfStock < 7) {
      // Lost sales opportunity
      const lostRevenue = this.estimateLostRevenue(product, salesData);
      plan.estimatedSavings += lostRevenue;
    }
  }

  private calculateTurnoverRate(product: Product, salesData: any[]): number {
    const productSales = salesData.filter(s => s.productId === product.id);
    
    if (productSales.length === 0) return 0;

    // Calculate sales in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentSales = productSales.filter(s => {
      const saleDate = new Date(s.saleDate);
      return saleDate >= thirtyDaysAgo;
    });

    const totalSold = recentSales.reduce((sum, s) => sum + s.quantitySold, 0);
    const avgStock = (product.quantity + totalSold) / 2;
    
    return avgStock > 0 ? totalSold / avgStock : 0;
  }

  private calculateDaysOfStock(product: Product, salesData: any[]): number {
    const avgDailySales = this.getAverageDailySales(product, salesData);
    
    if (avgDailySales === 0) return 999; // Infinite days
    
    return product.quantity / avgDailySales;
  }

  private getAverageDailySales(product: Product, salesData: any[]): number {
    const productSales = salesData.filter(s => s.productId === product.id);
    
    if (productSales.length === 0) return 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentSales = productSales.filter(s => {
      const saleDate = new Date(s.saleDate);
      return saleDate >= thirtyDaysAgo;
    });

    const totalSold = recentSales.reduce((sum, s) => sum + s.quantitySold, 0);
    return totalSold / 30;
  }

  private needsReorder(product: Product, daysOfStock: number, turnoverRate: number): boolean {
    // Reorder if:
    // 1. Out of stock
    // 2. Low stock with high turnover
    // 3. Stock will run out in < 7 days
    
    if (product.quantity === 0 && turnoverRate > 0.1) return true;
    if (product.quantity <= 5 && turnoverRate > 0.2) return true;
    if (daysOfStock < 7 && turnoverRate > 0) return true;
    
    return false;
  }

  private calculateReorderQuantity(product: Product, salesData: any[]): number {
    const avgDailySales = this.getAverageDailySales(product, salesData);
    
    // Order for 30 days of stock
    const targetStock = Math.ceil(avgDailySales * 30);
    const needed = Math.max(targetStock - product.quantity, 10);
    
    // Round to nearest 5
    return Math.ceil(needed / 5) * 5;
  }

  private getReorderPriority(stockLevel: number, daysOfStock: number): 'urgent' | 'high' | 'medium' | 'low' {
    if (stockLevel === 0) return 'urgent';
    if (daysOfStock < 3) return 'urgent';
    if (daysOfStock < 7) return 'high';
    if (daysOfStock < 14) return 'medium';
    return 'low';
  }

  private getReorderReason(stockLevel: number, daysOfStock: number, turnoverRate: number): string {
    if (stockLevel === 0) {
      return 'OUT OF STOCK - Immediate reorder required';
    }
    
    if (daysOfStock < 3) {
      return `CRITICAL - Only ${daysOfStock.toFixed(1)} days of stock remaining`;
    }
    
    if (daysOfStock < 7) {
      return `LOW STOCK - ${daysOfStock.toFixed(1)} days remaining (high turnover: ${(turnoverRate * 100).toFixed(1)}%)`;
    }
    
    return `Stock running low - ${daysOfStock.toFixed(1)} days remaining`;
  }

  private calculateDiscountPercentage(turnoverRate: number, stockLevel: number): number {
    // Higher discount for slower-moving items with more stock
    let discount = 10; // Base discount
    
    if (turnoverRate < 0.05) discount += 10;
    if (turnoverRate < 0.02) discount += 10;
    if (stockLevel > 20) discount += 5;
    if (stockLevel > 50) discount += 10;
    
    return Math.min(discount, 40); // Cap at 40%
  }

  private shouldLiquidate(product: Product, turnoverRate: number, salesData: any[]): boolean {
    // Liquidate if:
    // 1. Expiring within 7 days
    // 2. No sales in last 60 days with high stock
    // 3. Very slow turnover with very high stock
    
    if (product.expiryDate && product.expiryDate.trim()) {
      try {
        const expiryDate = new Date(product.expiryDate);
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        
        if (expiryDate <= sevenDaysFromNow) return true;
      } catch (e) {
        // Invalid date
      }
    }

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const recentSales = salesData.filter(s => {
      const saleDate = new Date(s.saleDate);
      return s.productId === product.id && saleDate >= sixtyDaysAgo;
    });

    if (recentSales.length === 0 && product.quantity > 20) return true;
    if (turnoverRate < 0.01 && product.quantity > 50) return true;
    
    return false;
  }

  private getLiquidationReason(product: Product, turnoverRate: number): string {
    if (product.expiryDate && product.expiryDate.trim()) {
      try {
        const expiryDate = new Date(product.expiryDate);
        const daysToExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        
        if (daysToExpiry <= 7) {
          return `URGENT - Expires in ${daysToExpiry} days. Liquidate immediately.`;
        }
      } catch (e) {
        // Invalid date
      }
    }

    if (turnoverRate < 0.01) {
      return `Dead stock - No movement in 60+ days (turnover: ${(turnoverRate * 100).toFixed(2)}%)`;
    }

    return 'Consider liquidation to free up capital';
  }

  private estimateLostRevenue(product: Product, salesData: any[]): number {
    const avgDailySales = this.getAverageDailySales(product, salesData);
    const profit = product.sellingPrice - product.buyingPrice;
    
    // Estimate lost revenue for 7 days out of stock
    return avgDailySales * 7 * profit;
  }

  private async generateRecommendations(plan: OptimizationPlan, products: Product[]): Promise<string[]> {
    const recommendations: string[] = [];

    // Priority actions
    const urgentReorders = plan.toReorder.filter(r => r.priority === 'urgent');
    if (urgentReorders.length > 0) {
      recommendations.push(`🔴 URGENT: Reorder ${urgentReorders.length} out-of-stock items immediately`);
    }

    // Capital tied up
    const excessStock = products.filter(p => p.quantity > 50);
    if (excessStock.length > 0) {
      const tiedCapital = excessStock.reduce((sum, p) => sum + (p.buyingPrice * p.quantity), 0);
      recommendations.push(`💰 ${excessStock.length} items have excess stock (₹${tiedCapital.toLocaleString()} tied up)`);
    }

    // Discount opportunities
    if (plan.toDiscount.length > 0) {
      const potentialRevenue = plan.toDiscount.reduce((sum, d) => 
        sum + (d.product.sellingPrice * d.product.quantity * (1 - d.suggestedDiscount / 100)), 0
      );
      recommendations.push(`🏷️ Discount ${plan.toDiscount.length} slow-moving items (potential revenue: ₹${Math.round(potentialRevenue).toLocaleString()})`);
    }

    // Stock optimization
    const totalValue = products.reduce((sum, p) => sum + (p.buyingPrice * p.quantity), 0);
    const optimalValue = totalValue * 0.8; // Target 80% of current
    const savings = totalValue - optimalValue;
    
    if (savings > 1000) {
      recommendations.push(`💡 Optimize stock levels to free up ₹${Math.round(savings).toLocaleString()} in capital`);
    }

    return recommendations;
  }
}

export const inventoryOptimizationAgent = new InventoryOptimizationAgent();
