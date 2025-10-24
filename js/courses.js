// Courses management - Complete version (đã sửa)
class CoursesManager {
    constructor() {
        this.courses = [];
        this.currentCourse = null;
        this.init();
    }

    async init() {
        console.log('📚 Khởi tạo courses module...');
        await this.loadCourses();
        this.setupCourseDropdown();
        this.setupEventListeners();
    }

    async loadCourses() {
        try {
            this.showCourseLoading();
            const courses = await ApiService.fetchCourses();
            this.courses = courses;
            window.currentCourses = courses;
            this.populateCourseDropdown(courses);
            console.log(`✅ Đã tải ${courses.length} khóa học`);
        } catch (error) {
            console.error('💥 Lỗi tải khóa học:', error);
            this.showCourseError('Lỗi tải khóa học: ' + error.message);
        }
    }

    showCourseLoading() {
        const select = document.getElementById('courseSelect');
        if (select) {
            select.innerHTML = '<option value="">⌛ Đang tải khóa học...</option>';
        }
    }

    showCourseError(message) {
        const select = document.getElementById('courseSelect');
        if (select) {
            select.innerHTML = `<option value="">❌ ${message}</option>`;
        }
    }

    populateCourseDropdown(courses) {
        const select = document.getElementById('courseSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">📚 Chọn khóa học...</option>';
        
        // Sắp xếp courses: đang active trước, sau đó theo ngày mới nhất
        const sortedCourses = this.sortCourses(courses);
        
        sortedCourses.forEach((course) => {
            const option = document.createElement('option');
            option.value = course.id;
            
            // Format thông tin cho dropdown - 🎯 CÓ SỐ HỌC VIÊN
            const displayText = this.formatCourseDisplay(course);
            option.textContent = displayText;
            option.dataset.course = JSON.stringify(course);
            
            // Thêm CSS class dựa trên trạng thái
            const status = course.status || course.trang_thai || 1;
            option.className = `course-option status-${status}`;
            
            select.appendChild(option);
        });
        
        console.log(`✅ Đã thêm ${sortedCourses.length} khóa học vào dropdown`);
    }

    sortCourses(courses) {
        return courses.sort((a, b) => {
            // Ưu tiên trạng thái active (1, 2) trước completed (3)
            const statusA = a.status || a.trang_thai || 1;
            const statusB = b.status || b.trang_thai || 1;
            
            if (statusA !== statusB) {
                return statusA - statusB; // 1,2 trước 3
            }
            
            // Sau đó sắp xếp theo ngày bắt đầu mới nhất
            const dateA = new Date(a.ngay_khai_giang || a.ngayKhaiGiang || a.start_date || 0);
            const dateB = new Date(b.ngay_khai_giang || b.ngayKhaiGiang || b.start_date || 0);
            
            return dateB - dateA;
        });
    }

    formatCourseDisplay(course) {
        const maKhoaHoc = course.ma_khoa_hoc || course.maKhoaHoc || course.code || 'N/A';
        const tenKhoaHoc = course.ten_khoa_hoc || course.tenKhoaHoc || course.name || 'N/A';
        const ngayKhaiGiang = this.formatDate(course.ngay_khai_giang || course.ngayKhaiGiang || course.start_date);
        const ngayBeGiang = this.formatDate(course.ngay_be_giang || course.ngayBeGiang || course.end_date);
        
        // 🎯 LẤY SỐ HỌC VIÊN TỪ API - kiểm tra nhiều trường có thể có
        const soHocVien = course.so_hoc_sinh || course.so_hoc_vien || course.soHocVien || course.student_count || 0;
        
        const trangThai = this.getStatusDisplay(course.status || course.trang_thai || 1);
        
        // 🎯 HIỂN THỊ ĐẦY ĐỦ: Mã | Tên | Ngày | Số HV | Trạng thái
        return `${maKhoaHoc} | ${tenKhoaHoc} | ${ngayKhaiGiang} → ${ngayBeGiang} | ${soHocVien} HV | ${trangThai}`;
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'N/A';
            
            return date.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            return 'N/A';
        }
    }

    getStatusDisplay(status) {
        const statusMap = {
            1: '📘 Lý thuyết',
            2: '📗 Thực hành', 
            3: '📕 Kết thúc'
        };
        return statusMap[status] || '📋 Chưa xác định';
    }

    setupCourseDropdown() {
        const select = document.getElementById('courseSelect');
        if (select) {
            // Remove existing listeners to avoid duplicates
            select.replaceWith(select.cloneNode(true));
            const newSelect = document.getElementById('courseSelect');
            
            newSelect.addEventListener('change', (event) => {
                this.handleCourseSelection(event);
            });
        }
    }

