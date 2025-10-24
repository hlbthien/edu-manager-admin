// admin-api.js - API Endpoints cho Admin Panel
const express = require('express');
const router = express.Router();
const db = require('./database'); // Import database connection của bạn

// Middleware kiểm tra admin authentication
const adminAuth = (req, res, next) => {
    const token = req.headers.authorization;
    
    // Kiểm tra token admin - bạn có thể customize theo hệ thống của bạn
    if (!token || token !== 'admin-secret-token') {
        return res.status(401).json({ 
            success: false, 
            error: 'Unauthorized - Admin access required' 
        });
    }
    next();
};

// 📊 DASHBOARD STATS
router.get('/stats', adminAuth, async (req, res) => {
    try {
        console.log('📊 Fetching admin stats...');
        
        const stats = await getAdminStats();
        
        res.json({
            success: true,
            stats: {
                totalUsers: stats.userCount,
                totalCourses: stats.courseCount,
                totalStudents: stats.studentCount,
                totalImports: stats.importCount,
                activeTokens: stats.tokenCount,
                totalScores: stats.scoreCount
            },
            recentActivity: stats.recentActivity || []
        });
        
    } catch (error) {
        console.error('❌ Admin stats error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi khi lấy thống kê: ' + error.message 
        });
    }
});

// 🔐 TOKENS MANAGEMENT
router.get('/tokens', adminAuth, async (req, res) => {
    try {
        console.log('🔐 Fetching tokens list...');
        
        const tokens = await db.all(`
            SELECT * FROM tokens 
            ORDER BY created_at DESC
        `);
        
        res.json({ 
            success: true, 
            tokens: tokens || [] 
        });
        
    } catch (error) {
        console.error('❌ Tokens fetch error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi khi lấy danh sách tokens' 
        });
    }
});

router.delete('/tokens/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🗑️ Deleting token ID: ${id}`);
        
        await db.run('DELETE FROM tokens WHERE id = ?', [id]);
        
        // Ghi log activity
        await logAdminActivity('DELETE_TOKEN', `Deleted token ID: ${id}`);
        
        res.json({ 
            success: true, 
            message: 'Token đã được xóa thành công' 
        });
        
    } catch (error) {
        console.error('❌ Token delete error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi khi xóa token' 
        });
    }
});

// 👥 USERS MANAGEMENT
router.get('/simple-users', async (req, res) => {
    try {
        console.log('👥 Fetching users list...');
        
        const users = await db.all(`
            SELECT id, username, full_name, role, created_at 
            FROM users 
            ORDER BY created_at DESC
        `);
        
        res.json({ 
            success: true, 
            users: users || [] 
        });
        
    } catch (error) {
        console.error('❌ Users fetch error:', error);
        res.json({ 
            success: false, 
            users: [],
            error: error.message 
        });
    }
});

router.post('/users', adminAuth, async (req, res) => {
    try {
        const { username, full_name, role, password } = req.body;
        console.log(`➕ Creating new user: ${username}`);
        
        // Validate input
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username và password là bắt buộc'
            });
        }
        
        // Hash password (bạn cần implement hàm hash)
        const hashedPassword = await hashPassword(password);
        
        await db.run(`
            INSERT INTO users (username, full_name, role, password_hash, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
        `, [username, full_name, role || 'user', hashedPassword]);
        
        // Ghi log activity
        await logAdminActivity('CREATE_USER', `Created user: ${username}`);
        
        res.json({ 
            success: true, 
            message: 'User đã được tạo thành công' 
        });
        
    } catch (error) {
        console.error('❌ User create error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi khi tạo user' 
        });
    }
});

router.put('/users/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { username, full_name, role, is_active } = req.body;
        console.log(`✏️ Updating user ID: ${id}`);
        
        await db.run(`
            UPDATE users 
            SET username = ?, full_name = ?, role = ?, is_active = ?
            WHERE id = ?
        `, [username, full_name, role, is_active, id]);
        
        await logAdminActivity('UPDATE_USER', `Updated user ID: ${id}`);
        
        res.json({ 
            success: true, 
            message: 'User đã được cập nhật' 
        });
        
    } catch (error) {
        console.error('❌ User update error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi khi cập nhật user' 
        });
    }
});

