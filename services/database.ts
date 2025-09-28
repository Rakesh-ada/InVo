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

  async initDatabase(): Promise<void> {
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
      await new Promise(resolve => setTimeout(resolve, 200));

      // Open new database connection
      console.log('Opening new database connection...');
      this.db = await SQLite.openDatabaseAsync(DB_NAME);
      
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
      throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      console.log('Creating database tables...');
      
      // Create products table
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
      
      await this.db.execAsync(productsSQL);
      console.log('Products table created');
      
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
      
      // Verify tables exist
      const tables = await this.db.getAllAsync("SELECT name FROM sqlite_master WHERE type='table'");
      console.log('Available tables:', tables.map((t: any) => t.name));
      
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
  }

  // Products CRUD operations
  async getProducts(): Promise<Product[]> {
    await this.ensureDatabase();
    
    if (!this.db) {
      throw new Error('Database not available');
    }

    try {
      const result = await this.db.getAllAsync('SELECT * FROM products ORDER BY addedDate DESC');
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

  async addProduct(product: Omit<Product, 'id' | 'addedDate'>): Promise<string> {
    await this.ensureDatabase();
    
    if (!this.db) {
      throw new Error('Database not available');
    }

    const id = Date.now().toString();
    const addedDate = new Date().toISOString();

    try {
      console.log('Adding product:', { id, name: product.name });
      
      await this.db.runAsync(
        'INSERT INTO products (id, name, buyingPrice, sellingPrice, quantity, expiryDate, imageUri, addedDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, product.name, product.buyingPrice, product.sellingPrice, product.quantity, product.expiryDate, product.imageUri || null, addedDate]
      );
      
      console.log('Product added successfully');
      return id;
    } catch (error) {
      console.error('Failed to add product:', error);
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
      
      if (this.db) {
        try {
          await this.db.closeAsync();
        } catch (e) {
          console.warn('Error closing database during reset:', e);
        }
        this.db = null;
      }
      
      try {
        await SQLite.deleteDatabaseAsync(DB_NAME);
        console.log('Database file deleted');
      } catch (e) {
        console.warn('Error deleting database file:', e);
      }
      
      this.isInitialized = false;
      await this.initDatabase();
      console.log('Database reset completed');
    } catch (error) {
      console.error('Failed to reset database:', error);
      throw new Error(`Database reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
}

export const dbService = new DatabaseService();