// server-simple.js - SỬA IMPORTS
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// 🎯 QUAN TRỌNG: Import đúng các hàm từ database.js
import { dbQuery, dbGet, dbRun } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static(__dirname));

// 🎯 ROUTES CƠ BẢN
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Thêm vào server-simple.js (sau imports, trước routes)
import { dbRun, dbGet } from './database.js';

// Thêm vào server-simple.js - thay thế hàm initializeDatabase cũ
async function initializeDatabase() {
  let retries = 5;
  
  while (retries > 0) {
    try {
      console.log(`🔄 Attempting database connection (${retries} retries left)...`);
      
      // Test connection đơn giản trước
      const testResult = await dbQuery('SELECT NOW() as time');
      console.log('✅ Database connection test passed:', testResult.rows[0].time);
      
      // Tạo bảng users
      await dbRun(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          full_name VARCHAR(200),
          role VARCHAR(50) DEFAULT 'viewer',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Users table ready');
      
      // Tạo admin user
      const userCount = await dbGet('SELECT COUNT(*) as count FROM users');
      if (parseInt(userCount.count) === 0) {
        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.default.hash('admin123', 10);
        
        await dbRun(
          'INSERT INTO users (username, password_hash, full_name, role) VALUES ($1, $2, $3, $4)',
          ['admin', hashedPassword, 'Administrator', 'admin']
        );
        console.log('✅ Admin user created: admin / admin123');
      }
      
      console.log('🎉 Database initialization completed!');
      return true;
      
    } catch (error) {
      console.error(`❌ Database init attempt failed:`, error.message);
      retries--;
      
      if (retries > 0) {
        console.log(`⏳ Retrying in 3 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        console.error('💥 Database initialization failed after all retries');
        return false;
      }
    }
  }
}

// Gọi hàm khởi tạo
initializeDatabase();
// Thêm các routes này vào server-simple.js (sau health check)

// Tạm thời comment database auth, dùng mock
app.post('/api/auth/user-login', async (req, res) => {
  console.log('🔐 Received login request');
  
  try {
    const { username, password } = req.body;
    
    // MOCK AUTHENTICATION - Tạm thời dùng mock
    if (username === 'admin' && password === 'admin123') {
      return res.json({
        success: true,
        user: {
          id: 1,
          username: 'admin',
          fullName: 'Administrator',
          role: 'admin'
        },
        message: 'Đăng nhập thành công! (Mock)'
      });
    } else {
      return res.json({
        success: false,
        error: 'Sai thông tin đăng nhập. Thử: admin / admin123'
      });
    }
    
  } catch (error) {
    console.error('🚨 Login error:', error);
    res.json({
      success: false,
      error: 'Lỗi server: ' + error.message
    });
  }
});

app.get('/api/auth/check', async (req, res) => {
  try {
    res.json({ 
      success: true, 
      authenticated: true,
      message: 'Auth API is working' 
    });
  } catch (error) {
    res.json({ 
      success: false, 
      error: error.message 
    });
  }
});


app.get('/api/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API is working perfectly! 🎉',
    version: '1.0.0-simple'
  });
});

// Sửa health endpoint trong server-simple.js
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const dbResult = await dbQuery('SELECT NOW() as time');
    
    res.json({ 
      status: 'OK', 
      message: 'Server and database are running!',
      timestamp: new Date().toISOString(),
      database_time: dbResult.rows[0].time,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.json({ 
      status: 'WARNING', 
      message: 'Server running but database connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 🎯 SERVE STATIC FILES
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// 🎯 FALLBACK - Serve any other HTML files
app.get('*.html', (req, res) => {
  res.sendFile(path.join(__dirname, req.path));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║               🚀 SIMPLE SERVER LIVE             ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`📍 Port: ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('✅ Server ready! Access your app at:');
  console.log(`   http://localhost:${PORT}`);
  console.log('🎯 Test endpoints:');
  console.log(`   /health`);
  console.log(`   /api/test`);
});