router.delete('/users/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🗑️ Deleting user ID: ${id}`);
        
        await db.run('DELETE FROM users WHERE id = ?', [id]);
        
        await logAdminActivity('DELETE_USER', `Deleted user ID: ${id}`);
        
        res.json({ 
            success: true, 
            message: 'User đã được xóa' 
        });
        
    } catch (error) {
        console.error('❌ User delete error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi khi xóa user' 
        });
    }
});

// 🏷️ SCORING STANDARDS MANAGEMENT
router.get('/standards/all', adminAuth, async (req, res) => {
    try {
        console.log('🏷️ Fetching scoring standards...');
        
        const standards = await db.all(`
            SELECT * FROM scoring_standards_new 
            ORDER BY created_at DESC
        `);
        
        // Parse JSON data nếu cần
        const parsedStandards = standards.map(standard => ({
            ...standard,
            standards_data: typeof standard.standards_data === 'string' 
                ? JSON.parse(standard.standards_data)
                : standard.standards_data
        }));
        
        res.json({ 
            success: true, 
            standards: parsedStandards || [],
            total: parsedStandards.length
        });
        
    } catch (error) {
        console.error('❌ Standards fetch error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi khi lấy danh sách tiêu chuẩn: ' + error.message 
        });
    }
});

// Thêm các endpoints khác (POST, PUT, DELETE)...

router.get('/standards/:ma_hang', adminAuth, async (req, res) => {
    try {
        const { ma_hang } = req.params;
        console.log(`🔍 Fetching standard: ${ma_hang}`);
        
        const standard = await db.get(`
            SELECT * FROM scoring_standards_new 
            WHERE ma_hang = ?
        `, [ma_hang]);
        
        if (!standard) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy tiêu chuẩn với mã hàng: ' + ma_hang
            });
        }
        
        // Parse JSON data
        if (typeof standard.standards_data === 'string') {
            standard.standards_data = JSON.parse(standard.standards_data);
        }
        
        res.json({ 
            success: true, 
            standard: standard
        });
        
    } catch (error) {
        console.error('❌ Standard fetch error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi khi lấy thông tin tiêu chuẩn' 
        });
    }
});

router.post('/standards', adminAuth, async (req, res) => {
    try {
        const { ma_hang, standards_data, ap_dung_tu_ngay } = req.body;
        console.log(`➕ Creating new standard: ${ma_hang}`);
        
        // Validate input
        if (!ma_hang || !standards_data) {
            return res.status(400).json({
                success: false,
                error: 'Mã hàng và dữ liệu tiêu chuẩn là bắt buộc'
            });
        }
        
        // Kiểm tra mã hàng đã tồn tại chưa
        const existing = await db.get(
            'SELECT ma_hang FROM scoring_standards_new WHERE ma_hang = ?',
            [ma_hang]
        );
        
        if (existing) {
            return res.status(400).json({
                success: false,
                error: 'Mã hàng đã tồn tại: ' + ma_hang
            });
        }
        
        // Validate JSON data
        let parsedData;
        try {
            parsedData = typeof standards_data === 'string' 
                ? JSON.parse(standards_data)
                : standards_data;
        } catch (parseError) {
            return res.status(400).json({
                success: false,
                error: 'Dữ liệu tiêu chuẩn không đúng định dạng JSON: ' + parseError.message
            });
        }
        
        // Insert vào database
        await db.run(`
            INSERT INTO scoring_standards_new 
            (ma_hang, standards_data, ap_dung_tu_ngay, created_at, updated_at)
            VALUES (?, ?, ?, datetime('now'), datetime('now'))
        `, [ma_hang, JSON.stringify(parsedData), ap_dung_tu_ngay || '2025-01-01']);
        
        // Ghi log activity
        await logAdminActivity('CREATE_STANDARD', `Created standard: ${ma_hang}`);
        
        res.json({ 
            success: true, 
            message: 'Tiêu chuẩn đã được tạo thành công',
            ma_hang: ma_hang
        });
        
    } catch (error) {
        console.error('❌ Standard create error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi khi tạo tiêu chuẩn: ' + error.message 
        });
    }
});

