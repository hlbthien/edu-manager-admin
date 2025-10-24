// Students table management
console.log('👨‍🎓 students.js loaded');

window.loadStudentsForCourse = async function(courseId, courseData = null) {
    try {
        console.log(`👨‍🎓 Loading students for course: ${courseId}`, courseData);
        showStudentsLoading();
        
        // RESET currentStudents
        window.currentStudents = [];
        
        // ✅ LẤY MÃ HẠNG TỪ COURSE DATA
        let maHang = null;
        if (courseData && courseData.ma_hang) {
            maHang = courseData.ma_hang;
            window.currentCourseMaHang = maHang;
            console.log(`🎯 Set currentCourseMaHang: ${maHang}`);
        } else {
            // Fallback: try to get from courseId or global variable
            maHang = window.currentCourseMaHang || getMaHangFromCourseId(courseId);
            console.log(`🔍 MaHang fallback: ${maHang}`);
        }
        
        let lmsStudents = [];
        let jiraStudents = [];
        
        try {
            console.log(`📥 Loading from LMS Excel...`);
            lmsStudents = await ApiService.fetchLmsExcel(courseId);
            console.log(`✅ Loaded ${lmsStudents?.length || 0} students from LMS Excel`);
        } catch (lmsError) {
            console.log(`❌ LMS Excel failed: ${lmsError.message}`);
            lmsStudents = [];
        }
        
        try {
            console.log(`📥 Loading from JIRA...`);
            jiraStudents = await ApiService.fetchStudents(courseId);
            console.log(`✅ Loaded ${jiraStudents?.length || 0} students from JIRA`);
        } catch (jiraError) {
            console.log(`❌ JIRA failed: ${jiraError.message}`);
            jiraStudents = [];
        }
        
        // ✅ ĐẢM BẢO CẢ HAI ĐỀU LÀ ARRAY
        if (!Array.isArray(lmsStudents)) {
            console.warn('⚠️ lmsStudents không phải array, converting to empty array');
            lmsStudents = [];
        }
        if (!Array.isArray(jiraStudents)) {
            console.warn('⚠️ jiraStudents không phải array, converting to empty array');
            jiraStudents = [];
        }
        
        // MERGE DATA
        let mergedStudents = await mergeStudentData(lmsStudents, jiraStudents);
        
        // ✅ VALIDATE MERGED DATA
        if (!mergedStudents || !Array.isArray(mergedStudents)) {
            console.error('❌ mergedStudents không phải array:', mergedStudents);
            mergedStudents = [];
        }
        
        console.log(`🔄 Merged ${mergedStudents.length} students total`);
        
        if (mergedStudents.length === 0) {
            const errorMsg = 'Không có dữ liệu học viên từ cả LMS và JIRA';
            console.log(`❌ ${errorMsg}`);
            showStudentsError(errorMsg);
            updateStudentsCount(0);
            
            // ✅ XỬ LÝ KHI KHÔNG CÓ DỮ LIỆU - KHÔNG GỌI excelExport
            disableExportButton();
            
            // 🎯 QUAN TRỌNG: ẨN LOADING KHI KHÔNG CÓ DỮ LIỆU
            hideStudentsLoading();
            return;
        }
        
        window.currentStudents = mergedStudents;
        
        // ✅ KÍCH HOẠT NÚT EXPORT KHI CÓ DỮ LIỆU - DÙNG FUNCTION AN TOÀN
        enableExportButton();
        
        await populateStudentsTable(mergedStudents, maHang);
        updateStudentsCount(mergedStudents.length);
        
        // 🎯 QUAN TRỌNG: ẨN LOADING SAU KHI HOÀN TẤT
        hideStudentsLoading();
        
    } catch (error) {
        console.error('💥 Lỗi tải học viên:', error);
        showStudentsError('Lỗi hệ thống: ' + error.message);
        updateStudentsCount(0);
        
        // ✅ DISABLE EXPORT KHI CÓ LỖI - DÙNG FUNCTION AN TOÀN
        disableExportButton();
        
        // 🎯 QUAN TRỌNG: ẨN LOADING KHI CÓ LỖI
        hideStudentsLoading();
    }
};
    function showStudentsLoading() {
        GlobalUtils.showLoading('#studentsTableBody');
    }

    function hideStudentsLoading() {
        GlobalUtils.hideLoading();
    }

    function enableExportButton() {
        GlobalUtils.enableExportButton();
    }

    function disableExportButton() {
        GlobalUtils.disableExportButton();
    }

