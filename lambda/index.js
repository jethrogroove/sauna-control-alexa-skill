const Alexa = require('ask-sdk-core');
const { getProvider } = require('./providers');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the user's sauna credentials from the Alexa access token.
 *
 * For now we use a simple JSON-encoded access token containing:
 *   { provider, email, password }
 *
 * Once OAuth account linking is wired up, the access token will be exchanged
 * for stored credentials on our auth server.
 */
function getCredentials(handlerInput) {
  const accessToken =
    handlerInput.requestEnvelope.context.System.user.accessToken;

  if (!accessToken) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(accessToken, 'base64').toString('utf-8'));
  } catch {
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
  handle(handlerInput) {
    const creds = getCredentials(handlerInput);
    if (!creds) {
      return accountLinkResponse(handlerInput);
    }

    const speech =
      'Welcome to Sauna Control. You can ask me to check the sauna status, ' +
      'start the sauna to a temperature, or turn it off. What would you like to do?';

    return handlerInput.responseBuilder
      .speak(speech)
      .reprompt('What would you like to do with your sauna?')
      .getResponse();
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
    const creds = getCredentials(handlerInput);
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
    const creds = getCredentials(handlerInput);
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
    const creds = getCredentials(handlerInput);
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
  handle(handlerInput) {
    const creds = getCredentials(handlerInput);
    if (!creds) return accountLinkResponse(handlerInput);

    const slots = handlerInput.requestEnvelope.request.intent.slots || {};
    const state = slots.state?.value || 'toggle';

    // Light control is not available via the Huum REST API at this time.
    // This handler is a placeholder for future implementation or for
    // providers that support light control.
    return handlerInput.responseBuilder
      .speak(
        `Sorry, light control is not yet available through this skill. ` +
        `You can control the light using the ${
          creds.provider || 'Huum'
        } app for now.`
      )
      .getResponse();
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
