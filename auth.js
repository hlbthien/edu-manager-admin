import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';

const db = new sqlite3.Database('./tokens.db');

// Tạo bảng users nếu chưa tồn tại
db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// Hàm khởi tạo users mẫu (chạy một lần)
const initializeSampleUsers = () => {
    const sampleUsers = [
        {
            username: 'admin',
            password: 'admin@123',
            full_name: 'Quản trị viên',
            role: 'admin'
        },    
    ];

    sampleUsers.forEach(user => {
        // Kiểm tra xem user đã tồn tại chưa
        db.get('SELECT id FROM users WHERE username = ?', [user.username], (err, row) => {
            if (err) {
                console.error('Lỗi kiểm tra user:', err);
                return;
            }

            if (!row) {
                // Hash password và insert user mới
                const saltRounds = 10;
                bcrypt.hash(user.password, saltRounds, (hashErr, hash) => {
                    if (hashErr) {
                        console.error('Lỗi hash password:', hashErr);
                        return;
                    }

                    db.run(
                        'INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
                        [user.username, hash, user.full_name, user.role],
                        function(insertErr) {
                            if (insertErr) {
                                console.error('Lỗi tạo user:', insertErr);
                            } else {
                                console.log(`✅ Đã tạo user: ${user.username}`);
                            }
                        }
                    );
                });
            }
        });
    });
};

// Gọi hàm khởi tạo users
initializeSampleUsers();

// API Login
export const userLogin = async (req, res) => {
    const { username, password } = req.body;

    console.log(`🔐 [AUTH] Login attempt: ${username}`);

    // Validate input
    if (!username || !password) {
        return res.json({
            success: false,
            error: 'Vui lòng nhập đầy đủ username và password'
        });
    }

    try {
        // Tìm user trong database
        db.get(
            'SELECT * FROM users WHERE username = ?', 
            [username],
            async (err, user) => {
                if (err) {
                    console.error('❌ [AUTH] Database error:', err);
                    return res.json({
                        success: false,
                        error: 'Lỗi hệ thống'
                    });
                }

                if (!user) {
                    console.log(`❌ [AUTH] User not found: ${username}`);
                    return res.json({
                        success: false,
                        error: 'Tên đăng nhập hoặc mật khẩu không đúng'
                    });
                }

                // So sánh password
                const isPasswordValid = await bcrypt.compare(password, user.password_hash);
                
                if (!isPasswordValid) {
                    console.log(`❌ [AUTH] Invalid password for: ${username}`);
                    return res.json({
                        success: false,
                        error: 'Tên đăng nhập hoặc mật khẩu không đúng'
                    });
                }

                // Login thành công
                console.log(`✅ [AUTH] Login successful: ${username} (${user.role})`);
                
                res.json({
                    success: true,
                    username: user.username,
                    fullName: user.full_name,
                    role: user.role,  // ← QUAN TRỌNG: trả về role
                    message: 'Đăng nhập thành công'
                });
            }
        );

    } catch (error) {
        console.error('❌ [AUTH] Login error:', error);
        res.json({
            success: false,
            error: 'Lỗi đăng nhập'
        });
    }
};

// API Check auth status
export const checkAuth = (req, res) => {
    // Middleware này có thể dùng để check token sau này
    res.json({ authenticated: true });
};

// API Logout
export const userLogout = (req, res) => {
    console.log('🔐 [AUTH] User logout');
    res.json({
        success: true,
        message: 'Đăng xuất thành công'
    });
};

// API Get all users (chỉ dành cho admin)
export const getAllUsers = (req, res) => {
    db.all('SELECT id, username, full_name, role, created_at FROM users', (err, rows) => {
        if (err) {
            console.error('❌ [AUTH] Error getting users:', err);
            return res.json({
                success: false,
                error: 'Lỗi lấy danh sách users'
            });
        }

        res.json({
            success: true,
            users: rows
        });
    });
};

// API xóa token (cho admin)
export const deleteToken = (req, res) => {
    const tokenId = req.params.id;
    
    db.run('DELETE FROM tokens WHERE id = ?', [tokenId], function(err) {
        if (err) {
            console.error('❌ [ADMIN] Delete token error:', err);
            return res.json({
                success: false,
                error: 'Lỗi xóa token'
            });
        }
        
        console.log(`✅ [ADMIN] Token deleted: ${tokenId}`);
        res.json({
            success: true,
            message: 'Đã xóa token thành công'
        });
    });
};


