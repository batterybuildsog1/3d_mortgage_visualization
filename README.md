# Cyberpunk Mortgage Calculator with 3D Visualization

A unique, visually striking mortgage calculator that uses a 3D visualization to show how FICO scores and LTV percentages affect borrowing power across different loan types.

## Features

- Cyberpunk/neon visual aesthetic
- Interactive form for inputting financial data
- Responsive design that works across devices
- Real-time calculations based on financial parameters
- 3D visualization showing the impact of FICO and LTV on purchasing power
- Support for different loan types (Conventional, FHA, VA, USDA)

## Getting Started

### Prerequisites

This project uses vanilla HTML, CSS, and JavaScript with Three.js for 3D visualization. No build tools or package managers are required.

### Installation

1. Clone the repository or download the files to your local machine:
   ```
   git clone https://github.com/yourusername/3d_mortgage_visualization.git
   ```

2. Navigate to the project directory:
   ```
   cd 3d_mortgage_visualization
   ```

3. Open `index.html` in a modern web browser:
   - Double-click the file to open it
   - Or use a local development server like [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) for VS Code

## Usage

1. Enter your annual income
2. (Optional) Enter your location/address
3. Adjust the LTV (Loan-to-Value) percentage slider
4. Adjust the FICO score slider
5. Select your preferred loan type (FHA, Conventional, VA, or USDA)
6. Click "CALCULATE PURCHASING POWER"
7. Explore the 3D visualization:
   - Rotate: Click and drag
   - Zoom: Scroll wheel
   - Pan: Shift + drag

## Project Structure

- `index.html` - Main HTML file
- `styles.css` - CSS styles including cyberpunk theme
- `script.js` - Main JavaScript for form handling and calculations
- `visualization.js` - Three.js implementation for 3D visualization
- `references/` - Reference materials and examples
  - `three_js_examples.md` - Helpful Three.js examples and tutorials

## Future Enhancements

- [ ] Implement advanced post-processing for better visual effects
- [ ] Add detailed tooltips to 3D visualization elements
- [ ] Integrate real LLPA and MIP data for precise calculations
- [ ] Add option to compare multiple loan scenarios simultaneously
- [ ] Deploy to a hosting platform for online access

## Development Notes

- The current implementation uses placeholder calculations that approximate mortgage affordability
- The 3D visualization is currently implemented with basic Three.js features
- Future iterations will integrate the actual LLPA and MIP data from provided references

## Credits

- Three.js library for 3D visualization
- Financial calculations based on standard industry practices
- Cyberpunk design inspired by modern UI trends

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

*Note: This calculator provides estimates only and should not be used for making financial decisions. Consult with a mortgage professional for accurate mortgage qualification information.*