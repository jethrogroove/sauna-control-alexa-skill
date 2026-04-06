# Lambda Function Integration Example

This guide shows how to use the OAuth auth server from your Alexa Lambda skill.

## Overview

Your Lambda function will:

1. Receive request context with Alexa user ID
2. Exchange user ID for access token (via DynamoDB cache or API call)
3. Call `/api/credentials` to get sauna credentials
4. Use credentials to call sauna provider API
5. Return result to Alexa

## Step 1: Store Access Token (One-time Account Linking)

When user completes account linking, Alexa passes the access token to your Lambda:

```javascript
// In your intentHandlers
const Alexa = require('ask-sdk-core');

const AccountLinkingHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' &&
           request.intent.name === 'YourIntentName' &&
           handlerInput.requestEnvelope.context.System.user.accessToken;
  },
  handle(handlerInput) {
    const accessToken = handlerInput.requestEnvelope.context.System.user.accessToken;
    const userId = handlerInput.requestEnvelope.context.System.user.userId;

    // Store in DynamoDB for future use
    // You might also store the refresh token for token renewal

    return handlerInput.responseBuilder
      .speak('Account linked successfully!')
      .getResponse();
  }
};
```

## Step 2: Retrieve Credentials Using Access Token

Call the `/api/credentials` endpoint with the access token:

```javascript
/**
 * Fetch sauna credentials from auth server
 * @param {string} accessToken - OAuth access token from Alexa
 * @param {string} authServerUrl - Your Vercel app URL
 * @returns {Promise<{provider, email, password}>}
 */
async function getSaunaCredentials(accessToken, authServerUrl) {
  try {
    const response = await fetch(`${authServerUrl}/api/credentials`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Credentials API error: ${response.status}`);
    }

    const credentials = await response.json();
    return credentials;
    // Returns: { provider: 'Huum', email: 'user@example.com', password: '...' }
  } catch (error) {
    console.error('Failed to fetch credentials:', error);
    throw error;
  }
}
```

## Step 3: Use Credentials to Call Sauna API

Example for Huum sauna provider:

```javascript
/**
 * Get sauna status from Huum API
 * @param {Object} credentials - { provider, email, password }
 * @returns {Promise<Object>} Sauna status
 */
async function getSaunaStatus(credentials) {
  const { provider, email, password } = credentials;

  if (provider !== 'Huum') {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  try {
    // Huum API example
    const response = await fetch('https://api.huum.com/status', {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${email}:${password}`).toString('base64'),
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Huum API error: ${response.status}`);
    }

    return await response.json();
    // Returns: { temperature: 65, humidity: 45, status: 'idle' }
  } catch (error) {
    console.error('Failed to get sauna status:', error);
    throw error;
  }
}
```

## Step 4: Complete Intent Handler

Put it all together:

```javascript
const Alexa = require('ask-sdk-core');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { GetCommand } = require('@aws-sdk/lib-dynamodb');

const AUTH_SERVER_URL = 'https://your-vercel-app.vercel.app';
const DYNAMODB_TABLE = 'UserAccessTokens';

const SaunaStatusHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetSaunaStatusIntent';
  },
  async handle(handlerInput) {
    try {
      // Get user ID and access token
      const userId = handlerInput.requestEnvelope.context.System.user.userId;
      const accessToken = handlerInput.requestEnvelope.context.System.user.accessToken;

      if (!accessToken) {
        return handlerInput.responseBuilder
          .speak('Your account is not linked. Please link your account through the Alexa app.')
          .getResponse();
      }

      // Fetch credentials from auth server
      const credentials = await getSaunaCredentials(accessToken, AUTH_SERVER_URL);

      // Get sauna status
      const status = await getSaunaStatus(credentials);

      // Format response for Alexa
      const speechText = `Your sauna is ${status.status}. ` +
                        `Temperature is ${status.temperature} degrees. ` +
                        `Humidity is ${status.humidity} percent.`;

      return handlerInput.responseBuilder
        .speak(speechText)
        .getResponse();

    } catch (error) {
      console.error('Error:', error);
      return handlerInput.responseBuilder
        .speak('Sorry, I could not get your sauna status. Please try again later.')
        .getResponse();
    }
  }
};
```

## Step 5: Error Handling and Token Refresh

Handle expired access tokens:

```javascript
/**
 * Handle 401 responses by attempting token refresh
 * Requires refresh token stored in DynamoDB
 */
