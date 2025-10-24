import sqlite3 from 'sqlite3';

// Kết nối database
const db = new sqlite3.Database('./tokens.db');

// Tạo bảng
db.run(`
    CREATE TABLE IF NOT EXISTS tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token_type TEXT NOT NULL,
        token_value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// Hàm lưu token
const saveToken = (tokenType, tokenValue) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT id FROM tokens WHERE token_type = ?', [tokenType], (err, row) => {
            if (err) {
                reject(err);
                return;
            }

            if (row) {
                db.run(
                    'UPDATE tokens SET token_value = ?, updated_at = datetime("now") WHERE token_type = ?',
                    [tokenValue, tokenType],
                    function(err) {
                        if (err) reject(err);
                        else resolve({ action: 'updated' });
                    }
                );
            } else {
                db.run(
                    'INSERT INTO tokens (token_type, token_value) VALUES (?, ?)',
                    [tokenType, tokenValue],
                    function(err) {
                        if (err) reject(err);
                        else resolve({ action: 'inserted' });
                    }
                );
            }
        });
    });
};

// Hàm lấy tất cả tokens
export const getAllTokens = () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM tokens ORDER BY updated_at DESC', (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// Hàm lấy token theo type
export const getToken = (tokenType) => {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT token_value FROM tokens WHERE token_type = ? ORDER BY updated_at DESC LIMIT 1',
            [tokenType],
            (err, row) => {
                if (err) reject(err);
                else resolve(row ? row.token_value : null);
            }
        );
    });
};

// Hàm gọi API Jira
export const callJiraAPI = async (url, credentials) => {
    console.log(`\n🔐 [JIRA] Calling API...`);
    
    const requestBody = {
        email: credentials.username,
        password: credentials.password
    };

    console.log(`📤 [JIRA] Request body:`, JSON.stringify(requestBody, null, 2));

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    
    if (data.access_token) {
        await saveToken('jira', data.access_token);
        console.log(`💾 [JIRA] Token saved to DB`);
        return data.access_token;
    } else {
        throw new Error('No access_token in response');
    }
};

// Hàm gọi API LMS
export const callLmsAPI = async (url, credentials) => {
    console.log(`\n🔐 [LMS] Calling API...`);
    
    const requestBody = {
        user_id: credentials.username,
        password: credentials.password
    };

    console.log(`📤 [LMS] Request body:`, JSON.stringify(requestBody, null, 2));

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    
    if (data.access_token) {
        await saveToken('lms', data.access_token);
        console.log(`💾 [LMS] Token saved to DB`);
        return data.access_token;
    } else {
        throw new Error('No access_token in response');
    }
};