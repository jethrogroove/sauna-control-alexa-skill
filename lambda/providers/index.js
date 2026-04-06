const { HuumProvider } = require('./huum');

/**
 * Registry of sauna providers.
 * To add a new manufacturer, create a provider module and register it here.
 *
 * Each provider must implement:
 *   - name: string
 *   - getStatus(credentials): Promise<StatusObject>
 *   - start(credentials, options): Promise<StatusObject>
 *   - stop(credentials): Promise<StatusObject>
 */
const providers = {
  huum: HuumProvider,
  // Future providers:
  // harvia: HarviaProvider,
  // tylohelo: TyloHeloProvider,
};

/**
 * Get a provider by name.
 * @param {string} providerName
 * @returns {object} Provider implementation
 */
function getProvider(providerName) {
  const provider = providers[providerName?.toLowerCase()];
  if (!provider) {
    const available = Object.keys(providers).join(', ');
    throw new Error(
      `Unknown sauna provider "${providerName}". Available providers: ${available}`
    );
  }
  return provider;
}

/**
 * List all registered provider names.
 * @returns {string[]}
 */
function listProviders() {
  return Object.keys(providers);
}

module.exports = { getProvider, listProviders };
