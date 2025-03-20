/**
 * OpenUda - Yagi-Uda Antenna Design Web App
 * Presets Module
 * 
 * This module provides a collection of predefined antenna designs
 * that can be loaded by the user as starting points.
 */

export class Presets {
    /**
     * Get a preset by its ID
     * @param {string} presetId The ID of the preset to retrieve
     * @returns {object} The preset object or null if not found
     */
    static getPreset(presetId) {
        return this.availablePresets.find(preset => preset.id === presetId) || null;
    }
    
    /**
     * Get all available presets
     * @returns {Array} Array of all preset objects
     */
    static getAllPresets() {
        return this.availablePresets;
    }
    
    /**
     * Get presets for a specific band
     * @param {string} band The frequency band (e.g., '2m', '70cm')
     * @returns {Array} Array of matching preset objects
     */
    static getPresetsByBand(band) {
        return this.availablePresets.filter(preset => preset.band === band);
    }
    
    /**
     * Collection of predefined antenna designs
     */
    static availablePresets = [
        // 144 MHz (2m) Presets
        {
            id: '2m-3el',
            name: '2m 3-Element',
            description: 'Standard 3-element Yagi for 144 MHz with good SWR bandwidth',
            band: '2m',
            frequency: 144,
            elements: [
                {
                    type: 'reflector',
                    length: 1030,
                    position: 0,
                    diameter: 10
                },
                {
                    type: 'driven',
                    length: 980,
                    position: 400,
                    diameter: 10
                },
                {
                    type: 'director',
                    length: 930,
                    position: 800,
                    diameter: 10
                }
            ],
            boomDiameter: 20,
            boomMaterial: 'nonmetal'
        },
        {
            id: '2m-5el',
            name: '2m 5-Element',
            description: 'Medium gain 5-element Yagi for 144 MHz, good for portable operations',
            band: '2m',
            frequency: 144,
            elements: [
                {
                    type: 'reflector',
                    length: 1030,
                    position: 0,
                    diameter: 10
                },
                {
                    type: 'driven',
                    length: 970,
                    position: 400,
                    diameter: 10
                },
                {
                    type: 'director',
                    length: 920,
                    position: 750,
                    diameter: 10
                },
                {
                    type: 'director',
                    length: 915,
                    position: 1250,
                    diameter: 10
                },
                {
                    type: 'director',
                    length: 910,
                    position: 1800,
                    diameter: 10
                }
            ],
            boomDiameter: 20,
            boomMaterial: 'nonmetal'
        },
        {
            id: '2m-7el',
            name: '2m 7-Element DK7ZB',
            description: 'DK7ZB design 7-element Yagi for 144 MHz with high gain and clean pattern',
            band: '2m',
            frequency: 144,
            elements: [
                {
                    type: 'reflector',
                    length: 1042,
                    position: 0,
                    diameter: 8
                },
                {
                    type: 'driven',
                    length: 966,
                    position: 314,
                    diameter: 8
                },
                {
                    type: 'director',
                    length: 930,
                    position: 551,
                    diameter: 8
                },
                {
                    type: 'director',
                    length: 921,
                    position: 1012,
                    diameter: 8
                },
                {
                    type: 'director',
                    length: 912,
                    position: 1473,
                    diameter: 8
                },
                {
                    type: 'director',
                    length: 903,
                    position: 1934,
                    diameter: 8
                },
                {
                    type: 'director',
                    length: 885,
                    position: 2395,
                    diameter: 8
                }
            ],
            boomDiameter: 20,
            boomMaterial: 'nonmetal'
        },
        
        // 432 MHz (70cm) Presets
        {
            id: '70cm-5el',
            name: '70cm 5-Element',
            description: 'Compact 5-element Yagi for 432 MHz, good for portable work',
            band: '70cm',
            frequency: 432,
            elements: [
                {
                    type: 'reflector',
                    length: 345,
                    position: 0,
                    diameter: 6
                },
                {
                    type: 'driven',
                    length: 328,
                    position: 125,
                    diameter: 6
                },
                {
                    type: 'director',
                    length: 306,
                    position: 235,
                    diameter: 6
                },
                {
                    type: 'director',
                    length: 303,
                    position: 390,
                    diameter: 6
                },
                {
                    type: 'director',
                    length: 300,
                    position: 580,
                    diameter: 6
                }
            ],
            boomDiameter: 15,
            boomMaterial: 'nonmetal'
        },
        {
            id: '70cm-10el',
            name: '70cm 10-Element DL6WU',
            description: 'DL6WU design 10-element Yagi for 432 MHz with high gain',
            band: '70cm',
            frequency: 432,
            elements: [
                {
                    type: 'reflector',
                    length: 344,
                    position: 0,
                    diameter: 4
                },
                {
                    type: 'driven',
                    length: 325,
                    position: 120,
                    diameter: 4
                },
                {
                    type: 'director',
                    length: 307,
                    position: 200,
                    diameter: 4
                },
                {
                    type: 'director',
                    length: 305,
                    position: 320,
                    diameter: 4
                },
                {
                    type: 'director',
                    length: 303,
                    position: 450,
                    diameter: 4
                },
                {
                    type: 'director',
                    length: 301,
                    position: 590,
                    diameter: 4
                },
                {
                    type: 'director',
                    length: 299,
                    position: 740,
                    diameter: 4
                },
                {
                    type: 'director',
                    length: 297,
                    position: 900,
                    diameter: 4
                },
                {
                    type: 'director',
                    length: 295,
                    position: 1070,
                    diameter: 4
                },
                {
                    type: 'director',
                    length: 294,
                    position: 1250,
                    diameter: 4
                }
            ],
            boomDiameter: 15,
            boomMaterial: 'nonmetal'
        },
        
        // 50 MHz (6m) Presets
        {
            id: '6m-3el',
            name: '6m 3-Element',
            description: 'Classic 3-element Yagi for 50 MHz with good F/B ratio',
            band: '6m',
            frequency: 50.1,
            elements: [
                {
                    type: 'reflector',
                    length: 3050,
                    position: 0,
                    diameter: 12
                },
                {
                    type: 'driven',
                    length: 2900,
                    position: 1250,
                    diameter: 12
                },
                {
                    type: 'director',
                    length: 2750,
                    position: 2500,
                    diameter: 12
                }
            ],
            boomDiameter: 30,
            boomMaterial: 'nonmetal'
        },
        {
            id: '6m-5el',
            name: '6m 5-Element',
            description: 'High-performance 5-element Yagi for 50 MHz',
            band: '6m',
            frequency: 50.1,
            elements: [
                {
                    type: 'reflector',
                    length: 3050,
                    position: 0,
                    diameter: 12
                },
                {
                    type: 'driven',
                    length: 2900,
                    position: 1200,
                    diameter: 12
                },
                {
                    type: 'director',
                    length: 2750,
                    position: 2300,
                    diameter: 12
                },
                {
                    type: 'director',
                    length: 2730,
                    position: 3500,
                    diameter: 12
                },
                {
                    type: 'director',
                    length: 2700,
                    position: 4800,
                    diameter: 12
                }
            ],
            boomDiameter: 30,
            boomMaterial: 'nonmetal'
        },
        
        // 1296 MHz (23cm) Presets
        {
            id: '23cm-10el',
            name: '23cm 10-Element',
            description: 'Compact 10-element Yagi for 1296 MHz',
            band: '23cm',
            frequency: 1296,
            elements: [
                {
                    type: 'reflector',
                    length: 116,
                    position: 0,
                    diameter: 3
                },
                {
                    type: 'driven',
                    length: 109,
                    position: 45,
                    diameter: 3
                },
                {
                    type: 'director',
                    length: 102,
                    position: 80,
                    diameter: 3
                },
                {
                    type: 'director',
                    length: 101,
                    position: 120,
                    diameter: 3
                },
                {
                    type: 'director',
                    length: 100,
                    position: 165,
                    diameter: 3
                },
                {
                    type: 'director',
                    length: 99,
                    position: 210,
                    diameter: 3
                },
                {
                    type: 'director',
                    length: 98,
                    position: 260,
                    diameter: 3
                },
                {
                    type: 'director',
                    length: 97,
                    position: 310,
                    diameter: 3
                },
                {
                    type: 'director',
                    length: 96,
                    position: 365,
                    diameter: 3
                },
                {
                    type: 'director',
                    length: 95,
                    position: 430,
                    diameter: 3
                }
            ],
            boomDiameter: 10,
            boomMaterial: 'nonmetal'
        },
        
        // HF Presets
        {
            id: '20m-3el',
            name: '20m 3-Element',
            description: '3-element Yagi for 14 MHz, typical HF tribander dimensions',
            band: '20m',
            frequency: 14.1,
            elements: [
                {
                    type: 'reflector',
                    length: 10740,
                    position: 0,
                    diameter: 35
                },
                {
                    type: 'driven',
                    length: 10210,
                    position: 2500,
                    diameter: 35
                },
                {
                    type: 'director',
                    length: 9680,
                    position: 5000,
                    diameter: 35
                }
            ],
            boomDiameter: 50,
            boomMaterial: 'nonmetal'
        },
        
        // Special Designs
        {
            id: 'vhf-wide-band',
            name: 'VHF Wide-Band',
            description: 'Wide-band design for 144-146 MHz with excellent VSWR across the band',
            band: '2m',
            frequency: 145,
            elements: [
                {
                    type: 'reflector',
                    length: 1045,
                    position: 0,
                    diameter: 10
                },
                {
                    type: 'driven',
                    length: 985,
                    position: 380,
                    diameter: 10,
                    matchingMethod: 'hairpin',
                    matchingParameters: {
                        length: 65,
                        spacing: 25
                    }
                },
                {
                    type: 'director',
                    length: 931,
                    position: 770,
                    diameter: 10
                },
                {
                    type: 'director',
                    length: 924,
                    position: 1250,
                    diameter: 10
                }
            ],
            boomDiameter: 20,
            boomMaterial: 'nonmetal'
        },
        {
            id: 'portable-2m-3el',
            name: 'Portable 2m 3-Element',
            description: 'Lightweight portable design for 144 MHz with collapsible elements',
            band: '2m',
            frequency: 144.3,
            elements: [
                {
                    type: 'reflector',
                    length: 1025,
                    position: 0,
                    diameter: 6
                },
                {
                    type: 'driven',
                    length: 975,
                    position: 380,
                    diameter: 6
                },
                {
                    type: 'director',
                    length: 928,
                    position: 750,
                    diameter: 6
                }
            ],
            boomDiameter: 15,
            boomMaterial: 'nonmetal'
        }
    ];
}
