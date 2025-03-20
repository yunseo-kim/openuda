/**
 * Chart.js - JavaScript Charting Library
 * 
 * This is a minimal version of Chart.js for the OpenUda application
 * Full Chart.js can be found at: https://www.chartjs.org/
 */

// The main Chart class
class Chart {
    constructor(ctx, config) {
        this.ctx = ctx;
        this.config = config;
        this.data = config.data || { datasets: [] };
        this.options = config.options || {};
        this.type = config.type || 'line';
        this.width = ctx.canvas.width;
        this.height = ctx.canvas.height;
        
        // Internal state
        this._animations = [];
        this._tooltipActive = false;
        
        // Initialize the chart
        this._init();
    }
    
    _init() {
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Set up event listeners for interactions
        this._setupEventListeners();
        
        // Render the chart
        this._render();
    }
    
    _setupEventListeners() {
        if (!this.ctx.canvas) return;
        
        const canvas = this.ctx.canvas;
        
        // Mouse move for tooltips
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // In a full implementation, this would handle tooltips
            this._handleTooltip(x, y);
        });
        
        // Mouse out to hide tooltips
        canvas.addEventListener('mouseout', () => {
            this._tooltipActive = false;
            this._render();
        });
    }
    
    _handleTooltip(x, y) {
        // In a full implementation, this would determine if a tooltip should be shown
        // For this simplified version, we'll just simulate the behavior
        this._tooltipActive = true;
        this._render();
    }
    
    _render() {
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Render based on chart type
        switch (this.type) {
            case 'line':
                this._renderLineChart();
                break;
            case 'bar':
                this._renderBarChart();
                break;
            case 'radar':
                this._renderRadarChart();
                break;
            case 'polarArea':
                this._renderPolarAreaChart();
                break;
            default:
                this._renderLineChart();
        }
        
        // Render tooltips if active
        if (this._tooltipActive) {
            this._renderTooltip();
        }
    }
    
    _renderLineChart() {
        const ctx = this.ctx;
        const datasets = this.data.datasets || [];
        const labels = this.data.labels || [];
        
        if (datasets.length === 0 || labels.length === 0) return;
        
        // Calculate scales
        const xScale = this.width / (labels.length - 1 || 1);
        let minY = Number.MAX_VALUE;
        let maxY = Number.MIN_VALUE;
        
        // Find min and max values
        datasets.forEach(dataset => {
            dataset.data.forEach(value => {
                minY = Math.min(minY, value);
                maxY = Math.max(maxY, value);
            });
        });
        
        // Add padding to min/max
        const padding = (maxY - minY) * 0.1;
        minY = Math.max(0, minY - padding);
        maxY = maxY + padding;
        
        const yScale = this.height / (maxY - minY || 1);
        
        // Draw axes if enabled
        if (this.options.scales && this.options.scales.x && this.options.scales.y) {
            this._drawAxes(minY, maxY, labels);
        }
        
        // Draw each dataset
        datasets.forEach(dataset => {
            ctx.beginPath();
            ctx.lineWidth = dataset.borderWidth || 2;
            ctx.strokeStyle = dataset.borderColor || '#007bff';
            
            // Draw lines
            dataset.data.forEach((value, index) => {
                const x = index * xScale;
                const y = this.height - ((value - minY) * yScale);
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            
            ctx.stroke();
            
            // Draw points if enabled
            if (dataset.pointRadius) {
                dataset.data.forEach((value, index) => {
                    const x = index * xScale;
                    const y = this.height - ((value - minY) * yScale);
                    
                    ctx.beginPath();
                    ctx.arc(x, y, dataset.pointRadius, 0, Math.PI * 2);
                    ctx.fillStyle = dataset.pointBackgroundColor || dataset.borderColor || '#007bff';
                    ctx.fill();
                });
            }
        });
    }
    
    _renderBarChart() {
        const ctx = this.ctx;
        const datasets = this.data.datasets || [];
        const labels = this.data.labels || [];
        
        if (datasets.length === 0 || labels.length === 0) return;
        
        // Calculate scales
        const barCount = datasets.length;
        const barWidth = (this.width / (labels.length * barCount)) * 0.8;
        const xScale = this.width / labels.length;
        
        let minY = Number.MAX_VALUE;
        let maxY = Number.MIN_VALUE;
        
        // Find min and max values
        datasets.forEach(dataset => {
            dataset.data.forEach(value => {
                minY = Math.min(minY, value);
                maxY = Math.max(maxY, value);
            });
        });
        
        // Add padding to min/max
        const padding = (maxY - minY) * 0.1;
        minY = Math.max(0, minY - padding);
        maxY = maxY + padding;
        
        const yScale = this.height / (maxY - minY || 1);
        
        // Draw axes if enabled
        if (this.options.scales && this.options.scales.x && this.options.scales.y) {
            this._drawAxes(minY, maxY, labels);
        }
        
        // Draw each dataset
        datasets.forEach((dataset, datasetIndex) => {
            ctx.fillStyle = dataset.backgroundColor || '#007bff';
            
            dataset.data.forEach((value, index) => {
                const xOffset = (index * xScale) + (datasetIndex * barWidth);
                const height = (value - minY) * yScale;
                const y = this.height - height;
                
                ctx.fillRect(xOffset, y, barWidth, height);
            });
        });
    }
    
    _renderRadarChart() {
        const ctx = this.ctx;
        const datasets = this.data.datasets || [];
        const labels = this.data.labels || [];
        
        if (datasets.length === 0 || labels.length === 0) return;
        
        // Calculate center and radius
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const radius = Math.min(centerX, centerY) * 0.8;
        
        // Calculate angle step
        const angleStep = (Math.PI * 2) / labels.length;
        
        // Find max value for scaling
        let maxValue = Number.MIN_VALUE;
        datasets.forEach(dataset => {
            dataset.data.forEach(value => {
                maxValue = Math.max(maxValue, value);
            });
        });
        
        // Draw background grid
        this._drawRadarGrid(centerX, centerY, radius, labels, angleStep);
        
        // Draw each dataset
        datasets.forEach(dataset => {
            ctx.beginPath();
            ctx.lineWidth = dataset.borderWidth || 2;
            ctx.strokeStyle = dataset.borderColor || '#007bff';
            
            if (dataset.backgroundColor) {
                ctx.fillStyle = dataset.backgroundColor;
            }
            
            // Draw radar shape
            dataset.data.forEach((value, index) => {
                const normalizedValue = value / maxValue;
                const angle = index * angleStep - Math.PI / 2; // Start from top
                const x = centerX + radius * normalizedValue * Math.cos(angle);
                const y = centerY + radius * normalizedValue * Math.sin(angle);
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            
            // Close the path
            ctx.closePath();
            
            // Fill if background color is set
            if (dataset.backgroundColor) {
                ctx.globalAlpha = 0.5; // Semi-transparent
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }
            
            // Stroke the path
            ctx.stroke();
            
            // Draw points if enabled
            if (dataset.pointRadius) {
                dataset.data.forEach((value, index) => {
                    const normalizedValue = value / maxValue;
                    const angle = index * angleStep - Math.PI / 2; // Start from top
                    const x = centerX + radius * normalizedValue * Math.cos(angle);
                    const y = centerY + radius * normalizedValue * Math.sin(angle);
                    
                    ctx.beginPath();
                    ctx.arc(x, y, dataset.pointRadius, 0, Math.PI * 2);
                    ctx.fillStyle = dataset.pointBackgroundColor || dataset.borderColor || '#007bff';
                    ctx.fill();
                });
            }
        });
    }
    
    _renderPolarAreaChart() {
        const ctx = this.ctx;
        const dataset = this.data.datasets ? this.data.datasets[0] : null;
        const labels = this.data.labels || [];
        
        if (!dataset || dataset.data.length === 0 || labels.length === 0) return;
        
        // Calculate center and radius
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const radius = Math.min(centerX, centerY) * 0.8;
        
        // Calculate angle step
        const angleStep = (Math.PI * 2) / labels.length;
        
        // Find max value for scaling
        let maxValue = Number.MIN_VALUE;
        dataset.data.forEach(value => {
            maxValue = Math.max(maxValue, value);
        });
        
        // Draw each sector
        dataset.data.forEach((value, index) => {
            const normalizedValue = value / maxValue;
            const startAngle = index * angleStep - Math.PI / 2;
            const endAngle = (index + 1) * angleStep - Math.PI / 2;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius * normalizedValue, startAngle, endAngle);
            ctx.closePath();
            
            // Fill with background color
            ctx.fillStyle = dataset.backgroundColor[index] || '#007bff';
            ctx.fill();
            
            // Draw border if specified
            if (dataset.borderWidth) {
                ctx.lineWidth = dataset.borderWidth;
                ctx.strokeStyle = dataset.borderColor || '#ffffff';
                ctx.stroke();
            }
        });
        
        // Draw labels
        ctx.fillStyle = '#000000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        
        labels.forEach((label, index) => {
            const angle = index * angleStep - Math.PI / 2;
            const x = centerX + (radius + 20) * Math.cos(angle);
            const y = centerY + (radius + 20) * Math.sin(angle);
            
            ctx.fillText(label, x, y);
        });
    }
    
    _drawRadarGrid(centerX, centerY, radius, labels, angleStep) {
        const ctx = this.ctx;
        
        // Draw concentric circles
        const gridLevels = 5;
        ctx.strokeStyle = '#dddddd';
        ctx.lineWidth = 1;
        
        for (let i = 1; i <= gridLevels; i++) {
            const currentRadius = (radius * i) / gridLevels;
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Draw radial lines
        labels.forEach((label, index) => {
            const angle = index * angleStep - Math.PI / 2; // Start from top
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, y);
            ctx.stroke();
            
            // Draw labels
            const labelX = centerX + (radius + 10) * Math.cos(angle);
            const labelY = centerY + (radius + 10) * Math.sin(angle);
            
            ctx.fillStyle = '#000000';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(label, labelX, labelY);
        });
    }
    
    _drawAxes(minY, maxY, labels) {
        const ctx = this.ctx;
        ctx.strokeStyle = '#dddddd';
        ctx.lineWidth = 1;
        
        // Draw y-axis
        ctx.beginPath();
        ctx.moveTo(40, 0);
        ctx.lineTo(40, this.height);
        ctx.stroke();
        
        // Draw y-axis labels
        ctx.fillStyle = '#000000';
        ctx.font = '10px Arial';
        ctx.textAlign = 'right';
        
        const yLevels = 5;
        for (let i = 0; i <= yLevels; i++) {
            const value = minY + ((maxY - minY) * i) / yLevels;
            const y = this.height - ((value - minY) * this.height / (maxY - minY));
            
            // Draw horizontal grid line
            ctx.beginPath();
            ctx.moveTo(40, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
            
            // Draw label
            ctx.fillText(value.toFixed(1), 35, y + 3);
        }
        
        // Draw x-axis
        ctx.beginPath();
        ctx.moveTo(40, this.height);
        ctx.lineTo(this.width, this.height);
        ctx.stroke();
        
        // Draw x-axis labels
        ctx.textAlign = 'center';
        
        labels.forEach((label, index) => {
            const x = 40 + ((this.width - 40) * index) / (labels.length - 1 || 1);
            ctx.fillText(label, x, this.height + 15);
        });
    }
    
    _renderTooltip() {
        // In a full implementation, this would render tooltips
        // For this simplified version, we'll leave it empty
    }
    
    update() {
        // Render the chart
        this._render();
    }
    
    destroy() {
        // Clean up resources
        if (this.ctx.canvas) {
            const canvas = this.ctx.canvas;
            canvas.removeEventListener('mousemove', this._handleTooltip);
            canvas.removeEventListener('mouseout', this._hideTooltip);
        }
    }
}

// Chart types
Chart.controllers = {
    line: {
        // Line chart controller methods
    },
    bar: {
        // Bar chart controller methods
    },
    radar: {
        // Radar chart controller methods
    },
    polarArea: {
        // Polar area chart controller methods
    }
};

// Scale types
Chart.Scale = class {
    constructor(config) {
        this.config = config;
    }
};

// Default configuration
Chart.defaults = {
    global: {
        responsive: true,
        animation: {
            duration: 1000
        },
        elements: {
            line: {
                tension: 0.4
            },
            point: {
                radius: 3
            }
        }
    }
};

// Helper functions
Chart.helpers = {
    // Various helper functions
};

export default Chart;
