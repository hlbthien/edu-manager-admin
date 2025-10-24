// database.js - PostgreSQL for Render
import pkg from 'pg';
const { Pool } = pkg;

console.log('🔧 Initializing PostgreSQL connection for Render...');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { 
    rejectUnauthorized: false 
  } : false,
  // Thêm connection settings
  max: 10,                    // Giới hạn connections
  idleTimeoutMillis: 30000,   // 30 seconds
  connectionTimeoutMillis: 5000, // 5 seconds timeout
  maxUses: 7500,              // Giới hạn sử dụng mỗi connection
});

// Connection events
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database on Render');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL connection error:', err);
});

// Helper functions
export const dbQuery = async (text, params) => {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('❌ Database Query Error:', error.message);
    throw error;
  }
};

export const dbGet = async (text, params) => {
  const result = await dbQuery(text, params);
  return result.rows[0] || null;
};

export const dbAll = async (text, params) => {
  const result = await dbQuery(text, params);
  return result.rows;
};

export const dbRun = async (text, params = []) => {
  const result = await dbQuery(text, params);
  
  let lastID = null;
  if (text.trim().toUpperCase().startsWith('INSERT') && result.rows.length > 0) {
    lastID = result.rows[0].id || null;
  }
  
  return {
    changes: result.rowCount || 0,
    lastID: lastID
  };
};

export default pool;