router.put('/standards/:ma_hang', adminAuth, async (req, res) => {
    try {
        const { ma_hang } = req.params;
        const { standards_data, ap_dung_tu_ngay } = req.body;
        console.log(`✏️ Updating standard: ${ma_hang}`);
        
        // Validate input
        if (!standards_data) {
            return res.status(400).json({
                success: false,
                error: 'Dữ liệu tiêu chuẩn là bắt buộc'
            });
        }
        
        // Validate JSON data
        let parsedData;
        try {
            parsedData = typeof standards_data === 'string' 
                ? JSON.parse(standards_data)
                : standards_data;
        } catch (parseError) {
            return res.status(400).json({
                success: false,
                error: 'Dữ liệu tiêu chuẩn không đúng định dạng JSON: ' + parseError.message
            });
        }
        
        // Update database
        const result = await db.run(`
            UPDATE scoring_standards_new 
            SET standards_data = ?, ap_dung_tu_ngay = ?, updated_at = datetime('now')
            WHERE ma_hang = ?
        `, [JSON.stringify(parsedData), ap_dung_tu_ngay, ma_hang]);
        
        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy tiêu chuẩn với mã hàng: ' + ma_hang
            });
        }
        
        await logAdminActivity('UPDATE_STANDARD', `Updated standard: ${ma_hang}`);
        
        res.json({ 
            success: true, 
            message: 'Tiêu chuẩn đã được cập nhật thành công'
        });
        
    } catch (error) {
        console.error('❌ Standard update error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi khi cập nhật tiêu chuẩn: ' + error.message 
        });
    }
});

router.delete('/standards/:ma_hang', adminAuth, async (req, res) => {
    try {
        const { ma_hang } = req.params;
        console.log(`🗑️ Deleting standard: ${ma_hang}`);
        
        const result = await db.run(
            'DELETE FROM scoring_standards_new WHERE ma_hang = ?',
            [ma_hang]
        );
        
        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy tiêu chuẩn với mã hàng: ' + ma_hang
            });
        }
        
        await logAdminActivity('DELETE_STANDARD', `Deleted standard: ${ma_hang}`);
        
        res.json({ 
            success: true, 
            message: 'Tiêu chuẩn đã được xóa thành công'
        });
        
    } catch (error) {
        console.error('❌ Standard delete error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi khi xóa tiêu chuẩn: ' + error.message 
        });
    }
});

// 📥 IMPORT STANDARDS FROM JSON
router.post('/standards/import', adminAuth, async (req, res) => {
    try {
        const { standards } = req.body; // Array of standards
        console.log(`📥 Importing ${standards.length} standards...`);
        
        if (!Array.isArray(standards) || standards.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Dữ liệu import phải là mảng và không được rỗng'
            });
        }
        
        let importedCount = 0;
        let errors = [];
        
        for (const standard of standards) {
            try {
                const { ma_hang, standards_data, ap_dung_tu_ngay } = standard;
                
                if (!ma_hang || !standards_data) {
                    errors.push(`Thiếu mã hàng hoặc dữ liệu: ${ma_hang}`);
                    continue;
                }
                
                // Validate JSON
                const parsedData = typeof standards_data === 'string' 
                    ? JSON.parse(standards_data)
                    : standards_data;
                
                // Insert or update
                await db.run(`
                    INSERT OR REPLACE INTO scoring_standards_new 
                    (ma_hang, standards_data, ap_dung_tu_ngay, created_at, updated_at)
                    VALUES (?, ?, ?, COALESCE((SELECT created_at FROM scoring_standards_new WHERE ma_hang = ?), datetime('now')), datetime('now'))
                `, [ma_hang, JSON.stringify(parsedData), ap_dung_tu_ngay || '2025-01-01', ma_hang]);
                
                importedCount++;
                
            } catch (itemError) {
                errors.push(`Lỗi với ${standard.ma_hang}: ${itemError.message}`);
            }
        }
        
        await logAdminActivity('IMPORT_STANDARDS', `Imported ${importedCount} standards`);
        
        res.json({ 
            success: true, 
            imported: importedCount,
            total: standards.length,
            errors: errors.length > 0 ? errors : undefined,
            message: `Đã import thành công ${importedCount}/${standards.length} tiêu chuẩn`
        });
        
    } catch (error) {
        console.error('❌ Standards import error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi khi import tiêu chuẩn: ' + error.message 
        });
    }
});

