// Visualization setup with Three.js
console.log('Visualization.js loaded');

// Variables to hold Three.js objects
let scene, camera, renderer, controls;
let bars = [];
let axes = [];
let isInitialized = false;
let container;
let raycaster, mouse;
let hoveredBar = null;
let tooltipElement;

// Initialize the visualization
function initVisualization() {
    if (isInitialized) return;
    
    console.log('Initializing 3D visualization');
    
    try {
        // Get the container element
        container = document.getElementById('visualization');
        if (!container) {
            console.error('Visualization container not found!');
            return;
        }
        
        // Clear placeholder
        const placeholder = document.querySelector('.placeholder-content');
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        
        // Create scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x111827);
        scene.fog = new THREE.FogExp2(0x111827, 0.002);
        
        // Create camera
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        camera.position.set(15, 15, 15);
        camera.lookAt(0, 0, 0);
        
        // Create renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        
        // Add canvas to container
        container.innerHTML = '';
        container.appendChild(renderer.domElement);
        
        // Add orbit controls for interactive rotation
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = true;
        controls.zoomSpeed = 1.2;
        
        // Add grid helper for reference
        const gridHelper = new THREE.GridHelper(20, 20, 0x06b6d4, 0x374151);
        scene.add(gridHelper);
        
        // Create axes and add lighting
        createAxes();
        addLighting();
        
        // Start animation loop
        animate();
        
        // Handle window resize
        window.addEventListener('resize', onWindowResize);
        
        // Initialize raycaster for hover detection
        raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2();
        
        // Add mouse move event listener for hover effects
        container.addEventListener('mousemove', onMouseMove);
        
        // Create tooltip element
        createTooltip();
        
        // Add navigation controls
        addViewControls();
        
        // Mark as initialized
        isInitialized = true;
        
        console.log('3D visualization initialized successfully');
    } catch (error) {
        console.error('Error initializing visualization:', error);
    }
}

// Create axes for the 3D space
function createAxes() {
    try {
        // X-axis (FICO Score) - Red/Pink
        const xAxisMaterial = new THREE.LineBasicMaterial({ color: 0xff3366 });
        const xAxisGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(10, 0, 0)
        ]);
        const xAxis = new THREE.Line(xAxisGeometry, xAxisMaterial);
        scene.add(xAxis);
        axes.push(xAxis);
        
        // Y-axis (Purchasing Power) - Green/Cyan
        const yAxisMaterial = new THREE.LineBasicMaterial({ color: 0x33ffaa });
        const yAxisGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 10, 0)
        ]);
        const yAxis = new THREE.Line(yAxisGeometry, yAxisMaterial);
        scene.add(yAxis);
        axes.push(yAxis);
        
        // Z-axis (LTV) - Blue/Purple
        const zAxisMaterial = new THREE.LineBasicMaterial({ color: 0x3366ff });
        const zAxisGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, 10)
        ]);
        const zAxis = new THREE.Line(zAxisGeometry, zAxisMaterial);
        scene.add(zAxis);
        axes.push(zAxis);
        
        // Add axis labels
        const labels = [
            { text: "FICO Score", position: new THREE.Vector3(12, 0, 0), color: "#ff3366" },
            { text: "Purchasing Power", position: new THREE.Vector3(0, 12, 0), color: "#33ffaa" },
            { text: "LTV %", position: new THREE.Vector3(0, 0, 12), color: "#3366ff" }
        ];
        
        labels.forEach(label => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 512;
            canvas.height = 128;
            
            context.font = "Bold 48px Courier New";
            context.fillStyle = label.color;
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillText(label.text, canvas.width/2, canvas.height/2);
            
            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({ 
                map: texture,
                transparent: true
            });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.position.copy(label.position);
            sprite.scale.set(8, 2, 1);
            
            scene.add(sprite);
            axes.push(sprite);
        });
    } catch (error) {
        console.error('Error creating axes:', error);
    }
}

// Add lighting to the scene
function addLighting() {
    try {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x666666, 1.2);
        scene.add(ambientLight);
        
        // Directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7);
        scene.add(directionalLight);
        
        // Colored point lights for cyberpunk effect
        const redLight = new THREE.PointLight(0xff3366, 1.5, 25);
        redLight.position.set(10, 8, 5);
        scene.add(redLight);
        
        const blueLight = new THREE.PointLight(0x3366ff, 1.5, 25);
        blueLight.position.set(-5, 8, -5);
        scene.add(blueLight);
        
        const greenLight = new THREE.PointLight(0x33ffaa, 1.5, 25);
        greenLight.position.set(0, 15, 10);
        scene.add(greenLight);
    } catch (error) {
        console.error('Error adding lighting:', error);
    }
}