// HÀM MERGE DATA - QUAN TRỌNG!
async function mergeStudentData(lmsStudents, jiraStudents) {
    console.log('🔄 Merging student data from multiple sources...');
    
    // Đảm bảo là array
    if (!lmsStudents || !Array.isArray(lmsStudents)) {
        console.error('❌ lmsStudents không phải array:', lmsStudents);
        lmsStudents = [];
    }
    if (!jiraStudents || !Array.isArray(jiraStudents)) {
        console.error('❌ jiraStudents không phải array:', jiraStudents);
        jiraStudents = [];
    }
    
    // Lấy danh sách ma_dk để query scores
    const maDkList = lmsStudents.map(s => s.ma_dk).filter(ma_dk => ma_dk);
    console.log(`📋 Fetching scores for ${maDkList.length} students`);
    
    // Lấy scores từ DB
    let scoresMap = {};
    if (maDkList.length > 0) {
        try {
            const response = await fetch('/api/scores/bulk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ma_dk_list: maDkList })
            });
            
            const result = await response.json();
            if (result.success) {
                scoresMap = result.scores || {};
                console.log(`✅ Loaded scores for ${Object.keys(scoresMap).length} students`);
            } else {
                console.log('❌ Scores API returned failure');
            }
        } catch (error) {
            console.log('⚠️ Could not load scores, continuing without...', error.message);
        }
    }
    
    // Merge 3 nguồn data
    const merged = lmsStudents.map(lmsStudent => {
        const ma_dk = lmsStudent.ma_dk;
        
        const jiraStudent = jiraStudents.find(j => j.ma_dk === ma_dk) || {};
        const scoreData = scoresMap[ma_dk] || {};
        
        const mergedStudent = {
            ...lmsStudent,
            ...jiraStudent,
            ...scoreData // Thêm scores data
        };
        
        return mergedStudent;
    });
    
    console.log(`🎯 Final merged: ${merged.length} students with scores data`);
    return merged;
}

// ==================== STUDENT ROW TEMPLATE ====================

