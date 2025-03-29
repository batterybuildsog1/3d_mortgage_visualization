import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'; 

/**
 * Manages the 3D Mortgage Visualization scene, camera, renderer, and animation loop.
 */
export class Visualization {
    // Core Three.js components
    scene;
    camera;
    renderer;
    controls;

    // State
    targetContainer;
    isPopup;
    currentData = null;
    currentLoanType = 'FHA'; // Default
    currentVizMode = 'borrowing'; // 'borrowing' or 'purchasing'

    // Internal flags/helpers
    #isInitialized = false;
    #animationFrameId = null;
    // No longer need to store THREE instance

    /**
     * Initializes the 3D visualization.
     * @param {HTMLElement} targetContainer - The DOM element to render the visualization into.
     * @param {boolean} [isPopup=false] - Flag indicating if running in the popup window.
     */
    constructor(targetContainer, isPopup = false) { // Removed THREE_Instance param
        if (!targetContainer) {
            throw new Error('Visualization target container not provided!');
        }
        // No need to check for global THREE here, imports handle it

        if (targetContainer.dataset.visualizationInitialized === 'true') {
            console.warn('Visualization already initialized for this container. Skipping re-initialization.');
            return;
        }

        this.targetContainer = targetContainer;
        this.isPopup = isPopup;

        console.log(`Initializing 3D visualization in ${isPopup ? 'popup' : 'main window'} using imported THREE`);

        try {
            this.#setupScene();
            this.#setupCamera();
            this.#setupRenderer();
            this.#setupControls();
            this.#addBaseElements(); // Grid, lighting
            this.#setupEventListeners();

            // Mark container as initialized
            this.targetContainer.dataset.visualizationInitialized = 'true';
            this.#isInitialized = true;

            // Start animation loop
            this.animate = this.animate.bind(this); // Bind animate to this instance
            this.animate();

            console.log('3D visualization initialized successfully');

        } catch (error) {
            console.error('Error initializing visualization:', error);
            this.destroy(); // Clean up on error
            throw error; // Re-throw error
        }
    }

    #setupScene() {
        this.scene = new THREE.Scene(); // Use imported THREE
        this.scene.background = new THREE.Color(0x111827);
        this.scene.fog = new THREE.FogExp2(0x111827, 0.002);
    }

    #setupCamera() {
        const width = this.targetContainer.clientWidth;
        const height = this.targetContainer.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000); // Use imported THREE
        this.camera.position.set(15, 15, 15);
        this.camera.lookAt(0, 0, 0);
    }

    #setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true }); // Use imported THREE
        this.renderer.setSize(this.targetContainer.clientWidth, this.targetContainer.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        // Don't clear innerHTML if placeholder exists, just append canvas
        // this.targetContainer.innerHTML = '';
        this.targetContainer.appendChild(this.renderer.domElement);

        // Placeholder hiding logic removed as element is deleted from HTML
    }

    #setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement); // Use imported OrbitControls
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = true;
        this.controls.zoomSpeed = 1.2;
        this.controls.target.set(0, 0, 0);
    }

    #addBaseElements() {
        // Grid Helper
        const gridHelper = new THREE.GridHelper(20, 20, 0x06b6d4, 0x374151); // Use imported THREE
        this.scene.add(gridHelper);

        // Lighting
        this.#addLighting();
    }

    #addLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x666666, 1.2); // Use imported THREE
        this.scene.add(ambientLight);

        // Directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // Use imported THREE
        directionalLight.position.set(5, 10, 7);
        this.scene.add(directionalLight);

        // Colored point lights
        const redLight = new THREE.PointLight(0xff3366, 1.5, 25); // Use imported THREE
        redLight.position.set(10, 8, 5);
        this.scene.add(redLight);

        const blueLight = new THREE.PointLight(0x3366ff, 1.5, 25); // Use imported THREE
        blueLight.position.set(-5, 8, -5);
        this.scene.add(blueLight);

        const greenLight = new THREE.PointLight(0x33ffaa, 1.5, 25); // Use imported THREE
        greenLight.position.set(0, 15, 10);
        this.scene.add(greenLight);
    }

    #setupEventListeners() {
        this.onWindowResize = this.onWindowResize.bind(this);
        window.addEventListener('resize', this.onWindowResize);
    }

    onWindowResize() {
        if (!this.#isInitialized || !this.targetContainer) return;
        const width = this.targetContainer.clientWidth;
        const height = this.targetContainer.clientHeight;
        if (width === 0 || height === 0) return;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        if (!this.#isInitialized) return;
        this.#animationFrameId = requestAnimationFrame(this.animate);
        if (this.controls?.update) this.controls.update();
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    setVisualizationMode(mode) {
        if (mode === 'borrowing' || mode === 'purchasing') {
            this.currentVizMode = mode;
            console.log(`Visualization mode set to: ${mode}`);
        } else {
            console.warn(`Invalid visualization mode: ${mode}`);
        }
    }

    setCurrentLoanType(loanType) {
        this.currentLoanType = loanType;
        console.log(`Current loan type set to: ${loanType}`);
    }

    updateData(data) {
        this.currentData = data;
        console.log('Visualization data updated:', data);
        this.setCurrentLoanType(data.loanType);
    }

    destroy() {
        console.log('Destroying visualization instance...');
        this.#isInitialized = false;
        if (this.#animationFrameId) cancelAnimationFrame(this.#animationFrameId);
        window.removeEventListener('resize', this.onWindowResize);

        if (this.scene) {
            this.scene.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => {
                            if (material.map) material.map.dispose();
                            material.dispose();
                        });
                    } else {
                        if (object.material.map) object.material.map.dispose();
                        object.material.dispose();
                    }
                }
            });
            this.scene = null;
        }
        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement?.parentElement) {
                this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
            }
            this.renderer = null;
        }
        if (this.controls) this.controls.dispose();
        this.camera = null;
        if (this.targetContainer) {
            delete this.targetContainer.dataset.visualizationInitialized;
            this.targetContainer.innerHTML = '';
        }
        this.currentData = null;
        console.log('Visualization destroyed.');
    }
}
