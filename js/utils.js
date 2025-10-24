// js/utils.js - COMPLETE VERSION
console.log('🔧 utils.js is loading...');

// Complete object with all needed methods
window.GlobalUtils = {
    showLoading: function(container = '.table-section') {
        console.log('🔄 GlobalUtils.showLoading called');
        const element = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;
            
        if (element) {
            // Remove existing overlay to avoid duplicates
            const existingOverlay = element.querySelector('.loading-overlay');
            if (existingOverlay) {
                existingOverlay.remove();
            }
            
            // Create new loading overlay
            const loadingOverlay = document.createElement('div');
            loadingOverlay.className = 'loading-overlay';
            loadingOverlay.innerHTML = `
                <div class="loading-spinner"></div>
                <div>Đang tải dữ liệu...</div>
            `;
            
            // Add styles if not exists
            if (!document.querySelector('#loading-styles')) {
                const styles = document.createElement('style');
                styles.id = 'loading-styles';
                styles.textContent = `
                    .loading-overlay {
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(255, 255, 255, 0.9);
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        z-index: 1000;
                    }
                    .loading-spinner {
                        border: 4px solid #f3f3f3;
                        border-top: 4px solid #3498db;
                        border-radius: 50%;
                        width: 40px;
                        height: 40px;
                        animation: spin 1s linear infinite;
                        margin-bottom: 10px;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(styles);
            }
            
            element.style.position = 'relative';
            element.appendChild(loadingOverlay);
            
            console.log('🔄 Loading shown successfully');
        } else {
            console.warn('⚠️ Container element not found for loading');
        }
    },

    hideLoading: function() {
        console.log('🔄 GlobalUtils.hideLoading called');
        const loadingOverlay = document.querySelector('.loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
            console.log('✅ Loading hidden successfully');
        } else {
            console.log('ℹ️ No loading overlay found to hide');
        }
    },

    showError: function(message) {
        console.error('❌ ' + message);
        alert('❌ ' + message);
    },
    
    showSuccess: function(message) {
        console.log('✅ ' + message);
    },
    
    enableExportButton: function() {
        const exportBtn = document.getElementById('exportExcelBtn');
        if (exportBtn) {
            exportBtn.disabled = false;
            console.log('✅ Export button enabled');
        }
    },
    
    disableExportButton: function() {
        const exportBtn = document.getElementById('exportExcelBtn');
        if (exportBtn) {
            exportBtn.disabled = true;
            console.log('✅ Export button disabled');
        }
    },

    updateStudentsCount: function(count) {
        console.log('🔄 GlobalUtils.updateStudentsCount:', count);
        const statsElement = document.querySelector('.header-stats');
        if (statsElement) {
            statsElement.textContent = `${count} học viên`;
        }
        
        // Update students count element if exists
        const studentsCountElement = document.getElementById('studentsCount');
        if (studentsCountElement) {
            studentsCountElement.textContent = `${count} học viên`;
        }
    }
};

console.log('🔧 GlobalUtils assigned to window:', typeof window.GlobalUtils);
console.log('🔧 utils.js loaded completely');