async function createStudentRowHTML(student, index, maHang = null) {
    const so_tt = student.so_tt || index + 1;
    const ma_dk = (student.ma_dk || `hv${String(index + 1).padStart(3, '0')}`).toLowerCase();
    
    let ho_va_ten = student.ho_va_ten || 'N/A';
    if (ho_va_ten.length > 25) {
        ho_va_ten = ho_va_ten.substring(0, 25) + '...';
    }
    
    // ✅ LẤY STANDARDS ĐỂ KIỂM TRA MÔN NÀO KHÔNG ÁP DỤNG
    const standards = maHang ? await getNewStandardsByMaHang(maHang) : null;
    const complianceResult = window.studentComplianceResults?.[student.ma_dk] || { violations: {} };
    const violations = complianceResult.violations;
    
    // Data từ JIRA (thực hành) - convert to hours/km
    const outdoor_hour = student.outdoor_hour ? (student.outdoor_hour / 3600).toFixed(2) : '0';
    const outdoor_distance = student.outdoor_distance ? (student.outdoor_distance / 1000).toFixed(2) : '0';
    const night_duration = student.night_duration ? (student.night_duration / 3600).toFixed(2) : '0';
    const auto_duration = student.auto_duration ? (student.auto_duration / 3600).toFixed(2) : '0';
    
    // Data từ LMS Excel (lý thuyết)
    const phap_luat = student.phap_luat || student['Pháp luật giao thông đường bộ'] || 0;
    const dao_duc = student.dao_duc || student['Đạo đức người lái xe'] || 0;
    const cau_tao_oto = student.cau_tao_oto || student['Cấu tạo và sửa chữa'] || 0;
    const ky_thuat_lai = student.ky_thuat_lai || student['Kỹ thuật lái xe'] || 0;
    const nang_hang = student.nang_hang || student['Nâng hạng'] || 0;
    const mo_phong = student.mo_phong || student['Mô phỏng'] || 0;
    
    // Data từ Scores Import (Cabin & Kiểm tra)
    const cabin_gio = student.cabin_gio || 0;
    const cabin_bai = student.cabin_bai || 0;
    const kt_lythuyet = student.kt_lythuyet || 0;
    const kt_mophong = student.kt_mophong || 0;
    const kt_thuchanh = student.kt_thuchanh || 0;
    const kt_hoanthanh = student.kt_hoanthanh || 'Chưa';
    
    // ✅ FUNCTION TẠO CELL MỚI - XỬ LÝ MÔN KHÔNG ÁP DỤNG
    const createCell = (value, isViolation, fieldName = null, isPercent = false) => {
        // Kiểm tra nếu môn không áp dụng (required: false)
        const isNotApplicable = standards && fieldName && 
                               getFieldStandard(standards, fieldName)?.required === false;
        
        if (isNotApplicable) {
            return `<td style="background: #f8f9fa; color: #6c757d; font-style: italic;">N/A</td>`;
        }
        
        const displayValue = isPercent ? value : value;
        const style = isViolation ? 'style="color: #e74c3c; font-weight: bold;"' : '';
        return `<td ${style}>${displayValue}</td>`;
    };

    // ✅ FUNCTION PHỤ ĐỂ LẤY STANDARD THEO FIELD NAME
    const getFieldStandard = (standards, fieldName) => {
        if (fieldName.startsWith('cabin_')) {
            const key = fieldName.replace('cabin_', '');
            return standards.cabin?.[key];
        } else if (fieldName.startsWith('kt_')) {
            const key = fieldName.replace('kt_', '');
            return standards.kiem_tra?.[key];
        } else if (['outdoor_hour', 'outdoor_distance', 'night_duration', 'auto_duration'].includes(fieldName)) {
            const mapping = {
                'outdoor_hour': 'gio',
                'outdoor_distance': 'km', 
                'night_duration': 'dem',
                'auto_duration': 'tu_dong'
            };
            return standards.thuc_hanh?.[mapping[fieldName]];
        } else {
            return standards.ly_thuyet?.[fieldName];
        }
    };
    
    return `
        <td>${so_tt}</td>
        <td>${ma_dk}</td>
        <td title="${student.ho_va_ten || 'N/A'}">${ho_va_ten}</td>
        
        <!-- Giờ học lý thuyết - TỪ LMS EXCEL -->
        ${createCell(phap_luat, violations.phap_luat, 'phap_luat', true)}
        ${createCell(dao_duc, violations.dao_duc, 'dao_duc', true)}
        ${createCell(cau_tao_oto, violations.cau_tao_oto, 'cau_tao_oto', true)}
        ${createCell(ky_thuat_lai, violations.ky_thuat_lai, 'ky_thuat_lai', true)}
        ${createCell(nang_hang, violations.nang_hang, 'nang_hang', true)}
        ${createCell(mo_phong, violations.mo_phong, 'mo_phong', true)}
        
        <!-- Cabin điện tử - TỪ SCORES IMPORT -->
        ${createCell(cabin_gio, violations.cabin_gio, 'cabin_gio')}
        ${createCell(cabin_bai, violations.cabin_bai, 'cabin_bai')}
        
        <!-- Thực hành lái xe - TỪ JIRA -->
        ${createCell(outdoor_hour, violations.outdoor_hour, 'outdoor_hour')}
        ${createCell(outdoor_distance, violations.outdoor_distance, 'outdoor_distance')}
        ${createCell(night_duration, violations.night_duration, 'night_duration')}
        ${createCell(auto_duration, violations.auto_duration, 'auto_duration')}
        
        <!-- Kiểm tra cuối khóa - TỪ SCORES IMPORT -->
        ${createCell(kt_lythuyet, violations.kt_lythuyet, 'kt_lythuyet')}
        ${createCell(kt_mophong, violations.kt_mophong, 'kt_mophong')}
        ${createCell(kt_thuchanh, violations.kt_thuchanh, 'kt_thuchanh')}
        <td>${kt_hoanthanh}</td>
    `;
}
// ==================== TABLE POPULATION ====================
async function populateStudentsTable(students, maHang = null) {
    const tbody = document.getElementById('studentsTableBody');
    const cardsContainer = document.getElementById('cardsContainer');
    
    if (!tbody || !cardsContainer) {
        console.error('❌ Không tìm thấy studentsTableBody hoặc cardsContainer');
        return;
    }
    
    // VALIDATE students là array
    if (!students || !Array.isArray(students)) {
        console.error('❌ Students data không hợp lệ:', students);
        tbody.innerHTML = getEmptyStateHTML('Lỗi dữ liệu học viên', 'Dữ liệu không hợp lệ - vui lòng thử lại');
        cardsContainer.innerHTML = getEmptyStateHTML('Lỗi dữ liệu học viên', 'Dữ liệu không hợp lệ - vui lòng thử lại');
        return;
    }
    
    console.log(`📋 Populating table with ${students.length} students, maHang: ${maHang}`);
    
    if (students.length === 0) {
        tbody.innerHTML = getEmptyStateHTML('Không có học viên', 'Không có học viên nào trong khóa học này');
        cardsContainer.innerHTML = getEmptyStateHTML('Không có học viên', 'Không có học viên nào trong khóa học này');
        
        // Reset thống kê
        updateProgressStats(0, 0, 0, 0, 0);
        return;
    }
    
    // Xóa nội dung cũ
    tbody.innerHTML = '';
    cardsContainer.innerHTML = '';
    
    // ✅ TÍNH TOÁN COMPLIANCE VÀ THỐNG KÊ
    window.studentComplianceResults = {};
    let stats = {
        theory: 0,
        cabin: 0, 
        practice: 0,
        test: 0,
        total: students.length
    };

    // Tính compliance cho tất cả học viên
    for (let student of students) {
        try {
            if (!student || !student.ma_dk) {
                console.log('⚠️ Skip invalid student:', student);
                continue;
            }
            
            const complianceResult = maHang ? await checkNewStandardCompliance(student, maHang) : { violations: {}, completedSections: {} };
            window.studentComplianceResults[student.ma_dk] = complianceResult;
            
            // Đếm thống kê
            const completed = complianceResult.completedSections || {};
            if (completed.theory) stats.theory++;
            if (completed.cabin) stats.cabin++;
            if (completed.practice) stats.practice++;
            if (completed.test) stats.test++;
        } catch (error) {
            console.error(`💥 Error processing student ${student.ma_dk}:`, error);
        }
    }
    
    // ✅ HIỆN THỊ THỐNG KÊ
    updateProgressStats(stats.total, stats.theory, stats.cabin, stats.practice, stats.test);
    
    // ✅ TẠO TABLE ROWS VÀ CARDS
    for (let index = 0; index < students.length; index++) {
        const student = students[index];
        try {
            // Table row
            const row = document.createElement('tr');
            row.innerHTML = await createStudentRowHTML(student, index, maHang);
            tbody.appendChild(row);
            
            // Card element
            const card = document.createElement('div');
            card.className = 'student-card';
            card.innerHTML = await createStudentCardHTML(student, index, maHang);
            cardsContainer.appendChild(card);
        } catch (error) {
            console.error(`💥 Error creating row/card for student ${student.ma_dk}:`, error);
        }
    }
    
    console.log('✅ Table and Cards populated with compliance checking');
    window.currentCourseStats = stats;
    
    // Áp dụng view mode ngay lập tức
    toggleTableView();
}

