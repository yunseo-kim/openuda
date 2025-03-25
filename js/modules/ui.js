/**
 * OpenUda - Yagi-Uda Antenna Design Web App
 * UI Module
 * 
 * This module handles the user interface elements, including tabs, rendering
 * the antenna sketch, updating result displays, and managing UI interactions.
 */

export class UI {
    constructor(app) {
        this.app = app;
        this.notificationTimeout = null;
        
        // 상태 표시를 위한 DOM 요소 참조
        this.statusElement = document.getElementById('status-display');
        this.notificationElement = document.getElementById('notification');
        
        // 알림 창 닫기 버튼 이벤트 리스너 설정
        this._setupNotificationCloseButton();
    }
    
    /**
     * 알림 창 닫기 버튼 이벤트 리스너를 설정합니다
     * @private
     */
    _setupNotificationCloseButton() {
        if (this.notificationElement) {
            const closeButton = this.notificationElement.querySelector('.notification-close');
            if (closeButton) {
                closeButton.addEventListener('click', () => {
                    this.hideNotification();
                });
            }
        }
    }
    
    /**
     * 알림 창을 숨깁니다
     */
    hideNotification() {
        if (this.notificationElement) {
            this.notificationElement.classList.remove('show');
        }
        
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
            this.notificationTimeout = null;
        }
    }

    /**
     * Initialize the tab navigation
     */
    initTabs() {
        // Set the Design tab as active by default
        this.switchTab('design');
    }

    /**
     * Switch to a different tab
     * @param {string} tabId The ID of the tab to switch to
     */
    switchTab(tabId) {
        // Hide all tab content
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active class from all tab links
        document.querySelectorAll('.tab-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Show the selected tab content
        const selectedTab = document.getElementById(tabId);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }
        
        // Add active class to the clicked tab link
        const activeLink = document.querySelector(`.tab-link[data-tab="${tabId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    /**
     * 대상 뷰의 상태 보기를 업데이트합니다
     * @param {string} message - 표시할 상태 메시지
     * @param {string} type - 상태 타입 ('normal', 'error', 'warning', 'success' 중 하나)
     */
    updateStatus(message, type = 'normal') {
        if (!this.statusElement) {
            this.statusElement = document.getElementById('status-display');
            if (!this.statusElement) {
                console.error('Status display element not found');
                return;
            }
        }
        
        // 기존 상태 클래스 제거
        this.statusElement.classList.remove('error', 'warning', 'success');
        
        // 새 상태 클래스 추가
        if (type !== 'normal') {
            this.statusElement.classList.add(type);
        }
        
        // 상태 텍스트 업데이트
        this.statusElement.textContent = message;
    }
    
    /**
     * 로딩 상태를 표시합니다
     * @param {string} message - 로딩 상태에 표시할 메시지
     */
    showLoading(message = 'Loading...') {
        try {
            // 로딩 오버레이 요소 참조
            const loadingOverlay = document.getElementById('loading-overlay');
            if (!loadingOverlay) {
                console.warn('Loading overlay element not found');
                return;
            }
            
            // 로딩 메시지 업데이트
            const loadingMessage = document.getElementById('loading-message');
            if (loadingMessage) {
                loadingMessage.textContent = message;
            }
            
            // 로딩 오버레이 표시 (클래스 기반 스타일링 사용)
            loadingOverlay.classList.add('active');
            console.log('Loading overlay shown:', message);
        } catch (error) {
            console.error('Error showing loading overlay:', error);
        }
    }
    
    /**
     * 로딩 상태를 숨깁니다
     */
    hideLoading() {
        try {
            // 로딩 오버레이 요소 참조
            const loadingOverlay = document.getElementById('loading-overlay');
            if (!loadingOverlay) {
                console.warn('Loading overlay element not found');
                return;
            }
            
            // 로딩 오버레이 숨김 (클래스 기반 스타일링 사용)
            loadingOverlay.classList.remove('active');
            console.log('Loading overlay hidden');
        } catch (error) {
            console.error('Error hiding loading overlay:', error);
        }
    }
    
    /**
     * 계산 관련 버튼들을 활성화/비활성화 합니다
     * @param {boolean} enabled - 버튼을 활성화할지 여부
     */
    enableCalculationButtons(enabled) {
        const buttons = [
            document.getElementById('run-analysis-btn'),
            document.getElementById('run-sweep-btn'),
            document.getElementById('run-optimization-btn')
        ];
        
        buttons.forEach(button => {
            if (button) {
                if (enabled) {
                    button.disabled = false;
                    button.classList.remove('disabled');
                } else {
                    button.disabled = true;
                    button.classList.add('disabled');
                }
            }
        });
    }
    
    /**
     * 알림 메시지를 표시합니다
     * @param {string} title - 알림 제목
     * @param {string} message - 알림 메시지
     * @param {string} type - 알림 타입 ('info', 'error', 'warning', 'success' 중 하나)
     * @param {number} duration - 알림 표시 시간 (밀리초, 기본 5000ms)
     */
    showNotification(title, message, type = 'info', duration = 5000) {
        if (!this.notificationElement) {
            this.notificationElement = document.getElementById('notification');
            if (!this.notificationElement) {
                console.error('Notification element not found');
                return;
            }
        }
        
        // 기존 알림 제거
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
        }
        
        // 알림 요소 구조 가져오기
        const titleElement = this.notificationElement.querySelector('.notification-title');
        const messageElement = this.notificationElement.querySelector('.notification-message');
        
        if (titleElement) titleElement.textContent = title;
        if (messageElement) messageElement.textContent = message;
        
        // 기존 타입 클래스 제거
        this.notificationElement.classList.remove('info', 'error', 'warning', 'success');
        // 새 타입 클래스 추가
        this.notificationElement.classList.add(type);
        
        // 알림 표시
        this.notificationElement.classList.add('show');
        
        // 일정 시간 후 알림 숨기기
        this.notificationTimeout = setTimeout(() => {
            this.notificationElement.classList.remove('show');
        }, duration);
    }
    
    /**
     * Initialize modal dialogs
     */  
    initModals() {
        // Setup close button functionality for all modals
        document.querySelectorAll('.close-modal').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                const modal = closeBtn.closest('.modal');
                if (modal) {
                    this.hideModal(modal.id);
                }
            });
        });

        // Close modal when clicking outside the content
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });
    }

    /**
     * Show a modal dialog
     * @param {string} modalId The ID of the modal to show
     */
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            document.body.classList.add('modal-open');
        }
    }

    /**
     * Hide a modal dialog
     * @param {string} modalId The ID of the modal to hide
     */
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            document.body.classList.remove('modal-open');
        }
    }

    /**
     * Initialize the antenna sketch canvas
     * @param {object} antennaModel The antenna model to visualize
     */
    initAntennaSketch(antennaModel) {
        try {
            const sketchContainer = document.getElementById('antenna-sketch');
            if (!sketchContainer) {
                console.error('Antenna sketch container not found');
                return;
            }

            this.sketchCanvas = document.createElement('canvas');
            this.sketchCanvas.width = 600;
            this.sketchCanvas.height = 250;
            
            sketchContainer.innerHTML = '';
            sketchContainer.appendChild(this.sketchCanvas);
            
            this.updateAntennaSketch();
        } catch (error) {
            console.error('Error initializing antenna sketch:', error);
        }
    }

    /**
     * Update the antenna sketch visualization
     */
    updateAntennaSketch() {
        try {
            // Canvas 요소 확인
            if (!this.sketchCanvas) {
                console.warn('Skipping antenna sketch update - canvas not initialized');
                return;
            }
            
            const canvas = this.sketchCanvas;
            const ctx = canvas.getContext('2d');
            
            // 안테나 모델 확인
            if (!this.app || !this.app.antennaModel) {
                console.warn('Skipping antenna sketch update - antenna model not available');
                return;
            }
            
            const antenna = this.app.antennaModel;
            
            // Clear the canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Set up coordinate system
            // Y is inverted in canvas, so we flip our drawing
            const centerY = canvas.height / 2;
            const marginX = 50;
            
            // Get the boom length and figure out the scale
            const boomLength = antenna.getBoomLength();
            const drawingWidth = canvas.width - (marginX * 2);
            const scale = drawingWidth / (boomLength > 0 ? boomLength : 1000);
            
            // Find min position to offset everything
            let minPosition = 0;
            if (antenna.elements.length > 0) {
                minPosition = Math.min(...antenna.elements.map(el => el.position));
            }
            
            // Draw the boom
            ctx.beginPath();
            ctx.moveTo(marginX, centerY);
            ctx.lineTo(marginX + drawingWidth, centerY);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw boom measurements
            ctx.font = '12px Arial';
            ctx.fillStyle = '#333';
            
            // Draw 0 point
            ctx.beginPath();
            ctx.moveTo(marginX, centerY - 5);
            ctx.lineTo(marginX, centerY + 5);
            ctx.stroke();
            ctx.fillText('0', marginX - 5, centerY + 20);
            
            // Draw end point
            const endX = marginX + boomLength * scale;
            ctx.beginPath();
            ctx.moveTo(endX, centerY - 5);
            ctx.lineTo(endX, centerY + 5);
            ctx.stroke();
            ctx.fillText(`${boomLength} mm`, endX - 20, centerY + 20);
            
            // Draw elements
            antenna.elements.forEach(element => {
                const xPos = marginX + (element.position - minPosition) * scale;
                const halfLength = element.length / 2;
                
                ctx.beginPath();
                ctx.moveTo(xPos, centerY - halfLength * scale);
                ctx.lineTo(xPos, centerY + halfLength * scale);
                
                // Different styles for different element types
                if (element.type === 'driven') {
                    ctx.strokeStyle = '#e74c3c'; // Red
                    ctx.lineWidth = 3;
                } else if (element.type === 'reflector') {
                    ctx.strokeStyle = '#3498db'; // Blue
                    ctx.lineWidth = 3;
                } else {
                    ctx.strokeStyle = '#2ecc71'; // Green
                    ctx.lineWidth = 2;
                }
                
                ctx.stroke();
                
                // Draw element position
                ctx.fillStyle = '#555';
                ctx.fillText(`${element.position}`, xPos - 10, centerY + 35);
                
                // Draw length indicator
                const lengthLabel = `${element.length}mm`;
                const textWidth = ctx.measureText(lengthLabel).width;
                ctx.fillText(lengthLabel, xPos - textWidth/2, centerY - halfLength * scale - 5);
            });
            
            // Draw legend
            const legendX = 10;
            const legendY = 10;
            const legendSpacing = 18;
            
            // Driven element
            ctx.strokeStyle = '#e74c3c';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(legendX, legendY);
            ctx.lineTo(legendX + 20, legendY);
            ctx.stroke();
            ctx.fillStyle = '#000';
            ctx.fillText('Driven Element', legendX + 30, legendY + 4);
            
            // Reflector
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(legendX, legendY + legendSpacing);
            ctx.lineTo(legendX + 20, legendY + legendSpacing);
            ctx.stroke();
            ctx.fillText('Reflector', legendX + 30, legendY + legendSpacing + 4);
            
            // Director
            ctx.strokeStyle = '#2ecc71';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(legendX, legendY + (legendSpacing * 2));
            ctx.lineTo(legendX + 20, legendY + (legendSpacing * 2));
            ctx.stroke();
            ctx.fillText('Director', legendX + 30, legendY + (legendSpacing * 2) + 4);
            
            // Frequency and wavelength
            const freq = antenna.centerFrequency;
            const wavelength = 300000 / freq;
            ctx.fillText(`f: ${freq} MHz`, legendX + 120, legendY + 4);
            ctx.fillText(`λ: ${wavelength.toFixed(1)} mm`, legendX + 120, legendY + (legendSpacing * 2));
        } catch (error) {
            console.error('Error updating antenna sketch:', error);
        }
    }

    /**
     * Update the elements list in the UI
     */
    updateElementsList() {
        try {
            const container = document.getElementById('elements-container');
            if (!container) {
                console.warn('Elements container not found');
                return;
            }
            
            if (!this.app || !this.app.antennaModel) {
                console.warn('Antenna model not available');
                return;
            }
            
            const antenna = this.app.antennaModel;
            
            // Clear existing elements
            container.innerHTML = '';
            
            // Add each element to the list
            antenna.elements.forEach((element, index) => {
                const elementDiv = document.createElement('div');
                elementDiv.className = 'element-item';
                elementDiv.dataset.index = index;
                
                // Element type selector
                const typeSelect = document.createElement('select');
                typeSelect.innerHTML = `
                    <option value="reflector" ${element.type === 'reflector' ? 'selected' : ''}>Reflector</option>
                    <option value="driven" ${element.type === 'driven' ? 'selected' : ''}>Driven</option>
                    <option value="director" ${element.type === 'director' ? 'selected' : ''}>Director</option>
                `;
                typeSelect.addEventListener('change', (e) => {
                    this.app.updateElement(index, 'type', e.target.value);
                });
                
                // Length input
                const lengthInput = document.createElement('input');
                lengthInput.type = 'number';
                lengthInput.value = element.length;
                lengthInput.min = 1;
                lengthInput.step = 1;
                lengthInput.addEventListener('change', (e) => {
                    this.app.updateElement(index, 'length', parseFloat(e.target.value));
                });
                
                // Position input
                const posInput = document.createElement('input');
                posInput.type = 'number';
                posInput.value = element.position;
                posInput.step = 1;
                posInput.addEventListener('change', (e) => {
                    this.app.updateElement(index, 'position', parseFloat(e.target.value));
                });
                
                // Diameter input
                const diaInput = document.createElement('input');
                diaInput.type = 'number';
                diaInput.value = element.diameter;
                diaInput.min = 1;
                diaInput.step = 0.1;
                diaInput.addEventListener('change', (e) => {
                    this.app.updateElement(index, 'diameter', parseFloat(e.target.value));
                });
                
                // Actions
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'element-actions';
                
                const deleteButton = document.createElement('button');
                deleteButton.innerHTML = '&times;';
                deleteButton.className = 'btn-small';
                deleteButton.addEventListener('click', () => {
                    this.app.removeElement(index);
                });
                
                // Append everything
                actionsDiv.appendChild(deleteButton);
                
                elementDiv.appendChild(typeSelect);
                elementDiv.appendChild(lengthInput);
                elementDiv.appendChild(posInput);
                elementDiv.appendChild(diaInput);
                elementDiv.appendChild(actionsDiv);
                
                container.appendChild(elementDiv);
            });
        } catch (error) {
            console.error('Error updating elements list:', error);
        }
    }

    /**
     * Update the UI with current model data
     */
    updateUI() {
        try {
            if (!this.app || !this.app.antennaModel) {
                console.warn('Antenna model not available for UI update');
                return;
            }
            
            const antenna = this.app.antennaModel;
            
            // Update frequency field
            document.getElementById('center-frequency').value = antenna.centerFrequency;
            document.getElementById('pattern-frequency').value = antenna.centerFrequency;
            
            // Update sweep frequency fields if they're empty
            const freqStart = document.getElementById('frequency-start');
            const freqEnd = document.getElementById('frequency-end');
            
            if (!freqStart.value) {
                freqStart.value = (antenna.centerFrequency * 0.97).toFixed(1);
            }
            
            if (!freqEnd.value) {
                freqEnd.value = (antenna.centerFrequency * 1.03).toFixed(1);
            }
            
            // Update boom settings
            document.getElementById('boom-diameter').value = antenna.boomDiameter;
            document.getElementById('boom-material').value = antenna.boomMaterial;
            
            // Update elements list
            this.updateElementsList();
        } catch (error) {
            console.error('Error updating UI:', error);
        }
    }

    /**
     * Update the results display with calculation results
     * @param {object} results The calculation results
     */
    updateResults(results) {
        try {
            if (!results) return;
            
            // Update the quick results panel
            if (results.gain !== undefined) {
                document.getElementById('result-gain').textContent = results.gain.toFixed(2) + ' dBi';
            }
            
            if (results.fbRatio !== undefined) {
                document.getElementById('result-fb').textContent = results.fbRatio.toFixed(2) + ' dB';
            }
            
            if (results.impedance !== undefined) {
                const impedance = results.impedance;
                document.getElementById('result-impedance').textContent = 
                    `${impedance.r.toFixed(1)} + j${impedance.x.toFixed(1)} Ω`;
            }
            
            if (results.vswr !== undefined) {
                document.getElementById('result-vswr').textContent = results.vswr.toFixed(2);
            }
            
            if (results.beamwidth !== undefined) {
                document.getElementById('result-beamwidth').textContent = results.beamwidth.toFixed(1) + '°';
            }
        } catch (error) {
            console.error('Error updating results:', error);
        }
    }
}
