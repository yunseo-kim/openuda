/**
 * OpenUda - Yagi-Uda Antenna Design Web App
 * Pattern Visualizer Module
 * 
 * This module handles the 3D visualization of radiation patterns
 * using Three.js for WebGL rendering.
 */

export class PatternVisualizer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.patternMesh = null;
        this.axesHelper = null;
        this.colorMap = 'rainbow';
        this.isInitialized = false;
        
        // Bind methods
        this.animate = this.animate.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);
    }

    /**
     * Initialize the 3D renderer
     */
    initialize() {
        if (this.isInitialized) return;
        
        // Import required libraries
        import('/js/lib/three.module.js').then(THREE => {
            this.THREE = THREE;
            
            // Import OrbitControls after Three.js is loaded
            import('/js/lib/OrbitControls.js').then(OrbitControlsModule => {
                // Create renderer
                this.renderer = new this.THREE.WebGLRenderer({ 
                    antialias: true,
                    alpha: true
                });
                this.renderer.setPixelRatio(window.devicePixelRatio);
                this.renderer.setClearColor(0x000000, 0);
                
                // Create container
                const container = document.getElementById('pattern-3d');
                
                // Clear any existing content
                container.innerHTML = '';
                
                // Set renderer size
                const width = container.clientWidth;
                const height = container.clientHeight;
                this.renderer.setSize(width, height);
                container.appendChild(this.renderer.domElement);
                
                // Create scene
                this.scene = new this.THREE.Scene();
                
                // Create camera
                this.camera = new this.THREE.PerspectiveCamera(
                    60, width / height, 0.1, 1000
                );
                this.camera.position.set(2, 1, 2);
                
                // Add ambient light
                const ambientLight = new this.THREE.AmbientLight(0xcccccc, 0.6);
                this.scene.add(ambientLight);
                
                // Add directional light
                const directionalLight = new this.THREE.DirectionalLight(0xffffff, 0.8);
                directionalLight.position.set(1, 1, 1);
                this.scene.add(directionalLight);
                
                // Add orbit controls
                const OrbitControls = OrbitControlsModule.OrbitControls;
                this.controls = new OrbitControls(this.camera, this.renderer.domElement);
                this.controls.enableDamping = true;
                this.controls.dampingFactor = 0.05;
                
                // Add axes helper
                this.axesHelper = new this.THREE.AxesHelper(1.2);
                this.scene.add(this.axesHelper);
                
                // Add coordinate labels
                this.addCoordinateLabels();
                
                // Add antenna representation
                this.addAntennaRepresentation();
                
                // Add event listeners
                window.addEventListener('resize', this.onWindowResize);
                
                // Start animation loop
                this.animate();
                
                this.isInitialized = true;
            });
        });
    }

    /**
     * Add coordinate labels to the 3D scene
     */
    addCoordinateLabels() {
        // Create canvas for text textures
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        // Function to create a label sprite
        const createLabel = (text, color) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = color;
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, canvas.width / 2, canvas.height / 2);
            
            const texture = new this.THREE.Texture(canvas);
            texture.needsUpdate = true;
            
            const material = new this.THREE.SpriteMaterial({ 
                map: texture,
                transparent: true
            });
            
            return new this.THREE.Sprite(material);
        };
        
        // Create axis labels
        const xLabel = createLabel('X', '#ff0000');
        xLabel.position.set(1.3, 0, 0);
        xLabel.scale.set(0.5, 0.25, 1);
        this.scene.add(xLabel);
        
        const yLabel = createLabel('Y', '#00ff00');
        yLabel.position.set(0, 1.3, 0);
        yLabel.scale.set(0.5, 0.25, 1);
        this.scene.add(yLabel);
        
        const zLabel = createLabel('Z', '#0000ff');
        zLabel.position.set(0, 0, 1.3);
        zLabel.scale.set(0.5, 0.25, 1);
        this.scene.add(zLabel);
    }

    /**
     * Add a simple antenna representation in the 3D scene
     */
    addAntennaRepresentation() {
        // Create a simple antenna model to show orientation
        
        // Boom (cylinder along z-axis)
        const boomGeometry = new this.THREE.CylinderGeometry(0.02, 0.02, 1.5, 8);
        const boomMaterial = new this.THREE.MeshPhongMaterial({ color: 0x888888 });
        const boom = new this.THREE.Mesh(boomGeometry, boomMaterial);
        boom.rotation.x = Math.PI / 2; // Rotate to align with z-axis
        this.scene.add(boom);
        
        // Elements (rods perpendicular to boom)
        const createElement = (position, length, color) => {
            const eleGeometry = new this.THREE.CylinderGeometry(0.01, 0.01, length, 8);
            const eleMaterial = new this.THREE.MeshPhongMaterial({ color });
            const element = new this.THREE.Mesh(eleGeometry, eleMaterial);
            element.position.set(0, 0, position);
            element.rotation.z = Math.PI / 2; // Align perpendicular to boom
            return element;
        };
        
        // Reflector (red)
        const reflector = createElement(-0.6, 0.7, 0xe74c3c);
        this.scene.add(reflector);
        
        // Driven element (green)
        const driven = createElement(0, 0.65, 0x2ecc71);
        this.scene.add(driven);
        
        // Director (blue)
        const director = createElement(0.4, 0.6, 0x3498db);
        this.scene.add(director);
    }

    /**
     * Handle window resize events
     */
    onWindowResize() {
        if (!this.isInitialized) return;
        
        const container = document.getElementById('pattern-3d');
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Animation loop
     */
    animate() {
        if (!this.isInitialized) return;
        
        requestAnimationFrame(this.animate);
        
        // Update controls
        if (this.controls) {
            this.controls.update();
        }
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Reset camera view to default position
     */
    resetView() {
        if (!this.isInitialized) return;
        
        this.camera.position.set(2, 1, 2);
        this.camera.lookAt(0, 0, 0);
        this.controls.reset();
    }

    /**
     * Render 3D radiation pattern
     * @param {object} patternData The pattern data from the calculator
     */
    renderPattern3D(patternData) {
        if (!this.isInitialized) {
            this.initialize();
            // Delay rendering until initialization is complete
            setTimeout(() => this.renderPattern3D(patternData), 500);
            return;
        }
        
        // Remove previous pattern if it exists
        if (this.patternMesh) {
            this.scene.remove(this.patternMesh);
        }
        
        // Create vertices for the pattern
        const vertices = [];
        const colors = [];
        const points = patternData.data3D;
        
        // Calculate min/max gain for color normalization
        let maxGain = 0;
        let minGain = 1;
        
        for (const point of points) {
            maxGain = Math.max(maxGain, point.gain);
            minGain = Math.min(minGain, point.gain);
        }
        
        // Create vertices and colors from pattern data
        for (const point of points) {
            vertices.push(point.x, point.y, point.z);
            
            // Normalize gain for coloring
            const normalizedGain = (point.gain - minGain) / (maxGain - minGain);
            const color = this.getColorFromMap(normalizedGain, this.colorMap);
            colors.push(color.r, color.g, color.b);
        }
        
        // Create buffer geometry
        const geometry = new this.THREE.BufferGeometry();
        geometry.setAttribute('position', new this.THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new this.THREE.Float32BufferAttribute(colors, 3));
        
        // Create material and mesh
        const material = new this.THREE.PointsMaterial({
            size: 0.03,
            vertexColors: true, 
            transparent: true,
            opacity: 0.8
        });
        
        // Create points mesh
        this.patternMesh = new this.THREE.Points(geometry, material);
        this.scene.add(this.patternMesh);
    }

    /**
     * Update the color map used for the pattern
     * @param {string} colorMap The color map name
     */
    updateColorMap(colorMap) {
        this.colorMap = colorMap;
        
        // Re-render pattern with new color map if a pattern exists
        if (this.patternMesh) {
            const positions = this.patternMesh.geometry.attributes.position.array;
            const colors = this.patternMesh.geometry.attributes.color.array;
            
            // Find min/max gain for normalization
            let maxR = 0;
            for (let i = 0; i < positions.length; i += 3) {
                const x = positions[i];
                const y = positions[i + 1];
                const z = positions[i + 2];
                const r = Math.sqrt(x*x + y*y + z*z);
                maxR = Math.max(maxR, r);
            }
            
            // Update colors
            for (let i = 0; i < positions.length; i += 3) {
                const x = positions[i];
                const y = positions[i + 1];
                const z = positions[i + 2];
                const r = Math.sqrt(x*x + y*y + z*z);
                
                const normalizedGain = r / maxR;
                const color = this.getColorFromMap(normalizedGain, this.colorMap);
                
                colors[i] = color.r;
                colors[i + 1] = color.g;
                colors[i + 2] = color.b;
            }
            
            this.patternMesh.geometry.attributes.color.needsUpdate = true;
        }
    }

    /**
     * Get a color from a color map based on normalized value (0-1)
     * @param {number} value Normalized value between 0 and 1
     * @param {string} colorMap The color map name
     * @returns {object} Object with r, g, b values (0-1)
     */
    getColorFromMap(value, colorMap) {
        // Ensure value is in range [0, 1]
        value = Math.max(0, Math.min(1, value));
        
        switch (colorMap) {
            case 'rainbow': {
                // Rainbow color map (blue -> cyan -> green -> yellow -> red)
                let r, g, b;
                if (value < 0.25) {
                    // Blue to cyan (0.0 - 0.25)
                    const t = value / 0.25;
                    r = 0;
                    g = t;
                    b = 1;
                } else if (value < 0.5) {
                    // Cyan to green (0.25 - 0.5)
                    const t = (value - 0.25) / 0.25;
                    r = 0;
                    g = 1;
                    b = 1 - t;
                } else if (value < 0.75) {
                    // Green to yellow (0.5 - 0.75)
                    const t = (value - 0.5) / 0.25;
                    r = t;
                    g = 1;
                    b = 0;
                } else {
                    // Yellow to red (0.75 - 1.0)
                    const t = (value - 0.75) / 0.25;
                    r = 1;
                    g = 1 - t;
                    b = 0;
                }
                return { r, g, b };
            }
            
            case 'jet': {
                // Jet color map (blue -> cyan -> yellow -> red)
                let r, g, b;
                if (value < 0.125) {
                    // Black to blue
                    const t = value / 0.125;
                    r = 0;
                    g = 0;
                    b = 0.5 + t*0.5;
                } else if (value < 0.375) {
                    // Blue to cyan
                    const t = (value - 0.125) / 0.25;
                    r = 0;
                    g = t;
                    b = 1;
                } else if (value < 0.625) {
                    // Cyan to yellow
                    const t = (value - 0.375) / 0.25;
                    r = t;
                    g = 1;
                    b = 1 - t;
                } else if (value < 0.875) {
                    // Yellow to red
                    const t = (value - 0.625) / 0.25;
                    r = 1;
                    g = 1 - t;
                    b = 0;
                } else {
                    // Red to dark red
                    const t = (value - 0.875) / 0.125;
                    r = 1 - t*0.5;
                    g = 0;
                    b = 0;
                }
                return { r, g, b };
            }
            
            case 'grayscale': {
                // Grayscale (black to white)
                return { r: value, g: value, b: value };
            }
            
            case 'hot': {
                // Hot color map (black -> red -> yellow -> white)
                let r, g, b;
                if (value < 0.33) {
                    r = 3 * value;
                    g = 0;
                    b = 0;
                } else if (value < 0.66) {
                    r = 1;
                    g = 3 * (value - 0.33);
                    b = 0;
                } else {
                    r = 1;
                    g = 1;
                    b = 3 * (value - 0.66);
                }
                return { r, g, b };
            }
            
            default: {
                // Default to rainbow
                return this.getColorFromMap(value, 'rainbow');
            }
        }
    }

    /**
     * Clean up resources when the visualizer is no longer needed
     */
    dispose() {
        if (!this.isInitialized) return;
        
        window.removeEventListener('resize', this.onWindowResize);
        
        // Dispose geometries and materials
        if (this.patternMesh) {
            this.patternMesh.geometry.dispose();
            this.patternMesh.material.dispose();
            this.scene.remove(this.patternMesh);
        }
        
        // Dispose renderer
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        this.isInitialized = false;
    }
}
