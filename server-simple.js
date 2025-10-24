// server-simple.js - Phiên bản đơn giản để deploy
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

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

// Database initialization
async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database tables...');
    
    // 1. Tạo bảng users
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
    
    // 2. Tạo bảng tokens
    await dbRun(`
      CREATE TABLE IF NOT EXISTS tokens (
        id SERIAL PRIMARY KEY,
        token_type VARCHAR(50) NOT NULL,
        token_value TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tokens table ready');
    
    // 3. Tạo admin user nếu chưa có
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
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
  }
}

// Gọi hàm khởi tạo
initializeDatabase();
// Thêm các routes này vào server-simple.js (sau health check)

// Authentication routes
app.post('/api/auth/user-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log(`🔐 Login attempt: ${username}`);
    
    if (!username || !password) {
      return res.json({
        success: false,
        error: 'Username và password là bắt buộc'
      });
    }

    // Tìm user trong database
    const user = await dbGet(
      'SELECT * FROM users WHERE username = $1', 
      [username]
    );

    if (!user) {
      return res.json({
        success: false,
        error: 'User không tồn tại'
      });
    }

    // Verify password
    const bcrypt = await import('bcryptjs');
    const isValid = await bcrypt.default.compare(password, user.password_hash);

    if (!isValid) {
      return res.json({
        success: false,
        error: 'Sai mật khẩu'
      });
    }

    // Login successful
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role
      },
      message: 'Đăng nhập thành công!'
    });

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