/**
 * OpenUda - Yagi-Uda Antenna Design Web App
 * Main Application Module
 */

import { AntennaModel } from './modules/antenna-model.js';
import { UI } from './modules/ui.js';
import { AntennaCalculator } from './modules/calculator.js';
import { PatternVisualizer } from './modules/pattern-visualizer.js';
import { ChartRenderer } from './modules/chart-renderer.js';
import { FileIO } from './modules/file-io.js';
import { Optimizer } from './modules/optimizer.js';
import { Presets } from './modules/presets.js';

// Main application class
class App {
    constructor() {
        try {
            // Initialize main components
            console.log('Creating antenna model...');
            this.antennaModel = new AntennaModel();
            
            console.log('Initializing calculator...');
            this.calculator = new AntennaCalculator();
            
            console.log('Setting up pattern visualizer...');
            this.patternVisualizer = new PatternVisualizer();
            
            console.log('Setting up chart renderer...');
            this.chartRenderer = new ChartRenderer();
            
            console.log('Initializing file IO...');
            this.fileIO = new FileIO(this.antennaModel);
            
            console.log('Setting up optimizer...');
            this.optimizer = new Optimizer(this.antennaModel, this.calculator);
            
            console.log('Initializing UI...');
            this.ui = new UI(this);

            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize the application
            this.init();
            
        } catch (error) {
            console.error('Error during application initialization:', error);
            throw error; // Re-throw to be caught by the DOMContentLoaded handler
        }
    }

