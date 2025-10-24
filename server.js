import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config, getApiUrl } from './config.js';

import { callJiraAPI, callLmsAPI, getAllTokens, getToken } from './getToken.js';
import { userLogin, checkAuth, userLogout, getAllUsers } from './auth.js';
import xlsx from 'xlsx';
import multer from 'multer';
import sqlite3 from 'sqlite3';

// ==================== INIT SETUP ====================
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();

// 🆕 SỬ DỤNG CONFIG THAY VÌ HARDCODE
const PORT = config.SERVER.PORT;
const HOST = config.SERVER.HOST;
const STATIC_IP = config.SERVER.STATIC_IP;

// ==================== MIDDLEWARE ====================
app.use(express.json());
app.use(express.static(__dirname));

// 🆕 CORS SỬ DỤNG CONFIG
app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    if (origin && config.CORS.ALLOWED_ORIGINS.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// ==================== MULTER CONFIG ====================
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: config.UPLOAD.MAX_FILE_SIZE // 🆕 SỬ DỤNG CONFIG
    }
});
// ==================== SCORES DATABASE ====================

// Kết nối database scores (dùng chung file tokens.db)
 const scoresDB = new sqlite3.Database(join(__dirname, config.DATABASE.PATH));

// Helper functions cho SQLite với Promise
function dbRun(query, params = []) {
    return new Promise((resolve, reject) => {
        scoresDB.run(query, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function dbAll(query, params = []) {
    return new Promise((resolve, reject) => {
        scoresDB.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function dbGet(query, params = []) {
    return new Promise((resolve, reject) => {
        scoresDB.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

// Tạo table student_scores
scoresDB.run(`
    CREATE TABLE IF NOT EXISTS student_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ma_dk TEXT UNIQUE NOT NULL,
        cabin_gio REAL DEFAULT 0,
        cabin_bai REAL DEFAULT 0,
        kt_lythuyet REAL DEFAULT 0,
        kt_mophong REAL DEFAULT 0,
        kt_thuchanh REAL DEFAULT 0,
        kt_hoanthanh TEXT DEFAULT '',
        imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        source_file TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`, (err) => {
    if (err) {
        console.error('❌ Lỗi tạo table student_scores:', err);
    } else {
        console.log('✅ Table student_scores ready');
    }
});

// Tạo table scoring_standards_new với cấu trúc mới
scoresDB.run(`
    CREATE TABLE IF NOT EXISTS scoring_standards_new (
        ma_hang TEXT PRIMARY KEY,
        standards_data TEXT NOT NULL,
        ap_dung_tu_ngay TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`, (err) => {
    if (err) {
        console.error('❌ Lỗi tạo table scoring_standards_new:', err);
    } else {
        console.log('✅ Table scoring_standards_new ready');
        initializeNewStandardsData();
    }
});

async function initializeNewStandardsData() {
    try {
        const existing = await dbGet('SELECT COUNT(*) as count FROM scoring_standards_new');
        
        if (existing.count === 0) {
            console.log('📊 Initializing new standards data...');
            
            const standardsData = [
                {
                    ma_hang: 'B.01',
                    standards_data: JSON.stringify({
                        ly_thuyet: {
                            phap_luat: { min: 70, required: true },
                            dao_duc: { min: 70, required: true },
                            cau_tao_oto: { min: 70, required: true },
                            ky_thuat_lai: { min: 70, required: true },
                            nang_hang: { min: 0, required: false },
                            mo_phong: { min: 70, required: true }
                        },
                        cabin: {
                            gio: { min: 2, required: true },
                            bai: { min: 8, required: true }
                        },
                        thuc_hanh: {
                            gio: { min: 12, required: true },
                            km: { min: 710, required: true },
                            dem: { min: 2, required: true },
                            tu_dong: { min: 2, required: true }
                        },
                        kiem_tra: {
                            ly_thuyet: { min: 30, required: true },
                            mo_phong: { min: 35, required: true },
                            thuc_hanh: { min: 5, required: true }
                        }
                    }),
                    ap_dung_tu_ngay: '2025-01-01'
                },
                {
                    ma_hang: 'B',
                    standards_data: JSON.stringify({
                        ly_thuyet: {
                            phap_luat: { min: 70, required: true },
                            dao_duc: { min: 70, required: true },
                            cau_tao_oto: { min: 70, required: true },
                            ky_thuat_lai: { min: 70, required: true },
                            nang_hang: { min: 0, required: false },
                            mo_phong: { min: 70, required: true }
                        },
                        cabin: {
                            gio: { min: 2, required: true },
                            bai: { min: 8, required: true }
                        },
                        thuc_hanh: {
                            gio: { min: 20, required: true },
                            km: { min: 810, required: true },
                            dem: { min: 2, required: true },
                            tu_dong: { min: 2, required: true }
                        },
                        kiem_tra: {
                            ly_thuyet: { min: 30, required: true },
                            mo_phong: { min: 35, required: true },
                            thuc_hanh: { min: 5, required: true }
                        }
                    }),
                    ap_dung_tu_ngay: '2025-01-01'
                },
                {
                    ma_hang: 'C1',
                    standards_data: JSON.stringify({
                        ly_thuyet: {
                            phap_luat: { min: 70, required: true },
                            dao_duc: { min: 70, required: true },
                            cau_tao_oto: { min: 70, required: true },
                            ky_thuat_lai: { min: 70, required: true },
                            nang_hang: { min: 0, required: false },
                            mo_phong: { min: 70, required: true }
                        },
                        cabin: {
                            gio: { min: 2, required: true },
                            bai: { min: 8, required: true }
                        },
                        thuc_hanh: {
                            gio: { min: 24, required: true },
                            km: { min: 825, required: true },
                            dem: { min: 1, required: true },
                            tu_dong: { min: 1, required: true }
                        },
                        kiem_tra: {
                            ly_thuyet: { min: 35, required: true },
                            mo_phong: { min: 35, required: true },
                            thuc_hanh: { min: 5, required: true }
                        }
                    }),
                    ap_dung_tu_ngay: '2025-01-01'
                },
                {
                    ma_hang: 'Cm-CE',
                    standards_data: JSON.stringify({
                        ly_thuyet: {
                            phap_luat: { min: 70, required: true },
                            dao_duc: { min: 70, required: true },
                            cau_tao_oto: { min: 0, required: false },
                            ky_thuat_lai: { min: 0, required: false },
                            nang_hang: { min: 70, required: true },
                            mo_phong: { min: 70, required: true }
                        },
                        cabin: {
                            gio: { min: 0, required: false },
                            bai: { min: 0, required: false }
                        },
                        thuc_hanh: {
                            gio: { min: 5, required: true },
                            km: { min: 210, required: true },
                            dem: { min: 1, required: true },
                            tu_dong: { min: 0, required: false }
                        },
                        kiem_tra: {
                            ly_thuyet: { min: 40, required: true },
                            mo_phong: { min: 35, required: true },
                            thuc_hanh: { min: 5, required: true }
                        }
                    }),
                    ap_dung_tu_ngay: '2025-01-01'
                }
            ];

            for (const standard of standardsData) {
                await dbRun(
                    `INSERT INTO scoring_standards_new (ma_hang, standards_data, ap_dung_tu_ngay)
                     VALUES (?, ?, ?)`,
                    [standard.ma_hang, standard.standards_data, standard.ap_dung_tu_ngay]
                );
            }

            console.log(`✅ Đã khởi tạo ${standardsData.length} hạng đào tạo`);
        }
    } catch (error) {
        console.error('❌ Lỗi khởi tạo standards mới:', error);
    }
}

// ==================== HELPER FUNCTIONS ====================

function normalizeText(text) {
    if (!text) return '';
    return text.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();
}

function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 0;
    
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
        if (longer.includes(shorter[i])) {
            matches++;
        }
    }
    
    return (matches / longer.length) * 100;
}

function findBestMatch(headers, patterns) {
    let bestMatch = null;
    let bestScore = 0;

    headers.forEach(header => {
        const normalizedHeader = normalizeText(header);
        
        patterns.forEach(pattern => {
            const normalizedPattern = normalizeText(pattern);
            let score = 0;
            
            if (normalizedHeader === normalizedPattern) {
                score = 100;
            } else if (normalizedHeader.includes(normalizedPattern)) {
                score = 80;
            } else if (normalizedPattern.includes(normalizedHeader)) {
                score = 60;
            } else {
                score = calculateSimilarity(normalizedHeader, normalizedPattern);
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestMatch = header;
            }
        });
    });

    return bestScore >= 30 ? bestMatch : null;
}

function findFlexibleHeaders(headers) {
    const mapping = {};
    
    const patterns = {
        ma_dk: [
            'mã học viên', 'ma hoc vien', 'madh', 'ma dk', 'code', 'id', 
            'mã', 'ma', 'học viên', 'student', 'mã đk', 'ma dk'
        ],
        cabin_gio: [
            'cabin_giờ', 'cabin gio', 'cabin hour', 'cabin', 'giờ cabin',
            'cabin giờ', 'cabin h', 'cabin_gio', 'cabin giơ', 'cabin time'
        ],
        cabin_bai: [
            'cabin_bài', 'cabin bai', 'cabin lesson', 'bài cabin', 
            'cabin bài', 'cabin l', 'cabin_bai', 'cabin baì', 'cabin lessons'
        ],
        kt_lythuyet: [
            'kt_lythuyet', 'kt ly thuyet', 'lý thuyết', 'theory', 'lt',
            'kiểm tra lý thuyết', 'kiem tra ly thuyet', 'kết quả lý thuyết',
            'ly thuyet', 'lth', 'kt lt', 'điểm lý thuyết'
        ],
        kt_mophong: [
            'kt_mophong', 'kt mo phong', 'mô phỏng', 'simulation', 'mp',
            'kiểm tra mô phỏng', 'kiem tra mo phong', 'kết quả mô phỏng', 
            'mo phong', 'mph', 'kt mp', 'điểm mô phỏng'
        ],
        kt_thuchanh: [
            'kt_thuchanh', 'kt thuc hanh', 'thực hành', 'practice', 'th',
            'kiểm tra thực hành', 'kiem tra thuc hanh', 'kết quả thực hành',
            'thuc hanh', 'thh', 'kt th', 'điểm thực hành'
        ],
        kt_hoanthanh: [
            'kt_hoanthanh', 'hoàn thành', 'completed', 'ht',
            'kết thúc', 'ket thuc', 'trạng thái', 'status',
            'tình trạng', 'tinh trang', 'hoàn tất', 'hoan tat'
        ]
    };

    Object.keys(patterns).forEach(key => {
        mapping[key] = findBestMatch(headers, patterns[key]);
    });

    return mapping;
}

function getFlexibleValue(row, header) {
    if (!header) return null;
    return row[header] !== undefined ? row[header] : null;
}

function parseNumber(value) {
    if (value === null || value === undefined || value === '') return 0;
    
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        // 🎯 XỬ LÝ ĐẶC BIỆT CHO ĐỊNH DẠNG THỜI GIAN: "02h03p" → 2.05 giờ
        if (value.includes('h') || value.includes('p')) {
            return parseTimeFormat(value);
        }
        
        // Xử lý số thông thường
        const cleanValue = value.replace(/[^\d.,]/g, '').replace(',', '.');
        const num = parseFloat(cleanValue);
        return isNaN(num) ? 0 : num;
    }
    return 0;
}

// 🎯 HÀM MỚI: XỬ LÝ ĐỊNH DẠNG THỜI GIAN "02h03p"
function parseTimeFormat(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    
    console.log(`⏰ Parsing time format: "${timeStr}"`);
    
    try {
        // Chuẩn hóa: loại bỏ khoảng trắng, chuyển thành chữ thường
        const normalized = timeStr.toLowerCase().replace(/\s/g, '');
        
        // Tách giờ và phút
        let hours = 0;
        let minutes = 0;
        
        // Pattern: "02h03p" hoặc "2h3p" hoặc "02h" hoặc "30p"
        const hourMatch = normalized.match(/(\d+)h/);
        const minuteMatch = normalized.match(/(\d+)p/);
        
        if (hourMatch) {
            hours = parseInt(hourMatch[1]) || 0;
        }
        
        if (minuteMatch) {
            minutes = parseInt(minuteMatch[1]) || 0;
        }
        
        // Chuyển phút sang giờ (phút / 60)
        const totalHours = hours + (minutes / 60);
        
        console.log(`⏰ Time parsed: ${hours}h ${minutes}p = ${totalHours.toFixed(2)} hours`);
        
        return parseFloat(totalHours.toFixed(2));
        
    } catch (error) {
        console.error(`❌ Error parsing time format "${timeStr}":`, error);
        return 0;
    }
}

function logMappingStats(headerMapping, scoresData) {
    const mappedColumns = Object.values(headerMapping).filter(Boolean).length;
    const totalColumns = Object.keys(headerMapping).length;
    
    console.log(`📊 Mapping stats: ${mappedColumns}/${totalColumns} columns matched`);
    
    Object.entries(headerMapping).forEach(([key, value]) => {
        const status = value ? '✅' : '❌';
        console.log(`${status} ${key}: ${value || 'Không tìm thấy'}`);
    });

    const dataStats = {
        total: scoresData.length,
        with_ma_dk: scoresData.filter(s => s.ma_dk && s.ma_dk !== 'HV').length,
        with_cabin_data: scoresData.filter(s => s.cabin_gio > 0 || s.cabin_bai > 0).length,
        with_kt_data: scoresData.filter(s => s.kt_lythuyet > 0 || s.kt_mophong > 0 || s.kt_thuchanh > 0).length,
        with_completion: scoresData.filter(s => s.kt_hoanthanh).length
    };
    
    console.log('📈 Data statistics:', dataStats);
    return { mapped_columns: mappedColumns, total_columns: totalColumns, data_stats: dataStats };
}

// ==================== EXCEL PARSING FUNCTIONS ====================

function parseExcelWithHeaders(excelBuffer) {
    const workbook = xlsx.read(excelBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    console.log(`📊 Total rows in Excel: ${rawData.length}`);
    
    // LOẠI BỎ 4 ROWS ĐẦU TIÊN
    const dataWithoutHeader = rawData.slice(4);
    console.log(`📈 After removing 4 header rows: ${dataWithoutHeader.length} rows`);
    
    const headerRow = dataWithoutHeader[0];
    const dataRows = dataWithoutHeader.slice(1);
    
    // Tạo mapping từ headers
    const headerMapping = {};
    headerRow.forEach((header, index) => {
        if (header && header !== '__EMPTY') {
            headerMapping[index] = header;
        }
    });
    
    // Convert sang JSON
    const jsonData = dataRows.map((row) => {
        const obj = {};
        Object.keys(headerMapping).forEach(colIndex => {
            const header = headerMapping[colIndex];
            const value = row[colIndex];
            if (value !== undefined && value !== null && value !== '') {
                obj[header] = value;
            }
        });
        return obj;
    }).filter(row => row['Mã học viên'] && row['Họ tên']);
    
    console.log(`✅ Final parsed data: ${jsonData.length} valid students`);
    return jsonData;
}

function transformExcelData(excelData) {
    return excelData.map((student, index) => {
        const getValue = (columnName) => {
            return student[columnName] || '';
        };

        return {
            so_tt: student['STT'] || index + 1,
            ma_dk: student['Mã học viên'] || `HV${String(index + 1).padStart(3, '0')}`,
            ho_va_ten: student['Họ tên'] || '',
            
            // GIỮ NGUYÊN GIÁ TRỊ TỪ EXCEL
            phap_luat: getValue('Pháp luật giao thông đường bộ'),
            dao_duc: getValue('Đạo đức người lái xe'),
            cau_tao_oto: getValue('Cấu tạo và sửa chữa'),
            ky_thuat_lai: getValue('Kỹ thuật lái xe'),
            nang_hang: getValue('Nâng hạng'),
            mo_phong: getValue('Mô phỏng'),
            
            ket_qua: getValue('Kết quả') || ''
        };
    }).filter(student => student.ma_dk && student.ma_dk !== '');
}

function parseScoresExcel(excelBuffer) {
    try {
        console.log('📊 Parsing scores Excel file...');
        const workbook = xlsx.read(excelBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Đọc dữ liệu với header
        const jsonData = xlsx.utils.sheet_to_json(worksheet);
        console.log(`📈 Parsed data: ${jsonData.length} rows`);
        
        if (jsonData.length === 0) {
            throw new Error('File Excel không có dữ liệu');
        }

        const headers = Object.keys(jsonData[0]);
        console.log('🎯 Headers found:', headers);
        
        // DEBUG: Hiển thị 3 dòng đầu
        console.log('📋 First 3 rows data:');
        for (let i = 0; i < Math.min(3, jsonData.length); i++) {
            console.log(`Row ${i}:`, jsonData[i]);
        }

        const scoresData = jsonData.map((row, index) => {
            // 🎯 MAPPING CHÍNH XÁC THEO FILE EXCEL CỦA BẠN
            const record = {
                // Mã học viên - cột B
                ma_dk: row['Mã học viên'] || row['mã học viên'] || `HV${index + 1}`,
                
                // Giờ cabin - cột D
                cabin_gio: parseNumber(row['Giờ cabin'] || row['giờ cabin'] || 0),
                
                // Số bài cabin - cột E  
                cabin_bai: parseNumber(row['Số bài cabin'] || row['số bài cabin'] || 0),
                
                // Điểm KTLT - cột F
                kt_lythuyet: parseNumber(row['Điểm KTLT'] || row['điểm KTLT'] || 0),
                
                // Điểm KTMP - cột G
                kt_mophong: parseNumber(row['Điểm KTMP'] || row['điểm KTMP'] || 0),
                
                // Điểm KTTH - cột H
                kt_thuchanh: parseNumber(row['Điểm KTTH'] || row['điểm KTTH'] || 0),
                
                // Ngày xét HTKH - cột I
                kt_hoanthanh: row['Ngày xét HTKH'] || row['ngày xét HTKH'] || '',
                
                source_file: 'imported_file.xlsx'
            };

            // Chuẩn hóa mã đk
            if (record.ma_dk) {
                record.ma_dk = record.ma_dk.toString().trim();
                // Loại bỏ khoảng trắng thừa
                record.ma_dk = record.ma_dk.replace(/\s+/g, '');
            }

            // DEBUG: Log 3 dòng đầu để kiểm tra
            if (index < 3) {
                console.log(`🔍 Record ${index}:`, record);
            }
            
            return record;
        });

        console.log(`✅ Parsed ${scoresData.length} scores records`);
        
        // Thống kê chi tiết
        const stats = {
            total: scoresData.length,
            has_ma_dk: scoresData.filter(s => s.ma_dk && s.ma_dk !== 'HV').length,
            has_cabin_gio: scoresData.filter(s => s.cabin_gio > 0).length,
            has_cabin_bai: scoresData.filter(s => s.cabin_bai > 0).length,
            has_kt_lythuyet: scoresData.filter(s => s.kt_lythuyet > 0).length,
            has_kt_mophong: scoresData.filter(s => s.kt_mophong > 0).length,
            has_kt_thuchanh: scoresData.filter(s => s.kt_thuchanh > 0).length,
            has_kt_hoanthanh: scoresData.filter(s => s.kt_hoanthanh).length
        };
        
        console.log('📊 Import statistics:', stats);
        
        // Log mapping thực tế
        const mappingStats = {
            mapped_columns: 6, // cabin_gio, cabin_bai, kt_lythuyet, kt_mophong, kt_thuchanh, kt_hoanthanh
            total_columns: 6,
            data_stats: stats,
            mapping_details: {
                'Mã học viên': 'ma_dk',
                'Giờ cabin': 'cabin_gio', 
                'Số bài cabin': 'cabin_bai',
                'Điểm KTLT': 'kt_lythuyet',
                'Điểm KTMP': 'kt_mophong',
                'Điểm KTTH': 'kt_thuchanh',
                'Ngày xét HTKH': 'kt_hoanthanh'
            }
        };
        
        return {
            scoresData,
            mappingStats
        };
        
    } catch (error) {
        console.error('❌ Excel parsing failed:', error);
        throw new Error('Lỗi parse file Excel: ' + error.message);
    }
}

// ==================== JIRA API FUNCTIONS ====================

// Hàm fetch students từ JIRA (tự động qua tất cả pages)
async function fetchStudentsFromJira(courseId, token, page = 1, allStudents = []) {
    try {
        console.log(`📥 Fetching students page ${page} for course ${courseId}...`);
        const apiUrl = getApiUrl('jira', config.API.JIRA.ENDPOINTS.TRAINEES);
        const response = await fetch(`${apiUrl}?course_id=${courseId}&page=${page}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`JIRA API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`📊 Page ${page}: ${data.items?.length || 0} students`);

        // Thêm students vào mảng
        if (data.items && data.items.length > 0) {
            // Transform data để phù hợp với table
            const transformedStudents = data.items.map((student, index) => ({
                so_tt: allStudents.length + index + 1,
                ma_dk: student.ma_dk || `HV${allStudents.length + index + 1}`,
                ho_va_ten: student.ho_va_ten || 'N/A',
                outdoor_hour: student.outdoor_hour || 0,
                outdoor_distance: student.outdoor_distance || 0,
                night_duration: student.night_duration || 0,
                auto_duration: student.auto_duration || 0,
                // Giữ nguyên data gốc để debug
                raw_data: student
            }));
            
            allStudents.push(...transformedStudents);
        }

        // Kiểm tra nếu còn page tiếp theo
        if (data.items && data.items.length > 0) {
            // Fetch page tiếp theo
            return await fetchStudentsFromJira(courseId, token, page + 1, allStudents);
        } else {
            console.log(`✅ Completed! Total students: ${allStudents.length}`);
            return allStudents;
        }

    } catch (error) {
        console.error(`❌ Error fetching students page ${page}:`, error.message);
        throw error;
    }
}

// ==================== ROUTES ====================

// Auth routes
app.post('/api/auth/login', async (req, res) => {
    console.log('🔐 [SERVER] Received login request');
    
    try {
        const { username, password, apiUrl1, apiUrl2 } = req.body;

        const [jiraToken, lmsToken] = await Promise.all([
            callJiraAPI(apiUrl1, { username, password }),
            callLmsAPI(apiUrl2, { username, password })
        ]);

        res.json({
            success: true,
            message: 'Đăng nhập thành công!',
            tokens: { jira: jiraToken, lms: lmsToken }
        });

    } catch (error) {
        console.error('❌ Login failed:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/auth/all-tokens', async (req, res) => {
    try {
        const tokens = await getAllTokens();
        console.log(`📊 Found ${tokens.length} tokens in database`);
        res.json({ tokens: tokens, count: tokens.length });
    } catch (error) {
        console.error('❌ Database error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/user-login', userLogin);
app.get('/api/auth/check', checkAuth);
app.post('/api/auth/logout', userLogout);
app.get('/api/auth/users', getAllUsers);

// SIMPLE COURSES API (tạm thời)
app.get('/api/courses/fetch', async (req, res) => {
    try {
        const token = await getToken('jira');
        if (!token) {
            throw new Error('Chưa có JIRA token. Hãy lấy token trước.');
        }

        // 🎯 SỬA: SỬ DỤNG CONFIG URL
        const apiUrl = getApiUrl('jira', config.API.JIRA.ENDPOINTS.COURSES);
        const response = await fetch(`${apiUrl}?&page=1`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        res.json({
            success: true,
            message: 'Đã fetch courses (test page 1)',
            data: {
                courses: data.items || [],
                total: data.items?.length || 0
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/courses', async (req, res) => {
    res.json({
        success: true,
        message: 'API get courses - ready for implementation',
        courses: []
    });
});

// Đồng bộ hóa API students từ JIRA
app.get('/api/students/:courseId', async (req, res) => {
    const courseId = req.params.courseId;
    console.log(`👨‍🎓 [SERVER] Fetching students for course: ${courseId}`);
    
    try {
        const token = await getToken('jira');
        if (!token) {
            throw new Error('Chưa có JIRA token. Hãy lấy token trước.');
        }

        const allStudents = await fetchStudentsFromJira(courseId, token);
        
        res.json({
            success: true,
            message: `Đã lấy ${allStudents.length} học viên từ khóa học`,
            students: allStudents,
            total: allStudents.length
        });

    } catch (error) {
        console.error('❌ Fetch students failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==================== LMS EXCEL API ====================

app.get('/api/lms-excel/:courseId', async (req, res) => {
    const courseId = req.params.courseId;
    console.log(`📥 [SERVER] Downloading Excel for course: ${courseId}`);
    
    try {
        const lmsToken = await getToken('lms');
        if (!lmsToken) {
            throw new Error('Chưa có LMS token. Hãy lấy token trước.');
        }

        const excelUrl = getApiUrl('lms', config.API.LMS.ENDPOINTS.COURSE_REPORT, { courseId }) + `?template_id=3&token=${lmsToken}`;
        console.log(`🌐 [SERVER] Downloading Excel from: ${excelUrl}`);
        
        const response = await fetch(excelUrl);
        
        if (!response.ok) {
            throw new Error(`LMS API error: ${response.status} ${response.statusText}`);
        }

        // Get Excel file
        const arrayBuffer = await response.arrayBuffer();
        const excelBuffer = Buffer.from(arrayBuffer);
        console.log(`📊 [SERVER] Excel downloaded: ${excelBuffer.length} bytes`);

        // Parse Excel
        const jsonData = parseExcelWithHeaders(excelBuffer);
        
        // Transform data
        const transformedData = transformExcelData(jsonData);
        
        res.json({
            success: true,
            message: `Đã parse ${transformedData.length} học viên từ Excel LMS`,
            students: transformedData,
            total: transformedData.length,
            source: 'lms_excel'
        });

    } catch (error) {
        console.error('❌ [SERVER] Excel download/parse failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==================== SCORES API ====================

// API import scores - ĐÃ SỬA LỖI
app.post('/api/scores/import', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            throw new Error('Không có file được upload');
        }
        
        console.log('📤 Received scores file upload:', req.file.originalname);
        const excelBuffer = req.file.buffer;
        
        // Parse Excel với fixed mapping
        const { scoresData, mappingStats } = parseScoresExcel(excelBuffer);
        
        console.log(`📊 Filtering data from ${scoresData.length} records...`);
        
        // Lọc bỏ records trống hoặc không có mã học viên hợp lệ
        const filteredData = scoresData.filter(score => {
            const hasValidId = score.ma_dk && score.ma_dk !== 'HV' && !score.ma_dk.startsWith('HV0');
            const hasData = score.cabin_gio > 0 || score.cabin_bai > 0 ||
                          score.kt_lythuyet > 0 || score.kt_mophong > 0 ||
                          score.kt_thuchanh > 0 || score.kt_hoanthanh;
            
            return hasValidId && hasData;
        });
        
        console.log(`✅ After filtering: ${filteredData.length} valid records`);
        
        let result = { processed: 0, inserted: 0, updated: 0, errors: [] };
        
        // Lưu vào database
        if (filteredData.length > 0) {
            for (const score of filteredData) {
                try {
                    const upsertResult = await dbRun(
                        `INSERT INTO student_scores (ma_dk, cabin_gio, cabin_bai, kt_lythuyet, kt_mophong, kt_thuchanh, kt_hoanthanh, source_file, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                         ON CONFLICT(ma_dk) DO UPDATE SET
                         cabin_gio = excluded.cabin_gio,
                         cabin_bai = excluded.cabin_bai,
                         kt_lythuyet = excluded.kt_lythuyet,
                         kt_mophong = excluded.kt_mophong,
                         kt_thuchanh = excluded.kt_thuchanh,
                         kt_hoanthanh = excluded.kt_hoanthanh,
                         source_file = excluded.source_file,
                         updated_at = datetime('now')`,
                        [score.ma_dk, score.cabin_gio, score.cabin_bai, score.kt_lythuyet, score.kt_mophong, score.kt_thuchanh, score.kt_hoanthanh, req.file.originalname]
                    );
                    
                    if (upsertResult.changes > 0) {
                        result.processed++;
                        if (upsertResult.lastID) {
                            result.inserted++;
                        } else {
                            result.updated++;
                        }
                    }
                    
                } catch (dbError) {
                    console.error(`❌ Database error for ${score.ma_dk}:`, dbError);
                    result.errors.push(`${score.ma_dk}: ${dbError.message}`);
                }
            }
        }
        
        res.json({
            success: true,
            message: `Đã xử lý ${result.processed} học viên có dữ liệu`,
            stats: {
                total: scoresData.length,
                filtered: filteredData.length,
                processed: result.processed,
                inserted: result.inserted,
                updated: result.updated,
                errors: result.errors.length
            },
            mapping_stats: mappingStats  // 🎯 ĐÃ SỬA: mappingStats → mapping_stats
        });
        
    } catch (error) {
        console.error('❌ Import scores failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API get scores by ma_dk list
app.post('/api/scores/bulk', async (req, res) => {
    try {
        const { ma_dk_list } = req.body;
        
        if (!ma_dk_list || !Array.isArray(ma_dk_list) || ma_dk_list.length === 0) {
            return res.json({ success: true, scores: {} });
        }
        
        // Tạo placeholders cho query
        const placeholders = ma_dk_list.map(() => '?').join(',');
        const scores = await dbAll(
            `SELECT ma_dk, cabin_gio, cabin_bai, kt_lythuyet, kt_mophong, kt_thuchanh, kt_hoanthanh 
             FROM student_scores 
             WHERE ma_dk IN (${placeholders})`,
            ma_dk_list
        );
        
        // Convert to map
        const scoresMap = {};
        scores.forEach(score => {
            scoresMap[score.ma_dk] = score;
        });
        
        console.log(`✅ Returning scores for ${Object.keys(scoresMap).length} students`);
        res.json({ success: true, scores: scoresMap });
        
    } catch (error) {
        console.error('❌ Get scores failed:', error);
        res.json({ success: false, scores: {} });
    }
});

// ==================== NEW STANDARDS API ====================

// API get standards by ma_hang (cấu trúc mới)
app.get('/api/standards-new/:maHang', async (req, res) => {
    try {
        const { maHang } = req.params;
        
        const standard = await dbGet(
            `SELECT standards_data FROM scoring_standards_new WHERE ma_hang = ?`,
            [maHang]
        );
        
        if (standard) {
            res.json({
                success: true,
                ma_hang: maHang,
                standards: JSON.parse(standard.standards_data)
            });
        } else {
            res.json({
                success: false,
                error: `Không tìm thấy tiêu chuẩn cho hạng ${maHang}`
            });
        }
        
    } catch (error) {
        console.error('❌ Get standards failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==================== USER MANAGEMENT API ====================

// API tạo user mới
app.post('/api/admin/users', async (req, res) => {
    try {
        const { username, password, full_name, role } = req.body;
        
        console.log(`👥 [ADMIN] Creating new user: ${username}`);
        
        if (!username || !password) {
            return res.json({
                success: false,
                error: 'Username và password là bắt buộc'
            });
        }

        // Hash password
        const bcrypt = await import('bcryptjs');
        const hash = await bcrypt.default.hash(password, 10);
        
        await dbRun(
            'INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
            [username, hash, full_name || '', role || 'viewer']
        );
        
        console.log(`✅ [ADMIN] User created: ${username}`);
        res.json({
            success: true,
            message: 'Đã tạo user thành công'
        });
        
    } catch (error) {
        console.error('❌ [ADMIN] Create user error:', error);
        res.json({
            success: false,
            error: error.message.includes('UNIQUE') ? 'Username đã tồn tại' : 'Lỗi tạo user'
        });
    }
});

// API xóa user
app.delete('/api/admin/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        
        console.log(`👥 [ADMIN] Deleting user ID: ${userId}`);
        
        // Không cho xóa chính mình
        // if (userId === req.user.id) {
        //     return res.json({
        //         success: false,
        //         error: 'Không thể xóa chính mình'
        //     });
        // }
        
        const result = await dbRun('DELETE FROM users WHERE id = ?', [userId]);
        
        if (result.changes === 0) {
            return res.json({
                success: false,
                error: 'User không tồn tại'
            });
        }
        
        console.log(`✅ [ADMIN] User deleted: ${userId}`);
        res.json({
            success: true,
            message: 'Đã xóa user thành công'
        });
        
    } catch (error) {
        console.error('❌ [ADMIN] Delete user error:', error);
        res.json({
            success: false,
            error: 'Lỗi xóa user'
        });
    }
});

// API cập nhật role user
app.put('/api/admin/users/:id/role', async (req, res) => {
    try {
        const userId = req.params.id;
        const { role } = req.body;
        
        console.log(`👥 [ADMIN] Updating user role: ${userId} -> ${role}`);
        
        const validRoles = ['admin', 'teacher', 'viewer'];
        if (!validRoles.includes(role)) {
            return res.json({
                success: false,
                error: 'Role không hợp lệ'
            });
        }
        
        const result = await dbRun(
            'UPDATE users SET role = ? WHERE id = ?',
            [role, userId]
        );
        
        if (result.changes === 0) {
            return res.json({
                success: false,
                error: 'User không tồn tại'
            });
        }
        
        console.log(`✅ [ADMIN] User role updated: ${userId}`);
        res.json({
            success: true,
            message: 'Đã cập nhật role thành công'
        });
        
    } catch (error) {
        console.error('❌ [ADMIN] Update role error:', error);
        res.json({
            success: false,
            error: 'Lỗi cập nhật role'
        });
    }
});

// API get standards by ma_hang (cấu trúc mới)
app.get('/api/standards-new/:maHang', async (req, res) => {
    try {
        const { maHang } = req.params;
        
        const standard = await dbGet(
            `SELECT standards_data FROM scoring_standards_new WHERE ma_hang = ?`,
            [maHang]
        );
        
        if (standard) {
            res.json({
                success: true,
                ma_hang: maHang,
                standards: JSON.parse(standard.standards_data)
            });
        } else {
            res.json({
                success: false,
                error: `Không tìm thấy tiêu chuẩn cho hạng ${maHang}`
            });
        }
        
    } catch (error) {
        console.error('❌ Get standards failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 🎯 THÊM API ĐƠN GIẢN ĐỂ TRÍCH XUẤT TOÀN BỘ TIÊU CHUẨN
app.get('/api/admin/standards/all', async (req, res) => {
    try {
        console.log('🔍 Getting all standards from scoring_standards_new...');
        
        // Lấy toàn bộ dữ liệu từ table
        const standards = await dbAll(
            `SELECT ma_hang, standards_data, ap_dung_tu_ngay, created_at, updated_at 
             FROM scoring_standards_new 
             ORDER BY ma_hang ASC`
        );
        
        console.log(`✅ Found ${standards.length} standards`);
        
        // Parse JSON data
        const parsedStandards = standards.map(item => {
            try {
                return {
                    ma_hang: item.ma_hang,
                    standards_data: typeof item.standards_data === 'string' 
                        ? JSON.parse(item.standards_data) 
                        : item.standards_data,
                    ap_dung_tu_ngay: item.ap_dung_tu_ngay,
                    created_at: item.created_at,
                    updated_at: item.updated_at
                };
            } catch (parseError) {
                console.error(`❌ Error parsing standards_data for ${item.ma_hang}:`, parseError);
                return {
                    ma_hang: item.ma_hang,
                    standards_data: {},
                    ap_dung_tu_ngay: item.ap_dung_tu_ngay,
                    created_at: item.created_at,
                    updated_at: item.updated_at,
                    parse_error: true
                };
            }
        });
        
        // 🎯 SỬA LỖI: Đổi "data" thành "standards" để match với frontend
        res.json({
            success: true,
            standards: parsedStandards, // ← SỬA Ở ĐÂY: data → standards
            count: standards.length
        });
        
    } catch (error) {
        console.error('❌ Get all standards failed:', error);
        res.json({
            success: false,
            error: error.message,
            standards: [] // ← Cũng sửa ở đây
        });
    }
});

// GET - Lấy tiêu chuẩn theo mã hạng
app.get('/api/admin/standards/:maHang', async (req, res) => {
    try {
        const { maHang } = req.params;
        
        const standard = await dbGet(
            `SELECT * FROM scoring_standards_new WHERE ma_hang = ?`,
            [maHang]
        );
        
        if (standard) {
            res.json({
                success: true,
                data: {
                    ...standard,
                    standards_data: JSON.parse(standard.standards_data)
                }
            });
        } else {
            res.json({
                success: false,
                error: `Không tìm thấy tiêu chuẩn cho hạng ${maHang}`
            });
        }
        
    } catch (error) {
        console.error('❌ Get standard failed:', error);
        res.json({
            success: false,
            error: error.message
        });
    }
});

// POST - Tạo tiêu chuẩn mới
app.post('/api/admin/standards', async (req, res) => {
    try {
        const { ma_hang, standards_data, ap_dung_tu_ngay } = req.body;
        
        if (!ma_hang || !standards_data) {
            return res.json({
                success: false,
                error: 'Thiếu mã hạng hoặc dữ liệu tiêu chuẩn'
            });
        }
        
        // Validate JSON structure
        const validatedData = validateStandardsData(standards_data);
        
        await dbRun(
            `INSERT INTO scoring_standards_new (ma_hang, standards_data, ap_dung_tu_ngay) 
             VALUES (?, ?, ?)`,
            [ma_hang, JSON.stringify(validatedData), ap_dung_tu_ngay || '2025-01-01']
        );
        
        res.json({
            success: true,
            message: `Đã tạo tiêu chuẩn cho hạng ${ma_hang}`
        });
        
    } catch (error) {
        console.error('❌ Create standard failed:', error);
        res.json({
            success: false,
            error: error.message.includes('UNIQUE') ? 'Mã hạng đã tồn tại' : 'Lỗi tạo tiêu chuẩn'
        });
    }
});

// PUT - Cập nhật tiêu chuẩn
app.put('/api/admin/standards/:maHang', async (req, res) => {
    try {
        const { maHang } = req.params;
        const { standards_data, ap_dung_tu_ngay } = req.body;
        
        if (!standards_data) {
            return res.json({
                success: false,
                error: 'Thiếu dữ liệu tiêu chuẩn'
            });
        }
        
        // Validate JSON structure
        const validatedData = validateStandardsData(standards_data);
        
        const result = await dbRun(
            `UPDATE scoring_standards_new 
             SET standards_data = ?, ap_dung_tu_ngay = ?, updated_at = datetime('now')
             WHERE ma_hang = ?`,
            [JSON.stringify(validatedData), ap_dung_tu_ngay, maHang]
        );
        
        if (result.changes === 0) {
            return res.json({
                success: false,
                error: 'Không tìm thấy tiêu chuẩn để cập nhật'
            });
        }
        
        res.json({
            success: true,
            message: `Đã cập nhật tiêu chuẩn cho hạng ${maHang}`
        });
        
    } catch (error) {
        console.error('❌ Update standard failed:', error);
        res.json({
            success: false,
            error: 'Lỗi cập nhật tiêu chuẩn'
        });
    }
});

// DELETE - Xóa tiêu chuẩn
app.delete('/api/admin/standards/:maHang', async (req, res) => {
    try {
        const { maHang } = req.params;
        
        const result = await dbRun(
            `DELETE FROM scoring_standards_new WHERE ma_hang = ?`,
            [maHang]
        );
        
        if (result.changes === 0) {
            return res.json({
                success: false,
                error: 'Không tìm thấy tiêu chuẩn để xóa'
            });
        }
        
        res.json({
            success: true,
            message: `Đã xóa tiêu chuẩn hạng ${maHang}`
        });
        
    } catch (error) {
        console.error('❌ Delete standard failed:', error);
        res.json({
            success: false,
            error: 'Lỗi xóa tiêu chuẩn'
        });
    }
});

// Hàm validate dữ liệu tiêu chuẩn
function validateStandardsData(data) {
    const defaultStructure = {
        ly_thuyet: {
            phap_luat: { min: 0, required: false },
            dao_duc: { min: 0, required: false },
            cau_tao_oto: { min: 0, required: false },
            ky_thuat_lai: { min: 0, required: false },
            nang_hang: { min: 0, required: false },
            mo_phong: { min: 0, required: false }
        },
        cabin: {
            gio: { min: 0, required: false },
            bai: { min: 0, required: false }
        },
        thuc_hanh: {
            gio: { min: 0, required: false },
            km: { min: 0, required: false },
            dem: { min: 0, required: false },
            tu_dong: { min: 0, required: false }
        },
        kiem_tra: {
            ly_thuyet: { min: 0, required: false },
            mo_phong: { min: 0, required: false },
            thuc_hanh: { min: 0, required: false }
        }
    };
    
    // Merge với dữ liệu mặc định
    return deepMerge(defaultStructure, data);
}

// Hàm merge object sâu
function deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = deepMerge(result[key] || {}, source[key]);
        } else {
            result[key] = source[key];
        }
    }
    
    return result;
}

// API test đơn giản
app.get('/api/admin/standards/test', async (req, res) => {
    try {
        const count = await dbGet('SELECT COUNT(*) as total FROM scoring_standards_new');
        const sample = await dbAll('SELECT ma_hang FROM scoring_standards_new LIMIT 3');
        
        res.json({
            success: true,
            message: 'Kết nối scoring_standards_new thành công!',
            total_standards: count.total,
            available_ma_hang: sample.map(s => s.ma_hang)
        });
        
    } catch (error) {
        res.json({
            success: false,
            error: error.message
        });
    }
});
// ==================== ADMIN AUTH MIDDLEWARE ====================

// Middleware kiểm tra admin session
const checkAdminAuth = (req, res, next) => {
    // Ở đây bạn có thể kiểm tra session, token, hoặc cookie
    // Tạm thời cho phép truy cập nếu đã login
    console.log('🔐 [ADMIN] Checking admin authentication...');
    next();
};

// API kiểm tra admin authentication
app.get('/api/admin/check-auth', async (req, res) => {
    try {
        // Kiểm tra xem user có tồn tại và có role admin không
        // Tạm thời trả về true nếu đã login
        res.json({
            authenticated: true,
            isAdmin: true
        });
    } catch (error) {
        res.json({
            authenticated: false,
            isAdmin: false
        });
    }
});


// ==================== STATIC ROUTES ====================

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});


// ==================== SERVER START ====================

app.listen(PORT, HOST, () => {
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║               🚀 SERVER STARTED                 ║');
    console.log('║              ⚙️  CONFIG-BASED MODE             ║');
    console.log('╚══════════════════════════════════════════════════╝');
    
    console.log(`📍 Static IP:    http://${STATIC_IP}:${PORT}`);
    console.log(`📍 Local access: http://localhost:${PORT}`);
    console.log(`📍 Local access: http://127.0.0.1:${PORT}`);
    
    console.log('\n🌐 Network Access:');
    console.log(`   Other devices use: http://${STATIC_IP}:${PORT}`);
    
    console.log('\n✅ CORS Allowed Origins:');
    config.CORS.ALLOWED_ORIGINS.forEach(origin => {
        console.log(`   ✓ ${origin}`);
    });
    
    console.log('\n🔐 Auth endpoints:');
    console.log('   POST /api/auth/user-login - User login with database');
    console.log('   GET  /api/auth/check      - Check auth status');
    console.log('   POST /api/auth/logout     - User logout');
    console.log('📚 Courses endpoints:');
    console.log('   GET /api/courses/fetch - Fetch courses from JIRA');
    console.log('   GET /api/courses       - Get courses from database');
    console.log('📊 Scores endpoints:');
    console.log('   POST /api/scores/import - Import scores from Excel');
    console.log('   POST /api/scores/bulk   - Get scores by ma_dk list');
    console.log('🎯 Standards endpoints:');
    console.log('   GET /api/standards-new/:maHang - Get scoring standards');
    
    console.log('\n⚡ Server ready with static IP configuration!');
});