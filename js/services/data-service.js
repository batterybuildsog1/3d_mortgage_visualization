/**
 * DataService
 * 
 * Handles loading and caching data from JSON files for mortgage calculations.
 */
class DataService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    this.dataBasePath = '/data/';
  }
  
  /**
   * Load data from JSON file with caching
   * @param {string} dataType - Data category (llpa, mortgage_insurance, etc.)
   * @param {string} file - File name without extension
   * @returns {Promise<Object>} Parsed JSON data
   */
  async loadData(dataType, file) {
    const cacheKey = `${dataType}_${file}`;
    
    // Check cache first
    const cachedData = this._getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }
    
    try {
      // Fetch data
      const response = await fetch(`${this.dataBasePath}${dataType}/${file}.json`);
      
      // Check for HTTP errors
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      // Parse JSON
      const data = await response.json();
      
      // Add to cache
      this._cacheData(cacheKey, data);
      
      return data;
    } catch (error) {
      console.error(`Error loading ${dataType}/${file}.json:`, error);
      throw new DataLoadError(`Failed to load ${dataType}/${file}.json`, { cause: error });
    }
  }
  
  /**
   * Get LLPA data for the specified entity
   * @param {string} entity - Fannie Mae or Freddie Mac
   * @returns {Promise<Object>} LLPA data
   */
  async getLLPA(entity) {
    const entityMap = {
      'Fannie Mae': 'fannie_mae',
      'Freddie Mac': 'freddie_mac'
    };
    
    const fileName = entityMap[entity] || 'fannie_mae';
    return this.loadData('llpa', fileName);
  }
  
  /**
   * Get mortgage insurance data for the specified loan type
   * @param {string} loanType - Loan type
   * @returns {Promise<Object>} Mortgage insurance data
   */
  async getMortgageInsurance(loanType) {
    const loanTypeMap = {
      'Conventional': 'pmi',
      'FHA': 'fha',
      'VA': 'va',
      'USDA': 'usda'
    };
    
    const fileName = loanTypeMap[loanType] || loanType.toLowerCase();
    return this.loadData('mortgage_insurance', fileName);
  }
  
  /**
   * Get base interest rates for the specified loan type
   * @param {string} loanType - Loan type
   * @returns {Promise<Object>} Interest rate data
   */
  async getBaseRates(loanType) {
    const loanTypeMap = {
      'Conventional': 'conventional',
      'FHA': 'fha',
      'VA': 'va',
      'USDA': 'usda'
    };
    
    const fileName = loanTypeMap[loanType] || loanType.toLowerCase();
    return this.loadData('rates', fileName);
  }
  
  /**
   * Get property tax rate for the specified location
   * @param {string} state - State code
   * @param {string} county - County name
   * @returns {Promise<number>} Property tax rate as decimal
   */
  async getPropertyTaxRate(state, county) {
    const taxData = await this.loadData('location', 'property_tax');
    
    if (!taxData[state]) {
      return taxData.default || 0.01; // Default to 1%
    }
    
    if (!taxData[state][county]) {
      return taxData[state].default || taxData.default || 0.01;
    }
    
    return taxData[state][county];
  }
  
  /**
   * Get insurance rate for the specified location
   * @param {string} zipCode - ZIP code
   * @returns {Promise<number>} Insurance rate as decimal
   */
  async getInsuranceRate(zipCode) {
    try {
      const insuranceData = await this.loadData('location', 'insurance');
      return insuranceData[zipCode] || insuranceData.default || 0.0035; // Default to 0.35%
    } catch (error) {
      console.warn('Insurance data not available, using default rate');
      return 0.0035; // Default to 0.35%
    }
  }
  
  /**
   * Estimate location factors based on address string
   * @param {string} locationString - Location string (address, city, state)
   * @returns {Promise<Object>} Location factors (property tax rate, insurance rate)
   */
  async estimateLocationFactors(locationString) {
    // Ensure locationString is a string, default to empty if not
    const safeLocationString = typeof locationString === 'string' ? locationString : '';

    // Extract state from location string
    const stateMatch = safeLocationString.match(/\b([A-Z]{2})\b/);
    const state = stateMatch ? stateMatch[1] : 'CA'; // Default to California
    
    // Basic estimate - in a real app we'd use geocoding
    return {
      propertyTaxRate: await this.getPropertyTaxRate(state),
      insuranceRate: 0.0035, // Default insurance rate
      state: state,
      taxCycle: await this._getPropertyTaxCycle(state)
    };
  }
  
  /**
   * Get closing costs data
   * @returns {Promise<Object>} Closing costs data
   */
  async getClosingCostsData() {
    try {
      return this.loadData('closing_costs', 'base');
    } catch (error) {
      console.error('Error loading closing costs data:', error);
      // Return a minimal default structure if data cannot be loaded
      return {
        fees: {},
        prepaids: {
          interest: { regZFinanceCharge: true },
          homeownersInsurance: { 
            regZFinanceCharge: false,
            monthsPrepaid: 12,
            escrowCushionMonths: 2,
            typicalAnnualRate: 0.0035
          },
          propertyTaxes: {
            regZFinanceCharge: false,
            escrowCushionMonths: 2
          }
        },
        stateVariations: {}
      };
    }
  }
  
  /**
   * Get property tax payment cycle for the state
   * @param {string} state - State code
   * @returns {Promise<Object>} Tax cycle information
   * @private
   */
  async _getPropertyTaxCycle(state) {
    try {
      const taxCycleData = await this.loadData('location', 'tax_cycles');
      return taxCycleData[state] || taxCycleData.default || {
        frequency: 'annual',
        dueDates: ['01-15'] // Default to January 15th
      };
    } catch (error) {
      console.warn('Tax cycle data not available, using defaults');
      return {
        frequency: 'annual',
        dueDates: ['01-15'] // Default to January 15th
      };
    }
  }
  
  // Private helper methods
  _getCachedData(key) {
    if (!this.cache.has(key)) {
      return null;
    }
    
    const cachedItem = this.cache.get(key);
    
    // Check if cache has expired
    if (Date.now() - cachedItem.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cachedItem.data;
  }
  
  _cacheData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}

// Custom error class
class DataLoadError extends Error {
  constructor(message, options = {}) {
    super(message, options);
    this.name = 'DataLoadError';
  }
}

// Create and export singleton instance
export default new DataService();
