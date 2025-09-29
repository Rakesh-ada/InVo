import * as SQLite from 'expo-sqlite';

const DB_NAME = 'invo.db';

export type Product = { 
  id: string; 
  name: string; 
  buyingPrice: number; 
  sellingPrice: number; 
  quantity: number; 
  expiryDate: string; 
  imageUri?: string; 
  addedDate: string;
};

export type CartItem = { 
  id: string; 
  name: string; 
  qty: number; 
  price: number;
};

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  async initDatabase(): Promise<void> {
    // If already initializing, wait for that to complete
    if (this.initPromise) {
      return this.initPromise;
    }

    // If already initialized and database exists, return immediately
    if (this.isInitialized && this.db) {
      return;
    }

    // Start initialization
    this.initPromise = this._doInitDatabase();
    return this.initPromise;
  }

  private async _doInitDatabase(): Promise<void> {
    try {
      console.log('Starting database initialization...');
      
      // Reset state
      this.isInitialized = false;
      
      // Close existing database if open
      if (this.db) {
        try {
          await this.db.closeAsync();
          console.log('Closed existing database connection');
        } catch (e) {
          console.warn('Error closing existing database:', e);
        }
        this.db = null;
      }

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      // Open new database connection
      console.log('Opening new database connection...');
      this.db = await SQLite.openDatabaseAsync(DB_NAME);
      console.log(`Database file: ${DB_NAME}`);
      
      if (!this.db) {
        throw new Error('Failed to open database - connection is null');
      }

      console.log('Database opened, testing connection...');
      
      // Test basic connection
      try {
        await this.db.getFirstAsync('SELECT 1 as test');
        console.log('Database connection test successful');
      } catch (e) {
        console.error('Database connection test failed:', e);
        throw new Error('Database connection not working');
      }

      // Create tables
      await this.createTables();
      
      this.isInitialized = true;
      console.log('Database initialization completed successfully');
      
    } catch (error) {
      console.error('Database initialization failed:', error);
      this.db = null;
      this.isInitialized = false;
      this.initPromise = null;
      throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.initPromise = null;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      console.log('Creating database tables...');
      
      // Create products table with optimizations for unlimited items
      const productsSQL = `
        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          buyingPrice REAL NOT NULL,
          sellingPrice REAL NOT NULL,
          quantity INTEGER NOT NULL,
          expiryDate TEXT NOT NULL,
          imageUri TEXT,
          addedDate TEXT NOT NULL
        )
      `;
      
      // Create indexes for better performance with large datasets
      const indexSQL = `
        CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
        CREATE INDEX IF NOT EXISTS idx_products_addedDate ON products(addedDate);
        CREATE INDEX IF NOT EXISTS idx_products_expiryDate ON products(expiryDate);
      `;
      
      await this.db.execAsync(productsSQL);
      console.log('Products table created');
      
      // Create indexes for better performance
      await this.db.execAsync(indexSQL);
      console.log('Database indexes created');
      
      // Create cart_items table
      const cartSQL = `
        CREATE TABLE IF NOT EXISTS cart_items (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          qty INTEGER NOT NULL,
          price REAL NOT NULL
        )
      `;
      
      await this.db.execAsync(cartSQL);
      console.log('Cart items table created');
      
      // Create sales table
      const salesSQL = `
        CREATE TABLE IF NOT EXISTS sales (
          id TEXT PRIMARY KEY,
          productId TEXT NOT NULL,
          quantitySold INTEGER NOT NULL,
          totalAmount REAL NOT NULL,
          saleDate TEXT NOT NULL
        )
      `;
      
      await this.db.execAsync(salesSQL);
      console.log('Sales table created');
      
      // Verify tables exist
      const tables = await this.db.getAllAsync("SELECT name FROM sqlite_master WHERE type='table'");
      console.log('Available tables:', tables.map((t: any) => t.name));
      
      // Check if there are existing products
      const existingProducts = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM products') as { count: number } | null;
      console.log(`Existing products in database: ${existingProducts?.count || 0}`);
      
    } catch (error) {
      console.error('Failed to create tables:', error);
      throw new Error(`Table creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Ensure database is ready before operations
  private async ensureDatabase(): Promise<void> {
    if (!this.isInitialized || !this.db) {
      console.log('Database not initialized, initializing now...');
      await this.initDatabase();
    }
    
    // Double-check database is still valid
    if (!this.db) {
      throw new Error('Database connection lost, please try again');
    }
  }

  // Products CRUD operations
  async getProducts(limit?: number, offset?: number): Promise<Product[]> {
    await this.ensureDatabase();
    
    if (!this.db) {
      throw new Error('Database not available');
    }

    try {
      let query = 'SELECT * FROM products ORDER BY addedDate DESC';
      const params: any[] = [];
      
      if (limit !== undefined) {
        query += ' LIMIT ?';
        params.push(limit);
        
        if (offset !== undefined) {
          query += ' OFFSET ?';
          params.push(offset);
        }
      }
      
      const result = await this.db.getAllAsync(query, params);
      return result.map((row: any) => ({
        id: row.id,
        name: row.name,
        buyingPrice: row.buyingPrice,
        sellingPrice: row.sellingPrice,
        quantity: row.quantity,
        expiryDate: row.expiryDate,
        imageUri: row.imageUri,
        addedDate: row.addedDate
      }));
    } catch (error) {
      console.warn('Failed to load products:', error);
      return [];
    }
  }

  async getProductsCount(): Promise<number> {
    await this.ensureDatabase();
    
    if (!this.db) {
      throw new Error('Database not available');
    }

    try {
      const result = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM products') as { count: number } | null;
      return result?.count || 0;
    } catch (error) {
      console.warn('Failed to get products count:', error);
      return 0;
    }
  }

  async addProduct(product: Omit<Product, 'id' | 'addedDate'>): Promise<string> {
    try {
      await this.ensureDatabase();
      
      if (!this.db) {
        throw new Error('Database not available');
      }

      const id = Date.now().toString();
      const addedDate = new Date().toISOString();

      console.log('Adding product:', { id, name: product.name });
      
      // Validate input data
      if (!product.name || product.name.trim().length === 0) {
        throw new Error('Product name is required');
      }
      
      if (product.buyingPrice < 0 || product.sellingPrice < 0 || product.quantity < 0) {
        throw new Error('Prices and quantity must be non-negative');
      }

      // Use a prepared statement for better performance and safety
      const result = await this.db.runAsync(
        'INSERT INTO products (id, name, buyingPrice, sellingPrice, quantity, expiryDate, imageUri, addedDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, product.name.trim(), product.buyingPrice, product.sellingPrice, product.quantity, product.expiryDate, product.imageUri || null, addedDate]
      );
      
      console.log('Product added successfully with ID:', id);
      return id;
    } catch (error) {
      console.error('Failed to add product:', error);
      
      // If it's a database connection error, try to reinitialize
      if (error instanceof Error && error.message.includes('NullPointerException')) {
        console.log('Database connection lost, attempting to reinitialize...');
        this.isInitialized = false;
        this.db = null;
        this.initPromise = null;
        
        try {
          await this.ensureDatabase();
          // Retry the operation once
          return this.addProduct(product);
        } catch (retryError) {
          console.error('Retry failed:', retryError);
          throw new Error(`Failed to add product after retry: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`);
        }
      }
      
      throw new Error(`Failed to add product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateProduct(product: Product): Promise<void> {
    await this.ensureDatabase();
    
    if (!this.db) {
      throw new Error('Database not available');
    }

    try {
      await this.db.runAsync(
        'UPDATE products SET name = ?, buyingPrice = ?, sellingPrice = ?, quantity = ?, expiryDate = ?, imageUri = ? WHERE id = ?',
        [product.name, product.buyingPrice, product.sellingPrice, product.quantity, product.expiryDate, product.imageUri || null, product.id]
      );
    } catch (error) {
      console.warn('Failed to update product:', error);
      throw error;
    }
  }

  async deleteProduct(id: string): Promise<void> {
    await this.ensureDatabase();
    
    if (!this.db) {
      throw new Error('Database not available');
    }

    try {
      await this.db.runAsync('DELETE FROM products WHERE id = ?', [id]);
    } catch (error) {
      console.warn('Failed to delete product:', error);
      throw error;
    }
  }

  async searchProducts(query: string): Promise<Product[]> {
    await this.ensureDatabase();
    
    if (!this.db) {
      throw new Error('Database not available');
    }

    try {
      const result = await this.db.getAllAsync(
        'SELECT * FROM products WHERE name LIKE ? ORDER BY addedDate DESC',
        [`%${query}%`]
      );
      return result.map((row: any) => ({
        id: row.id,
        name: row.name,
        buyingPrice: row.buyingPrice,
        sellingPrice: row.sellingPrice,
        quantity: row.quantity,
        expiryDate: row.expiryDate,
        imageUri: row.imageUri,
        addedDate: row.addedDate
      }));
    } catch (error) {
      console.warn('Failed to search products:', error);
      return [];
    }
  }

  async clearAllProducts(): Promise<void> {
    await this.ensureDatabase();
    
    if (!this.db) {
      throw new Error('Database not available');
    }
    
    try {
      await this.db.runAsync('DELETE FROM products');
      console.log('All products cleared');
    } catch (error) {
      console.warn('Failed to clear products:', error);
      throw error;
    }
  }

  // Bulk operations for better performance with large datasets
  async addProductsBulk(products: Omit<Product, 'id' | 'addedDate'>[]): Promise<string[]> {
    await this.ensureDatabase();
    
    if (!this.db) {
      throw new Error('Database not available');
    }

    if (products.length === 0) {
      return [];
    }

    try {
      const ids: string[] = [];
      const addedDate = new Date().toISOString();
      
      // Use transaction for better performance
      await this.db.withTransactionAsync(async () => {
        for (const product of products) {
          const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
          ids.push(id);
          
          await this.db!.runAsync(
            'INSERT INTO products (id, name, buyingPrice, sellingPrice, quantity, expiryDate, imageUri, addedDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, product.name.trim(), product.buyingPrice, product.sellingPrice, product.quantity, product.expiryDate, product.imageUri || null, addedDate]
          );
        }
      });
      
      console.log(`Bulk added ${products.length} products`);
      return ids;
    } catch (error) {
      console.error('Failed to bulk add products:', error);
      throw new Error(`Failed to bulk add products: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async seedInitialData(): Promise<void> {
    try {
      console.log('Database initialized successfully');
    } catch (error) {
      console.warn('Failed to initialize database:', error);
    }
  }

  async resetDatabase(): Promise<void> {
    try {
      console.log('Resetting database...');
      
      // Reset state first
      this.isInitialized = false;
      this.initPromise = null;
      
      if (this.db) {
        try {
          await this.db.closeAsync();
          console.log('Database connection closed');
        } catch (e) {
          console.warn('Error closing database during reset:', e);
        }
        this.db = null;
      }
      
      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 200));
      
      try {
        await SQLite.deleteDatabaseAsync(DB_NAME);
        console.log('Database file deleted');
      } catch (e) {
        console.warn('Error deleting database file:', e);
      }
      
      // Wait a bit more
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Reinitialize
      await this.initDatabase();
      console.log('Database reset completed');
    } catch (error) {
      console.error('Failed to reset database:', error);
      throw new Error(`Database reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Check if database is healthy
  async checkDatabaseHealth(): Promise<boolean> {
    try {
      if (!this.db || !this.isInitialized) {
        return false;
      }
      
      await this.db.getFirstAsync('SELECT 1 as test');
      return true;
    } catch (error) {
      console.warn('Database health check failed:', error);
      return false;
    }
  }

  // Get database statistics for monitoring
  async getDatabaseStats(): Promise<{
    totalProducts: number;
    totalQuantity: number;
    databaseSize: string;
    lastAdded: string | null;
  }> {
    await this.ensureDatabase();
    
    if (!this.db) {
      throw new Error('Database not available');
    }

    try {
      const [countResult, quantityResult, lastAddedResult] = await Promise.all([
        this.db.getFirstAsync('SELECT COUNT(*) as count FROM products'),
        this.db.getFirstAsync('SELECT SUM(quantity) as total FROM products'),
        this.db.getFirstAsync('SELECT MAX(addedDate) as lastAdded FROM products')
      ]) as [{ count: number } | null, { total: number } | null, { lastAdded: string } | null];

      return {
        totalProducts: countResult?.count || 0,
        totalQuantity: quantityResult?.total || 0,
        databaseSize: 'N/A', // SQLite doesn't provide easy size info
        lastAdded: lastAddedResult?.lastAdded || null
      };
    } catch (error) {
      console.warn('Failed to get database stats:', error);
      return {
        totalProducts: 0,
        totalQuantity: 0,
        databaseSize: 'Unknown',
        lastAdded: null
      };
    }
  }

  // Cart operations
  async getCartItems(): Promise<CartItem[]> {
    await this.ensureDatabase();
    
    if (!this.db) {
      throw new Error('Database not available');
    }

    try {
      const result = await this.db.getAllAsync('SELECT * FROM cart_items');
      return result.map((row: any) => ({
        id: row.id,
        name: row.name,
        qty: row.qty,
        price: row.price
      }));
    } catch (error) {
      console.warn('Failed to load cart items:', error);
      return [];
    }
  }

  async addToCart(item: Omit<CartItem, 'id'>): Promise<string> {
    await this.ensureDatabase();
    
    if (!this.db) {
      throw new Error('Database not available');
    }

    const id = Date.now().toString();
    
    try {
      await this.db.runAsync(
        'INSERT INTO cart_items (id, name, qty, price) VALUES (?, ?, ?, ?)',
        [id, item.name, item.qty, item.price]
      );
      return id;
    } catch (error) {
      console.warn('Failed to add to cart:', error);
      throw error;
    }
  }

  async removeFromCart(id: string): Promise<void> {
    await this.ensureDatabase();
    
    if (!this.db) {
      throw new Error('Database not available');
    }

    try {
      await this.db.runAsync('DELETE FROM cart_items WHERE id = ?', [id]);
    } catch (error) {
      console.warn('Failed to remove from cart:', error);
      throw error;
    }
  }

  async clearCart(): Promise<void> {
    await this.ensureDatabase();
    
    if (!this.db) {
      throw new Error('Database not available');
    }

    try {
      await this.db.runAsync('DELETE FROM cart_items');
    } catch (error) {
      console.warn('Failed to clear cart:', error);
      throw error;
    }
  }

  // Sales tracking
  async recordSale(productId: string, quantitySold: number, totalAmount: number): Promise<void> {
    await this.ensureDatabase();
    
    if (!this.db) {
      throw new Error('Database not available');
    }

    try {
      const saleId = Date.now().toString();
      const saleDate = new Date().toISOString();
      
      await this.db.runAsync(
        'INSERT INTO sales (id, productId, quantitySold, totalAmount, saleDate) VALUES (?, ?, ?, ?, ?)',
        [saleId, productId, quantitySold, totalAmount, saleDate]
      );
      
      console.log('Sale recorded:', { saleId, productId, quantitySold, totalAmount });
    } catch (error) {
      console.error('Failed to record sale:', error);
      throw error;
    }
  }

  async getSalesData(): Promise<Array<{
    id: string;
    productId: string;
    quantitySold: number;
    totalAmount: number;
    saleDate: string;
  }>> {
    await this.ensureDatabase();
    
    if (!this.db) {
      throw new Error('Database not available');
    }

    try {
      const result = await this.db.getAllAsync('SELECT * FROM sales ORDER BY saleDate DESC');
      return result.map((row: any) => ({
        id: row.id,
        productId: row.productId,
        quantitySold: row.quantitySold,
        totalAmount: row.totalAmount,
        saleDate: row.saleDate
      }));
    } catch (error) {
      console.warn('Failed to load sales data:', error);
      return [];
    }
  }

  // Daily sales helper functions
  async getDailySalesData(): Promise<any[]> {
    await this.ensureDatabase();
    
    if (!this.db) {
      throw new Error('Database not available');
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await this.db.getAllAsync(
        'SELECT * FROM sales WHERE DATE(saleDate) = ? ORDER BY saleDate DESC',
        [today]
      );
      return result.map((row: any) => ({
        id: row.id,
        productId: row.productId,
        quantitySold: row.quantitySold,
        totalAmount: row.totalAmount,
        saleDate: row.saleDate
      }));
    } catch (error) {
      console.warn('Failed to load daily sales data:', error);
      return [];
    }
  }

  async getTodaysSalesTotal(): Promise<{ totalAmount: number; totalItems: number }> {
    await this.ensureDatabase();
    
    if (!this.db) {
      throw new Error('Database not available');
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await this.db.getFirstAsync(
        'SELECT COALESCE(SUM(totalAmount), 0) as totalAmount, COALESCE(SUM(quantitySold), 0) as totalItems FROM sales WHERE DATE(saleDate) = ?',
        [today]
      ) as any;
      
      return {
        totalAmount: result.totalAmount || 0,
        totalItems: result.totalItems || 0
      };
    } catch (error) {
      console.warn('Failed to get today\'s sales total:', error);
      return { totalAmount: 0, totalItems: 0 };
    }
  }
}

export const dbService = new DatabaseService();