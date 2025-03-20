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
        // Initialize main components
        this.antennaModel = new AntennaModel();
        this.calculator = new AntennaCalculator();
        this.patternVisualizer = new PatternVisualizer();
        this.chartRenderer = new ChartRenderer();
        this.fileIO = new FileIO(this.antennaModel);
        this.optimizer = new Optimizer(this.antennaModel, this.calculator);
        this.ui = new UI(this);

        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize the application
        this.init();
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
        // Tab navigation
        document.querySelectorAll('.tab-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = e.currentTarget.getAttribute('data-tab');
                this.ui.switchTab(tabId);
            });
        });

        // Run analysis button
        document.getElementById('run-analysis-btn').addEventListener('click', () => {
            this.runAnalysis();
        });

        // Run frequency sweep button
        document.getElementById('run-sweep-btn').addEventListener('click', () => {
            this.runFrequencySweep();
        });

        // Calculate pattern button
        document.getElementById('calculate-pattern-btn').addEventListener('click', () => {
            this.calculatePattern();
        });

        // Optimization button
        document.getElementById('optimize-btn').addEventListener('click', () => {
            this.runOptimization();
        });

        // Preset button
        document.getElementById('load-preset-btn').addEventListener('click', () => {
            this.ui.showModal('presets-modal');
        });

        // Preset selection in modal
        document.querySelectorAll('.preset-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const presetId = e.currentTarget.getAttribute('data-preset');
                this.loadPreset(presetId);
                this.ui.hideModal('presets-modal');
            });
        });

        // Import button
        document.getElementById('import-btn').addEventListener('click', () => {
            this.ui.showModal('import-modal');
        });

        // Import submit button
        document.getElementById('import-submit-btn').addEventListener('click', () => {
            this.importAntenna();
        });

        // Export button
        document.getElementById('export-btn').addEventListener('click', () => {
            this.prepareExport();
        });

        // Copy export button
        document.getElementById('copy-export-btn').addEventListener('click', () => {
            this.copyExportToClipboard();
        });

        // Download export button
        document.getElementById('download-export-btn').addEventListener('click', () => {
            this.downloadExport();
        });

        // Add element button
        document.getElementById('add-element').addEventListener('click', () => {
            this.addElement();
        });

        // Reset view button for 3D pattern
        document.getElementById('reset-view-btn').addEventListener('click', () => {
            this.patternVisualizer.resetView();
        });

        // Change colormap for 3D pattern
        document.getElementById('pattern-colormap').addEventListener('change', (e) => {
            this.patternVisualizer.updateColorMap(e.target.value);
        });

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
        this.ui.showLoading('Calculating antenna performance...');
        
        try {
            // Allow UI to update before starting calculation
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Run the analysis
            const results = await this.calculator.calculateAntennaPerformance(this.antennaModel);
            
            // Update the results on the UI
            this.ui.updateResults(results);
            
            this.ui.hideLoading();
            this.ui.showNotification('Analysis completed');
        } catch (error) {
            console.error('Analysis error:', error);
            this.ui.hideLoading();
            this.ui.showNotification('Error during analysis', true);
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
        
        const blob = new Blob([content], {type: 'text/plain'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fullFilename;
        a.click();
        
        this.ui.showNotification(`Downloaded ${fullFilename}`);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
