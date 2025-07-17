import 'dotenv/config';
import express from 'express';
import {
    InteractionType,
    InteractionResponseType,
    InteractionResponseFlags,
    MessageComponentTypes,
    ButtonStyleTypes,
    verifyKeyMiddleware,
} from 'discord-interactions';

import {
    getScopeKey,
    setActivePortfolio,
    getActivePortfolio,
    addQuote,
    getQuotes,
    popQuote,
    deletePortfolio,
    clearActivePortfolio,
} from './storage.js';

import { getRandomEmoji, DiscordRequest } from './utils.js';
import { getShuffledOptions, getResult } from './game.js';

const app = express();
const PORT = process.env.PORT || 3000;

const activeGames = {};


app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
    const { type, id, data } = req.body;

    if (type === InteractionType.PING) {
        return res.send({ type: InteractionResponseType.PONG });
    }

    if (type === InteractionType.APPLICATION_COMMAND) {
        const { name } = data;

        if (name === 'test') {
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    flags: InteractionResponseFlags.IS_COMPONENTS_V2,
                    components: [
                        {
                            type: MessageComponentTypes.TEXT_DISPLAY,
                            content: `hello world ${getRandomEmoji()}`
                        }
                    ]
                },
            });
        }

        if (name === 'access') {
            try {
                const data = req.body.data; // Ensure this exists
                const options = data.options || [];
                
                const portfolioOption = options.find(opt => opt.name === 'portfolio');
                const scopeOption = options.find(opt => opt.name === 'scope');
        
                if (!portfolioOption || !scopeOption) {
                    return res.send({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: `⚠️ Missing required options. Please provide both a portfolio name and a scope.`,
                            flags: InteractionResponseFlags.EPHEMERAL,
                        },
                    });
                }
        
                const portfolioName = portfolioOption.value;
                const scope = scopeOption.value;
        
                const context = req.body.context;
                const user = context === 0 ? req.body.member?.user : req.body.user;
        
                if (!user?.id) {
                    return res.send({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: `⚠️ Unable to identify user. Try again or contact support.`,
                            flags: InteractionResponseFlags.EPHEMERAL,
                        },
                    });
                }
        
                const userId = user.id;
                const serverId = req.body.guild_id || 'global';
                const channelId = req.body.channel_id || 'unknown';
        
                const key = getScopeKey(userId, serverId, channelId, scope);
                setActivePortfolio(userId, key, portfolioName);
        
                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        flags: InteractionResponseFlags.IS_COMPONENTS_V2,
                        components: [
                            {
                                type: MessageComponentTypes.TEXT_DISPLAY,
                                content: `📂 Now accessing portfolio **"${portfolioName}"** in scope **${scope}**.`,
                            }
                        ]
                    }
                });
            } catch (error) {        
                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: `❌ An unexpected error occurred while accessing your portfolio.`,
                        flags: InteractionResponseFlags.EPHEMERAL,
                    },
                });
            }
        }

        if (name === 'create') {
            const portfolioName = data.options?.find(opt => opt.name === 'portfolio')?.value || 'default';
            const scope = data.options?.find(opt => opt.name === 'scope')?.value || 'personal';

            const context = req.body.context;
            const userId = context === 0 ? req.body.member.user.id : req.body.user.id;
            const serverId = req.body.guild_id || 'global';

            const key = getScopeKey(userId, serverId, req.body.channel_id, scope);
            const existing = getQuotes(key, portfolioName);
            if (existing.length > 0) {
                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        components: [
                            {
                                type: MessageComponentTypes.TEXT_DISPLAY,
                                content: `⚠️ A portfolio named **"${portfolioName}"** already exists in **${scope}**.`,
                                flags: InteractionResponseFlags.EPHEMERAL,
                            }
                        ]
                    }
                });
            }

            addQuote(userId, key, portfolioName, '[Portfolio created]');
            popQuote(userId, key, portfolioName);
            setActivePortfolio(userId, key, portfolioName);
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: `📁 Created and switched to portfolio **"${portfolioName}"** in **${scope}**.`
                }
            });
        }

        if (name === 'delete') {
            const portfolioName = data.options?.find(opt => opt.name === 'portfolio')?.value;
            const scope = data.options?.find(opt => opt.name === 'scope')?.value || 'personal';
            console.log("1", portfolioName, scope);
            if (!portfolioName) {
              return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                  content: '⚠️ Please provide a portfolio name to delete.',
                  flags: InteractionResponseFlags.EPHEMERAL,
                },
              });
            }
            console.log("2");
            const context = req.body.context;
            const userId = context === 0 ? req.body.member.user.id : req.body.user.id;
            const serverId = req.body.guild_id || 'global';
            console.log("3");
            const key = getScopeKey(userId, serverId, req.body.channel_id, scope);
            const deleted = deletePortfolio(key, portfolioName);
            const active = getActivePortfolio(userId);
            console.log("4");
            if (active && active.key === key && active.portfolio === portfolioName) {
              clearActivePortfolio(userId);
            }
            console.log("last");
            if (deleted) {
              return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                  content: `🗑️ Portfolio **"${portfolioName}"** in scope **${scope}** has been deleted.`,
                },
              });
            } else {
              return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                  content: `⚠️ Portfolio **"${portfolioName}"** not found in **${scope}**.`,
                  flags: InteractionResponseFlags.EPHEMERAL,
                },
              });
            }
        }

        if (name === 'add') {
            const quote = data.options?.find(opt => opt.name === 'quote')?.value;
            const context = req.body.context;
            const userId = context === 0 ? req.body.member.user.id : req.body.user.id;
            const active = getActivePortfolio(userId);

            if (quote.length < 4 || quote.length > 200) {
                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data : {
                        content: `⚠️ Quotes must be between 4 and 200 characters.`,
                        flags: InteractionResponseFlags.EPHEMERAL,
                    },
                });
            }

            if (!active) {
                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: `⚠️ You haven't selected or created a portfolio yet. Use /create or /access first.`,
                        flags: InteractionResponseFlags.EPHEMERAL,
                    },
                });
            }

            const {key, portfolio} = active;
            const existingQuotes = getQuotes(key, portfolio);
            if (existingQuotes.includes(quote)) {
                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: `⚠️ This quote already exists in your portfolio.`,
                        flags: InteractionResponseFlags.EPHEMERAL,
                    },
                });
            }

            addQuote(userId, key, portfolio, quote);

            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: `✅ Quote added to **${portfolio}**:\n> *${quote}*`
                },
            });
        }

        if (name === 'generate') {
            const context = req.body.context;
            const userId = context === 0? req.body.member.user.id : req.body.user.id;
            const active = getActivePortfolio(userId);

            if (!active) {
                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: `⚠️ You haven't selected or created a portfolio yet. Use /create or /access first.`,
                        flags: InteractionResponseFlags.EPHEMERAL,
                    },
                });
            }
            
            const {key, portfolio} = active;
            const quotes = getQuotes(key, portfolio);
            const number = quotes.length;
            const remaining = 4 - number;

            if (number < 4 && number > 0) {
                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: `⚠️ You only have ${number} quotes in your portfolio. You need to add at least ${remaining} more quotes with /add.`,
                        flags: InteractionResponseFlags.EPHEMERAL,
                    },
                });
            } else if (number == 0) {
                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: `⚠️ Your portfolio is empty. You need to add at least 4 more quotes with /add.`,
                        flags: InteractionResponseFlags.EPHEMERAL,
                    },
                });
            } else {
                let poem = '';
                let count = 0;
                for (let quote of [...quotes].sort(() => 0.5 - Math.random())) {
                    if ((poem.length + quote.length + 1) > 1900 || count >= 6) break;
                    poem += `> ${quote}\n`;
                    count++;
                }

                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data : {
                        content: `📜 Here's your poem from **${portfolio}**:\n\n${poem.trim()}\n\n— <@*${userId}*>`,
                    },
                });
            }
        }

        if (name === 'peek') {
            const context = req.body.context;
            const userId = context === 0? req.body.member.user.id : req.body.user.id;
            const active = getActivePortfolio(userId);

            if (!active) {
                return res.send ({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data : {
                        content: `⚠️ You haven't selected or created a portfolio yet. Use /create or /access first.`,
                        flags: InteractionResponseFlags.EPHEMERAL,
                    },
                });
            }
            
            const {key, portfolio} = active;
            const quotes = getQuotes(key, portfolio);
            
            if (quotes.length === 0) {
                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: `📭 Your portfolio **${portfolio}** is empty.`,
                        flags: InteractionResponseFlags.EPHEMERAL,
                    },
                });
            }

            const last = quotes[quotes.length - 1];

            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: `📝 Latest quote in **${portfolio}**:\n> ${last}`,
                    flags: InteractionResponseFlags.EPHEMERAL,
                },
            });
        }

        if (name === 'pop') {
            const context = req.body.context;
            const userId = context === 0 ? req.body.member.user.id : req.body.user.id;
            const active = getActivePortfolio(userId);

            if (!active) {
                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: `⚠️ You haven't selected or created a portfolio yet. Use /create or /access first.`,
                        flags: InteractionResponseFlags.EPHEMERAL,
                    },
                });
            }

            const {key, portfolio} = active;
            const removed = popQuote(userId, key, portfolio);

            if (!removed) {
                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: `📭 Your portfolio **${portfolio}** is empty — nothing to pop.`,
                        flags: InteractionResponseFlags.EPHEMERAL,
                    }
                })
            }

            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: `🗑️ Removed quote from **${portfolio}**:\n> ${removed}`,        
                }
            })
        }

        if (name === 'random') {
            const context = req.body.context;
            const userId = context === 0 ? req.body.member.user.id : req.body.user.id;
            const active = getActivePortfolio(userId);

            if (!active) {
                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: `⚠️ You haven't selected or created a portfolio yet. Use /create or /access first.`,
                        flags: InteractionResponseFlags.EPHEMERAL,
                    },
                });
            }

            const {key, portfolio} = active;
            const quotes = getQuotes(key, portfolio);

            if (quotes.length === 0) {
                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: `📭 Your portfolio **${portfolio}** is empty — there's nothing to randomly show.`,
                        flags: InteractionResponseFlags.EPHEMERAL,
                    },
                });
            }

            const random = quotes[Math.floor(Math.random() * quotes.length)];

            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: `🎲 Random quote from **${portfolio}**:\n> ${random}`,
                },        
            })
        }

        if (name === 'count') {
            const context = req.body.context;
            const userId = context === 0 ? req.body.member.user.id : req.body.user.id;
            const active = getActivePortfolio(userId);

            if (!active) {
                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: `⚠️ You haven't selected or created a portfolio yet. Use /create or /access first.`,
                        flags: InteractionResponseFlags.EPHEMERAL,
                    },
                });
            }

            const {key, portfolio} = active;
            const quotes = getQuotes(key, portfolio);
            const count = quotes.length;

            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: `📦 You have **${count}** quote${count === 1 ? '' : 's'} saved in **${portfolio}**.`,
                },
            });
        }

        if (name === 'export') {
            const context = req.body.context;
            const userId = context === 0 ? req.body.member.user.id : req.body.user.id;
            const active = getActivePortfolio(userId);

            if (!active) {
                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: `⚠️ You haven't selected or created a portfolio yet. Use /create or /access first.`,
                        flags: InteractionResponseFlags.EPHEMERAL,
                    },
                });
            }

            const {key, portfolio} = active;
            const quotes = getQuotes(key, portfolio);
                
            if (quotes.length === 0) {
                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: `📭 Your portfolio **${portfolio}** is empty — nothing to export.`,
                        flags: InteractionResponseFlags.EPHEMERAL,
                    },
                });
            }
        
            const fileContent = quotes.map((q, i) => `${i + 1}. ${q}`).join('\n');
            if (fileContent.length < 1900) {
                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: `📤 Exported quotes from **${portfolio}**:\n\n${fileContent}`,
                        flags: InteractionResponseFlags.EPHEMERAL,
                    },
                });
            } else {
                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: `⚠️ Your export is too large to send as a message. Export as a file feature coming soon.`,
                        flags: InteractionResponseFlags.EPHEMERAL,
                    },
                });
            }        
        }
          
        if (name === 'challenge' && id) {
            const context = req.body.context;
            const userId = context === 0 ? req.body.member.user.id : req.body.user.id;
            const objectName = req.body.data.options[0].value;

            activeGames[id] = {
                id: userId,
                objectName,
            };

            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    flags: InteractionResponseFlags.IS_COMPONENTS_V2,
                    components: [
                        {
                            type: MessageComponentTypes.TEXT_DISPLAY,
                            content: `Rock papers scissors challenge from <@${userId}>`,
                        },
                        {
                            type: MessageComponentTypes.ACTION_ROW,
                            components: [
                                {
                                    type: MessageComponentTypes.BUTTON,
                                    custom_id: `accept_button_${req.body.id}`,
                                    label: 'Accept',
                                    style: ButtonStyleTypes.PRIMARY,
                                },
                            ],
                        },
                    ],
                },
            });
        }

        console.error(`unknown command: ${name}`);
        return res.status(400).json({ error: 'unknown command' });
    }

    if (type === InteractionType.MESSAGE_COMPONENT) {
        const componentId = data.custom_id;

        if (componentId.startsWith('accept_button_')) {
            const gameId = componentId.replace('accept_button_', '');
            const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/${req.body.message.id}`;
            try {
                await res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        flags: InteractionResponseFlags.EPHEMERAL | InteractionResponseFlags.IS_COMPONENTS_V2,
                        components: [
                            {
                                type: MessageComponentTypes.TEXT_DISPLAY,
                                content: 'What is your object of choice?',
                            },
                            {
                                type: MessageComponentTypes.ACTION_ROW,
                                components: [
                                    {
                                        type: MessageComponentTypes.STRING_SELECT,
                                        custom_id: `select_choice_${gameId}`,
                                        options: getShuffledOptions(),
                                    },
                                ],
                            },
                        ],
                    },
                });
                await DiscordRequest(endpoint, { method: 'DELETE' });
            } catch (err) {
                console.error('Error sending message:', err);
            }
        } else if (componentId.startsWith('select_choice_')) {
            const gameId = componentId.replace('select_choice_', '');

            if (activeGames[gameId]) {
                const context = req.body.context;
                const userId = context === 0 ? req.body.member.user.id : req.body.user.id;
                const objectName = data.values[0];
                const resultStr = getResult(activeGames[gameId], {
                    id: userId,
                    objectName,
                });

                delete activeGames[gameId];
                const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/${req.body.message.id}`;

                try {
                    await res.send({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            flags: InteractionResponseFlags.IS_COMPONENTS_V2,
                            components: [
                                {
                                    type: MessageComponentTypes.TEXT_DISPLAY,
                                    content: resultStr
                                }
                            ]
                        },
                    });
                    await DiscordRequest(endpoint, {
                        method: 'PATCH',
                        body: {
                            components: [
                                {
                                    type: MessageComponentTypes.TEXT_DISPLAY,
                                    content: 'Nice choice ' + getRandomEmoji()
                                }
                            ],
                        },
                    });
                } catch (err) {
                    console.error('Error sending message:', err);
                }
            }
        }

        return;
    }

    console.error('unknown interaction type', type);
    return res.status(400).json({ error: 'unknown interaction type' });
});

app.listen(PORT, () => {
    console.log('Listening on port', PORT);
});
