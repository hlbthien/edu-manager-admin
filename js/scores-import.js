// Scores Import Module - Chỉ dành cho giáo viên
class ScoresImport {
    
    constructor() {
        this.userRole = localStorage.getItem('userRole');
        console.log('🔐 DEBUG User Role:', this.userRole);
        this.init();
    }
    
    init() {
        console.log('📤 Scores Import initialized - Role:', this.userRole);
        
        if (this.userRole === 'teacher' || this.userRole === 'giaovien') {
            console.log('✅ Teacher detected - Setting up import functionality');
            this.setupMainImportButton();
            this.setupTemplateButton();
        } else {
            console.log('❌ User cannot import - Role:', this.userRole);
        }
    }
    
    setupMainImportButton() {
        // Kết nối nút Import chính trong header
        const mainImportBtn = document.getElementById('importExcelBtn');
        
        if (mainImportBtn) {
            console.log('🔗 Connecting main import button to scores import');
            
            // Tạo file input ẩn
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.id = 'scoresFile';
            fileInput.accept = '.xlsx,.xls';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);
            
            // Xóa event listeners cũ và thêm mới
            const newImportBtn = mainImportBtn.cloneNode(true);
            mainImportBtn.parentNode.replaceChild(newImportBtn, mainImportBtn);
            
            newImportBtn.addEventListener('click', () => {
                console.log('📁 Main import button clicked');
                fileInput.click();
            });
            
            // Kết nối sự kiện file input
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
            
            // Cập nhật text cho rõ ràng
            newImportBtn.innerHTML = '📥Nhập';
            
        } else {
            console.log('❌ Main import button not found');
        }
    }

    setupTemplateButton() {
        const templateBtn = document.getElementById('exportTemplateBtn');
        
        if (templateBtn) {
            console.log('🔗 Connecting template button in header');
            
            // Xóa event listeners cũ và thêm mới
            const newTemplateBtn = templateBtn.cloneNode(true);
            templateBtn.parentNode.replaceChild(newTemplateBtn, templateBtn);
            
            newTemplateBtn.addEventListener('click', () => {
                console.log('📋 Template button clicked from header');
                this.exportTemplateFromTable();
            });
            
        } else {
            console.log('❌ Template button not found in header');
        }
    }

    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        console.log('📁 File selected for import:', file.name);
        this.showStatus('⏳ Đang phân tích file...', 'info');
        
        const importBtn = document.getElementById('importExcelBtn');
        if (importBtn) importBtn.disabled = true;
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            console.log('📤 Uploading file to server...');
            const response = await fetch('/api/scores/import', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('📊 Import result:', result);
            
            if (result.success) {
                let message = `✅ ${result.message}`;
                
                if (result.mapping_stats) {
                    message += ` - Đã nhận diện: ${result.mapping_stats.mapped_columns}/${result.mapping_stats.total_columns} cột`;
                }
                
                if (result.data_stats) {
                    const stats = result.data_stats;
                    message += ` - Dữ liệu: ${stats.with_ma_dk} HV, ${stats.with_kt_data} có điểm KT`;
                }
                
                this.showStatus(message, 'success');
                
                // Tự động reload table sau khi import thành công
                setTimeout(() => {
                    const courseSelect = document.getElementById('courseSelect');
                    if (courseSelect && courseSelect.value) {
                        console.log('🔄 Tự động reload table sau import...');
                        courseSelect.dispatchEvent(new Event('change'));
                    }
                }, 1500);
                
            } else {
                throw new Error(result.error || 'Import thất bại');
            }
            
        } catch (error) {
            console.error('❌ Import failed:', error);
            this.showStatus(`❌ Lỗi: ${error.message}`, 'error');
        } finally {
            if (importBtn) importBtn.disabled = false;
            event.target.value = '';
        }
    }
       
    exportTemplateFromTable() {
        console.log('📋 Exporting template...');
        const table = document.getElementById('studentsTable');
        if (!table) {
            alert('❌ Vui lòng chọn khóa học để hiển thị danh sách học viên trước.');
            return;
        }

        try {
            const headers = ['#', 'Mã học viên', 'Họ và tên', 'Giờ cabin', 'Số bài cabin', 'Điểm KTLT', 'Điểm KTMP', 'Điểm KTTH', 'Ngày xét HTKH'];
            
            console.log('📊 Using fixed headers:', headers);

            // Tạo data mẫu
            const sampleData = [headers];
            sampleData.push(['1', 'HV001', 'Nguyễn Văn A', '10.5', '8', '85', '90', '88', '20/10/2024']);
            sampleData.push(['2', 'HV002', 'Trần Thị B', '12.0', '9', '92', '85', '90', '21/10/2024']);

            // Tạo workbook
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(sampleData);
            
            // Style header
            if (ws['!ref']) {
                const headerRange = XLSX.utils.decode_range(ws['!ref']);
                for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
                    const cellAddress = XLSX.utils.encode_cell({r: 0, c: C});
                    if (!ws[cellAddress]) continue;
                    if (!ws[cellAddress].s) ws[cellAddress].s = {};
                    ws[cellAddress].s.font = { bold: true };
                    ws[cellAddress].s.fill = { fgColor: { rgb: "E8F4FD" } };
                    ws[cellAddress].s.border = {
                        bottom: { style: 'thin', color: { rgb: "000000" } }
                    };
                }
            }

            XLSX.utils.book_append_sheet(wb, ws, 'Template_Nhap_Diem');
            
            // Tên file
            const today = new Date();
            const dateStr = today.toLocaleDateString('vi-VN').replace(/\//g, '-');
            const fileName = `Template_Nhap_Diem_${dateStr}.xlsx`;
            
            XLSX.writeFile(wb, fileName);
            
            console.log('✅ Đã export template với cấu trúc chuẩn');
            this.showStatus('✅ Đã tải template thành công!', 'success');
            
        } catch (error) {
            console.error('❌ Export template failed:', error);
            this.showStatus('❌ Lỗi tạo template: ' + error.message, 'error');
        }
    }

    showStatus(message, type = 'info') {
        // Hiển thị status đơn giản bằng alert hoặc console
        if (type === 'error') {
            alert(`❌ ${message}`);
            console.error('❌ ' + message);
        } else if (type === 'success') {
            console.log('✅ ' + message);
            // Hiển thị thông báo thành công
            this.showSuccessNotification(message);
        } else {
            console.log('ℹ️ ' + message);
        }
    }

    showSuccessNotification(message) {
        // Tạo toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 12px 18px;
            border-radius: 6px;
            font-weight: bold;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease-out;
            max-width: 400px;
        `;
        
        // Thêm style animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // Tự động xóa sau 3 giây
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// Khởi tạo khi DOM ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏁 DOM Ready - Initializing ScoresImport');
    try {
        new ScoresImport();
    } catch (error) {
        console.error('💥 Failed to initialize ScoresImport:', error);
    }
});