// THÊM HÀM MỚI ĐỂ CẬP NHẬT THỐNG KÊ
function updateProgressStats(total, theory, cabin, practice, test) {
    const statsElement = document.getElementById('progressStats');
    console.log('🔍 progressStats element:', statsElement);
    console.log('📊 Stats data to display:', { 
        total: total, 
        theory: theory, 
        cabin: cabin, 
        practice: practice, 
        test: test 
    });
    
    if (statsElement) {
        // ✅ KIỂM TRA NẾU CÓ DỮ LIỆU THỐNG KÊ
        if (total > 0) {
            const htmlContent = ` 
                LT: <strong>${theory}/${total}</strong> • 
                Cabin: <strong>${cabin}/${total}</strong> • 
                TH: <strong>${practice}/${total}</strong> • 
                KT: <strong>${test}/${total}</strong>
            `;
            statsElement.innerHTML = htmlContent;
            console.log('✅ Stats displayed:', htmlContent);
        } else {
            statsElement.innerHTML = '- Chọn khóa học để xem thống kê';
            console.log('ℹ️ No students, showing default message');
        }
    } else {
        console.error('❌ progressStats element not found!');
        // ✅ THỬ TÌM LẠI ELEMENT
        const retryElement = document.getElementById('progressStats');
        console.log('🔍 Retry finding progressStats:', retryElement);
    }
}

window.clearStudentsTable = function() {
    const tbody = document.getElementById('studentsTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="20">
                    <div class="empty-state">
                        <div class="empty-icon">📝</div>
                        <div class="empty-text">Chọn khóa học để xem danh sách học viên</div>
                        <div class="empty-subtext">Danh sách học viên sẽ tự động hiển thị</div>
                    </div>
                </td>
            </tr>
        `;
        updateStudentsCount(0);
        // THÊM DÒNG NÀY
        updateProgressStats(0, 0, 0, 0, 0);
    }
};

function showStudentsError(message) {
    GlobalUtils.showError(message);
    
    // Fallback UI update
    const tbody = document.getElementById('studentsTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="20">
                    <div class="empty-state">
                        <div class="empty-icon">🚫</div>
                        <div class="empty-text" style="color: #e74c3c;">${message}</div>
                        <div class="empty-subtext">Vui lòng kiểm tra kết nối hoặc liên hệ quản trị viên</div>
                    </div>
                </td>
            </tr>
        `;
    }
}


//function updateStudentsCount(count) {
    //GlobalUtils.updateStudentsCount(count);
//}