// Handle window resize
function onWindowResize() {
    if (!container || !camera || !renderer) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update any animations
    animationUpdates.forEach(animation => {
        if (animation && typeof animation.update === 'function') {
            animation.update();
        }
    });
    
    // Check for hover intersections
    checkIntersections();
    
    if (controls && typeof controls.update === 'function') {
        controls.update();
    }
    
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// Update visualization with new data
function updateVisualization(data) {
    console.log('Updating visualization with data:', data);
    
    if (!isInitialized) {
        initVisualization();
    }
    
    if (!scene) {
        console.error('Scene not initialized!');
        return;
    }
    
    // Store the current loan type
    currentLoanType = data.loanType;
    
    // Clear old bars
    clearBars();
    
    // Generate bars based on current data
    createVisualizationBars(data);
    
    console.log(`Created ${bars.length} bars for ${currentLoanType} loan type`);
}

// Variable to track current loan type
let currentLoanType = 'FHA';

// Clear existing bars
function clearBars() {
    try {
        bars.forEach(bar => scene.remove(bar));
        bars = [];
    } catch (error) {
        console.error('Error clearing bars:', error);
    }
}

// Create 3D bars for visualization - SIMPLE VERSION
function createVisualizationBars(data) {
    console.log('Creating visualization with data:', data);
    
    try {
        const { ficoScore, ltv, loanType } = data;
        
        // Define ranges
        const ficoScores = [580, 620, 660, 700, 740, 780, 820];
        const ltvValues = [70, 75, 80, 85, 90, 95, 97];
        
        // Map our actual values to indices
        const ficoIndex = ficoScores.findIndex(val => ficoScore <= val) || 0;
        const ltvIndex = ltvValues.findIndex(val => ltv <= val) || 0;
        
        // Generate bars
        for (let i = 0; i < ficoScores.length; i++) {
            for (let j = 0; j < ltvValues.length; j++) {
                // Calculate base value
                let baseValue = 300000; // Default value
                
                // Adjust based on loan type
                if (loanType === 'FHA') baseValue = 320000;
                if (loanType === 'VA') baseValue = 350000;
                if (loanType === 'USDA') baseValue = 280000;
                
                // Adjust for FICO and LTV
                baseValue += (i * 15000); // Higher FICO = better value
                baseValue -= (j * 10000); // Higher LTV = lower value
                
                // Calculate height between 0.5 and 10
                const height = 0.5 + ((baseValue - 150000) / 350000) * 9.5;
                
                // Create basic box geometry
                const barGeometry = new THREE.BoxGeometry(0.8, height, 0.8);
                
                // Simple color by loan type
                let barColor;
                switch (loanType) {
                    case 'Conventional': barColor = 0xff1493; break; // Pink
                    case 'FHA': barColor = 0x00e5ff; break; // Cyan
                    case 'VA': barColor = 0x39ff14; break; // Green
                    case 'USDA': barColor = 0xb026ff; break; // Purple
                    default: barColor = 0x888888;
                }
                
                // Create material
                const material = new THREE.MeshStandardMaterial({
                    color: barColor,
                    metalness: 0.3,
                    roughness: 0.2,
                    emissive: barColor,
                    emissiveIntensity: 0.5
                });
                
                // Create mesh
                const bar = new THREE.Mesh(barGeometry, material);
                
                // Position the bar with increased spacing
                const xOffset = -3.5;
                const zOffset = -3.5;
                const spacing = 1.9;  // Increased by ~60%
                
                bar.position.set(
                    i * spacing + xOffset,
                    height / 2, // Center vertically
                    j * spacing + zOffset
                );
                
                // Highlight the selected bar
                if (i === ficoIndex && j === ltvIndex) {
                    const outlineGeometry = new THREE.BoxGeometry(1, height + 0.2, 1);
                    const outlineMaterial = new THREE.MeshBasicMaterial({
                        color: 0xffffff,
                        transparent: true,
                        opacity: 0.4,
                        wireframe: true
                    });
                    
                    const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
                    bar.add(outline);
                    
                    // Add glow sphere
                    const glowGeometry = new THREE.SphereGeometry(0.3, 16, 16);
                    const glowMaterial = new THREE.MeshBasicMaterial({
                        color: 0xffffff,
                        transparent: true,
                        opacity: 0.7
                    });
                    
                    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
                    glow.position.set(0, height / 2 + 0.3, 0);
                    bar.add(glow);
                }
                
                // Store metadata
                bar.userData = {
                    ficoScore: ficoScores[i],
                    ltv: ltvValues[j],
                    loanType: loanType,
                    purchasingPower: baseValue,
                    powerValue: Math.round(baseValue / 1000)
                };
                
                // Add to scene
                scene.add(bar);
                bars.push(bar);
            }
        }
        
        console.log(`Created ${bars.length} bars for visualization`);
    } catch (error) {
        console.error('Error creating bars:', error);
    }
}

// Array to store animation updates
const animationUpdates = [];

// Create tooltip element
function createTooltip() {
    tooltipElement = document.createElement('div');
    tooltipElement.className = 'bar-tooltip';
    tooltipElement.style.position = 'absolute';
    tooltipElement.style.display = 'none';
    tooltipElement.style.backgroundColor = 'rgba(17, 24, 39, 0.95)';
    tooltipElement.style.color = '#ffffff';
    tooltipElement.style.padding = '15px';
    tooltipElement.style.borderRadius = '8px';
    tooltipElement.style.fontSize = '16px';
    tooltipElement.style.minWidth = '240px';
    tooltipElement.style.pointerEvents = 'none';
    tooltipElement.style.zIndex = '1000';
    tooltipElement.style.border = '2px solid var(--accent-cyan)';
    tooltipElement.style.boxShadow = '0 0 15px rgba(6, 182, 212, 0.5)';
    tooltipElement.style.fontFamily = 'Courier New, monospace';
    tooltipElement.style.backdropFilter = 'blur(4px)';
    tooltipElement.style.transition = 'opacity 0.15s ease';
    container.appendChild(tooltipElement);
}

// Handle mouse movement for hover effects
function onMouseMove(event) {
    // Calculate mouse position in normalized device coordinates
    const rect = container.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;
}

// Check for intersections between mouse and bars
function checkIntersections() {
    if (!raycaster || !mouse || !camera || !scene || bars.length === 0) return;
    
    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);
    
    // Calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(bars, true);
    
    if (intersects.length > 0) {
        // Get the first intersected object
        let intersectedObject = intersects[0].object;
        
        // Make sure we get the parent if we hit a child
        while (intersectedObject && !intersectedObject.userData.ficoScore && intersectedObject.parent) {
            intersectedObject = intersectedObject.parent;
        }
        
        if (intersectedObject && intersectedObject.userData.ficoScore) {
            // New bar hovered
            if (hoveredBar !== intersectedObject) {
                hoveredBar = intersectedObject;
                updateTooltip(intersectedObject);
            }
            
            // Get bar position in world space
            const barPosition = new THREE.Vector3();
            barPosition.setFromMatrixPosition(intersectedObject.matrixWorld);
            barPosition.y += intersectedObject.geometry.parameters.height / 2 + 0.5;
            
            // Project to screen space
            barPosition.project(camera);
            
            // Convert to CSS coordinates
            const x = (barPosition.x * 0.5 + 0.5) * container.clientWidth;
            const y = (-barPosition.y * 0.5 + 0.5) * container.clientHeight;
            
            // Position tooltip
            tooltipElement.style.left = `${x + 20}px`;
            tooltipElement.style.top = `${y - 150}px`;
            tooltipElement.style.display = 'block';
        }
    } else if (hoveredBar) {
        // No intersection, hide tooltip
        hoveredBar = null;
        tooltipElement.style.display = 'none';
    }
}

