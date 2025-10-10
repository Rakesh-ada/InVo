import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { dbService, Product } from './database';

type WeeklyData = {
  totalSales: number;
  totalRevenue: number;
  itemsSold: number;
  topProducts: { name: string; quantity: number; revenue: number }[];
  dailySales: { day: string; sales: number; revenue: number }[];
  lowStockAlerts: Product[];
  outOfStockItems: Product[];
};

class WeeklyReportService {
  async generateAndDownloadReport(): Promise<void> {
    try {
      const weeklyData = await this.loadWeeklyData();
      await this.generatePDF(weeklyData);
    } catch (error) {
      console.error('Error generating weekly report:', error);
      Alert.alert('Error', 'Failed to generate weekly report');
    }
  }

  private async loadWeeklyData(): Promise<WeeklyData> {
    const products = await dbService.getProducts();
    
    // Calculate weekly data (mock data for demonstration)
    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    
    // Mock daily sales data for the week
    const dailySales = [];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    let totalSales = 0;
    let totalRevenue = 0;
    
    for (let i = 0; i < 7; i++) {
      const sales = Math.floor(Math.random() * 50) + 10; // Mock sales 10-60
      const revenue = sales * (Math.random() * 500 + 100); // Mock revenue
      dailySales.push({
        day: days[i],
        sales,
        revenue: Math.round(revenue)
      });
      totalSales += sales;
      totalRevenue += revenue;
    }

    // Get top products (mock based on actual products)
    const topProducts = products.slice(0, 5).map(product => ({
      name: product.name,
      quantity: Math.floor(Math.random() * 20) + 5,
      revenue: Math.round((Math.random() * 2000 + 500))
    }));

    // Filter stock alerts
    const lowStockAlerts = products.filter(p => p.quantity <= 5 && p.quantity > 0);
    const outOfStockItems = products.filter(p => p.quantity === 0);

    return {
      totalSales,
      totalRevenue: Math.round(totalRevenue),
      itemsSold: totalSales,
      topProducts,
      dailySales,
      lowStockAlerts,
      outOfStockItems
    };
  }

  private generateChart(data: { day: string; sales: number }[]): string {
    const maxSales = Math.max(...data.map(d => d.sales));
    const chartHeight = 200;
    const barWidth = 40;
    const gap = 10;
    
    return data.map((item, index) => {
      const height = (item.sales / maxSales) * chartHeight;
      const x = index * (barWidth + gap);
      
      return `
        <rect x="${x}" y="${chartHeight - height}" width="${barWidth}" height="${height}" 
              fill="#3B82F6" rx="4"/>
        <text x="${x + barWidth/2}" y="${chartHeight + 20}" text-anchor="middle" 
              fill="#666" font-size="12">${item.day}</text>
        <text x="${x + barWidth/2}" y="${chartHeight - height - 5}" text-anchor="middle" 
              fill="#333" font-size="10">${item.sales}</text>
      `;
    }).join('');
  }

