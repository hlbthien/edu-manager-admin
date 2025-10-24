// js/app.js - Simplified App Initialization
console.log('🚀 EduManager đang khởi động...');

// Global variables
window.currentCourses = [];
window.currentStudents = [];
window.currentCourseData = null;
window.excelImport = null;

// Simple initialization - just log ready state
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Tất cả modules đã được khởi tạo');
    console.log('✅ Ứng dụng đã sẵn sàng');
    
    // Test GlobalUtils is working
    if (typeof GlobalUtils !== 'undefined') {
        console.log('✅ GlobalUtils is available');
    } else {
        console.error('❌ GlobalUtils is not available');
    }
});

// Keep only essential utility functions (fallback)
window.showError = function(message) {
    if (typeof GlobalUtils !== 'undefined') {
        GlobalUtils.showError(message);
    } else {
        console.error('❌ ' + message);
        alert('❌ ' + message);
    }
};

window.showSuccess = function(message) {
    if (typeof GlobalUtils !== 'undefined') {
        GlobalUtils.showSuccess(message);
    } else {
        console.log('✅ ' + message);
    }
};