// Update tooltip content
function updateTooltip(bar) {
    const data = bar.userData;
    
    // Format purchasing power with commas
    const formattedPower = data.purchasingPower.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    });
    
    // Calculate monthly payment (approximate)
    const interestRate = 0.06; // 6% as example
    const loanAmount = data.purchasingPower * (data.ltv / 100);
    const termMonths = 30 * 12; // 30-year fixed
    const monthlyRate = interestRate / 12;
    
    // Monthly payment calculation (P&I only)
    const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                         (Math.pow(1 + monthlyRate, termMonths) - 1);
                         
    // Calculate down payment
    const downPayment = data.purchasingPower - loanAmount;
    
    // Colors for loan types
    const loanTypeColors = {
        'Conventional': '#ec4899',
        'FHA': '#06b6d4',
        'VA': '#34d399',
        'USDA': '#8b5cf6'
    };
    
    const loanTypeColor = loanTypeColors[data.loanType] || '#888888';
    
    tooltipElement.innerHTML = `
        <div style="margin-bottom: 12px; text-align: center;">
            <div style="font-size: 20px; font-weight: bold;">
                ${formattedPower}
            </div>
            <div style="margin-top: 2px; font-size: 14px; color: #aaaaaa;">
                Maximum Purchase Price
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
            <div>
                <div style="color: #ff3366; font-weight: bold; margin-bottom: 2px;">FICO Score</div>
                <div style="font-size: 18px;">${data.ficoScore}</div>
            </div>
            <div>
                <div style="color: #3366ff; font-weight: bold; margin-bottom: 2px;">LTV</div>
                <div style="font-size: 18px;">${data.ltv}%</div>
            </div>
        </div>
        
        <div style="padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2);">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div>
                    <div style="color: #aaaaaa; font-size: 12px;">Monthly Payment</div>
                    <div style="font-size: 16px;">${Math.round(monthlyPayment).toLocaleString('en-US', {style: 'currency', currency: 'USD'})}</div>
                </div>
                <div>
                    <div style="color: #aaaaaa; font-size: 12px;">Down Payment</div>
                    <div style="font-size: 16px;">${Math.round(downPayment).toLocaleString('en-US', {style: 'currency', currency: 'USD'})}</div>
                </div>
            </div>
        </div>
        
        <div style="margin-top: 10px; text-align: center; padding: 5px; background-color: rgba(0,0,0,0.3); border-radius: 4px;">
            <div style="font-size: 14px; color: ${loanTypeColor}; font-weight: bold;">
                ${data.loanType} Loan
            </div>
        </div>
    `;
}