  private async generatePDF(weeklyData: WeeklyData): Promise<void> {
    const chartSVG = this.generateChart(weeklyData.dailySales);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    const weekEnd = new Date();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Weekly Sales Report</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            color: #333;
            line-height: 1.6;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px;
            border-bottom: 2px solid #3B82F6;
            padding-bottom: 20px;
          }
          .header h1 { 
            color: #1e40af; 
            margin: 0;
            font-size: 28px;
          }
          .period { 
            color: #666; 
            font-size: 14px;
            margin-top: 5px;
          }
          .metrics { 
            display: flex; 
            justify-content: space-around; 
            margin: 30px 0;
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
          }
          .metric { 
            text-align: center;
            flex: 1;
          }
          .metric-value { 
            font-size: 24px; 
            font-weight: bold; 
            color: #1e40af;
            display: block;
          }
          .metric-label { 
            color: #666; 
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .section { 
            margin: 30px 0;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
          }
          .section h2 { 
            color: #1e40af; 
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 10px;
            margin-top: 0;
          }
          .chart-container { 
            text-align: center; 
            margin: 20px 0;
          }
          .top-products table { 
            width: 100%; 
            border-collapse: collapse;
            margin-top: 15px;
          }
          .top-products th, 
          .top-products td { 
            padding: 12px; 
            text-align: left; 
            border-bottom: 1px solid #e2e8f0;
          }
          .top-products th { 
            background: #f1f5f9; 
            font-weight: 600;
            color: #475569;
          }
          .alert-item { 
            background: #fef2f2; 
            border-left: 4px solid #ef4444;
            padding: 10px 15px; 
            margin: 8px 0;
            border-radius: 0 4px 4px 0;
          }
          .low-stock { 
            background: #fffbeb; 
            border-left-color: #f59e0b;
          }
          .footer { 
            margin-top: 40px; 
            text-align: center; 
            color: #666;
            font-size: 12px;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
          }
          .no-items { 
            text-align: center; 
            color: #10b981; 
            font-style: italic;
            padding: 20px;
            background: #f0fdf4;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 Weekly Sales Report</h1>
          <div class="period">
            ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}
          </div>
        </div>

        <div class="metrics">
          <div class="metric">
            <span class="metric-value">₹${weeklyData.totalRevenue.toLocaleString()}</span>
            <div class="metric-label">Total Revenue</div>
          </div>
          <div class="metric">
            <span class="metric-value">${weeklyData.totalSales}</span>
            <div class="metric-label">Total Sales</div>
          </div>
          <div class="metric">
            <span class="metric-value">${weeklyData.itemsSold}</span>
            <div class="metric-label">Items Sold</div>
          </div>
        </div>

        <div class="section">
          <h2>📈 Daily Sales Trend</h2>
          <div class="chart-container">
            <svg width="350" height="250" viewBox="0 0 350 250">
              ${chartSVG}
            </svg>
          </div>
        </div>

        <div class="section">
          <h2>🏆 Top Performing Products</h2>
          <div class="top-products">
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Quantity Sold</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                ${weeklyData.topProducts.map(product => `
                  <tr>
                    <td>${product.name}</td>
                    <td>${product.quantity}</td>
                    <td>₹${product.revenue.toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="section">
          <h2>⚠️ Inventory Alerts</h2>
          <h3 style="color: #dc2626; margin-top: 20px;">Out of Stock (${weeklyData.outOfStockItems.length})</h3>
          ${weeklyData.outOfStockItems.length > 0 ? 
            weeklyData.outOfStockItems.map(item => `
              <div class="alert-item">
                <strong>${item.name}</strong> - Completely out of stock
              </div>
            `).join('') : 
            '<div class="no-items">✅ No out of stock items</div>'
          }
          
          <h3 style="color: #f59e0b; margin-top: 25px;">Low Stock (${weeklyData.lowStockAlerts.length})</h3>
          ${weeklyData.lowStockAlerts.length > 0 ? 
            weeklyData.lowStockAlerts.map(item => `
              <div class="alert-item low-stock">
                <strong>${item.name}</strong> - Only ${item.quantity} units remaining
              </div>
            `).join('') : 
            '<div class="no-items">✅ No low stock items</div>'
          }
        </div>

        <div class="section">
          <h2>💡 Recommendations</h2>
          <ul style="padding-left: 20px;">
            <li><strong>Restock Priority:</strong> Focus on out-of-stock items to prevent lost sales</li>
            <li><strong>Best Sellers:</strong> Increase inventory for top-performing products</li>
            <li><strong>Sales Trend:</strong> ${weeklyData.dailySales[6].sales > weeklyData.dailySales[0].sales ? 
              'Positive trend - sales increasing throughout the week' : 
              'Monitor daily patterns for optimization opportunities'}</li>
            <li><strong>Revenue Growth:</strong> Consider promotional strategies for slow-moving inventory</li>
          </ul>
        </div>

        <div class="footer">
          Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} | InVo Inventory Management
        </div>
      </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Weekly Sales Report',
        UTI: 'com.adobe.pdf'
      });
    } else {
      Alert.alert('Success', `Report saved to: ${uri}`);
    }
  }
}

export const weeklyReportService = new WeeklyReportService();