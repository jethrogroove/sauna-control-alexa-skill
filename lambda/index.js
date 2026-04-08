const Alexa = require('ask-sdk-core');
const axios = require('axios');
const { getProvider } = require('./providers');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * URL of the auth server's credentials endpoint.
 * Set this to your Vercel deployment URL.
 */
const AUTH_SERVER_URL =
  process.env.AUTH_SERVER_URL || 'https://sauna-control-auth.vercel.app';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fetch the user's sauna credentials from the auth server using the
 * OAuth access token that Alexa provides after account linking.
 *
 * The access token is a JWT issued by our auth server. We send it to
 * the /api/credentials endpoint, which validates it and returns the
 * user's decrypted sauna credentials: { provider, email, password }.
 */
async function getCredentials(handlerInput) {
  const accessToken =
    handlerInput.requestEnvelope.context.System.user.accessToken;

  if (!accessToken) {
    return null;
  }

  try {
    const response = await axios.get(`${AUTH_SERVER_URL}/api/credentials`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 5000,
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch credentials:', error.message);
    return null;
  }
}

/**
 * Build a response that asks the user to link their account.
 */
function accountLinkResponse(handlerInput) {
  return handlerInput.responseBuilder
    .speak(
      'To use Sauna Control, please link your sauna account in the Alexa app.'
    )
    .withLinkAccountCard()
    .getResponse();
}

/**
 * Determine whether the user is speaking in Fahrenheit.
 * Default to Fahrenheit for en-US locale.
 */
function usesFahrenheit(handlerInput) {
  const locale =
    handlerInput.requestEnvelope.request.locale || 'en-US';
  return locale.startsWith('en-US');
}

/**
 * Convert a user-spoken temperature to Celsius if needed.
 */
function toCelsius(temp, handlerInput) {
  if (usesFahrenheit(handlerInput)) {
    return Math.round(((temp - 32) * 5) / 9);
  }
  return temp;
}

/**
 * Convert a Celsius temperature to the user's preferred unit for speech.
 */
function toUserTemp(tempCelsius, handlerInput) {
  if (usesFahrenheit(handlerInput)) {
    return {
      value: Math.round((tempCelsius * 9) / 5 + 32),
      unit: 'degrees Fahrenheit',
    };
  }
  return { value: tempCelsius, unit: 'degrees Celsius' };
}

// ---------------------------------------------------------------------------
// Intent Handlers
// ---------------------------------------------------------------------------

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'LaunchRequest'
    );
  },
  async handle(handlerInput) {
    console.log('[SaunaControl v2] LaunchRequest received');
    const creds = await getCredentials(handlerInput);
    if (!creds) {
      return accountLinkResponse(handlerInput);
    }

    // On launch, just give them the current status
    try {
      const provider = getProvider(creds.provider || 'huum');
      const status = await provider.getStatus(creds);
      const temp = toUserTemp(status.currentTemperature, handlerInput);

      let speech;
      if (status.isOn) {
        const target = toUserTemp(status.targetTemperature, handlerInput);
        speech =
          `Sauna is heating. Currently ${temp.value} ${temp.unit}, ` +
          `target ${target.value}.`;
      } else if (status.statusText === 'offline') {
        speech = 'Sauna is offline.';
      } else {
        speech = `Sauna is ${status.statusText} at ${temp.value} ${temp.unit}.`;
      }

      if (status.hasLight) {
        speech += status.lightOn ? ' Light is on.' : ' Light is off.';
      }

      return handlerInput.responseBuilder
        .speak(speech)
        .reprompt('What would you like to do?')
        .getResponse();
    } catch (error) {
      console.error('Launch status error:', error);
      return handlerInput.responseBuilder
        .speak('Sauna Control is ready. What would you like to do?')
        .reprompt('What would you like to do?')
        .getResponse();
    }
  },
};

const GetSaunaStatusIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name ===
        'GetSaunaStatusIntent'
    );
  },
  async handle(handlerInput) {
    const creds = await getCredentials(handlerInput);
    if (!creds) return accountLinkResponse(handlerInput);

    try {
      const provider = getProvider(creds.provider || 'huum');
      const status = await provider.getStatus(creds);
      const temp = toUserTemp(status.currentTemperature, handlerInput);

      let speech;
      if (status.isOn) {
        const target = toUserTemp(status.targetTemperature, handlerInput);
        speech =
          `Your sauna is currently heating. ` +
          `The temperature is ${temp.value} ${temp.unit}, ` +
          `heading to a target of ${target.value} ${target.unit}.`;
      } else if (status.statusText === 'offline') {
        speech = 'Your sauna is currently offline.';
      } else {
        speech =
          `Your sauna is ${status.statusText}. ` +
          `The current temperature is ${temp.value} ${temp.unit}.`;
      }

      // Append light status if the controller supports it
      if (status.hasLight) {
        speech += status.lightOn
          ? ' The light is on.'
          : ' The light is off.';
      }

      return handlerInput.responseBuilder.speak(speech).getResponse();
    } catch (error) {
      console.error('GetSaunaStatus error:', error);
      return handlerInput.responseBuilder
        .speak(
          'Sorry, I had trouble checking your sauna status. Please try again later.'
        )
        .getResponse();
    }
  },
};

const StartSaunaIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name ===
        'StartSaunaIntent'
    );
  },
  async handle(handlerInput) {
    const creds = await getCredentials(handlerInput);
    if (!creds) return accountLinkResponse(handlerInput);

    try {
      const provider = getProvider(creds.provider || 'huum');
      const slots = handlerInput.requestEnvelope.request.intent.slots || {};

      const options = {};

      // Handle temperature slot
      if (slots.temperature && slots.temperature.value) {
        const userTemp = parseInt(slots.temperature.value, 10);
        const tempCelsius = toCelsius(userTemp, handlerInput);

        if (!provider.isValidTemperature || provider.isValidTemperature(tempCelsius)) {
          options.targetTemperature = tempCelsius;
        } else {
          const low = toUserTemp(40, handlerInput);
          const high = toUserTemp(110, handlerInput);
          return handlerInput.responseBuilder
            .speak(
              `The temperature must be between ${low.value} and ${high.value} ${low.unit}. ` +
              `What temperature would you like?`
            )
            .reprompt('What temperature should I set the sauna to?')
            .getResponse();
        }
      }

      // Handle humidity slot
      if (slots.humidity && slots.humidity.value) {
        options.humidity = parseInt(slots.humidity.value, 10);
      }

      const result = await provider.start(creds, options);
      const target = toUserTemp(
        result.targetTemperature || options.targetTemperature || 80,
        handlerInput
      );

      const speech =
        `OK, starting your sauna to ${target.value} ${target.unit}. ` +
        `I'll heat it up for you.`;

      return handlerInput.responseBuilder.speak(speech).getResponse();
    } catch (error) {
      console.error('StartSauna error:', error);
      return handlerInput.responseBuilder
        .speak(
          'Sorry, I had trouble starting your sauna. Please try again later.'
        )
        .getResponse();
    }
  },
};

const StopSaunaIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name ===
        'StopSaunaIntent'
    );
  },
  async handle(handlerInput) {
    const creds = await getCredentials(handlerInput);
    if (!creds) return accountLinkResponse(handlerInput);

    try {
      const provider = getProvider(creds.provider || 'huum');
      await provider.stop(creds);

      return handlerInput.responseBuilder
        .speak('OK, your sauna has been turned off.')
        .getResponse();
    } catch (error) {
      console.error('StopSauna error:', error);
      return handlerInput.responseBuilder
        .speak(
          'Sorry, I had trouble turning off your sauna. Please try again later.'
        )
        .getResponse();
    }
  },
};

const ControlLightIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name ===
        'ControlLightIntent'
    );
  },
  async handle(handlerInput) {
    const creds = await getCredentials(handlerInput);
    if (!creds) return accountLinkResponse(handlerInput);

    try {
      const provider = getProvider(creds.provider || 'huum');

      if (!provider.light) {
        return handlerInput.responseBuilder
          .speak(
            `Sorry, light control is not available for ${
              creds.provider || 'your sauna'
            }.`
          )
          .getResponse();
      }

      const slots = handlerInput.requestEnvelope.request.intent.slots || {};
      const stateSlot = slots.state?.value;

      // Map slot values to on/off/toggle
      let lightState = null; // null = toggle
      if (stateSlot === 'on') {
        lightState = 'on';
      } else if (stateSlot === 'off') {
        lightState = 'off';
      }

      const result = await provider.light(creds, lightState);

      if (!result.hasLight) {
        return handlerInput.responseBuilder
          .speak(
            'Your sauna controller does not have a light system configured.'
          )
          .getResponse();
      }

      const speech = result.lightOn
        ? 'The sauna light is now on.'
        : 'The sauna light is now off.';

      return handlerInput.responseBuilder.speak(speech).getResponse();
    } catch (error) {
      console.error('ControlLight error:', error);
      return handlerInput.responseBuilder
        .speak(
          'Sorry, I had trouble controlling the sauna light. Please try again later.'
        )
        .getResponse();
    }
  },
};

// ---------------------------------------------------------------------------
// Built-in Intent Handlers
// ---------------------------------------------------------------------------

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name ===
        'AMAZON.HelpIntent'
    );
  },
  handle(handlerInput) {
    const speech =
      'You can say things like: check the sauna status, ' +
      'start the sauna to 180 degrees, or turn off the sauna. ' +
      'What would you like to do?';

    return handlerInput.responseBuilder
      .speak(speech)
      .reprompt('What would you like to do with your sauna?')
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      (handlerInput.requestEnvelope.request.intent.name ===
        'AMAZON.CancelIntent' ||
        handlerInput.requestEnvelope.request.intent.name ===
          'AMAZON.StopIntent')
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder.speak('Goodbye!').getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'SessionEndedRequest'
    );
  },
  handle(handlerInput) {
    console.log(
      `Session ended: ${handlerInput.requestEnvelope.request.reason}`
    );
    return handlerInput.responseBuilder.getResponse();
  },
};

const IntentReflectorHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest'
    );
  },
  handle(handlerInput) {
    const intentName =
      handlerInput.requestEnvelope.request.intent.name;
    return handlerInput.responseBuilder
      .speak(`Sorry, I'm not sure how to handle ${intentName}.`)
      .getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error('Unhandled error:', error);
    return handlerInput.responseBuilder
      .speak('Sorry, something went wrong. Please try again.')
      .reprompt('Please try again.')
      .getResponse();
  },
};

// ---------------------------------------------------------------------------
// Lambda Entry Point
// ---------------------------------------------------------------------------

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    GetSaunaStatusIntentHandler,
    StartSaunaIntentHandler,
    StopSaunaIntentHandler,
    ControlLightIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler,
    IntentReflectorHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
