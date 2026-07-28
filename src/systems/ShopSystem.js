import { UNITS } from '../config/units.js';
import { weightedPick } from '../utils/math.js';

const BASE_WEIGHTS = {
  '箭':3,'切':3,'盾':3,'速':2,'枪':2,
  '疗':2,'退':2,'神':1,'豪':1,'娥':1,'爆':2,
  '雷':2,'冰':2,'火':2,'毒':2,'奶':2,
  '弓':1,'炮':1,'刺':1,'甲':1,'锤':1,
  '唐':2,'僧':2,'悟':1,'空':1,'八':2,'戒':2,'沙':1,
  '姜':1,'牙':1,'申':1,'豹':1,'吒':1
};

const REROLL_COST = 2;
const CARD_COUNT = 5;

export function generateShopCards(unlockedTypes, levelConfig) {
  const unlocked = unlockedTypes && unlockedTypes.length > 0 ? unlockedTypes : ['箭','切','盾','速'];
  const banned = new Set();

  if (levelConfig?.rule) {
    if (levelConfig.rule.type === 'no_archer') banned.add('箭');
    if (levelConfig.rule.type === 'no_shield') banned.add('盾');
  }

  const pool = [];
  for (const type of unlocked) {
    if (banned.has(type)) continue;
    if (!UNITS[type]) continue;
    pool.push(type);
  }

  if (pool.length === 0) return [];

  const cards = [];
  const used = new Set();
  let attempts = 0;

  while (cards.length < CARD_COUNT && attempts < 100) {
    attempts++;
    const weights = {};
    for (const type of pool) {
      if (used.has(type)) continue;
      weights[type] = BASE_WEIGHTS[type] || 1;
    }
    if (Object.keys(weights).length === 0) break;
    const pick = weightedPick(weights);
    used.add(pick);
    cards.push({ type: pick, def: UNITS[pick] });
  }

  return cards;
}

export function getRerollCost() {
  return REROLL_COST;
}

export function getCardCount() {
  return CARD_COUNT;
}