// Add view control buttons
function addViewControls() {
    // Create container for view buttons
    const viewControlsContainer = document.createElement('div');
    viewControlsContainer.className = 'view-controls';
    viewControlsContainer.style.position = 'absolute';
    viewControlsContainer.style.bottom = '10px';
    viewControlsContainer.style.left = '10px';
    viewControlsContainer.style.display = 'flex';
    viewControlsContainer.style.gap = '8px';
    viewControlsContainer.style.zIndex = '100';
    container.appendChild(viewControlsContainer);
    
    // Define view presets
    const views = [
        { name: 'Top', position: [0, 15, 0], rotation: [-Math.PI/2, 0, 0] },
        { name: 'Front', position: [0, 0, 15], rotation: [0, 0, 0] },
        { name: 'Side', position: [15, 0, 0], rotation: [0, Math.PI/2, 0] },
        { name: 'Isometric', position: [10, 10, 10], rotation: [-Math.PI/4, Math.PI/4, 0] },
        { name: 'Reset', position: [15, 15, 15], rotation: [0, 0, 0] }
    ];
    
    // Create buttons for each view
    views.forEach(view => {
        const button = document.createElement('button');
        button.textContent = view.name;
        button.style.backgroundColor = 'rgba(17, 24, 39, 0.8)';
        button.style.color = view.name === 'Reset' ? '#ff3366' : '#06b6d4';
        button.style.border = `1px solid ${view.name === 'Reset' ? '#ff3366' : '#06b6d4'}`;
        button.style.borderRadius = '4px';
        button.style.padding = '6px 10px';
        button.style.fontSize = '12px';
        button.style.fontFamily = 'Courier New, monospace';
        button.style.cursor = 'pointer';
        button.style.transition = 'all 0.2s ease';
        
        // Add click event to change view
        button.addEventListener('click', () => {
            camera.position.set(...view.position);
            camera.lookAt(0, 0, 0);
        });
        
        viewControlsContainer.appendChild(button);
    });
}

// Make updateVisualization function available globally
window.updateVisualization = updateVisualization;

// Initialize visualization when the page is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded, initializing visualization');
    setTimeout(initVisualization, 500);
    
    // Setup fullscreen button
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }
});

// Function to toggle fullscreen as a pop-out window
function toggleFullscreen() {
    // Create pop-out window
    const width = 800;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    // Get the current settings/data
    const currentSettings = {
        ficoScore: document.getElementById('fico-value').textContent,
        ltv: document.getElementById('ltv-value').textContent,
        loanType: document.getElementById('selected-loan-type').textContent
    };
    
    // Create URL with parameters
    const url = `visualization-popup.html?fico=${currentSettings.ficoScore}&ltv=${currentSettings.ltv}&loanType=${currentSettings.loanType}`;
    
    // Open in new window
    window.open(
        url,
        'MortgageVisualization',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no,status=no,location=no`
    );
}