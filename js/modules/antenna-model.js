/**
 * OpenUda - Yagi-Uda Antenna Design Web App
 * Antenna Model Module
 * 
 * This module handles the data structure that represents a Yagi-Uda antenna,
 * including all element parameters, positions, and properties.
 */

export class AntennaModel {
    constructor() {
        // Basic antenna properties
        this.centerFrequency = 144; // MHz
        this.elements = [];         // Array of antenna elements (reflector, driven, directors)
        this.boomDiameter = 20;     // mm
        this.boomMaterial = 'nonmetal'; // metal or nonmetal
        
        // Default ground parameters - not used in free space simulation
        this.groundType = 'free-space'; // free-space, perfect, real
        this.groundHeight = 0;          // Height above ground in meters
        this.groundQuality = 'average'; // poor, average, good, very-good (for real ground)
    }

    /**
     * Add a new element to the antenna
     * @param {Object} element The element to add with type, length, position, diameter
     */
    addElement(element) {
        this.elements.push({
            type: element.type || 'director',       // reflector, driven, director
            length: element.length || 0,            // mm
            position: element.position || 0,        // mm (along boom)
            diameter: element.diameter || 10,       // mm
            
            // Optional properties for advanced configurations
            taper: element.taper || false,          // Whether element has tapered diameter
            taperDiameters: element.taperDiameters || [],  // Diameters for tapered sections
            taperLengths: element.taperLengths || [],      // Lengths for tapered sections
            
            // Matching properties (for driven element)
            matchingMethod: element.matchingMethod || 'none', // none, hairpin, gamma, etc.
            matchingParameters: element.matchingParameters || {}
        });
    }

    /**
     * Remove an element at the specified index
     * @param {number} index Index of element to remove
     */
    removeElement(index) {
        if (index >= 0 && index < this.elements.length) {
            this.elements.splice(index, 1);
        }
    }

    /**
     * Update a property of an existing element
     * @param {number} index Element index to update
     * @param {string} property Property name to update
     * @param {any} value New value for the property
     */
    updateElement(index, property, value) {
        if (index >= 0 && index < this.elements.length) {
            this.elements[index][property] = value;
        }
    }

    /**
     * Get the wavelength for the center frequency in millimeters
     * @returns {number} Wavelength in mm
     */
    getWavelength() {
        // Speed of light (in mm/s) / frequency (in Hz)
        return 299792458 * 1000 / (this.centerFrequency * 1000000);
    }

    /**
     * Get the total boom length based on element positions
     * @returns {number} Total boom length in mm
     */
    getBoomLength() {
        if (this.elements.length === 0) return 0;
        
        // Find the minimum and maximum element positions
        const positions = this.elements.map(el => el.position);
        const minPos = Math.min(...positions);
        const maxPos = Math.max(...positions);
        
        // Add some margin at each end
        const margin = 50; // mm
        return maxPos - minPos + (2 * margin);
    }

    /**
     * Get the driven element index
     * @returns {number} Index of the driven element or -1 if not found
     */
    getDrivenElementIndex() {
        return this.elements.findIndex(el => el.type === 'driven');
    }

    /**
     * Get element coordinates for visualization
     * @returns {Array} Array of coordinate objects for each element
     */
    getElementCoordinates() {
        return this.elements.map(element => {
            // For each element, return its position and length for drawing
            return {
                x: element.position,
                y: 0,
                length: element.length,
                type: element.type,
                diameter: element.diameter
            };
        });
    }

    /**
     * Load antenna model from preset data
     * @param {Object} preset Preset antenna configuration
     */
    loadFromPreset(preset) {
        this.centerFrequency = preset.frequency || this.centerFrequency;
        this.elements = [...preset.elements] || [];
        this.boomDiameter = preset.boomDiameter || this.boomDiameter;
        this.boomMaterial = preset.boomMaterial || this.boomMaterial;
        
        if (preset.groundType) {
            this.groundType = preset.groundType;
            this.groundHeight = preset.groundHeight || 0;
            this.groundQuality = preset.groundQuality || 'average';
        }
    }

    /**
     * Load antenna model from another model
     * @param {AntennaModel} model The source model to load from
     */
    loadFromModel(model) {
        this.centerFrequency = model.centerFrequency;
        this.elements = JSON.parse(JSON.stringify(model.elements)); // Deep copy
        this.boomDiameter = model.boomDiameter;
        this.boomMaterial = model.boomMaterial;
        this.groundType = model.groundType;
        this.groundHeight = model.groundHeight;
        this.groundQuality = model.groundQuality;
    }

    /**
     * Create a deep copy of this antenna model
     * @returns {AntennaModel} A new instance with the same properties
     */
    clone() {
        const clone = new AntennaModel();
        clone.loadFromModel(this);
        return clone;
    }

    /**
     * Convert the antenna model to a plain object for serialization
     * @returns {Object} Plain object representation
     */
    toObject() {
        return {
            centerFrequency: this.centerFrequency,
            elements: JSON.parse(JSON.stringify(this.elements)),
            boomDiameter: this.boomDiameter,
            boomMaterial: this.boomMaterial,
            groundType: this.groundType,
            groundHeight: this.groundHeight,
            groundQuality: this.groundQuality
        };
    }

    /**
     * Create an antenna model from a plain object
     * @param {Object} obj Object to create model from
     * @returns {AntennaModel} New antenna model
     */
    static fromObject(obj) {
        const model = new AntennaModel();
        
        if (obj.centerFrequency) model.centerFrequency = obj.centerFrequency;
        if (obj.elements) model.elements = JSON.parse(JSON.stringify(obj.elements));
        if (obj.boomDiameter) model.boomDiameter = obj.boomDiameter;
        if (obj.boomMaterial) model.boomMaterial = obj.boomMaterial;
        if (obj.groundType) model.groundType = obj.groundType;
        if (obj.groundHeight) model.groundHeight = obj.groundHeight;
        if (obj.groundQuality) model.groundQuality = obj.groundQuality;
        
        return model;
    }
}
