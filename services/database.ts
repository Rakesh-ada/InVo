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

export type Supplier = {
  id: string;
  name: string;
  phoneNumber: string;
  whatsappNumber: string;
  email?: string;
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

    // Start initialization with retry logic
    this.initPromise = this._doInitDatabaseWithRetry();
    return this.initPromise;
  }

  private async _doInitDatabaseWithRetry(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        await this._doInitDatabase();
        return; // Success, exit retry loop
      } catch (error) {
        attempts++;
        console.warn(`Database initialization attempt ${attempts} failed:`, error);
        
        if (attempts >= maxAttempts) {
          throw error; // Final attempt failed, throw error
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Reset state for retry
        this.isInitialized = false;
        if (this.db) {
          try {
            await this.db.closeAsync();
          } catch (e) {
            console.warn('Error closing database during retry:', e);
          }
          this.db = null;
        }
      }
    }
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
      console.log(`Database opened: ${DB_NAME}`);
      
      if (!this.db) {
        throw new Error('Failed to open database - connection is null');
      }

      console.log('Testing database connection...');
      
      // Test basic connection with a simple query
      try {
        await this.db.execAsync('PRAGMA table_info(sqlite_master);');
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
      
      // Drop and recreate suppliers table to ensure correct schema
      await this.db.execAsync('DROP TABLE IF EXISTS suppliers;');
      console.log('Dropped existing suppliers table');
      
      // Create products table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          buyingPrice REAL NOT NULL,
          sellingPrice REAL NOT NULL,
          quantity INTEGER NOT NULL,
          expiryDate TEXT NOT NULL,
          imageUri TEXT,
          addedDate TEXT NOT NULL
        );
      `);
      console.log('Products table created');
      
      // Create indexes for better performance
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
        CREATE INDEX IF NOT EXISTS idx_products_addedDate ON products(addedDate);
      `);
      console.log('Product indexes created');
      
      // Create cart_items table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS cart_items (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          qty INTEGER NOT NULL,
          price REAL NOT NULL
        );
      `);
      console.log('Cart items table created');
      
      // Create sales table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS sales (
          id TEXT PRIMARY KEY,
          productId TEXT NOT NULL,
          quantitySold INTEGER NOT NULL,
          totalAmount REAL NOT NULL,
          saleDate TEXT NOT NULL
        );
      `);
      console.log('Sales table created');

      // Create suppliers table with correct schema
      await this.db.execAsync(`
        CREATE TABLE suppliers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          phoneNumber TEXT NOT NULL,
          whatsappNumber TEXT NOT NULL,
          email TEXT,
          addedDate TEXT NOT NULL
        );
      `);
      console.log('Suppliers table created with correct schema');
      
      // Verify tables exist and check schema
      const tables = await this.db.getAllAsync("SELECT name FROM sqlite_master WHERE type='table'");
      console.log('Available tables:', tables.map((t: any) => t.name));
      
      // Check suppliers table schema
      const suppliersSchema = await this.db.getAllAsync("PRAGMA table_info(suppliers)");
      console.log('Suppliers table schema:', suppliersSchema);
      
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
    try {
      await this.ensureDatabase();
      
      if (!this.db) {
        throw new Error('Database not available');
      }

      console.log('Deleting product with ID:', id);
      
      // Use execAsync instead of runAsync to avoid prepareAsync issues
      await this.db.execAsync(`DELETE FROM products WHERE id = '${id.replace(/'/g, "''")}'`);
      
      console.log('Product deleted successfully');
    } catch (error) {
      console.error('Failed to delete product:', error);
      
      // If it's a database connection error, try to reinitialize
      if (error instanceof Error && (
        error.message.includes('NullPointerException') || 
        error.message.includes('prepareAsync') || 
        error.message.includes('database') ||
        error.message.includes('connection')
      )) {
        console.log('Database connection issue detected during product delete, reinitializing...');
        this.isInitialized = false;
        this.db = null;
        this.initPromise = null;
        
        try {
          await this.initDatabase();
          console.log('Database reinitialized, retrying product delete...');
          return this.deleteProduct(id);
        } catch (retryError) {
          console.error('Product delete retry failed:', retryError);
          throw new Error(`Failed to delete product after retry: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`);
        }
      }
      
      throw new Error(`Failed to delete product: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    try {
      await this.ensureDatabase();
      
      if (!this.db) {
        throw new Error('Database not available');
      }
      
      console.log('Clearing all products...');
      
      // Use execAsync instead of runAsync
      await this.db.execAsync('DELETE FROM products');
      
      console.log('All products cleared');
    } catch (error) {
      console.error('Failed to clear products:', error);
      
      // If it's a database connection error, try to reinitialize
      if (error instanceof Error && (
        error.message.includes('NullPointerException') || 
        error.message.includes('prepareAsync') || 
        error.message.includes('database') ||
        error.message.includes('connection')
      )) {
        console.log('Database connection issue detected during clear products, reinitializing...');
        this.isInitialized = false;
        this.db = null;
        this.initPromise = null;
        
        try {
          await this.initDatabase();
          console.log('Database reinitialized, retrying clear products...');
          return this.clearAllProducts();
        } catch (retryError) {
          console.error('Clear products retry failed:', retryError);
          throw new Error(`Failed to clear products after retry: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`);
        }
      }
      
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

  // Supplier operations
  async getSuppliers(): Promise<Supplier[]> {
    await this.ensureDatabase();
    
    if (!this.db) {
      throw new Error('Database not available');
    }

    try {
      const result = await this.db.getAllAsync('SELECT * FROM suppliers ORDER BY addedDate DESC');
      return result.map((row: any) => ({
        id: row.id,
        name: row.name,
        phoneNumber: row.phoneNumber,
        whatsappNumber: row.whatsappNumber,
        email: row.email,
        addedDate: row.addedDate
      }));
    } catch (error) {
      console.warn('Failed to get suppliers:', error);
      return [];
    }
  }

  async addSupplier(supplier: Omit<Supplier, 'id' | 'addedDate'>): Promise<string> {
    try {
      await this.ensureDatabase();
      
      if (!this.db) {
        throw new Error('Database not available');
      }

      // Validate input data first
      if (!supplier.name || supplier.name.trim().length === 0) {
        throw new Error('Supplier name is required');
      }
      
      if (!supplier.phoneNumber || supplier.phoneNumber.trim().length === 0) {
        throw new Error('Phone number is required');
      }
      
      if (!supplier.whatsappNumber || supplier.whatsappNumber.trim().length === 0) {
        throw new Error('WhatsApp number is required');
      }

      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const addedDate = new Date().toISOString();
      
      console.log('Adding supplier with data:', {
        id,
        name: supplier.name.trim(),
        phoneNumber: supplier.phoneNumber.trim(),
        whatsappNumber: supplier.whatsappNumber.trim()
      });
      
      // Use execAsync instead of runAsync to avoid prepareAsync issues
      await this.db.execAsync(`
        INSERT INTO suppliers (id, name, phoneNumber, whatsappNumber, email, addedDate) 
        VALUES (
          '${id}', 
          '${supplier.name.trim().replace(/'/g, "''")}', 
          '${supplier.phoneNumber.trim()}', 
          '${supplier.whatsappNumber.trim()}', 
          ${supplier.email?.trim() ? `'${supplier.email.trim().replace(/'/g, "''")}'` : 'NULL'}, 
          '${addedDate}'
        )
      `);
      
      console.log('Supplier added successfully with ID:', id);
      return id;
    } catch (error) {
      console.error('Failed to add supplier:', error);
      
      // If it's a schema error, try to reset and recreate database
      if (error instanceof Error && (
        error.message.includes('no column named') ||
        error.message.includes('no such column') ||
        error.message.includes('table suppliers has no column')
      )) {
        console.log('Schema mismatch detected, resetting database...');
        try {
          await this.resetDatabase();
          console.log('Database reset complete, retrying supplier add...');
          // Retry the operation once after resetting
          return this.addSupplier(supplier);
        } catch (resetError) {
          console.error('Database reset failed:', resetError);
          throw new Error(`Failed to add supplier after database reset: ${resetError instanceof Error ? resetError.message : 'Unknown error'}`);
        }
      }
      
      // If it's a general database connection error, try to reinitialize
      if (error instanceof Error && (
        error.message.includes('NullPointerException') || 
        error.message.includes('prepareAsync') || 
        error.message.includes('database') ||
        error.message.includes('connection')
      )) {
        console.log('Database connection issue detected, reinitializing...');
        this.isInitialized = false;
        this.db = null;
        this.initPromise = null;
        
        try {
          await this.initDatabase();
          console.log('Database reinitialized, retrying supplier add...');
          // Retry the operation once after reinitializing
          return this.addSupplier(supplier);
        } catch (retryError) {
          console.error('Retry failed:', retryError);
          throw new Error(`Failed to add supplier after retry: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`);
        }
      }
      
      throw new Error(`Failed to add supplier: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateSupplier(supplier: Supplier): Promise<void> {
    try {
      await this.ensureDatabase();
      
      if (!this.db) {
        throw new Error('Database not available');
      }

      console.log('Updating supplier:', supplier.id);
      
      // Use execAsync instead of runAsync to avoid prepareAsync issues
      await this.db.execAsync(`
        UPDATE suppliers 
        SET name = '${supplier.name.trim().replace(/'/g, "''")}', 
            phoneNumber = '${supplier.phoneNumber.trim()}', 
            whatsappNumber = '${supplier.whatsappNumber.trim()}', 
            email = ${supplier.email?.trim() ? `'${supplier.email.trim().replace(/'/g, "''")}'` : 'NULL'}
        WHERE id = '${supplier.id.replace(/'/g, "''")}'
      `);
      
      console.log('Supplier updated successfully');
    } catch (error) {
      console.error('Failed to update supplier:', error);
      
      // If it's a database connection error, try to reinitialize
      if (error instanceof Error && (
        error.message.includes('NullPointerException') || 
        error.message.includes('prepareAsync') || 
        error.message.includes('database') ||
        error.message.includes('connection')
      )) {
        console.log('Database connection issue detected during update, reinitializing...');
        this.isInitialized = false;
        this.db = null;
        this.initPromise = null;
        
        try {
          await this.initDatabase();
          console.log('Database reinitialized, retrying supplier update...');
          // Retry the operation once after reinitializing
          return this.updateSupplier(supplier);
        } catch (retryError) {
          console.error('Update retry failed:', retryError);
          throw new Error(`Failed to update supplier after retry: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`);
        }
      }
      
      throw new Error(`Failed to update supplier: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteSupplier(id: string): Promise<void> {
    try {
      await this.ensureDatabase();
      
      if (!this.db) {
        throw new Error('Database not available');
      }

      console.log('Deleting supplier with ID:', id);
      
      // Use execAsync instead of runAsync to avoid prepareAsync issues
      await this.db.execAsync(`DELETE FROM suppliers WHERE id = '${id.replace(/'/g, "''")}'`);
      
      console.log('Supplier deleted successfully');
    } catch (error) {
      console.error('Failed to delete supplier:', error);
      
      // If it's a database connection error, try to reinitialize
      if (error instanceof Error && (
        error.message.includes('NullPointerException') || 
        error.message.includes('prepareAsync') || 
        error.message.includes('database') ||
        error.message.includes('connection')
      )) {
        console.log('Database connection issue detected during delete, reinitializing...');
        this.isInitialized = false;
        this.db = null;
        this.initPromise = null;
        
        try {
          await this.initDatabase();
          console.log('Database reinitialized, retrying supplier delete...');
          // Retry the operation once after reinitializing
          return this.deleteSupplier(id);
        } catch (retryError) {
          console.error('Delete retry failed:', retryError);
          throw new Error(`Failed to delete supplier after retry: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`);
        }
      }
      
      throw new Error(`Failed to delete supplier: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
          // Drop all tables to ensure clean schema
          await this.db.execAsync('DROP TABLE IF EXISTS suppliers;');
          await this.db.execAsync('DROP TABLE IF EXISTS products;');
          await this.db.execAsync('DROP TABLE IF EXISTS cart_items;');
          await this.db.execAsync('DROP TABLE IF EXISTS sales;');
          console.log('All tables dropped');
          
          await this.db.closeAsync();
          console.log('Database connection closed');
        } catch (e) {
          console.warn('Error during database cleanup:', e);
        }
        this.db = null;
      }
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 300));
      
      try {
        await SQLite.deleteDatabaseAsync(DB_NAME);
        console.log('Database file deleted');
      } catch (e) {
        console.warn('Error deleting database file:', e);
      }
      
      // Wait a bit more
      await new Promise(resolve => setTimeout(resolve, 300));
      
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