// ==================== NEW STANDARDS COMPLIANCE CHECK ====================
async function checkNewStandardCompliance(student, maHang) {
    try {
        if (!student) {
            console.log('❌ Student is undefined');
            return { 
                violations: {}, 
                completedSections: {
                    theory: false,
                    cabin: false,
                    practice: false,
                    test: false
                }
            };
        }

        const standards = await getNewStandardsByMaHang(maHang);
        if (!standards) {
            console.log(`❌ No standards found for ${maHang}`);
            return { 
                violations: {}, 
                completedSections: {
                    theory: false,
                    cabin: false,
                    practice: false,
                    test: false
                }
            };
        }
        
        const violations = {};
        let completedSections = {
            theory: true,  // Mặc định là true, sẽ set false nếu vi phạm
            cabin: true,
            practice: true,
            test: true
        };
        
        console.log(`🔍 Checking compliance for ${student.ma_dk} with ${maHang} standards`);

        // ✅ KIỂM TRA LÝ THUYẾT
        if (standards.ly_thuyet) {
            Object.keys(standards.ly_thuyet).forEach(key => {
                const standard = standards.ly_thuyet[key];
                if (standard.required && standard.min > 0) {
                    const studentValue = parseFloat(student[key] || student[key] || 0);
                    console.log(`📊 ${key}: Student=${studentValue}%, Standard=${standard.min}%`);
                    if (studentValue < standard.min) {
                        violations[key] = true;
                        completedSections.theory = false;
                        console.log(`❌ ${key} NOT MET: ${studentValue}% < ${standard.min}%`);
                    }
                }
            });
        }

        // ✅ KIỂM TRA CABIN
        if (standards.cabin) {
            Object.keys(standards.cabin).forEach(key => {
                const standard = standards.cabin[key];
                if (standard.required && standard.min > 0) {
                    const fieldName = `cabin_${key}`;
                    const studentValue = parseFloat(student[fieldName] || 0);
                    console.log(`📊 ${fieldName}: Student=${studentValue}, Standard=${standard.min}`);
                    if (studentValue < standard.min) {
                        violations[fieldName] = true;
                        completedSections.cabin = false;
                        console.log(`❌ ${fieldName} NOT MET: ${studentValue} < ${standard.min}`);
                    }
                }
            });
        }

        // ✅ KIỂM TRA THỰC HÀNH
        if (standards.thuc_hanh) {
            const outdoor_hour = student.outdoor_hour ? (student.outdoor_hour / 3600) : 0;
            const outdoor_distance = student.outdoor_distance ? (student.outdoor_distance / 1000) : 0;
            const night_duration = student.night_duration ? (student.night_duration / 3600) : 0;
            const auto_duration = student.auto_duration ? (student.auto_duration / 3600) : 0;

            const thucHanhMapping = {
                'gio': { value: outdoor_hour, field: 'outdoor_hour' },
                'km': { value: outdoor_distance, field: 'outdoor_distance' },
                'dem': { value: night_duration, field: 'night_duration' },
                'tu_dong': { value: auto_duration, field: 'auto_duration' }
            };

            Object.keys(standards.thuc_hanh).forEach(key => {
                const standard = standards.thuc_hanh[key];
                if (standard.required && standard.min > 0) {
                    const mapping = thucHanhMapping[key];
                    if (mapping) {
                        console.log(`📊 ${mapping.field}: Student=${mapping.value}, Standard=${standard.min}`);
                        if (mapping.value < standard.min) {
                            violations[mapping.field] = true;
                            completedSections.practice = false;
                            console.log(`❌ ${mapping.field} NOT MET: ${mapping.value} < ${standard.min}`);
                        }
                    }
                }
            });
        }

        // ✅ KIỂM TRA ĐIỂM KIỂM TRA
        if (standards.kiem_tra) {
            Object.keys(standards.kiem_tra).forEach(key => {
                const standard = standards.kiem_tra[key];
                if (standard.required && standard.min > 0) {
                    const fieldName = `kt_${key}`;
                    const studentValue = parseFloat(student[fieldName] || 0);
                    console.log(`📊 ${fieldName}: Student=${studentValue}, Standard=${standard.min}`);
                    if (studentValue < standard.min) {
                        violations[fieldName] = true;
                        completedSections.test = false;
                        console.log(`❌ ${fieldName} NOT MET: ${studentValue} < ${standard.min}`);
                    }
                }
            });
        }

        console.log(`🎯 Final compliance for ${student.ma_dk}:`, { violations, completedSections });
        return { violations, completedSections };

    } catch (error) {
        console.error('💥 Error in checkNewStandardCompliance:', error);
        return { 
            violations: {}, 
            completedSections: {
                theory: false,
                cabin: false,
                practice: false,
                test: false
            }
        };
    }
}