async function refreshAccessToken(refreshToken, authServerUrl) {
  try {
    const response = await fetch(`${authServerUrl}/api/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.ALEXA_CLIENT_ID,
        client_secret: process.env.ALEXA_CLIENT_SECRET
      })
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const { access_token } = await response.json();
    return access_token;
  } catch (error) {
    console.error('Token refresh error:', error);
    throw error;
  }
}

/**
 * Wrapper to handle 401 and retry with refresh
 */
async function getSaunaCredentialsWithRefresh(
  accessToken,
  refreshToken,
  authServerUrl
) {
  try {
    return await getSaunaCredentials(accessToken, authServerUrl);
  } catch (error) {
    if (error.message.includes('401')) {
      // Token expired, try refresh
      const newToken = await refreshAccessToken(refreshToken, authServerUrl);
      return getSaunaCredentials(newToken, authServerUrl);
    }
    throw error;
  }
}
```

## Complete Lambda Example with Secrets Manager

```javascript
const Alexa = require('ask-sdk-core');
const https = require('https');
const AWS = require('aws-sdk');

const secretsManager = new AWS.SecretsManager();

// Fetch config from Secrets Manager
async function getConfig() {
  try {
    const secret = await secretsManager.getSecretValue({
      SecretId: 'alexa-sauna-config'
    }).promise();
    return JSON.parse(secret.SecretString);
    // Should contain: { AUTH_SERVER_URL, ALEXA_CLIENT_ID, ALEXA_CLIENT_SECRET }
  } catch (error) {
    console.error('Failed to get config:', error);
    throw error;
  }
}

const SaunaControlHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SaunaControlIntent';
  },
  async handle(handlerInput) {
    try {
      // Get configuration
      const config = await getConfig();

      // Get access token from Alexa context
      const accessToken = handlerInput.requestEnvelope.context.System.user.accessToken;
      if (!accessToken) {
        return handlerInput.responseBuilder
          .speak('Please link your account in the Alexa app first.')
          .getResponse();
      }

      // Get sauna credentials
      const credentials = await getSaunaCredentials(accessToken, config.AUTH_SERVER_URL);

      // Call sauna API
      const status = await getSaunaStatus(credentials);

      // Build response
      const speech = `Your sauna temperature is ${status.temperature} degrees.`;
      return handlerInput.responseBuilder
        .speak(speech)
        .getResponse();

    } catch (error) {
      console.error('Handler error:', error);
      return handlerInput.responseBuilder
        .speak('Sorry, there was an error.')
        .getResponse();
    }
  }
};

// Lambda handler
const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(SaunaControlHandler)
  .addErrorHandlers({
    handle(handlerInput, error) {
      console.error('Error:', error);
      return handlerInput.responseBuilder
        .speak('An error occurred.')
        .getResponse();
    }
  })
  .lambda();
```

## DynamoDB Schema (Optional)

Store user tokens to avoid repeated API calls:

```javascript
// User Access Tokens table
{
  userId: 'amzn1.ask.account.abc123', // Partition key
  accessToken: 'jwt-token-here',
  refreshToken: 'opaque-refresh-token',
  expiresAt: 1234567890,
  createdAt: 1234567890,
  ttl: 1234567890  // Auto-expire after token lifetime
}
```

Store and retrieve:

```javascript
const dynamodb = new AWS.DynamoDB.DocumentClient();

async function storeAccessToken(userId, accessToken, refreshToken, expiresIn) {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

  await dynamodb.put({
    TableName: 'UserAccessTokens',
    Item: {
      userId,
      accessToken,
      refreshToken,
      expiresAt,
      createdAt: Math.floor(Date.now() / 1000),
      ttl: expiresAt
    }
  }).promise();
}

async function getAccessToken(userId) {
  const result = await dynamodb.get({
    TableName: 'UserAccessTokens',
    Key: { userId }
  }).promise();

  return result.Item?.accessToken || null;
}
```

## Testing in Alexa Simulator

1. Go to Alexa Developer Console > Test tab
2. Link account (first time only)
3. Type: "Ask my skill to get sauna status"
4. Should return sauna information

## Environment Variables for Lambda

```
AUTH_SERVER_URL=https://your-vercel-app.vercel.app
ALEXA_CLIENT_ID=<from auth server>
ALEXA_CLIENT_SECRET=<from auth server>
DYNAMODB_TABLE=UserAccessTokens
```

## Production Considerations

- **Token Caching**: Cache tokens in DynamoDB to reduce API calls
- **Error Logging**: Send errors to CloudWatch or external service
- **Rate Limiting**: Implement exponential backoff for API calls
- **Timeouts**: Set reasonable timeouts for external API calls
- **Monitoring**: Track success/failure rates and token refresh patterns

## Reference

- [Alexa Skills Kit Documentation](https://developer.amazon.com/docs/custom-skills/handle-requests-sent-by-alexa.html)
- [Account Linking](https://developer.amazon.com/docs/custom-skills/add-account-linking-to-a-custom-skill.html)
- [OAuth 2.0 Authorization Code Grant](https://tools.ietf.org/html/rfc6749#section-1.3.1)
