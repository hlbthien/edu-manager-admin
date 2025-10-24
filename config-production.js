// config-production.js - Cấu hình production

export const productionConfig = {
    PORT: 3001,
    STATIC_IP: process.env.SERVER_IP, // Lấy từ environment variable
    HOST: process.env.SERVER_IP,
    
    ALLOWED_ORIGINS: [
        'http://your-domain.com',
        'https://your-domain.com',
        // Thêm IP server production
        `http://${process.env.SERVER_IP}:3001`
    ],
    
    LOGGING: {
        LEVEL: 'error',
        FILE: '/var/log/your-app/app.log'
    },
    
    DATABASE: {
        PATH: '/data/your-app/tokens.db'
    }
};