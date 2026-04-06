const axios = require('axios');

const BASE_URL = 'https://api.huum.eu/action/home';

/**
 * Status codes returned by the Huum API.
 */
const STATUS_CODES = {
  OFFLINE: 230,
  HEATING: 231,
  ONLINE_NOT_HEATING: 232,
  LOCKED: 233,
  EMERGENCY_STOP: 400,
};

/**
 * Human-readable descriptions for each status code.
 */
const STATUS_DESCRIPTIONS = {
  [STATUS_CODES.OFFLINE]: 'offline',
  [STATUS_CODES.HEATING]: 'heating',
  [STATUS_CODES.ONLINE_NOT_HEATING]: 'online but not heating',
  [STATUS_CODES.LOCKED]: 'in use by another user',
  [STATUS_CODES.EMERGENCY_STOP]: 'emergency stop activated',
};

/**
 * Create an Axios instance with basic auth for the Huum API.
 * @param {string} email - Huum account email
 * @param {string} password - Huum account password
 * @returns {import('axios').AxiosInstance}
 */
function createClient(email, password) {
  return axios.create({
    baseURL: BASE_URL,
    auth: { username: email, password },
    timeout: 10000,
  });
}

/**
 * Huum sauna provider — implements the standard provider interface.
 */
const HuumProvider = {
  name: 'Huum',

  /**
   * Get the current status of the sauna.
   * @param {object} credentials - { email, password }
   * @returns {object} Normalized status object
   */
  async getStatus(credentials) {
    const client = createClient(credentials.email, credentials.password);
    const { data } = await client.get('/status');

    return {
      provider: 'huum',
      statusCode: data.statusCode,
      statusText: STATUS_DESCRIPTIONS[data.statusCode] || 'unknown',
      isOn: data.statusCode === STATUS_CODES.HEATING,
      currentTemperature: data.temperature,
      targetTemperature: data.targetTemperature,
      humidity: data.humidity || null,
      doorOpen: data.door === true || data.door === 1,
      startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
      endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
      duration: data.duration || null,
      config: data.config,
      raw: data,
    };
  },

  /**
   * Start the sauna.
   * @param {object} credentials - { email, password }
   * @param {object} options - { targetTemperature, humidity }
   * @returns {object} Normalized status after starting
   */
  async start(credentials, options = {}) {
    const client = createClient(credentials.email, credentials.password);

    const params = {};
    if (options.targetTemperature) {
      // Huum API expects Celsius (40–110). Convert from Fahrenheit if needed.
      params.targetTemperature = options.targetTemperature;
    } else {
      params.targetTemperature = 80; // Default 80°C
    }
    if (options.humidity != null) {
      params.humidity = options.humidity;
    }

    const { data } = await client.post('/start', null, { params });

    return {
      provider: 'huum',
      statusCode: data.statusCode,
      statusText: STATUS_DESCRIPTIONS[data.statusCode] || 'unknown',
      isOn: data.statusCode === STATUS_CODES.HEATING,
      currentTemperature: data.temperature,
      targetTemperature: data.targetTemperature,
      raw: data,
    };
  },

  /**
   * Stop the sauna.
   * @param {object} credentials - { email, password }
   * @returns {object} Normalized status after stopping
   */
  async stop(credentials) {
    const client = createClient(credentials.email, credentials.password);
    const { data } = await client.post('/stop');

    return {
      provider: 'huum',
      statusCode: data.statusCode,
      statusText: STATUS_DESCRIPTIONS[data.statusCode] || 'unknown',
      isOn: false,
      currentTemperature: data.temperature,
      raw: data,
    };
  },

  /**
   * Temperature conversion helpers.
   */
  celsiusToFahrenheit(c) {
    return Math.round((c * 9) / 5 + 32);
  },

  fahrenheitToCelsius(f) {
    return Math.round(((f - 32) * 5) / 9);
  },

  /**
   * Validate that a target temperature (in Celsius) is within the Huum range.
   */
  isValidTemperature(tempCelsius) {
    return tempCelsius >= 40 && tempCelsius <= 110;
  },
};

module.exports = { HuumProvider, STATUS_CODES, STATUS_DESCRIPTIONS };
