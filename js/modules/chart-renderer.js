/**
 * OpenUda - Yagi-Uda Antenna Design Web App
 * Chart Renderer Module
 * 
 * This module handles rendering various charts including frequency sweep
 * charts and polar radiation patterns using Chart.js.
 */

export class ChartRenderer {
    constructor() {
        this.charts = {};
    }

    /**
     * Initialize charts - to be called once Chart.js is loaded
     */
    async initializeCharts() {
        try {
            // Create charts for frequency sweep
            this.createGainChart();
            this.createVswrChart();
            this.createFbRatioChart();
            this.createImpedanceChart();
            
            // Create polar charts for radiation patterns
            this.createPolarCharts();
            
            console.log('Charts initialized');
        } catch (error) {
            console.error('Error initializing charts:', error);
        }
    }

    /**
     * Initialize Chart.js and required plugins
     */
    async ensureChartLibrary() {
        if (window.Chart) {
            return window.Chart;
        }
        
        try {
            const Chart = await import('/js/lib/chart.js');
            window.Chart = Chart.default || Chart;
            
            // Register additional needed plugins
            if (!window.Chart.registry.plugins.get('zoom')) {
                const zoomPlugin = await import('/js/lib/chartjs-plugin-zoom.min.js');
                window.Chart.register(zoomPlugin.default || zoomPlugin);
            }
            
            return window.Chart;
        } catch (error) {
            console.error('Failed to load Chart.js:', error);
            throw error;
        }
    }

