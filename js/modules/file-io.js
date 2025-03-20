/**
 * OpenUda - Yagi-Uda Antenna Design Web App
 * File I/O Module
 * 
 * This module handles importing and exporting antenna designs in various formats,
 * including JSON, NEC, and YagiCAD (YC6) formats.
 */

export class FileIO {
    constructor(antennaModel) {
        this.antennaModel = antennaModel;
    }

    /**
     * Import an antenna design from a file
     * @param {File} file File object from file input
     * @returns {Promise} Promise resolving when import is complete
     */
    importFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    const fileExtension = file.name.split('.').pop().toLowerCase();
                    
                    // Import based on file extension
                    switch (fileExtension) {
                        case 'json':
                            this.importFromJSON(text);
                            break;
                        case 'nec':
                            this.importFromNEC(text);
                            break;
                        case 'yc6':
                            this.importFromYagiCAD(text);
                            break;
                        default:
                            throw new Error(`Unsupported file format: ${fileExtension}`);
                    }
                    
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Error reading file'));
            };
            
            reader.readAsText(file);
        });
    }

    /**
     * Import antenna design from text
     * @param {string} text The text content to import
     */
    importFromText(text) {
        try {
            // Try to auto-detect format
            if (text.trim().startsWith('{')) {
                // Likely JSON
                this.importFromJSON(text);
            } else if (text.includes('CM NEC') || text.includes('GW')) {
                // Likely NEC format
                this.importFromNEC(text);
            } else if (text.includes('YagiCAD') || text.includes('[Elements]')) {
                // Likely YagiCAD format
                this.importFromYagiCAD(text);
            } else {
                throw new Error('Unknown format. Please specify format explicitly.');
            }
        } catch (error) {
            console.error('Import error:', error);
            throw error;
        }
    }

    /**
     * Import antenna design from JSON
     * @param {string} jsonText JSON string
     */
    importFromJSON(jsonText) {
        try {
            const data = JSON.parse(jsonText);
            
            // Validate and import
            if (data.centerFrequency && Array.isArray(data.elements)) {
                this.antennaModel.centerFrequency = data.centerFrequency;
                this.antennaModel.elements = data.elements;
                this.antennaModel.boomDiameter = data.boomDiameter || 20;
                this.antennaModel.boomMaterial = data.boomMaterial || 'nonmetal';
                
                if (data.groundType) {
                    this.antennaModel.groundType = data.groundType;
                    this.antennaModel.groundHeight = data.groundHeight || 0;
                    this.antennaModel.groundQuality = data.groundQuality || 'average';
                }
            } else {
                throw new Error('Invalid JSON format: missing required fields');
            }
        } catch (error) {
            console.error('JSON import error:', error);
            throw error;
        }
    }

    /**
     * Import antenna design from NEC format
     * @param {string} necText NEC format text
     */
    importFromNEC(necText) {
        try {
            // Parse NEC format
            const lines = necText.split('\n');
            const elements = [];
            let frequency = 144; // Default frequency in MHz
            
            // Extract frequency from FR card if present
            const frLine = lines.find(line => line.trim().startsWith('FR'));
            if (frLine) {
                const parts = frLine.trim().split(/\s+/);
                if (parts.length >= 7) {
                    frequency = parseFloat(parts[6]);
                }
            }
            
            // Extract elements from GW cards
            lines.forEach(line => {
                line = line.trim();
                if (line.startsWith('GW')) {
                    const parts = line.split(/\s+/);
                    if (parts.length >= 9) {
                        // GW tag segments x1 y1 z1 x2 y2 z2 radius
                        const radius = parseFloat(parts[8]) * 1000; // Convert to mm
                        
                        // Calculate element position (Z coordinate) and length
                        const x1 = parseFloat(parts[3]);
                        const x2 = parseFloat(parts[6]);
                        const y1 = parseFloat(parts[4]);
                        const y2 = parseFloat(parts[7]);
                        const z1 = parseFloat(parts[5]);
                        const z2 = parseFloat(parts[8]);
                        
                        // Calculate length from endpoints
                        const length = Math.sqrt(
                            Math.pow(x2 - x1, 2) + 
                            Math.pow(y2 - y1, 2)
                        ) * 1000; // Convert to mm
                        
                        // Position is midpoint Z coordinate
                        const position = z1 * 1000; // Convert to mm
                        
                        // Determine element type (simple heuristic - can be improved)
                        let type = 'director';
                        if (elements.length === 0) {
                            type = 'reflector';
                        } else if (elements.length === 1) {
                            type = 'driven';
                        }
                        
                        elements.push({
                            type,
                            length,
                            position,
                            diameter: radius * 2 // Convert radius to diameter
                        });
                    }
                }
            });
            
            // Update model if we found elements
            if (elements.length > 0) {
                this.antennaModel.centerFrequency = frequency;
                this.antennaModel.elements = elements;
            } else {
                throw new Error('No antenna elements found in NEC file');
            }
        } catch (error) {
            console.error('NEC import error:', error);
            throw error;
        }
    }

    /**
     * Import antenna design from YagiCAD format
     * @param {string} text YagiCAD format text
     */
    importFromYagiCAD(text) {
        try {
            const lines = text.split('\n');
            const elements = [];
            let frequency = 144; // Default
            let boomDiameter = 20;
            let boomMaterial = 'nonmetal';
            
            // Parse YagiCAD format
            let inElementsSection = false;
            
            lines.forEach(line => {
                line = line.trim();
                
                // Look for frequency
                if (line.startsWith('Frequency=')) {
                    frequency = parseFloat(line.split('=')[1]);
                }
                
                // Look for boom settings
                if (line.startsWith('BoomDia=')) {
                    boomDiameter = parseFloat(line.split('=')[1]);
                }
                
                if (line.startsWith('BoomMaterial=')) {
                    const material = line.split('=')[1];
                    boomMaterial = material.includes('Metal') ? 'metal' : 'nonmetal';
                }
                
                // Start of elements section
                if (line === '[Elements]') {
                    inElementsSection = true;
                    return;
                }
                
                // End of elements section
                if (line.startsWith('[') && line !== '[Elements]') {
                    inElementsSection = false;
                }
                
                // Parse element data
                if (inElementsSection && line.includes(',')) {
                    const parts = line.split(',');
                    if (parts.length >= 7) {
                        const position = parseFloat(parts[1]);
                        const length = parseFloat(parts[2]);
                        const diameter = parseFloat(parts[3]);
                        
                        // Determine element type
                        let type = 'director';
                        if (parts[0].toLowerCase().includes('refl')) {
                            type = 'reflector';
                        } else if (parts[0].toLowerCase().includes('driven') || parts[0].toLowerCase().includes('de')) {
                            type = 'driven';
                        }
                        
                        elements.push({
                            type,
                            length,
                            position,
                            diameter
                        });
                    }
                }
            });
            
            // Update model if we found elements
            if (elements.length > 0) {
                this.antennaModel.centerFrequency = frequency;
                this.antennaModel.elements = elements;
                this.antennaModel.boomDiameter = boomDiameter;
                this.antennaModel.boomMaterial = boomMaterial;
            } else {
                throw new Error('No antenna elements found in YagiCAD file');
            }
        } catch (error) {
            console.error('YagiCAD import error:', error);
            throw error;
        }
    }

    /**
     * Generate export text in the specified format
     * @param {string} format Format to export (json, nec, yc6)
     * @returns {string} Exported text
     */
    generateExport(format) {
        switch (format) {
            case 'json':
                return this.exportToJSON();
            case 'nec':
                return this.exportToNEC();
            case 'yc6':
                return this.exportToYagiCAD();
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Export antenna design to JSON format
     * @returns {string} JSON string
     */
    exportToJSON() {
        return JSON.stringify(this.antennaModel.toObject(), null, 2);
    }

    /**
     * Export antenna design to NEC format
     * @returns {string} NEC format text
     */
    exportToNEC() {
        const freq = this.antennaModel.centerFrequency;
        const elements = this.antennaModel.elements;
        const wavelength = this.antennaModel.getWavelength() / 1000; // Convert to meters
        
        let necText = `CM NEC input file generated by OpenUda\n`;
        necText += `CM Yagi-Uda antenna for ${freq} MHz\n`;
        necText += `CM ----------------------------------------\n`;
        
        // Add wire segments for each element
        elements.forEach((element, index) => {
            const position = element.position / 1000; // Convert to meters
            const halfLength = element.length / 2000; // Half length in meters
            const radius = element.diameter / 2000; // Radius in meters
            
            // Wire coordinates: tag, segments, x1, y1, z1, x2, y2, z2, radius
            necText += `GW ${index+1} 11 ${-halfLength} 0 ${position} ${halfLength} 0 ${position} ${radius}\n`;
        });
        
        // Add frequency card
        necText += `FR 0 1 0 0 ${freq} 0\n`;
        
        // Add excitation at driven element
        const drivenIndex = elements.findIndex(el => el.type === 'driven');
        if (drivenIndex !== -1) {
            necText += `EX 0 ${drivenIndex+1} 6 0 1 0 0 0 0\n`;
        } else {
            // If no driven element found, excite the first element
            necText += `EX 0 1 6 0 1 0 0 0 0\n`;
        }
        
        // Add radiation pattern request
        necText += `RP 0 73 72 1000 0 0 5 5\n`;
        necText += `EN\n`;
        
        return necText;
    }

    /**
     * Export antenna design to YagiCAD format
     * @returns {string} YagiCAD format text
     */
    exportToYagiCAD() {
        const model = this.antennaModel;
        const freq = model.centerFrequency;
        
        let ycText = `[YagiCAD]\n`;
        ycText += `Version=6.0\n`;
        ycText += `Frequency=${freq}\n`;
        ycText += `BoomDia=${model.boomDiameter}\n`;
        ycText += `BoomMaterial=${model.boomMaterial === 'metal' ? 'Metal' : 'Non-metal'}\n`;
        ycText += `Title=OpenUda Design for ${freq} MHz\n`;
        ycText += `Date=${new Date().toLocaleDateString()}\n`;
        ycText += `[Elements]\n`;
        
        // Add elements
        model.elements.forEach((element, index) => {
            const typeName = element.type.charAt(0).toUpperCase() + element.type.slice(1);
            ycText += `${typeName} ${index+1},${element.position},${element.length},${element.diameter},0,0,0\n`;
        });
        
        ycText += `[END]\n`;
        
        return ycText;
    }
}
