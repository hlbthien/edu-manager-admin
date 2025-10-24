// config.js - File cấu hình tập trung
export const config = {
    // 🎯 CẤU HÌNH SERVER
    SERVER: {
        PORT: 3001,
        STATIC_IP: '0.0.0.0', // Thay bằng IP tĩnh của bạn
        HOST: '0.0.0.0' // Thay bằng IP tĩnh của bạn
    },
    
    // 🎯 CẤU HÌNH DATABASE
    DATABASE: {
        PATH: './tokens.db',
        TABLES: {
            USERS: 'users',
            TOKENS: 'tokens', 
            SCORES: 'student_scores',
            STANDARDS: 'scoring_standards_new'
        }
    },
    
    // 🎯 CẤU HÌNH CORS - Các domain được phép truy cập
    CORS: {
        ALLOWED_ORIGINS: [
            'http://localhost:3001',
            'http://127.0.0.1:3001',
            'http://192.168.1.0/24'
        ]
    },
    
    // 🎯 CẤU HÌNH API
    API: {
        JIRA: {
            BASE_URL: 'https://jira.shlx.vn/v1',
            ENDPOINTS: {
                TRAINEES: 'trainees',
                COURSES: 'courses'
            }
        },
        LMS: {
            BASE_URL: 'https://admin.lms.shlx.vn/v1',
            ENDPOINTS: {
                COURSE_REPORT: 'admin/courses/{courseId}/report'
            }
        },
        TIMEOUT: 30000
    },
    
    // 🎯 CẤU HÌNH UPLOAD
    UPLOAD: {
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
        ALLOWED_FILE_TYPES: ['.xlsx', '.xls', '.csv']
    },
    
    // 🎯 CẤU HÌNH AUTH
    AUTH: {
        SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
        PASSWORD_MIN_LENGTH: 6
    },
    
    // 🎯 CẤU HÌNH LOGGING
    LOGGING: {
        LEVEL: 'debug',
        FILE: './app.log'
    }
};

// 🎯 Hàm helper để build API URLs
export function getApiUrl(service, endpoint, params = {}) {
    const baseUrls = {
        jira: config.API.JIRA.BASE_URL,
        lms: config.API.LMS.BASE_URL
    };
    
    let url = `${baseUrls[service]}/${endpoint}`;
    
    // Thay thế params trong URL (ví dụ: {courseId} -> actual value)
    Object.keys(params).forEach(key => {
        url = url.replace(`{${key}}`, params[key]);
    });
    
    return url;
}

// 🎯 Hàm helper để validate config
export function validateConfig() {
    const errors = [];
    
    if (!config.SERVER.STATIC_IP) {
        errors.push('STATIC_IP is required');
    }
    
    if (!config.SERVER.PORT || config.SERVER.PORT < 1000 || config.SERVER.PORT > 65535) {
        errors.push('PORT must be between 1000 and 65535');
    }
    
    if (config.CORS.ALLOWED_ORIGINS.length === 0) {
        errors.push('ALLOWED_ORIGINS cannot be empty');
    }
    
    return errors;
}

export default config;