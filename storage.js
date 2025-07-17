import fs from 'fs';
import path from 'path';

const QUOTES_FILE = path.resolve('./quotes.json');

function loadQuotes() {
    try {
      return JSON.parse(fs.readFileSync(QUOTES_FILE, 'utf-8'));
    } catch (err) {
      return {};
    }
}
  
function saveQuotes(quotes) {
    fs.writeFileSync(QUOTES_FILE, JSON.stringify(quotes, null, 2));
}


const activePortfolios = {}; // format: { [userId]: { key: "....", portfolio: "...." } }


function getScopeKey(userId, serverId, channelId, scope) {
    if (scope === 'personal') return `user:${userId}`;
    if (scope === 'server') return `server:${serverId}`;
    if (scope === 'group') return `group:${channelId}`;
    return null;
}

function setActivePortfolio(userId, key, portfolio) {
    activePortfolios[userId] = { key, portfolio};
}

function getActivePortfolio(userId) {
    return activePortfolios[userId] || null;
}

export function clearActivePortfolio(userId) {
    delete activePortfolios[userId];
}

function deletePortfolio(key, portfolio) {
    const quotes = loadQuotes();
    if (quotes[key] && quotes[key][portfolio]) {
        delete quotes[key][portfolio];
        saveQuotes(quotes);
        return true;
      }
      return false;
}

function addQuote(userId, key, portfolio, quoteText) {
    const quotes = loadQuotes();

    if (!quotes[key]) quotes[key] = {};
    if (!quotes[key][portfolio]) quotes[key][portfolio] = [];

    quotes[key][portfolio].push(quoteText);

    saveQuotes(quotes);
}

function getQuotes(key, portfolio) {
    const quotes = loadQuotes();
    return (quotes[key] && quotes[key][portfolio]) || [];
}

function popQuote(userId, key, portfolio) {
    const quotes = loadQuotes();

    if (quotes[key]?.[portfolio]?.length > 0) {
        const removed = quotes[key][portfolio].pop();
        saveQuotes(quotes);
        return removed;
    }

    return null;
}

export {
    getScopeKey,
    setActivePortfolio,
    getActivePortfolio,
    addQuote,
    getQuotes,
    popQuote,
    deletePortfolio,
};