// HÀM LẤY STANDARDS TỪ DATABASE - SỬA ENDPOINT
async function getNewStandardsByMaHang(maHang) {
    try {
        console.log(`📋 Loading standards from DB for: ${maHang}`);
        
        if (!maHang) {
            console.log('❌ No maHang provided for standards');
            return null;
        }
        
        // ✅ SỬA ENDPOINT: standards-new thay vì standards
        const response = await fetch(`/api/standards-new/${maHang}`);
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                console.log(`✅ Loaded standards for ${maHang} from DB:`, result.standards);
                return result.standards;
            } else {
                console.log(`❌ API returned error: ${result.error}`);
                return null;
            }
        } else {
            console.log(`❌ Failed to load standards for ${maHang} from DB`);
            return null;
        }
    } catch (error) {
        console.error(`💥 Error loading standards for ${maHang} from DB:`, error);
        return null;
    }
}

// HÀM PHỤ TRỢ: Lấy mã hạng từ courseId (nếu cần)
function getMaHangFromCourseId(courseId) {
    // Logic để extract mã hạng từ courseId
    // Ví dụ: courseId = "B2_K12" -> mã hạng = "B2"
    const match = courseId.match(/^([A-Z]\d+)/);
    return match ? match[1] : null;
}

// ✅ FUNCTION AN TOÀN ĐỂ XỬ LÝ EXPORT BUTTON - ĐÃ SỬA
function enableExportButton() {
    console.log('🔄 Enabling export button...');
    const exportBtn = document.getElementById('exportExcelBtn');
    if (exportBtn) {
        exportBtn.disabled = false;
        console.log('✅ Export button enabled');
    } else {
        console.error('❌ Export button not found in DOM');
    }
}

function disableExportButton() {
    console.log('🔄 Disabling export button...');
    const exportBtn = document.getElementById('exportExcelBtn');
    if (exportBtn) {
        exportBtn.disabled = true;
        console.log('✅ Export button disabled');
    }
}

// ✅ KHỞI TẠO EXPORT BUTTON KHI TRANG LOAD
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Initializing export button...');
    const exportBtn = document.getElementById('exportExcelBtn');
    if (exportBtn) {
        console.log('✅ Export button found in DOM');
        // Đảm bảo nút bị disabled ban đầu
        exportBtn.disabled = true;
        
        // Thêm event listener nếu chưa có
        exportBtn.addEventListener('click', function() {
            if (window.excelExport && !exportBtn.disabled) {
                window.excelExport.exportToExcel();
            }
        });
    } else {
        console.error('❌ Export button NOT FOUND in DOM');
    }
});
// ==================== EXCEL IMPORT INTEGRATION ====================

