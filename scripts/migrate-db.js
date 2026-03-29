#!/usr/bin/env node

/**
 * SQLite to MySQL Migration Script
 * Art Gallery Cross-Post System
 *
 * This script migrates data from the existing SQLite database
 * to the new MySQL database.
 */

const sqlite3 = require('sqlite3').verbose();
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

// Configuration
const SQLITE_DB_PATH = path.join(__dirname, '..', 'backend', 'artwork_tracker.db');
const BATCH_SIZE = 100; // Process records in batches

const mysqlConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'artwork_user',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'artwork_tracker',
  charset: 'utf8mb4'
};

async function checkSQLiteDatabase() {
  return new Promise((resolve, reject) => {
    console.log('📂 Checking SQLite database...');

    const db = new sqlite3.Database(SQLITE_DB_PATH, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        console.log('ℹ️  SQLite database not found - this is normal for new installations');
        resolve({ exists: false });
        return;
      }

      // Count records
      db.get('SELECT COUNT(*) as count FROM posted_artwork', (err, row) => {
        db.close();

        if (err) {
          reject(err);
          return;
        }

        console.log(`✅ SQLite database found with ${row.count} records`);
        resolve({ exists: true, count: row.count });
      });
    });
  });
}

async function connectToMySQL() {
  console.log('🔄 Connecting to MySQL database...');

  if (!process.env.DB_PASSWORD) {
    throw new Error('❌ DB_PASSWORD environment variable is required');
  }

  const connection = await mysql.createConnection(mysqlConfig);
  console.log('✅ Connected to MySQL database');

  return connection;
}

async function migrateSQLiteToMySQL() {
  let sqliteDb = null;
  let mysqlConnection = null;

  try {
    // Check if SQLite database exists
    const sqliteCheck = await checkSQLiteDatabase();
    if (!sqliteCheck.exists) {
      console.log('ℹ️  No SQLite database to migrate - skipping migration');
      return { migrated: 0, skipped: true };
    }

    if (sqliteCheck.count === 0) {
      console.log('ℹ️  SQLite database is empty - skipping migration');
      return { migrated: 0, skipped: true };
    }

    // Connect to databases
    mysqlConnection = await connectToMySQL();

    // Check if MySQL table already has data
    const [existingRows] = await mysqlConnection.execute('SELECT COUNT(*) as count FROM posted_artwork');
    if (existingRows[0].count > 0) {
      console.log(`⚠️  MySQL database already contains ${existingRows[0].count} records`);
      console.log('   Migration will only add new records that don\'t exist in MySQL');
    }

    // Open SQLite database
    sqliteDb = new sqlite3.Database(SQLITE_DB_PATH, sqlite3.OPEN_READONLY);

    // Get all SQLite records
    const sqliteRecords = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM posted_artwork ORDER BY posted_at', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log(`📊 Found ${sqliteRecords.length} records in SQLite database`);

    let migratedCount = 0;
    let skippedCount = 0;

    // Process records in batches
    for (let i = 0; i < sqliteRecords.length; i += BATCH_SIZE) {
      const batch = sqliteRecords.slice(i, i + BATCH_SIZE);

      try {
        // Prepare values for bulk insert
        const values = batch.map(record => [
          record.id,
          record.deviantart_id,
          record.deviantart_url,
          record.tumblr_post_id,
          record.artist_username,
          record.title,
          record.posted_at
        ]);

        // Insert records into MySQL in bulk, ignoring duplicates
        // Note: mysql2/promise .query() supports bulk insert with [values]
        const [result] = await mysqlConnection.query(
          `INSERT IGNORE INTO posted_artwork (id, deviantart_id, deviantart_url, tumblr_post_id, artist_username, title, posted_at)
           VALUES ?`,
          [values]
        );

        migratedCount += result.affectedRows;
        skippedCount += (batch.length - result.affectedRows);

      } catch (error) {
        console.error(`❌ Failed to migrate batch starting at index ${i}:`, error.message);
      }

      // Progress update
      const processed = Math.min(i + BATCH_SIZE, sqliteRecords.length);
      console.log(`📈 Progress: ${processed}/${sqliteRecords.length} records processed`);
    }

    console.log(`✅ Migration completed!`);
    console.log(`   📊 Migrated: ${migratedCount} records`);
    console.log(`   ⏭️  Skipped: ${skippedCount} records (already existed)`);

    return { migrated: migratedCount, skipped: skippedCount };

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    // Close connections
    if (sqliteDb) {
      sqliteDb.close();
    }
    if (mysqlConnection) {
      await mysqlConnection.end();
    }
  }
}

async function verifyMigration() {
  try {
    console.log('🔍 Verifying migration...');

    const connection = await connectToMySQL();
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM posted_artwork');

    console.log(`✅ MySQL database now contains ${rows[0].count} records`);

    // Show sample of migrated data
    const [sampleRows] = await connection.execute(
      'SELECT deviantart_id, title, artist_username, posted_at FROM posted_artwork ORDER BY posted_at DESC LIMIT 5'
    );

    if (sampleRows.length > 0) {
      console.log('📋 Sample of migrated records:');
      sampleRows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.title} by ${row.artist_username} (${row.posted_at})`);
      });
    }

    await connection.end();
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting SQLite to MySQL migration...');
  console.log('📅 Timestamp:', new Date().toISOString());
  console.log('');

  try {
    const result = await migrateSQLiteToMySQL();

    if (!result.skipped) {
      await verifyMigration();
    }

    console.log('');
    console.log('🎉 Migration process completed successfully!');

    if (result.migrated > 0) {
      console.log('');
      console.log('📝 Next steps:');
      console.log('   1. Test your application with the new MySQL database');
      console.log('   2. Verify all data is accessible through the API');
      console.log('   3. Create a backup of the SQLite database before removing it');
      console.log('   4. Update your Docker Compose to remove SQLite dependencies');
    }

  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = { migrateSQLiteToMySQL, verifyMigration };