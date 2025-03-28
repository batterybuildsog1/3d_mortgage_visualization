import * as THREE from 'three';

/**
 * Manages user interactions like mouse hovering and clicking within the 3D visualization.
 */
export class InteractionManager {
    visualization; // Reference to the main Visualization instance
    barManager;    // Reference to the BarManager instance
    uiManager;     // Reference to the UIManager instance

    raycaster;
    mouse; // Normalized device coordinates
    lastMouseClientX = 0; // Raw client coordinates
    lastMouseClientY = 0;
    // isOverTooltip = false; // REMOVED - Step 1 & 2: Remove isOverTooltip flag and logic
    hoveredBar = null; // The currently hovered THREE.Group
    tooltipHideTimeout = null; // Timeout ID for delayed tooltip hiding

    constructor(visualization, barManager, uiManager) {
        if (!visualization || !barManager || !uiManager) { // Added uiManager check back
            throw new Error("InteractionManager requires Visualization, BarManager, and UIManager instances.");
        }
        this.visualization = visualization;
        this.barManager = barManager;
        this.uiManager = uiManager; // Store uiManager

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2(-Infinity, -Infinity);

        this.#setupEventListeners();
    }

    #setupEventListeners() {
        this.onMouseMove = this.onMouseMove.bind(this);
        // REMOVED: Tooltip enter/leave bindings - Step 1
        this.#handleMouseLeaveCanvas = this.#handleMouseLeaveCanvas.bind(this);

        if (this.visualization.renderer && this.visualization.renderer.domElement) {
            this.visualization.renderer.domElement.addEventListener('mousemove', this.onMouseMove);
            this.visualization.renderer.domElement.addEventListener('mouseleave', this.#handleMouseLeaveCanvas);
        } else {
            console.error("Renderer DOM element not found for attaching mouse listeners.");
        }
        // REMOVED: Tooltip listener attachments - Step 1
    }

    onMouseMove(event) {
        this.lastMouseClientX = event.clientX; // Store raw coordinates
        this.lastMouseClientY = event.clientY;

        const canvas = this.visualization.renderer?.domElement;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        if (
            event.clientX >= rect.left && event.clientX <= rect.right &&
            event.clientY >= rect.top && event.clientY <= rect.bottom
        ) {
            const canvasX = event.clientX - rect.left;
            const canvasY = event.clientY - rect.top;
            this.mouse.x = (canvasX / canvas.clientWidth) * 2 - 1;
            this.mouse.y = -(canvasY / canvas.clientHeight) * 2 + 1;
        } else {
             this.mouse.x = -Infinity;
             this.mouse.y = -Infinity;
             if (this.hoveredBar) {
                 this.#handleHoverChange(null);
             }
        }
    }

    // REMOVED: onTooltipEnter and onTooltipLeave methods - Step 1


    checkIntersections() {
        // Step 2: Remove isOverTooltip check from condition
        if (!this.visualization.camera || !this.barManager || this.barManager.bars.length === 0 || this.mouse.x === -Infinity) {
            // If mouse is off canvas, ensure tooltip is hidden (moved logic to #handleMouseLeaveCanvas)
            return;
        }

        // --- Debugging Raycaster ---
        console.log(`[Raycast Debug] Mouse NDC: x=${this.mouse.x.toFixed(2)}, y=${this.mouse.y.toFixed(2)}`);
        // --- End Debugging ---

        this.raycaster.setFromCamera(this.mouse, this.visualization.camera);
        const intersects = this.raycaster.intersectObjects(this.barManager.bars, true);

        // --- Debugging Raycaster ---
        console.log(`[Raycast Debug] Intersects found: ${intersects.length}`);
        if (intersects.length > 0) {
            console.log(`[Raycast Debug] First intersect object name: ${intersects[0].object.name}, uuid: ${intersects[0].object.uuid}`);
        }
        // --- End Debugging ---

        let intersectedGroup = null;
        if (intersects.length > 0) {
            let intersectedObject = intersects[0].object;
            while (intersectedObject && intersectedObject !== this.visualization.scene) {
                if (intersectedObject instanceof THREE.Group && this.barManager.bars.includes(intersectedObject)) {
                    intersectedGroup = intersectedObject;
                    break;
                }
                intersectedObject = intersectedObject.parent;
            }
        }

        // --- Debugging Raycaster ---
        console.log(`[Raycast Debug] Found Group: ${intersectedGroup ? intersectedGroup.uuid : 'null'}`);
        // --- End Debugging ---


        // Step 3: Refine hover change logic
        if (this.hoveredBar !== intersectedGroup) {
            this.#handleHoverChange(intersectedGroup);
        }

        // Update tooltip position if a bar is hovered (and tooltip is visible)
        if (this.hoveredBar && this.uiManager && this.uiManager.tooltipElement.style.display === 'block') {
            this.uiManager.updateTooltipPosition(this.lastMouseClientX, this.lastMouseClientY);
        }
    }

    #handleHoverChange(newHoveredBar) {
        // Step 3: Ensure timeout is cleared when hover changes
        if (this.tooltipHideTimeout) {
            clearTimeout(this.tooltipHideTimeout);
            this.tooltipHideTimeout = null;
        }

        // Restore previous bar
        if (this.hoveredBar && this.barManager) {
            this.barManager.applyHoverEffect(this.hoveredBar, false);
        }

        this.hoveredBar = newHoveredBar;

        if (this.hoveredBar && this.barManager && this.uiManager) { // Add uiManager check back
            this.barManager.applyHoverEffect(this.hoveredBar, true);
            this.uiManager.showTooltip(this.hoveredBar.userData);
        } else {
            // Step 3: Only start hide timeout if moving to *no* bar
            this.#hideTooltipWithDelay();
        }
    }

    // Step 3 & 4: Refine hide logic and add logging
    #hideTooltipWithDelay() {
        if (this.tooltipHideTimeout) {
            clearTimeout(this.tooltipHideTimeout); // Clear existing timeout if any
        }
        this.tooltipHideTimeout = setTimeout(() => {
            // Only hide if the mouse is *still* not over any bar
            if (!this.hoveredBar && this.uiManager) {
                console.log("Executing hide timeout after delay"); // Step 4: Add log
                this.uiManager.hideTooltip();
            }
            this.tooltipHideTimeout = null; // Clear ID after execution
        }, 100); // 100ms delay
    }


    destroy() {
        console.log("Destroying InteractionManager listeners...");
        if (this.visualization.renderer?.domElement) {
            this.visualization.renderer.domElement.removeEventListener('mousemove', this.onMouseMove);
            this.visualization.renderer.domElement.removeEventListener('mouseleave', this.#handleMouseLeaveCanvas);
        }
        // REMOVED: Tooltip listener removal - Step 1

        // Clear timeout on destroy
        if (this.tooltipHideTimeout) {
            clearTimeout(this.tooltipHideTimeout);
            this.tooltipHideTimeout = null;
        }
        this.hoveredBar = null;
    }

    // Step 4: Add logging to canvas mouseleave
    #handleMouseLeaveCanvas = () => {
         console.log("Canvas mouseleave detected"); // Step 4: Add log
         this.mouse.x = -Infinity; // Mark mouse as off-canvas
         this.mouse.y = -Infinity;
         // If we were hovering a bar when leaving canvas, trigger hover change to null
         if (this.hoveredBar) {
             this.#handleHoverChange(null); // This will initiate the hide delay
         } else {
             // If not hovering a bar, still ensure hide is triggered (e.g., if mouse leaves quickly)
             this.#hideTooltipWithDelay();
         }
    }
}