window.handleScoresImport = async function(importedData) {
    try {
        console.log('📥 Processing imported scores data:', importedData);
        
        if (!importedData || !Array.isArray(importedData.rows)) {
            throw new Error('Dữ liệu import không hợp lệ');
        }
        
        // TODO: Xử lý và lưu dữ liệu điểm số
        const result = await this.saveImportedScores(importedData.rows);
        
        // Reload students data để hiển thị điểm mới
        if (window.currentCourseData) {
            await window.loadStudentsForCourse(window.currentCourseData.id, window.currentCourseData);
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Error processing imported scores:', error);
        throw error;
    }
};

window.saveImportedScores = async function(scoresData) {
    // TODO: Gọi API để lưu điểm vào database
    console.log('💾 Saving imported scores to database:', scoresData);
    
    // Tạm thời trả về mock data
    return { success: true, message: `Đã xử lý ${scoresData.length} bản ghi` };
};

// ==================== CARD VIEW INTEGRATION ====================

// Hàm tạo card HTML cho mobile
async function createStudentCardHTML(student, index, maHang = null) {
    const so_tt = student.so_tt || index + 1;
    const ma_dk = (student.ma_dk || `hv${String(index + 1).padStart(3, '0')}`).toLowerCase();
    
    let ho_va_ten = student.ho_va_ten || 'N/A';
    
    // ✅ LẤY STANDARDS ĐỂ KIỂM TRA MÔN NÀO KHÔNG ÁP DỤNG
    const standards = maHang ? await getNewStandardsByMaHang(maHang) : null;
    const complianceResult = window.studentComplianceResults?.[student.ma_dk] || { violations: {}, completedSections: {} };
    const violations = complianceResult.violations;
    const completed = complianceResult.completedSections || {};
    
    // Data từ JIRA (thực hành) - convert to hours/km
    const outdoor_hour = student.outdoor_hour ? (student.outdoor_hour / 3600).toFixed(2) : '0';
    const outdoor_distance = student.outdoor_distance ? (student.outdoor_distance / 1000).toFixed(2) : '0';
    const night_duration = student.night_duration ? (student.night_duration / 3600).toFixed(2) : '0';
    const auto_duration = student.auto_duration ? (student.auto_duration / 3600).toFixed(2) : '0';
    
    // Data từ LMS Excel (lý thuyết)
    const phap_luat = student.phap_luat || student['Pháp luật giao thông đường bộ'] || 0;
    const dao_duc = student.dao_duc || student['Đạo đức người lái xe'] || 0;
    const cau_tao_oto = student.cau_tao_oto || student['Cấu tạo và sửa chữa'] || 0;
    const ky_thuat_lai = student.ky_thuat_lai || student['Kỹ thuật lái xe'] || 0;
    const nang_hang = student.nang_hang || student['Nâng hạng'] || 0;
    const mo_phong = student.mo_phong || student['Mô phỏng'] || 0;
    
    // Data từ Scores Import (Cabin & Kiểm tra)
    const cabin_gio = student.cabin_gio || 0;
    const cabin_bai = student.cabin_bai || 0;
    const kt_lythuyet = student.kt_lythuyet || 0;
    const kt_mophong = student.kt_mophong || 0;
    const kt_thuchanh = student.kt_thuchanh || 0;
    const kt_hoanthanh = student.kt_hoanthanh || 'Chưa';
    
    // Status badge
    const allCompleted = completed.theory && completed.cabin && completed.practice && completed.test;
    const statusBadge = allCompleted ? 'completion-badge' : 'progress-badge';
    const statusText = allCompleted ? '✅ Hoàn thành' : '📚 Đang học';
    
    // ✅ FUNCTION TẠO DATA ITEM MỚI - XỬ LÝ MÔN KHÔNG ÁP DỤNG
    const createDataItem = (label, value, fieldName = null, isPercent = false) => {
        // Kiểm tra nếu môn không áp dụng (required: false)
        const isNotApplicable = standards && fieldName && 
                               getFieldStandard(standards, fieldName)?.required === false;
        
        if (isNotApplicable) {
            return `<div class="data-item">
                <span class="data-label">${label}</span>
                <span class="data-value" style="color: #6c757d; font-style: italic;">N/A</span>
            </div>`;
        }
        
        const isViolation = violations[fieldName];
        const valueStyle = isViolation ? 'style="color: #e74c3c; font-weight: bold;"' : '';
        const displayValue = isPercent ? `${value}%` : value;
        
        return `<div class="data-item">
            <span class="data-label">${label}</span>
            <span class="data-value" ${valueStyle}>${displayValue}</span>
        </div>`;
    };

    // ✅ FUNCTION PHỤ ĐỂ LẤY STANDARD THEO FIELD NAME
    const getFieldStandard = (standards, fieldName) => {
        if (fieldName.startsWith('cabin_')) {
            const key = fieldName.replace('cabin_', '');
            return standards.cabin?.[key];
        } else if (fieldName.startsWith('kt_')) {
            const key = fieldName.replace('kt_', '');
            return standards.kiem_tra?.[key];
        } else if (['outdoor_hour', 'outdoor_distance', 'night_duration', 'auto_duration'].includes(fieldName)) {
            const mapping = {
                'outdoor_hour': 'gio',
                'outdoor_distance': 'km', 
                'night_duration': 'dem',
                'auto_duration': 'tu_dong'
            };
            return standards.thuc_hanh?.[mapping[fieldName]];
        } else {
            return standards.ly_thuyet?.[fieldName];
        }
    };
    
    return `
        <div class="card-header">
            <div class="student-info">
                <div class="student-name">${so_tt}. ${ho_va_ten}</div>
            </div>
        </div>
        
        <div class="card-sections">
            <div class="card-section">
                <div class="section-title">📖 Lý thuyết</div>
                <div class="section-grid">
                    ${createDataItem('Pháp luật', phap_luat, 'phap_luat', true)}
                    ${createDataItem('Đạo đức', dao_duc, 'dao_duc', true)}
                    ${createDataItem('Cấu tạo oto', cau_tao_oto, 'cau_tao_oto', true)}
                    ${createDataItem('Kỹ thuật lái', ky_thuat_lai, 'ky_thuat_lai', true)}
                    ${createDataItem('Nâng hạng', nang_hang, 'nang_hang', true)}
                    ${createDataItem('Mô phỏng', mo_phong, 'mo_phong', true)}
                </div>
            </div>
            
            <div class="card-section">
                <div class="section-title">🎮 Cabin điện tử</div>
                <div class="section-grid">
                    ${createDataItem('Giờ học', cabin_gio, 'cabin_gio')}
                    ${createDataItem('Số bài', cabin_bai, 'cabin_bai')}
                </div>
            </div>
            
            <div class="card-section">
                <div class="section-title">🚗 Thực hành</div>
                <div class="section-grid">
                    ${createDataItem('Thời gian', outdoor_hour, 'outdoor_hour')}
                    ${createDataItem('Quãng đường', outdoor_distance, 'outdoor_distance')}
                    ${createDataItem('Giờ đêm', night_duration, 'night_duration')}
                    ${createDataItem('Giờ tự động', auto_duration, 'auto_duration')}
                </div>
            </div>
            
            <div class="card-section">
                <div class="section-title">📝 Kiểm tra</div>
                <div class="section-grid">
                    ${createDataItem('Lý thuyết', kt_lythuyet, 'kt_lythuyet')}
                    ${createDataItem('Mô phỏng', kt_mophong, 'kt_mophong')}
                    ${createDataItem('Thực hành', kt_thuchanh, 'kt_thuchanh')}
                    <div class="data-item">
                        <span class="data-label">Hoàn thành</span>
                        <span class="data-value">${kt_hoanthanh}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Hàm tạo empty state HTML
function getEmptyStateHTML(title, subtitle = '') {
    return `
        <div class="empty-state">
            <div class="empty-icon">${title === 'Lỗi dữ liệu học viên' ? '🚫' : '👥'}</div>
            <div class="empty-text">${title}</div>
            ${subtitle ? `<div class="empty-subtext">${subtitle}</div>` : ''}
        </div>
    `;
}

// Toggle giữa table và card view
function toggleTableView() {
    const table = document.getElementById('studentsTable');
    const cardsContainer = document.getElementById('cardsContainer');
    
    if (!table || !cardsContainer) {
        console.error('❌ Table or cards container not found');
        return;
    }
    
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        table.style.display = 'none';
        cardsContainer.style.display = 'block';
    } else {
        table.style.display = 'table';
        cardsContainer.style.display = 'none';
    }
}

// Thêm event listener cho resize
window.addEventListener('resize', toggleTableView);

// Hàm search hỗ trợ cả table và card
function filterStudents(searchTerm) {
    const tbody = document.getElementById('studentsTableBody');
    const cardsContainer = document.getElementById('cardsContainer');
    const rows = tbody.getElementsByTagName('tr');
    const cards = cardsContainer.getElementsByClassName('student-card');
    
    let visibleCount = 0;
    searchTerm = searchTerm.toLowerCase().trim();
    
    // Filter table rows
    for (let row of rows) {
        if (row.cells.length < 3) continue;
        
        const studentName = row.cells[2]?.textContent?.toLowerCase() || '';
        const studentCode = row.cells[1]?.textContent?.toLowerCase() || '';
        const isVisible = studentName.includes(searchTerm) || 
                         studentCode.includes(searchTerm) || 
                         searchTerm === '';
        
        row.style.display = isVisible ? '' : 'none';
        if (isVisible) visibleCount++;
    }
    
    // Filter cards
    for (let card of cards) {
        const studentName = card.querySelector('.student-name')?.textContent?.toLowerCase() || '';
        const studentCode = card.querySelector('.student-code')?.textContent?.toLowerCase() || '';
        const isVisible = studentName.includes(searchTerm) || 
                         studentCode.includes(searchTerm) || 
                         searchTerm === '';
        
        card.style.display = isVisible ? '' : 'none';
        if (isVisible) visibleCount++;
    }
    
    // Hiển thị thông báo nếu không tìm thấy
    if (visibleCount === 0 && searchTerm !== '') {
        showNoResultsMessage(searchTerm);
    } else {
        removeNoResultsMessage();
    }
}

function showNoResultsMessage(searchTerm) {
    removeNoResultsMessage();
    
    const tbody = document.getElementById('studentsTableBody');
    const cardsContainer = document.getElementById('cardsContainer');
    
    // Table no results
    const noResultsRow = document.createElement('tr');
    noResultsRow.innerHTML = `
        <td colspan="20">
            <div class="no-results">
                <div>🔍</div>
                <div>Không tìm thấy học viên nào với từ khóa: "${searchTerm}"</div>
            </div>
        </td>
    `;
    tbody.appendChild(noResultsRow);
    
    // Card no results
    const noResultsCard = document.createElement('div');
    noResultsCard.className = 'no-results-card';
    noResultsCard.innerHTML = `
        <div class="no-results">
            <div>🔍</div>
            <div>Không tìm thấy học viên nào với từ khóa: "${searchTerm}"</div>
        </div>
    `;
    cardsContainer.appendChild(noResultsCard);
}

function removeNoResultsMessage() {
    const noResults = document.querySelectorAll('.no-results');
    noResults.forEach(element => {
        element.closest('tr')?.remove();
        element.closest('.no-results-card')?.remove();
    });
}

// Khởi tạo card view khi trang load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Initializing card view...');
    setTimeout(() => {
        toggleTableView(); // Áp dụng view mode ngay khi load
    }, 100);
});
