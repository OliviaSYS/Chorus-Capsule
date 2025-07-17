import 'dotenv/config';
import { getRPSChoices } from './game.js';
import { capitalize, InstallGlobalCommands } from './utils.js';

function createCommandChoices() {
  const choices = getRPSChoices();
  const commandChoices = [];

  for (let choice of choices) {
    commandChoices.push({
      name: capitalize(choice),
      value: choice.toLowerCase(),
    });
  }

  return commandChoices;
}

const TEST_COMMAND = {
  name: 'test',
  description: 'Basic command',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const CHALLENGE_COMMAND = {
  name: 'challenge',
  description: 'Challenge to a match of rock paper scissors',
  options: [
    {
      type: 3,
      name: 'object',
      description: 'Pick your object',
      required: true,
      choices: createCommandChoices(),
    },
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 2],
};

const CREATE_COMMAND = {
    name: 'create',
    description: 'Create your quote portfolio',
    options: [
        {
          type: 3,
          name: 'portfolio',
          description: 'Name of the portfolio to create',
          required: true,
        },
        {
          type: 3,
          name: 'scope',
          description: 'Scope of the portfolio (personal/server/group)',
          required: true,
          choices: [
            { name: 'Personal', value: 'personal' },
            { name: 'Server', value: 'server' },
            { name: 'Group', value: 'group' },
          ],
        },
    ],
    type: 1,
    integration_types: [0, 1],
    contexts: [0, 2],
};

const DELETE_COMMAND = {
    name: 'delete',
    description: 'Delete your quote portfolio',
    options: [
        {
            type: 3,
            name: 'portfolio',
            description: 'Name of the portfolio to delete',
            required: true,
        },
        {
            type: 3,
            name: 'scope',
            description: 'Scoe of the portfolio to delete (personal/server/group)',
            required: true,
            choices: [
                { name: 'Personal', value: 'personal' },
                { name: 'Server', value: 'server' },
                { name: 'Group', value: 'group' },
            ],
        },
    ],
    type: 1,
    integration_types: [0, 1],
    contexts: [0, 2],
};

const ACCESS_COMMAND = {
    name: 'access',
    description: 'Access a quote portfolio by name and scope, and automatically create one if it does not exist.',
    options: [
        {
            type: 3,
            name: 'portfolio',
            description: 'Name of the portfolio',
            required: true,
        },
        {
            type: 3,
            name: 'scope',
            description: 'Whose portfolio do you want to access?',
            required: true,
            choices: [
                {name: 'Personal', value: 'personal'},
                {name: 'Server', value: 'server'},
                {name: 'Group', value: 'group'},
            ],
        },
    ],
    type: 1,
    integration_types: [0, 1],
    contexts: [0, 2],
};

const ADD_COMMAND = {
    name: 'add',
    description: 'Add a quote manually by entering the text snippet',
    options: [
      {
        type: 3,
        name: 'quote',
        description: 'The quote you would like to save',
        required: true,
      }
    ],
    type: 1,
    integration_types: [0, 1],
    contexts: [0, 2],
};

const COUNT_COMMAND = {
    name: 'count',
    description: 'See how many quotes you have in your active portfolio',
    type: 1,
    integration_types: [0, 1],
    contexts: [0, 2],
};

const GENERATE_COMMAND = {
    name: 'generate',
    description: 'Randomly generate a poem using your quotes',
    type: 1,
    integration_types: [0, 1],
    contexts: [0, 2],
};

const PEEK_COMMAND = {
    name: 'peek',
    description: 'Peek at your latest quote added',
    type: 1,
    integration_types: [0, 1],
    contexts: [0, 2],
};

const POP_COMMAND = {
    name: 'pop',
    description: 'Remove your latest quote added',
    type: 1,
    integration_types: [0, 1],
    contexts: [0, 2],
};

const RANDOM_COMMAND = {
    name: 'random',
    description: 'Remember the past: get a random quote from your portfolio',
    type: 1,
    integration_types: [0, 1],
    contexts: [0, 2],
};

const EXPORT_COMMAND = {
    name: 'export',
    description: 'Export your saved quotes as a full text message',
    type: 1,
    integration_types: [0, 1],
    contexts: [0, 2],
};

const ALL_COMMANDS = [TEST_COMMAND, CHALLENGE_COMMAND, CREATE_COMMAND, DELETE_COMMAND, ADD_COMMAND, COUNT_COMMAND, GENERATE_COMMAND, PEEK_COMMAND, POP_COMMAND, RANDOM_COMMAND, EXPORT_COMMAND, ACCESS_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
