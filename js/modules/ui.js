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
            modal.style.display = 'block';
            
            // Reset form fields if necessary
            if (modalId === 'import-modal') {
                document.getElementById('import-file').value = '';
                document.getElementById('import-text').value = '';
            }
        }
    }

    /**
     * Hide a modal dialog
     * @param {string} modalId The ID of the modal to hide
     */
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Show a loading indicator
     * @param {string} message Message to display
     */
    showLoading(message = 'Processing...') {
        const loadingOverlay = document.getElementById('loading-overlay');
        const loadingMessage = document.getElementById('loading-message');
        
        loadingMessage.textContent = message;
        loadingOverlay.classList.remove('hidden');
    }

    /**
     * Hide the loading indicator
     */
    hideLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.classList.add('hidden');
    }

    /**
     * Show a notification message
     * @param {string} message Message to display
     * @param {boolean} isError Whether this is an error message
     */
    showNotification(message, isError = false) {
        const statusMessage = document.getElementById('status-message');
        
        statusMessage.textContent = message;
        statusMessage.style.color = isError ? 'var(--error-color)' : 'var(--success-color)';
        
        // Clear any existing timeout
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
        }
        
        // Reset the status after 5 seconds
        this.notificationTimeout = setTimeout(() => {
            statusMessage.textContent = 'Ready';
            statusMessage.style.color = '';
        }, 5000);
    }

    /**
     * Initialize the antenna sketch canvas
     * @param {object} antennaModel The antenna model to visualize
     */
    initAntennaSketch(antennaModel) {
        this.sketchCanvas = document.createElement('canvas');
        this.sketchCanvas.width = 600;
        this.sketchCanvas.height = 250;
        
        const sketchContainer = document.getElementById('antenna-sketch');
        sketchContainer.innerHTML = '';
        sketchContainer.appendChild(this.sketchCanvas);
        
        this.updateAntennaSketch();
    }

    /**
     * Update the antenna sketch visualization
     */
    updateAntennaSketch() {
        const canvas = this.sketchCanvas;
        const ctx = canvas.getContext('2d');
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
        const minPosition = Math.min(...antenna.elements.map(el => el.position), 0);
        const xOffset = marginX - (minPosition * scale);
        
        // Draw the boom
        const boomY = centerY;
        const boomHeight = antenna.boomDiameter * scale;
        const boomStartX = marginX;
        const boomWidth = drawingWidth;
        
        ctx.fillStyle = antenna.boomMaterial === 'metal' ? '#888' : '#a97e46';
        ctx.fillRect(boomStartX, boomY - (boomHeight / 2), boomWidth, boomHeight);
        
        // Draw each element
        antenna.elements.forEach((element, index) => {
            const x = element.position * scale + xOffset;
            const halfLength = element.length / 2 * scale;
            const elementDiameter = element.diameter * scale;
            const elementWidth = Math.max(1, elementDiameter); // Ensure visible
            
            // Set color based on element type
            switch(element.type) {
                case 'reflector':
                    ctx.fillStyle = '#e74c3c'; // Red
                    break;
                case 'driven':
                    ctx.fillStyle = '#2ecc71'; // Green
                    break;
                case 'director':
                    ctx.fillStyle = '#3498db'; // Blue
                    break;
                default:
                    ctx.fillStyle = '#95a5a6'; // Gray
            }
            
            // Draw the element
            ctx.fillRect(x - (elementWidth / 2), centerY - halfLength, elementWidth, element.length * scale);
            
            // Add label
            ctx.fillStyle = '#000';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            
            // Top label (element #)
            ctx.fillText(`#${index + 1}`, x, centerY - halfLength - 5);
            
            // Bottom label (position)
            ctx.fillText(`${element.position}mm`, x, centerY + halfLength + 15);
        });
        
        // Add legend
        const legendX = 15;
        const legendY = 30;
        const legendSpacing = 20;
        
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        
        // Reflector
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(legendX, legendY - 10, 15, 10);
        ctx.fillStyle = '#000';
        ctx.fillText('Reflector', legendX + 20, legendY);
        
        // Driven
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(legendX, legendY + legendSpacing - 10, 15, 10);
        ctx.fillStyle = '#000';
        ctx.fillText('Driven', legendX + 20, legendY + legendSpacing);
        
        // Director
        ctx.fillStyle = '#3498db';
        ctx.fillRect(legendX, legendY + (legendSpacing * 2) - 10, 15, 10);
        ctx.fillStyle = '#000';
        ctx.fillText('Director', legendX + 20, legendY + (legendSpacing * 2));
        
        // Boom type
        ctx.fillStyle = antenna.boomMaterial === 'metal' ? '#888' : '#a97e46';
        ctx.fillRect(legendX + 120, legendY - 10, 15, 10);
        ctx.fillStyle = '#000';
        ctx.fillText(`Boom: ${antenna.boomMaterial}`, legendX + 140, legendY);
        
        // Frequency
        ctx.fillText(`Frequency: ${antenna.centerFrequency} MHz`, legendX + 120, legendY + legendSpacing);
        
        // Wavelength
        const wavelength = antenna.getWavelength();
        ctx.fillText(`λ: ${wavelength.toFixed(1)} mm`, legendX + 120, legendY + (legendSpacing * 2));
    }

    /**
     * Update the elements list in the UI
     */
    updateElementsList() {
        const container = document.getElementById('elements-container');
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
    }

    /**
     * Update the UI with current model data
     */
    updateUI() {
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
    }

    /**
     * Update the results display with calculation results
     * @param {object} results The calculation results
     */
    updateResults(results) {
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
    }
}
