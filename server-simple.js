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