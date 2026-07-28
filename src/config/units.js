export const UNITS = {
  '箭': { cost: 3, name: '箭·射手', atk: 9,  range: 3,  aspd: 1.1, hp: 45,  color: '#4f8fd0', desc: '远程连射' },
  '切': { cost: 3, name: '切·快刀', atk: 16, range: 1,  aspd: 1.0, hp: 80,  color: '#d0704f', desc: '近战高伤' },
  '盾': { cost: 2, name: '盾·壁垒', atk: 4,  range: 1,  aspd: 0.6, hp: 240, color: '#8a8f9c', desc: '高血量吸引敌人' },
  '速': { cost: 3, name: '速·战鼓', atk: 0,  range: 0,  aspd: 0,   hp: 55,  color: '#4fc07a', desc: '相邻友军攻速+35%/级' },
  '疗': { cost: 4, name: '疗·医仙', atk: 0,  range: 0,  aspd: 0,   hp: 60,  color: '#4ade80', desc: '治疗相邻友军', heal: true },
  '退': { cost: 3, name: '退·力士', atk: 10, range: 1,  aspd: 0.8, hp: 90,  color: '#60a5fa', desc: '击退敌人', knockback: true },
  '神': { cost: 6, name: '神·战神', atk: 25, range: 2,  aspd: 0.7, hp: 100, color: '#fbbf24', desc: '神圣攻击·克制妖', counter: '妖' },
  '豪': { cost: 8, name: '豪·财神', atk: 18, range: 2,  aspd: 0.9, hp: 85,  color: '#f59e0b', desc: '击杀掉落额外金币', goldDrop: true },
  '娥': { cost: 5, name: '娥·嫦娥', atk: 14, range: 4,  aspd: 0.8, hp: 50,  color: '#ec4899', desc: '远程月光攻击', moon: true },
  '爆': { cost: 5, name: '爆·炸弹', atk: 0,  range: 0,  aspd: 0,   hp: 50,  color: '#ef4444', desc: '死亡时爆炸伤害', explode: true },
  '雷': { cost: 4, name: '雷·天师', atk: 15, range: 3,  aspd: 0.8, hp: 50,  color: '#ffd700', desc: '闪电链攻击多个目标', aoe: 2 },
  '冰': { cost: 4, name: '冰·寒士', atk: 10, range: 2,  aspd: 0.7, hp: 60,  color: '#4fd0f8', desc: '减速敌人50%', slow: true },
  '火': { cost: 4, name: '火·术士', atk: 12, range: 2,  aspd: 0.8, hp: 55,  color: '#ff6b35', desc: '灼烧持续伤害', burn: true },
  '毒': { cost: 3, name: '毒·蛊师', atk: 8,  range: 1,  aspd: 0.9, hp: 65,  color: '#8b5cf6', desc: '毒雾范围伤害', poison: true },
  '奶': { cost: 4, name: '奶·药师', atk: 0,  range: 0,  aspd: 0,   hp: 70,  color: '#4ade80', desc: '治疗相邻友军', heal: true },
  '弓': { cost: 5, name: '弓·神射', atk: 22, range: 4,  aspd: 0.7, hp: 40,  color: '#3b82f6', desc: '超远程狙击', counter: '魔' },
  '炮': { cost: 6, name: '炮·投石', atk: 35, range: 3,  aspd: 0.4, hp: 80,  color: '#92400e', desc: '范围爆炸伤害', aoe: 3 },
  '刺': { cost: 4, name: '刺·刺客', atk: 25, range: 1,  aspd: 1.3, hp: 45,  color: '#ef4444', desc: '背刺暴击', crit: true },
  '甲': { cost: 3, name: '甲·重装', atk: 6,  range: 1,  aspd: 0.5, hp: 320, color: '#6b7280', desc: '减免30%伤害', armor: true },
  '锤': { cost: 5, name: '锤·力士', atk: 28, range: 1,  aspd: 0.6, hp: 120, color: '#f97316', desc: '击晕敌人', stun: true },
  '唐': { cost: 4, name: '唐(半)',  atk: 0,  range: 0,  aspd: 0,   hp: 65,  color: '#c9a84f', combo: '唐僧', desc: '与「僧」相邻成型' },
  '僧': { cost: 4, name: '僧(半)',  atk: 0,  range: 0,  aspd: 0,   hp: 65,  color: '#c9a84f', combo: '唐僧', desc: '与「唐」相邻成型' },
  '悟': { cost: 5, name: '悟(半)',  atk: 6,  range: 2,  aspd: 0.8, hp: 60,  color: '#b06ad0', combo: '悟空', desc: '与「空」相邻成型' },
  '空': { cost: 5, name: '空(半)',  atk: 6,  range: 2,  aspd: 0.8, hp: 60,  color: '#b06ad0', combo: '悟空', desc: '与「悟」相邻成型' },
  '八': { cost: 4, name: '八(半)',  atk: 13, range: 1,  aspd: 0.9, hp: 110, color: '#6e9dca', combo: '八戒', desc: '与「戒」相邻成型' },
  '戒': { cost: 4, name: '戒(半)',  atk: 13, range: 1,  aspd: 0.9, hp: 110, color: '#6e9dca', combo: '八戒', desc: '与「八」相邻成型' },
  '沙': { cost: 3, name: '沙(半)',  atk: 5,  range: 2,  aspd: 0.7, hp: 150, color: '#779b78', combo: '沙僧', desc: '与「僧」相邻成型' },
  '姜': { cost: 5, name: '姜(半)',  atk: 8,  range: 3,  aspd: 0.7, hp: 80,  color: '#d97827', combo: '子牙', desc: '与「牙」相邻成型' },
  '牙': { cost: 5, name: '牙(半)',  atk: 8,  range: 3,  aspd: 0.7, hp: 80,  color: '#d97827', combo: '子牙', desc: '与「姜」相邻成型' },
  '申': { cost: 5, name: '申(半)',  atk: 10, range: 2,  aspd: 0.8, hp: 70,  color: '#9333ea', combo: '公豹', desc: '与「豹」相邻成型' },
  '豹': { cost: 5, name: '豹(半)',  atk: 10, range: 2,  aspd: 0.8, hp: 70,  color: '#9333ea', combo: '公豹', desc: '与「申」相邻成型' },
  '吒': { cost: 6, name: '哪吒(全)',atk: 18, range: 2,  aspd: 1.0, hp: 90,  color: '#f43f5e', desc: '三头六臂·范围攻击' },
  '枪': { cost: 3, name: '枪·长兵', atk: 12, range: 2,  aspd: 0.9, hp: 70,  color: '#5a8acc', desc: '贯穿伤害·克制骑', counter: '骑' },
};