    setupEventListeners() {
        // Refresh courses button (có thể thêm sau)
        const refreshBtn = document.getElementById('refreshCoursesBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadCourses();
            });
        }
    }

    async handleCourseSelection(event) {
        const selectedValue = event.target.value;
        
        if (selectedValue) {
            try {
                // 🎯 SỬA: Sử dụng hàm loading từ students.js thay vì từ HTML
                this.showStudentsLoading();
                const selectedOption = event.target.selectedOptions[0];
                const course = JSON.parse(selectedOption.dataset.course);
                this.currentCourse = course;
                
                // Lưu course info để sử dụng ở modules khác
                window.currentCourse = course;
                window.currentCourseMaHang = course.ma_hang_dao_tao || course.maHangDaoTao || course.training_level || 'N/A';
                
                console.log(`🎯 Đã chọn khóa học: ${course.ma_khoa_hoc || course.maKhoaHoc} - ${course.ten_khoa_hoc || course.tenKhoaHoc}`);
                
                // 🎯 CẬP NHẬT TIÊU ĐỀ BẢNG
                this.updateTableHeader(course);
                
                // 🎯 CẬP NHẬT SỐ HỌC VIÊN TỪ COURSE DATA
                const soHocVien = course.so_hoc_sinh || course.so_hoc_vien || course.soHocVien || course.student_count || 0;
                this.updateStudentsCount(soHocVien);
                
                // Kích hoạt nút export
                this.enableExportButton();
                
                // Load students cho khóa học được chọn
                if (window.loadStudentsForCourse) {
                    await window.loadStudentsForCourse(course.id, course);
                } else {
                    console.warn('⚠️ Hàm loadStudentsForCourse chưa được định nghĩa');
                    this.hideStudentsLoading();
                }
                
                // 🎯 QUAN TRỌNG: ẨN LOADING SAU KHI HOÀN TẤT
                this.hideStudentsLoading();
                
            } catch (error) {
                console.error('❌ Lỗi xử lý khóa học:', error);
                this.showError('Lỗi khi chọn khóa học: ' + error.message);
                this.hideStudentsLoading();
            }
        } else {
            this.handleNoCourseSelected();
        }
    }

    showStudentsLoading() {
        GlobalUtils.showLoading('.table-section');
    }

    hideStudentsLoading() {
        GlobalUtils.hideLoading();
    }

    enableExportButton() {
        GlobalUtils.enableExportButton();
    }

    disableExportButton() {
        GlobalUtils.disableExportButton();
    }

    updateStudentsCount(count) {
        GlobalUtils.updateStudentsCount(count);
    }

    showError(message) {
        GlobalUtils.showError(message);
    }
    
   // 🎯 SỬA HÀM CẬP NHẬT TABLE HEADER ĐỂ KHÔNG GHI ĐÈ THỐNG KÊ
updateTableHeader(course) {
    const headerInfo = document.querySelector('.header-info');
    if (headerInfo && course) {
        const maKhoaHoc = course.ma_khoa_hoc || course.maKhoaHoc || course.code || 'N/A';
        const tenKhoaHoc = course.ten_khoa_hoc || course.tenKhoaHoc || course.name || 'N/A';
        const now = new Date();
        const checkTime = now.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // 🎯 CHỈ CẬP NHẬT TITLE, KHÔNG ĐỤNG ĐẾN STATS
        const titleElement = headerInfo.querySelector('.header-title');
        
        if (titleElement) {
            titleElement.innerHTML = `📊 TIẾN ĐỘ ĐÀO TẠO - KHÓA ${tenKhoaHoc} - ${checkTime}`;
        }
        
        // 🎯 QUAN TRỌNG: KHÔNG CẬP NHẬT STATS ELEMENT Ở ĐÂY
        // Stats sẽ được cập nhật bởi students.js sau khi load dữ liệu
    }
}

   // 🎯 SỬA HÀM handleNoCourseSelected
handleNoCourseSelected() {
    this.currentCourse = null;
    window.currentCourse = null;
    window.currentCourseMaHang = null;
    
    this.disableExportButton();
    
    // 🎯 CHỈ RESET TITLE, STATS SẼ TỰ ĐỘNG RESET KHI CLEAR TABLE
    const headerInfo = document.querySelector('.header-info');
    if (headerInfo) {
        const titleElement = headerInfo.querySelector('.header-title');
        
        if (titleElement) {
            titleElement.innerHTML = '📊 TIẾN ĐỘ ĐÀO TẠO';
        }
        
        // 🎯 KHÔNG RESET STATS Ở ĐÂY - để students.js xử lý
    }
    
    // Clear students table - hàm này sẽ reset stats
    if (window.clearStudentsTable) {
        window.clearStudentsTable();
    } else {
        console.warn('⚠️ Hàm clearStudentsTable chưa được định nghĩa');
    }
    
    // Update students count về 0
    this.updateStudentsCount(0);
    
    console.log('ℹ️ Đã bỏ chọn khóa học');
}


    
    getCurrentCourse() {
        return this.currentCourse;
    }

    getCourseById(courseId) {
        return this.courses.find(course => course.id == courseId);
    }

    refreshCourses() {
        return this.loadCourses();
    }


    // Utility methods
    getCoursesByStatus(status) {
        return this.courses.filter(course => (course.status || course.trang_thai) === status);
    }

    getActiveCourses() {
        return this.courses.filter(course => {
            const status = course.status || course.trang_thai;
            return status === 1 || status === 2; // Lý thuyết hoặc Thực hành
        });
    }

    getCompletedCourses() {
        return this.courses.filter(course => (course.status || course.trang_thai) === 3);
    }
}

// Initialize courses manager khi DOM ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏁 DOM Ready - Initializing CoursesManager');
    try {
        window.coursesManager = new CoursesManager();
        console.log('✅ CoursesManager initialized successfully');
    } catch (error) {
        console.error('💥 Failed to initialize CoursesManager:', error);
    }
});

function updateStudentsCount(count) {
    GlobalUtils.updateStudentsCount(count);
}