    /**
     * Create the gain vs frequency chart
     */
    createGainChart() {
        const ctx = document.getElementById('gain-chart').getContext('2d');
        
        this.charts.gain = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Gain (dBi)',
                    data: [],
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 2,
                    pointRadius: 2,
                    pointHoverRadius: 5,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Frequency (MHz)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Gain (dBi)'
                        }
                    }
                },
                plugins: {
                    zoom: {
                        pan: {
                            enabled: true,
                            mode: 'xy'
                        },
                        zoom: {
                            wheel: {
                                enabled: true
                            },
                            pinch: {
                                enabled: true
                            },
                            mode: 'xy'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Gain: ${context.parsed.y.toFixed(2)} dBi`;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Create the VSWR vs frequency chart
     */
    createVswrChart() {
        const ctx = document.getElementById('vswr-chart').getContext('2d');
        
        this.charts.vswr = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'VSWR',
                    data: [],
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    borderWidth: 2,
                    pointRadius: 2,
                    pointHoverRadius: 5,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Frequency (MHz)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'VSWR'
                        },
                        min: 1,
                        suggestedMax: 3
                    }
                },
                plugins: {
                    zoom: {
                        pan: {
                            enabled: true,
                            mode: 'xy'
                        },
                        zoom: {
                            wheel: {
                                enabled: true
                            },
                            pinch: {
                                enabled: true
                            },
                            mode: 'xy'
                        }
                    },
                    annotation: {
                        annotations: {
                            vswr2Line: {
                                type: 'line',
                                yMin: 2,
                                yMax: 2,
                                borderColor: 'rgba(231, 76, 60, 0.5)',
                                borderWidth: 1,
                                borderDash: [5, 5],
                                label: {
                                    content: 'VSWR 2:1',
                                    enabled: true,
                                    position: 'left'
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Create the F/B ratio vs frequency chart
     */
    createFbRatioChart() {
        const ctx = document.getElementById('fb-ratio-chart').getContext('2d');
        
        this.charts.fbRatio = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'F/B Ratio (dB)',
                    data: [],
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    borderWidth: 2,
                    pointRadius: 2,
                    pointHoverRadius: 5,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Frequency (MHz)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'F/B Ratio (dB)'
                        }
                    }
                },
                plugins: {
                    zoom: {
                        pan: {
                            enabled: true,
                            mode: 'xy'
                        },
                        zoom: {
                            wheel: {
                                enabled: true
                            },
                            pinch: {
                                enabled: true
                            },
                            mode: 'xy'
                        }
                    }
                }
            }
        });
    }

    /**
     * Create the impedance vs frequency chart
     */
    createImpedanceChart() {
        const ctx = document.getElementById('impedance-chart').getContext('2d');
        
        this.charts.impedance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'R (Ω)',
                        data: [],
                        borderColor: '#9b59b6',
                        backgroundColor: 'rgba(155, 89, 182, 0.1)',
                        borderWidth: 2,
                        pointRadius: 2,
                        pointHoverRadius: 5,
                        tension: 0.3,
                        yAxisID: 'y'
                    },
                    {
                        label: 'X (Ω)',
                        data: [],
                        borderColor: '#f39c12',
                        backgroundColor: 'rgba(243, 156, 18, 0.1)',
                        borderWidth: 2,
                        pointRadius: 2,
                        pointHoverRadius: 5,
                        tension: 0.3,
                        yAxisID: 'y'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Frequency (MHz)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Impedance (Ω)'
                        }
                    }
                },
                plugins: {
                    zoom: {
                        pan: {
                            enabled: true,
                            mode: 'xy'
                        },
                        zoom: {
                            wheel: {
                                enabled: true
                            },
                            pinch: {
                                enabled: true
                            },
                            mode: 'xy'
                        }
                    },
                    annotation: {
                        annotations: {
                            zeroReactanceLine: {
                                type: 'line',
                                yMin: 0,
                                yMax: 0,
                                borderColor: 'rgba(243, 156, 18, 0.5)',
                                borderWidth: 1,
                                borderDash: [5, 5]
                            },
                            fiftyOhmLine: {
                                type: 'line',
                                yMin: 50,
                                yMax: 50,
                                borderColor: 'rgba(155, 89, 182, 0.5)',
                                borderWidth: 1,
                                borderDash: [5, 5]
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Create polar charts for radiation patterns
     */
    createPolarCharts() {
        // Horizontal plane (azimuth) chart
        const hPlaneCtx = document.getElementById('h-plane-chart').getContext('2d');
        this.charts.hPlane = new Chart(hPlaneCtx, {
            type: 'polarArea',
            data: {
                labels: [], // Will be populated with angle values
                datasets: [{
                    data: [], // Will be populated with gain values
                    backgroundColor: 'rgba(52, 152, 219, 0.5)',
                    borderColor: 'rgba(52, 152, 219, 0.8)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        min: 0,
                        max: 1,
                        ticks: {
                            backdropColor: 'transparent',
                            showLabelBackdrop: false
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        pointLabels: {
                            font: {
                                size: 10
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Horizontal Plane (Azimuth)'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const gain = 20 * Math.log10(value);
                                return `Gain: ${gain.toFixed(2)} dB`;
                            }
                        }
                    }
                }
            }
        });
        
        // Vertical plane (elevation) chart
        const vPlaneCtx = document.getElementById('v-plane-chart').getContext('2d');
        this.charts.vPlane = new Chart(vPlaneCtx, {
            type: 'polarArea',
            data: {
                labels: [], // Will be populated with angle values
                datasets: [{
                    data: [], // Will be populated with gain values
                    backgroundColor: 'rgba(46, 204, 113, 0.5)',
                    borderColor: 'rgba(46, 204, 113, 0.8)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        min: 0,
                        max: 1,
                        ticks: {
                            backdropColor: 'transparent',
                            showLabelBackdrop: false
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        pointLabels: {
                            font: {
                                size: 10
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Vertical Plane (Elevation)'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const gain = 20 * Math.log10(value);
                                return `Gain: ${gain.toFixed(2)} dB`;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Render frequency sweep charts
     * @param {object} sweepResults Results from frequency sweep analysis
     */
    renderFrequencyCharts(sweepResults) {
        this.ensureChartLibrary().then(() => {
            if (!this.charts.gain) {
                this.initializeCharts();
            }
            
            // Update gain chart
            this.updateChart(
                this.charts.gain,
                sweepResults.frequencies,
                sweepResults.gains
            );
            
            // Update VSWR chart
            this.updateChart(
                this.charts.vswr,
                sweepResults.frequencies,
                sweepResults.vswrs
            );
            
            // Update F/B ratio chart
            this.updateChart(
                this.charts.fbRatio,
                sweepResults.frequencies,
                sweepResults.fbRatios
            );
            
            // Update impedance chart with two datasets
            this.updateImpedanceChart(
                this.charts.impedance,
                sweepResults.frequencies,
                sweepResults.impedances
            );
        });
    }

    /**
     * Render polar pattern charts
     * @param {object} patternData Pattern data from calculator
     */
    renderPolarPatterns(patternData) {
        this.ensureChartLibrary().then(() => {
            if (!this.charts.hPlane) {
                this.initializeCharts();
            }
            
            // Update horizontal plane (azimuth) chart
            this.updatePolarChart(
                this.charts.hPlane,
                patternData.azimuth
            );
            
            // Update vertical plane (elevation) chart
            this.updatePolarChart(
                this.charts.vPlane,
                patternData.elevation
            );
        });
    }

    /**
     * Update a simple chart with new data
     * @param {Chart} chart Chart.js instance
     * @param {array} labels X-axis labels
     * @param {array} data Y-axis data
     */
    updateChart(chart, labels, data) {
        if (!chart) return;
        
        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.update();
    }

    /**
     * Update impedance chart with resistance and reactance data
     * @param {Chart} chart Impedance chart instance
     * @param {array} frequencies Frequency points
     * @param {array} impedances Array of impedance objects {r, x}
     */
    updateImpedanceChart(chart, frequencies, impedances) {
        if (!chart) return;
        
        const resistances = impedances.map(imp => imp.r);
        const reactances = impedances.map(imp => imp.x);
        
        chart.data.labels = frequencies;
        chart.data.datasets[0].data = resistances;
        chart.data.datasets[1].data = reactances;
        chart.update();
    }

    /**
     * Update polar chart with pattern data
     * @param {Chart} chart Polar chart instance
     * @param {array} patternData Array of gain values at different angles
     */
    updatePolarChart(chart, patternData) {
        if (!chart) return;
        
        const angles = [];
        
        // Generate angle labels based on data length
        const step = 360 / patternData.length;
        for (let i = 0; i < patternData.length; i++) {
            angles.push(`${Math.round(i * step)}°`);
        }
        
        chart.data.labels = angles;
        chart.data.datasets[0].data = patternData;
        chart.update();
    }

    /**
     * Reset all charts to empty state
     */
    resetCharts() {
        for (const chartName in this.charts) {
            const chart = this.charts[chartName];
            chart.data.labels = [];
            chart.data.datasets.forEach(dataset => {
                dataset.data = [];
            });
            chart.update();
        }
    }

    /**
     * Destroy all charts to clean up resources
     */
    destroy() {
        for (const chartName in this.charts) {
            if (this.charts[chartName]) {
                this.charts[chartName].destroy();
            }
        }
        this.charts = {};
    }
}
