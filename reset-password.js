// reset-password.js - Reset user passwords
import { dbRun, dbGet } from './database.js';
import bcrypt from 'bcryptjs';

async function resetPasswords() {
    console.log('🔄 Resetting user passwords...\n');
    
    try {
        // Password mới: admin123
        const newPassword = 'admin123';
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        console.log('🔑 New password:', newPassword);
        console.log('🔐 Hashed password:', hashedPassword);
        
        // Reset user admin
        await dbRun(
            `INSERT INTO users (username, password_hash, full_name, role) 
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (username) 
             DO UPDATE SET password_hash = $2, full_name = $3, role = $4`,
            ['admin', hashedPassword, 'Quản trị viên', 'admin']
        );
        
        // Reset user teacher
        await dbRun(
            `INSERT INTO users (username, password_hash, full_name, role) 
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (username) 
             DO UPDATE SET password_hash = $2, full_name = $3, role = $4`,
            ['teacher', hashedPassword, 'Giáo viên Demo', 'teacher']
        );
        
        // Tạo user test
        await dbRun(
            `INSERT INTO users (username, password_hash, full_name, role) 
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (username) DO NOTHING`,
            ['test', hashedPassword, 'Test User', 'admin']
        );
        
        console.log('\n✅ Passwords reset successfully!');
        console.log('📝 Login credentials:');
        console.log('   👤 admin / admin123');
        console.log('   👤 teacher / admin123'); 
        console.log('   👤 test / admin123');
        
        // Verify
        const users = await dbGet('SELECT COUNT(*) as count FROM users');
        console.log('\n📊 Total users:', users.count);
        
    } catch (error) {
        console.error('❌ Error resetting passwords:', error);
    }
}

resetPasswords();