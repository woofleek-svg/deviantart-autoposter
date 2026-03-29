const mysql = require('mysql2/promise');

let pool;

const dbConfig = {
  host: process.env.DB_HOST || 'mysql-db',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'artwork_user',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'artwork_tracker',
  charset: process.env.DB_CHARSET || 'utf8mb4',
  connectionLimit: parseInt(process.env.DB_POOL_MAX) || 20,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000
};

async function initializeDatabase() {
  try {
    if (!pool) {
      console.log('🔄 Initializing MySQL connection pool...');

      // Validate required environment variables
      if (!process.env.DB_PASSWORD) {
        throw new Error('DB_PASSWORD environment variable is required');
      }

      pool = mysql.createPool(dbConfig);

      // Test the connection
      const connection = await pool.getConnection();
      console.log('✅ MySQL connection pool initialized successfully');
      console.log(`📍 Connected to: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

      // Initialize database schema if needed
      await initializeSchema(connection);

      connection.release();
    }

    return pool;
  } catch (error) {
    console.error('❌ Failed to initialize MySQL connection:', error.message);
    throw error;
  }
}

async function initializeSchema(connection) {
  try {
    console.log('🔧 Checking database schema...');

    // Check if the table exists and create if it doesn't
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS posted_artwork (
        id VARCHAR(255) PRIMARY KEY,
        deviantart_id VARCHAR(255) UNIQUE NOT NULL,
        deviantart_url TEXT,
        tumblr_post_id VARCHAR(255),
        instagram_post_id VARCHAR(255),
        instagram_posted_at TIMESTAMP NULL,
        artist_username VARCHAR(255),
        title TEXT,
        post_status ENUM('tumblr_only', 'instagram_only', 'both', 'failed') DEFAULT 'tumblr_only',
        posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_artist_username (artist_username),
        INDEX idx_posted_at (posted_at),
        INDEX idx_instagram_post_id (instagram_post_id),
        INDEX idx_post_status (post_status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.execute(createTableSQL);

    // Add migration to update existing schema
    await migrateSchema(connection);

    console.log('✅ Database schema verified/created');

  } catch (error) {
    console.error('❌ Failed to initialize database schema:', error.message);
    throw error;
  }
}

async function migrateSchema(connection) {
  try {
    // Check if instagram columns exist
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'posted_artwork'
      AND COLUMN_NAME IN ('instagram_post_id', 'instagram_posted_at', 'post_status')
    `);

    const existingColumns = columns.map(row => row.COLUMN_NAME);

    // Add instagram_post_id if it doesn't exist
    if (!existingColumns.includes('instagram_post_id')) {
      console.log('🔄 Adding instagram_post_id column...');
      await connection.execute(`
        ALTER TABLE posted_artwork
        ADD COLUMN instagram_post_id VARCHAR(255) AFTER tumblr_post_id
      `);
      await connection.execute(`
        ALTER TABLE posted_artwork
        ADD INDEX idx_instagram_post_id (instagram_post_id)
      `);
    }

    // Add instagram_posted_at if it doesn't exist
    if (!existingColumns.includes('instagram_posted_at')) {
      console.log('🔄 Adding instagram_posted_at column...');
      await connection.execute(`
        ALTER TABLE posted_artwork
        ADD COLUMN instagram_posted_at TIMESTAMP NULL AFTER instagram_post_id
      `);
    }

    // Add post_status if it doesn't exist
    if (!existingColumns.includes('post_status')) {
      console.log('🔄 Adding post_status column...');
      await connection.execute(`
        ALTER TABLE posted_artwork
        ADD COLUMN post_status ENUM('tumblr_only', 'instagram_only', 'both', 'failed') DEFAULT 'tumblr_only' AFTER title
      `);
      await connection.execute(`
        ALTER TABLE posted_artwork
        ADD INDEX idx_post_status (post_status)
      `);
    }

    console.log('✅ Schema migration complete');
  } catch (error) {
    // Log but don't fail if migration has issues (columns might already exist)
    console.warn('⚠️  Schema migration warning:', error.message);
  }
}

async function getConnection() {
  if (!pool) {
    await initializeDatabase();
  }
  return pool;
}

// Database query wrapper with error handling
async function query(sql, params = []) {
  try {
    const pool = await getConnection();
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('❌ Database query error:', error.message);
    console.error('📝 SQL:', sql);
    console.error('📝 Params:', params);
    throw error;
  }
}

// Get a single row
async function queryOne(sql, params = []) {
  const results = await query(sql, params);
  return results.length > 0 ? results[0] : null;
}

// Close the pool (for graceful shutdown)
async function closePool() {
  if (pool) {
    console.log('🔄 Closing MySQL connection pool...');
    await pool.end();
    pool = null;
    console.log('✅ MySQL connection pool closed');
  }
}

// Health check function
async function healthCheck() {
  try {
    const pool = await getConnection();
    await pool.execute('SELECT 1 as health');
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  initializeDatabase,
  getConnection,
  query,
  queryOne,
  closePool,
  healthCheck
};