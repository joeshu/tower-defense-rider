import { dist, dist2, clamp, lerp, rand, randInt, choice, weightedPick, roundRect, manhattan, sign, TAU } from '../utils/math.js';
import { SpatialGrid } from '../utils/SpatialGrid.js';
import { EventBus, bus } from '../core/EventBus.js';
import { GameState, GamePhase, game } from '../core/GameState.js';
import { buildLayoutCells, recomputeCombos, adjacent, findCellByGrid, buildCellIndex, neighborsOf, cellKey } from '../core/Grid.js';
import { UNITS, COMBO_INFO, COMBO_PAIRS, MIRROR_CHARGE_MAX, MIRROR_SPECIAL_TYPES, canMirrorUnit, makeUnit, unitMaxHp, effStat } from '../config/units.js';
import { CHAPTER_THEMES, getTheme, SPECIAL_CELL } from '../config/themes.js';
import { ENEMY_DEFS, generateWave, createEnemy, getRuleEffect } from '../config/enemies.js';
import { generateShopCards, getRerollCost, getCardCount } from '../systems/ShopSystem.js';
import { LEAK_DAMAGE_RATIO, findEnemyTarget, findNearestEnemy, findUnitTargetForEnemy, getReach, applyDamageToUnit, processUnitAttack } from '../systems/BattleSystem.js';
import { drawCell, drawUnitText, drawChargeBar, drawHeart, drawClouds, drawObstacle, drawFloatText } from '../render/sprites.js';
import { BattleRenderer } from '../render/BattleRenderer.js';

window._Arc = {
  utils: { dist, dist2, clamp, lerp, rand, randInt, choice, weightedPick, roundRect, manhattan, sign, TAU, SpatialGrid },
  core: { EventBus, bus, GameState, GamePhase, game, buildLayoutCells, recomputeCombos, adjacent, findCellByGrid, buildCellIndex, neighborsOf, cellKey },
  config: { UNITS, COMBO_INFO, COMBO_PAIRS, MIRROR_CHARGE_MAX, MIRROR_SPECIAL_TYPES, canMirrorUnit, makeUnit, unitMaxHp, effStat, CHAPTER_THEMES, getTheme, SPECIAL_CELL, ENEMY_DEFS, generateWave, createEnemy, getRuleEffect },
  systems: { generateShopCards, getRerollCost, getCardCount, LEAK_DAMAGE_RATIO, findEnemyTarget, findNearestEnemy, findUnitTargetForEnemy, getReach, applyDamageToUnit, processUnitAttack },
  render: { drawCell, drawUnitText, drawChargeBar, drawHeart, drawClouds, drawObstacle, drawFloatText, BattleRenderer },
};

console.log('[Arc] 新架构模块已加载到 window._Arc');
