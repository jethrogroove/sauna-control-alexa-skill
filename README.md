# Sauna Control — Alexa Skill

An Alexa skill for controlling your sauna by voice. Currently supports **Huum** saunas, with an extensible provider architecture for adding other manufacturers.

## Voice Commands

- "Alexa, open sauna control"
- "Check the status of my sauna"
- "Turn on my sauna to 150 degrees"
- "Start sauna to 180 degrees with humidity 5"
- "Turn off the sauna"

## Project Structure

```
├── ask-resources.json              # ASK CLI deployment config
├── skill-package/
│   ├── skill.json                  # Skill manifest
│   └── interactionModels/
│       └── custom/
│           └── en-US.json          # Interaction model (intents, slots)
└── lambda/
    ├── index.js                    # Alexa request handlers
    ├── package.json
    └── providers/
        ├── index.js                # Provider registry
        └── huum.js                 # Huum sauna API integration
```

## Adding a New Sauna Provider

1. Create a new file in `lambda/providers/` (e.g., `harvia.js`)
2. Implement the provider interface: `getStatus(credentials)`, `start(credentials, options)`, `stop(credentials)`
3. Register it in `lambda/providers/index.js`

## Setup

```bash
cd lambda && npm install
```

## Deployment

```bash
ask deploy
```

## Huum API Reference

- **GET** `api.huum.eu/action/home/status` — current sauna status
- **POST** `api.huum.eu/action/home/start?targetTemperature=80` — start heating (40–110 °C)
- **POST** `api.huum.eu/action/home/stop` — stop heating

Authentication: HTTP Basic Auth with Huum app credentials.