export const COMBO_INFO = {
  '唐僧': { desc: '唐僧·慈悲为怀：持续治疗+佛光普照大招', color: '#ffd700' },
  '悟空': { desc: '悟空·大闹天宫：金箍棒横扫+击飞', color: '#ff8c00' },
  '八戒': { desc: '八戒·食色性也：扇形横扫+吸血+狂暴', color: '#4682b4' },
  '沙僧': { desc: '沙僧·金身罗汉：分担伤害+死亡爆炸', color: '#2e8b57' },
  '子牙': { desc: '子牙·封神榜：全场减速+打神鞭定身', color: '#daa520' },
  '公豹': { desc: '公豹·截教天阵：召唤魔物+自爆', color: '#8b008b' },
};

export const COMBO_PAIRS = [
  ['唐','僧'], ['悟','空'], ['八','戒'],
  ['沙','僧'], ['姜','牙'], ['申','豹']
];

export const MIRROR_CHARGE_MAX = 100;
export const MIRROR_SPECIAL_TYPES = new Set(['神','豪','娥','爆','退','疗','弓','炮']);

export function canMirrorUnit(u) {
  if (!u) return false;
  const d = UNITS[u.ch];
  if (!d || !d.atk || d.atk <= 0) return false;
  return u.combo || MIRROR_SPECIAL_TYPES.has(u.ch);
}

export function makeUnit(ch) {
  const d = UNITS[ch];
  return {
    ch, lv: 1, hp: d.hp, maxHp: d.hp, cd: 0, healT: 0,
    combo: false, partner: -1, aura: 1, dead: false,
    rallyBuff: 0, comboSkillCd: 0, comboSkillT: 0,
    comboCharge: 0, charge: 0, maxCharge: MIRROR_CHARGE_MAX,
    shield: 0,
  };
}

export function unitMaxHp(u, statFn) {
  let hp = UNITS[u.ch].hp * Math.pow(1.5, u.lv - 1);
  if (typeof statFn === 'function') {
    const baseHp = UNITS[u.ch].hp || 1;
    const finalStats = statFn(u);
    const hpMul = finalStats.hp / Math.max(1, baseHp);
    hp *= hpMul;
  }
  return hp;
}

export function effStat(u, statFn) {
  const d = UNITS[u.ch];
  const m = Math.pow(1.5, u.lv - 1);
  let atk = d.atk * m, range = d.range, aspd = d.aspd * u.aura, splash = 0;
  if (u.rallyBuff > 0) aspd *= 1.4;
  if (u.combo && (u.ch === '悟' || u.ch === '空')) { atk = 22 * m; range = 3; aspd = 1.15 * u.aura; splash = 60; }
  if (u.combo && (u.ch === '八' || u.ch === '戒')) { atk = 26 * m; range = 1; aspd = 1.0 * u.aura; splash = 30; }
  if (u.combo && (u.ch === '姜' || u.ch === '牙')) { atk = 14 * m; range = 4; aspd = 0.9 * u.aura; }
  if (u.combo && (u.ch === '申' || u.ch === '豹')) { atk = 16 * m; range = 2; aspd = 0.95 * u.aura; }
  if (u.combo && (u.ch === '沙')) { atk = 8 * m; range = 2; aspd = 0.8 * u.aura; }
  if (u.rallyBuff > 0 && u.combo) { aspd *= 1.4; }

  if (typeof statFn === 'function') {
    const baseAtk = d.atk || 1;
    const finalStats = statFn(u);
    const atkMul = finalStats.atk / Math.max(1, baseAtk);
    atk *= atkMul;
  }

  return { atk, range, aspd, splash };
}
