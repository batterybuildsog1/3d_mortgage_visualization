import * as THREE from 'three'; // Import THREE

// Cache for textures - managed globally within this module for now
let incrementTextureCache = {};

/**
 * Helper to format currency
 * @param {number | null | undefined} value - The value to format.
 * @returns {string} Formatted currency string or 'N/A'.
 */
export function formatCurrency(value) {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    return value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    });
}

/**
 * Creates a texture with horizontal increment lines.
 * Uses caching to avoid regenerating identical textures.
 * Texture represents the value range from 0 to maxValue.
 * Scaling (repeat/offset) should be applied when mapping to geometry.
 * @param {number} maxValue - The maximum value represented by the full texture height (0 to 1 in UV space).
 * @returns {THREE.CanvasTexture | null} The generated texture, or null on error.
 */
export function createIncrementTexture(maxValue) {
    if (maxValue <= 0) return null;

    // Determine increment step based on maxValue
    let incrementStep;
    if (maxValue <= 250000) incrementStep = 5000;
    else if (maxValue <= 500000) incrementStep = 10000;
    else if (maxValue <= 750000) incrementStep = 15000;
    else if (maxValue <= 1000000) incrementStep = 25000;
    else incrementStep = 50000;

    // Cache based on the step size, assuming this defines the visual density
    const cacheKey = `${incrementStep}`;
    if (incrementTextureCache[cacheKey]) {
        // console.log(`Using cached texture for step: ${incrementStep}`);
        return incrementTextureCache[cacheKey].clone(); // Return a clone of the cached texture
    }
    // console.log(`Creating new texture for step: ${incrementStep}, maxValue: ${maxValue}`);

    const canvas = document.createElement('canvas');
    const textureHeight = 256; // Power of 2 for texture size
    const textureWidth = 16;   // Narrow texture, will repeat horizontally
    canvas.width = textureWidth;
    canvas.height = textureHeight;
    const context = canvas.getContext('2d');

    // Draw increment lines
    context.strokeStyle = 'rgba(255, 255, 255, 0.4)'; // Semi-transparent white lines
    context.lineWidth = 2;

    const numIncrements = Math.floor(maxValue / incrementStep);

    for (let i = 1; i <= numIncrements; i++) {
        const value = i * incrementStep;
        // Calculate y position (0 = bottom, textureHeight = top)
        // Map value relative to maxValue onto the texture height
        const y = textureHeight - (value / maxValue) * textureHeight;

        if (y >= context.lineWidth / 2 && y <= textureHeight - context.lineWidth / 2) { // Draw only within canvas bounds, considering line width
            context.beginPath();
            context.moveTo(0, y);
            context.lineTo(textureWidth, y);
            context.stroke();
        }
    }

    const texture = new THREE.CanvasTexture(canvas); // Use imported THREE
    texture.wrapS = THREE.RepeatWrapping; // Use imported THREE
    texture.wrapT = THREE.RepeatWrapping; // Use imported THREE
    texture.needsUpdate = true; // Ensure canvas content is uploaded

    // Cache the newly created texture (base texture, repeat/offset applied later)
    incrementTextureCache[cacheKey] = texture.clone(); // Cache a clone
    incrementTextureCache[cacheKey].needsUpdate = true;

    return texture; // Return the original texture (not the cached clone)
}
