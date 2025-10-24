// API Management
class ApiService {
    static async fetchCourses() {
        try {
            console.log('🔄 Fetching courses from API...');
            const response = await fetch('/api/courses/fetch');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('📊 Courses API Response:', result);
            
            if (result.success) {
                return result.data.courses || [];
            } else {
                throw new Error(result.error || 'API trả về success: false');
            }
        } catch (error) {
            console.error('💥 Fetch courses failed:', error);
            throw error;
        }
    }

    static async fetchStudents(courseId) {
        try {
            console.log(`👨‍🎓 Fetching students for course: ${courseId}`);
            const response = await fetch(`/api/students/${courseId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('📊 Students API Response:', result);
            
            if (result.success) {
                return result.students || result.data?.students || [];
            } else {
                throw new Error(result.error || 'API trả về success: false');
            }
        } catch (error) {
            console.error('💥 Fetch students failed:', error);
            throw error;
        }
    }

    // THÊM PHƯƠNG THỨC fetchLmsExcel
    static async fetchLmsExcel(courseId) {
        try {
            console.log(`📊 Fetching LMS Excel for course: ${courseId}`);
            const response = await fetch(`/api/lms-excel/${courseId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('📈 LMS Excel API Response:', result);
            
            if (result.success) {
                return result.students || result.data?.students || [];
            } else {
                throw new Error(result.error || 'LMS Excel API trả về success: false');
            }
        } catch (error) {
            console.error('💥 Fetch LMS Excel failed:', error);
            throw error;
        }
    }

    static async checkToken() {
        try {
            const response = await fetch('/api/debug/check-token');
            return await response.json();
        } catch (error) {
            console.error('Token check failed:', error);
            return { hasToken: false };
        }
    }
}

// Đảm bảo có thể truy cập globally
window.ApiService = ApiService;