// 🔍 SEARCH STANDARDS
router.get('/standards-search', adminAuth, async (req, res) => {
    try {
        const { q, category, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;
        
        console.log(`🔍 Searching standards: ${q}`);
        
        let whereConditions = [];
        let params = [];
        
        if (q) {
            whereConditions.push('(ma_hang LIKE ? OR standards_data LIKE ?)');
            params.push(`%${q}%`, `%${q}%`);
        }
        
        const whereClause = whereConditions.length > 0 
            ? 'WHERE ' + whereConditions.join(' AND ')
            : '';
        
        params.push(limit, offset);
        
        const standards = await db.all(`
            SELECT * FROM scoring_standards_new 
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, params);
        
        // Get total count
        const countResult = await db.get(`
            SELECT COUNT(*) as total FROM scoring_standards_new 
            ${whereClause}
        `, whereConditions.length > 0 ? params.slice(0, -2) : []);
        
        // Parse JSON data
        const parsedStandards = standards.map(standard => ({
            ...standard,
            standards_data: typeof standard.standards_data === 'string' 
                ? JSON.parse(standard.standards_data)
                : standard.standards_data
        }));
        
        res.json({ 
            success: true, 
            standards: parsedStandards,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult.total
            }
        });
        
    } catch (error) {
        console.error('❌ Standards search error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi khi tìm kiếm tiêu chuẩn' 
        });
    }
});

// 📥 IMPORT LOGS
router.get('/import-logs', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        
        console.log(`📥 Fetching import logs...`);
        
        const logs = await db.all(`
            SELECT 
                il.*,
                u.username as imported_by_user
            FROM import_logs il
            LEFT JOIN users u ON il.imported_by = u.id
            ORDER BY il.imported_at DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);
        
        res.json({ 
            success: true, 
            logs: logs || [] 
        });
        
    } catch (error) {
        console.error('❌ Import logs fetch error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi khi lấy lịch sử import' 
        });
    }
});

// 📤 EXPORT DATA
router.get('/export/:type', adminAuth, async (req, res) => {
    try {
        const { type } = req.params;
        console.log(`📤 Exporting data type: ${type}`);
        
        let query = '';
        let filename = '';
        
        switch (type) {
            case 'users':
                query = 'SELECT * FROM users';
                filename = 'users_export.csv';
                break;
            case 'courses':
                query = 'SELECT * FROM courses';
                filename = 'courses_export.csv';
                break;
            case 'students':
                query = 'SELECT * FROM students';
                filename = 'students_export.csv';
                break;
            case 'scores':
                query = 'SELECT * FROM scores';
                filename = 'scores_export.csv';
                break;
            default:
                return res.status(400).json({
                    success: false,
                    error: 'Invalid export type'
                });
        }
        
        const data = await db.all(query);
        
        // Convert to CSV
        const csv = convertToCSV(data);
        
        // Set headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        res.send(csv);
        
        // Log export activity
        await logAdminActivity('EXPORT_DATA', `Exported ${type}`);
        
    } catch (error) {
        console.error('❌ Export error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi khi export dữ liệu' 
        });
    }
});

// 🔧 HELPER FUNCTIONS
async function getAdminStats() {
    try {
        const queries = [
            db.get('SELECT COUNT(*) as count FROM users'),
            db.get('SELECT COUNT(*) as count FROM courses'),
            db.get('SELECT COUNT(*) as count FROM students'),
            db.get('SELECT COUNT(*) as count FROM import_logs'),
            db.get('SELECT COUNT(*) as count FROM tokens'),
            db.get('SELECT COUNT(*) as count FROM scores'),
            db.all(`SELECT * FROM admin_activity_logs ORDER BY created_at DESC LIMIT 10`)
        ];
        
        const [users, courses, students, imports, tokens, scores, activity] = await Promise.all(queries);
        
        return {
            userCount: users.count,
            courseCount: courses.count,
            studentCount: students.count,
            importCount: imports.count,
            tokenCount: tokens.count,
            scoreCount: scores.count,
            recentActivity: activity
        };
    } catch (error) {
        console.error('Error getting admin stats:', error);
        return {
            userCount: 0,
            courseCount: 0,
            studentCount: 0,
            importCount: 0,
            tokenCount: 0,
            scoreCount: 0,
            recentActivity: []
        };
    }
}

async function logAdminActivity(action, details) {
    try {
        await db.run(`
            INSERT INTO admin_activity_logs (action, details, created_at)
            VALUES (?, ?, datetime('now'))
        `, [action, details]);
    } catch (error) {
        console.error('Error logging admin activity:', error);
    }
}

function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header] || '';
            return `"${String(value).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
}

async function hashPassword(password) {
    // Implement password hashing (bcrypt recommended)
    const bcrypt = require('bcrypt');
    return await bcrypt.hash(password, 10);
}


module.exports = router;