    init() {
        // Initialize UI tabs
        this.ui.initTabs();
        
        // Initialize modals
        this.ui.initModals();
        
        // Load a default antenna model
        this.loadDefaultAntenna();
        
        // Initialize antenna sketch
        this.ui.initAntennaSketch(this.antennaModel);
        
        console.log('OpenUda application initialized');
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Tab navigation
        document.querySelectorAll('.tab-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = e.currentTarget.getAttribute('data-tab');
                this.ui.switchTab(tabId);
                console.log(`Switched to tab: ${tabId}`);
            });
        });

        // Run analysis button
        const runAnalysisBtn = document.getElementById('run-analysis-btn');
        if (runAnalysisBtn) {
            runAnalysisBtn.addEventListener('click', () => {
                console.log('Run analysis button clicked');
                this.runAnalysis();
            });
        } else {
            console.error('Run analysis button not found in DOM');
        }

        // Run frequency sweep button
        const runSweepBtn = document.getElementById('run-sweep-btn');
        if (runSweepBtn) {
            runSweepBtn.addEventListener('click', () => {
                console.log('Run frequency sweep button clicked');
                this.runFrequencySweep();
            });
        } else {
            console.error('Run sweep button not found in DOM');
        }

        // Calculate pattern button
        const calculatePatternBtn = document.getElementById('calculate-pattern-btn');
        if (calculatePatternBtn) {
            calculatePatternBtn.addEventListener('click', () => {
                console.log('Calculate pattern button clicked');
                this.calculatePattern();
            });
        } else {
            console.error('Calculate pattern button not found in DOM');
        }

        // Optimization button
        const optimizeBtn = document.getElementById('optimize-btn');
        if (optimizeBtn) {
            optimizeBtn.addEventListener('click', () => {
                console.log('Optimize button clicked');
                this.runOptimization();
            });
        } else {
            console.error('Optimize button not found in DOM');
        }

        // Preset button
        const loadPresetBtn = document.getElementById('load-preset-btn');
        if (loadPresetBtn) {
            loadPresetBtn.addEventListener('click', () => {
                console.log('Load preset button clicked');
                this.ui.showModal('presets-modal');
            });
        } else {
            console.error('Load preset button not found in DOM');
        }

        // Preset selection in modal
        document.querySelectorAll('.preset-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const presetId = e.currentTarget.getAttribute('data-preset');
                console.log(`Loading preset: ${presetId}`);
                this.loadPreset(presetId);
                this.ui.hideModal('presets-modal');
            });
        });

        // Import button
        const importBtn = document.getElementById('import-btn');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                console.log('Import button clicked');
                this.ui.showModal('import-modal');
            });
        } else {
            console.error('Import button not found in DOM');
        }

        // Import submit button
        const importSubmitBtn = document.getElementById('import-submit-btn');
        if (importSubmitBtn) {
            importSubmitBtn.addEventListener('click', () => {
                console.log('Import submit button clicked');
                this.importAntenna();
            });
        } else {
            console.error('Import submit button not found in DOM');
        }

        // Export button
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                console.log('Export button clicked');
                this.prepareExport();
            });
        } else {
            console.error('Export button not found in DOM');
        }

        // Copy export button
        const copyExportBtn = document.getElementById('copy-export-btn');
        if (copyExportBtn) {
            copyExportBtn.addEventListener('click', () => {
                console.log('Copy export button clicked');
                this.copyExportToClipboard();
            });
        } else {
            console.error('Copy export button not found in DOM');
        }

        // Download export button
        const downloadExportBtn = document.getElementById('download-export-btn');
        if (downloadExportBtn) {
            downloadExportBtn.addEventListener('click', () => {
                console.log('Download export button clicked');
                this.downloadExport();
            });
        } else {
            console.error('Download export button not found in DOM');
        }

        // Add element button
        const addElementBtn = document.getElementById('add-element');
        if (addElementBtn) {
            addElementBtn.addEventListener('click', () => {
                console.log('Add element button clicked');
                this.addElement();
            });
        } else {
            console.error('Add element button not found in DOM');
        }

        // Reset view button for 3D pattern
        const resetViewBtn = document.getElementById('reset-view-btn');
        if (resetViewBtn) {
            resetViewBtn.addEventListener('click', () => {
                console.log('Reset view button clicked');
                this.patternVisualizer.resetView();
            });
        } else {
            console.error('Reset view button not found in DOM');
        }

        // Change colormap for 3D pattern
        const patternColormap = document.getElementById('pattern-colormap');
        if (patternColormap) {
            patternColormap.addEventListener('change', (e) => {
                console.log(`Changed colormap to: ${e.target.value}`);
                this.patternVisualizer.updateColorMap(e.target.value);
            });
        } else {
            console.error('Pattern colormap select not found in DOM');
        }

        // Center frequency change
        document.getElementById('center-frequency').addEventListener('change', (e) => {
            this.antennaModel.centerFrequency = parseFloat(e.target.value);
            this.ui.updateUI();
        });

        // Boom settings changes
        document.getElementById('boom-diameter').addEventListener('change', (e) => {
            this.antennaModel.boomDiameter = parseFloat(e.target.value);
            this.ui.updateAntennaSketch();
        });

        document.getElementById('boom-material').addEventListener('change', (e) => {
            this.antennaModel.boomMaterial = e.target.value;
        });
    }

    loadDefaultAntenna() {
        // Load a default 3-element Yagi for 144 MHz
        this.antennaModel.centerFrequency = 144; // MHz
        
        // Clear existing elements
        this.antennaModel.elements = [];
        
        // Add reflector
        this.antennaModel.addElement({
            type: 'reflector',
            length: 1030, // mm
            position: 0,  // mm (reference point)
            diameter: 10  // mm
        });
        
        // Add driven element
        this.antennaModel.addElement({
            type: 'driven',
            length: 980, // mm
            position: 400, // mm
            diameter: 10  // mm
        });
        
        // Add director
        this.antennaModel.addElement({
            type: 'director',
            length: 930, // mm
            position: 800, // mm
            diameter: 10  // mm
        });
        
        // Set boom properties
        this.antennaModel.boomDiameter = 20; // mm
        this.antennaModel.boomMaterial = 'nonmetal';
        
        // Update UI with the loaded model
        this.ui.updateElementsList();
        this.ui.updateAntennaSketch();
    }

    loadPreset(presetId) {
        const preset = Presets.getPreset(presetId);
        if (preset) {
            this.antennaModel.loadFromPreset(preset);
            this.ui.updateElementsList();
            this.ui.updateAntennaSketch();
            this.ui.showNotification(`Loaded preset: ${preset.name}`);
        }
    }

    addElement() {
        // Get last element position to place new element
        const lastPosition = this.antennaModel.elements.length > 0 
            ? Math.max(...this.antennaModel.elements.map(el => el.position)) 
            : 0;
        
        // Add new director by default
        this.antennaModel.addElement({
            type: 'director',
            length: 900, // mm (default value)
            position: lastPosition + 400, // mm (400mm after last element)
            diameter: 10  // mm
        });
        
        this.ui.updateElementsList();
        this.ui.updateAntennaSketch();
    }

    removeElement(index) {
        this.antennaModel.removeElement(index);
        this.ui.updateElementsList();
        this.ui.updateAntennaSketch();
    }

    updateElement(index, property, value) {
        this.antennaModel.updateElement(index, property, value);
        this.ui.updateAntennaSketch();
    }

    async runAnalysis() {
        console.log('Running antenna analysis...');
        this.ui.showLoading('Calculating antenna performance...');
        
        try {
            // Allow UI to update before starting calculation
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Check if calculator is ready
            if (!this.calculator.isReady) {
                console.log('Waiting for calculator engine to initialize...');
                await this.calculator._waitForEngine();
            }
            
            // Run the analysis
            console.log('Starting analysis with model:', this.antennaModel);
            const results = await this.calculator.calculateAntennaPerformance(this.antennaModel);
            console.log('Analysis results:', results);
            
            // Update the results on the UI
            this.ui.updateResults(results);
            
            this.ui.hideLoading();
            this.ui.showNotification('Analysis completed');
        } catch (error) {
            console.error('Analysis error:', error);
            this.ui.hideLoading();
            this.ui.showNotification('Error during analysis: ' + error.message, true);
        }
    }

    async runFrequencySweep() {
        this.ui.showLoading('Running frequency sweep analysis...');
        
        try {
            // Get frequency range from UI
            const start = parseFloat(document.getElementById('frequency-start').value);
            const end = parseFloat(document.getElementById('frequency-end').value);
            const steps = parseInt(document.getElementById('frequency-steps').value);
            
            // Allow UI to update before starting calculation
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Run the sweep
            const sweepResults = await this.calculator.calculateFrequencySweep(
                this.antennaModel, start, end, steps
            );
            
            // Update charts with the results
            this.chartRenderer.renderFrequencyCharts(sweepResults);
            
            this.ui.hideLoading();
            this.ui.showNotification('Frequency sweep completed');
        } catch (error) {
            console.error('Frequency sweep error:', error);
            this.ui.hideLoading();
            this.ui.showNotification('Error during frequency sweep', true);
        }
    }

    async calculatePattern() {
        this.ui.showLoading('Calculating radiation pattern...');
        
        try {
            // Get pattern frequency from UI
            const frequency = parseFloat(document.getElementById('pattern-frequency').value);
            const resolution = document.getElementById('pattern-resolution').value;
            
            // Set resolution step sizes
            const stepSizes = {
                'low': 5,
                'medium': 2,
                'high': 1
            };
            const step = stepSizes[resolution] || 2;
            
            // Allow UI to update before starting calculation
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Calculate the pattern
            const patternData = await this.calculator.calculateRadiationPattern(
                this.antennaModel, frequency, step
            );
            
            // Render the 2D patterns
            this.chartRenderer.renderPolarPatterns(patternData);
            
            // Render the 3D pattern
            this.patternVisualizer.renderPattern3D(patternData);
            
            this.ui.hideLoading();
            this.ui.showNotification('Pattern calculation completed');
        } catch (error) {
            console.error('Pattern calculation error:', error);
            this.ui.hideLoading();
            this.ui.showNotification('Error during pattern calculation', true);
        }
    }

    async runOptimization() {
        this.ui.showLoading('Optimizing antenna design...');
        
        try {
            // Get optimization goal from UI
            const goal = document.getElementById('optimization-goal').value;
            
            // Allow UI to update before starting optimization
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Run the optimization
            const optimizationResult = await this.optimizer.optimize(goal);
            
            // Update the model with optimized parameters
            this.antennaModel.loadFromModel(optimizationResult.model);
            
            // Update UI with new model
            this.ui.updateElementsList();
            this.ui.updateAntennaSketch();
            
            // Show optimization results
            this.ui.updateResults(optimizationResult.performance);
            
            this.ui.hideLoading();
            this.ui.showNotification(`Optimization completed: ${optimizationResult.improvement.toFixed(2)}% improvement`);
        } catch (error) {
            console.error('Optimization error:', error);
            this.ui.hideLoading();
            this.ui.showNotification('Error during optimization', true);
        }
    }

    importAntenna() {
        try {
            const file = document.getElementById('import-file').files[0];
            const text = document.getElementById('import-text').value;
            
            if (file) {
                this.fileIO.importFromFile(file)
                    .then(() => {
                        this.ui.updateElementsList();
                        this.ui.updateAntennaSketch();
                        this.ui.hideModal('import-modal');
                        this.ui.showNotification('Antenna design imported successfully');
                    })
                    .catch(error => {
                        console.error('Import error:', error);
                        this.ui.showNotification('Error importing antenna design', true);
                    });
            } else if (text) {
                this.fileIO.importFromText(text);
                this.ui.updateElementsList();
                this.ui.updateAntennaSketch();
                this.ui.hideModal('import-modal');
                this.ui.showNotification('Antenna design imported successfully');
            } else {
                this.ui.showNotification('No file or text provided for import', true);
            }
        } catch (error) {
            console.error('Import error:', error);
            this.ui.showNotification('Error importing antenna design', true);
        }
    }

    prepareExport() {
        const format = document.getElementById('export-format').value;
        const filename = document.getElementById('export-filename').value;
        
        try {
            const exportText = this.fileIO.generateExport(format);
            document.getElementById('export-text').value = exportText;
            document.getElementById('export-filename').value = filename || 'antenna_design';
            
            this.ui.showModal('export-modal');
        } catch (error) {
            console.error('Export preparation error:', error);
            this.ui.showNotification('Error preparing export', true);
        }
    }

    copyExportToClipboard() {
        const exportText = document.getElementById('export-text');
        exportText.select();
        document.execCommand('copy');
        this.ui.showNotification('Copied to clipboard');
    }

    downloadExport() {
        const format = document.getElementById('export-format').value;
        const filename = document.getElementById('export-filename').value || 'antenna_design';
        const content = document.getElementById('export-text').value;
        
        const extensions = {
            'json': '.json',
            'nec': '.nec',
            'yc6': '.yc6'
        };
        
        const extension = extensions[format] || '.txt';
        const fullFilename = filename + extension;
        
        // Create a blob with the content
        const blob = new Blob([content], {type: 'text/plain'});
        
        // Create a temporary download link
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = fullFilename;
        
        // Trigger the download
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        this.ui.showNotification(`Exported to ${fullFilename}`);
        this.ui.hideModal('export-modal');


    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('Initializing OpenUda application...');
        window.app = new App();
        console.log('OpenUda application successfully initialized');
    } catch (error) {
        console.error('Failed to initialize application:', error);
        // Display error on UI if possible
        const statusMessage = document.getElementById('status-message');
        if (statusMessage) {
            statusMessage.textContent = 'Initialization error';
            statusMessage.style.color = 'var(--error-color)';
        }
    }
});
