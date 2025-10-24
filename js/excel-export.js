// excel-export.js - SỬA LẠI TIÊU ĐỀ ĐẦY ĐỦ
window.excelExport = {
    exportToExcel: function() {
        try {
            if (!window.currentStudents || window.currentStudents.length === 0) {
                alert('Không có dữ liệu học viên để export');
                return;
            }

            console.log('📊 Exporting to Excel with full headers...');
            
            const wb = XLSX.utils.book_new();
            
            // 🎯 TIÊU ĐỀ ĐẦY ĐỦ 19 CỘT
            const headerRows = [
                ['#', 'Mã học viên', 'Họ và tên', 'Pháp luật', 'Đạo đức', 'Cấu tạo oto', 'Kỹ thuật lái', 'Nâng hạng', 'Mô phỏng', 'Giờ cabin', 'Số bài cabin', 'Thời gian TH', 'Quãng đường TH', 'Giờ đêm TH', 'Giờ tự động TH', 'Lý thuyết KT', 'Mô phỏng KT', 'Thực hành KT', 'Hoàn thành KT']
            ];

            // 🎯 LẤY DỮ LIỆU TỪ currentStudents - ĐẢM BẢO ĐÚNG 19 CỘT
            const dataRows = [];
            window.currentStudents.forEach((student, index) => {
                const row = [
                    // 3 cột đầu
                    index + 1,
                    student.ma_dk || '',
                    student.ho_va_ten || '',
                    
                    // 6 cột lý thuyết
                    student.phap_luat || student['Pháp luật giao thông đường bộ'] || 0,
                    student.dao_duc || student['Đạo đức người lái xe'] || 0,
                    student.cau_tao_oto || student['Cấu tạo và sửa chữa'] || 0,
                    student.ky_thuat_lai || student['Kỹ thuật lái xe'] || 0,
                    student.nang_hang || student['Nâng hạng'] || 0,
                    student.mo_phong || student['Mô phỏng'] || 0,
                    
                    // 2 cột cabin
                    student.cabin_gio || 0,
                    student.cabin_bai || 0,
                    
                    // 4 cột thực hành
                    student.outdoor_hour ? (student.outdoor_hour / 3600).toFixed(1) : '0',
                    student.outdoor_distance ? (student.outdoor_distance / 1000).toFixed(1) : '0',
                    student.night_duration ? (student.night_duration / 3600).toFixed(1) : '0',
                    student.auto_duration ? (student.auto_duration / 3600).toFixed(1) : '0',
                    
                    // 4 cột kiểm tra
                    student.kt_lythuyet || 0,
                    student.kt_mophong || 0,
                    student.kt_thuchanh || 0,
                    student.kt_hoanthanh || 'Chưa'
                ];
                
                // 🎯 KIỂM TRA SỐ CỘT
                if (row.length !== 19) {
                    console.warn(`⚠️ Row ${index} has ${row.length} columns, expected 19`);
                }
                
                dataRows.push(row);
            });

            // 🎯 KẾT HỢP TIÊU ĐỀ VÀ DỮ LIỆU
            const allRows = [...headerRows, ...dataRows];
            
            console.log(`✅ Exporting ${allRows.length} rows (1 header + ${dataRows.length} data)`);
            
            const ws = XLSX.utils.aoa_to_sheet(allRows);
            
            // 🎯 THIẾT LẬP STYLE CHO TIÊU ĐỀ
            const headerRange = XLSX.utils.decode_range(ws['!ref']);
            for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
                if (ws[cellAddress]) {
                    if (!ws[cellAddress].s) ws[cellAddress].s = {};
                    ws[cellAddress].s.font = { bold: true };
                    ws[cellAddress].s.fill = { fgColor: { rgb: "DDEBF7" } };
                    ws[cellAddress].s.border = {
                        top: { style: "thin" },
                        left: { style: "thin" },
                        bottom: { style: "thin" }, 
                        right: { style: "thin" }
                    };
                }
            }

            XLSX.utils.book_append_sheet(wb, ws, 'DanhSachHocVien');

            // 🎯 TÊN FILE
            let fileName = 'TienDoDaoTao';
            if (window.currentCourse) {
                const maKhoa = window.currentCourse.ma_khoa_hoc || window.currentCourse.maKhoaHoc || '';
                fileName = `TienDoDaoTao_${maKhoa}_${new Date().toISOString().split('T')[0]}`;
            }

            XLSX.writeFile(wb, `${fileName}.xlsx`);
            console.log('✅ Excel exported successfully with full headers');

        } catch (error) {
            console.error('💥 Export Excel failed:', error);
            alert('Lỗi khi export Excel: ' + error.message);
        }
    }
};