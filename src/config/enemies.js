export const ENEMY_DEFS = {
  "妖":      { hp: 30,  spd: 42, atk: 7,  r: 15, color: "#7fae52", gold: 1 },
  "魔":      { hp: 24,  spd: 68, atk: 6,  r: 13, color: "#c05fb0", gold: 1 },
  "鬼":      { hp: 65,  spd: 30, atk: 10, r: 17, color: "#6a7fd0", gold: 1 },
  "小钻风":  { hp: 50,  spd: 52, atk: 9,  r: 16, color: "#d0a44f", gold: 2 },
  "白骨精":  { hp: 240, spd: 36, atk: 16, r: 22, color: "#e8e8f0", gold: 8,  elite: true },
  "牛魔王":  { hp: 700, spd: 24, atk: 28, r: 30, color: "#c04040", gold: 25, boss: true },
  "金翅大鹏":{ hp: 1200,spd: 52, atk: 35, r: 28, color: "#e8c83a", gold: 40, boss: true },
  "如来":    { hp: 3000,spd: 18, atk: 50, r: 36, color: "#ffd700", gold: 100,boss: true },
  "通天教主":{ hp: 5000,spd: 22, atk: 65, r: 34, color: "#9333ea", gold: 150,boss: true },
  "鸿钧老祖":{ hp: 10000,spd: 15, atk: 80, r: 40, color: "#00ffff", gold: 300,boss: true },
};

export function generateWave(levelConfig, waveIdx) {
  const lv = levelConfig;
  const list = [];
  let count = 4 + waveIdx * 2 + (lv.chapter - 1) * 3;

  if (lv.rule && lv.rule.type === "more_spawns") count = Math.ceil(count * 1.3);
  if (lv.rule && lv.rule.type === "fast_enemy") count += 2;

  const pool = ["妖","妖","妖","魔"];
  if (waveIdx >= 2) pool.push("鬼","小钻风");
  if (waveIdx >= 3) pool.push("鬼","鬼");
  if (lv.chapter >= 2) pool.push("小钻风","小钻风");
  if (lv.chapter >= 3) pool.push("鬼","魔","小钻风");

  for (let i = 0; i < count; i++) {
    list.push(pool[Math.floor(Math.random() * pool.length)]);
  }

  if (lv.rule && lv.rule.type === "boss" && waveIdx >= 4) {
    const levelId = lv.id || 1;
    if (levelId >= 35) list.push("通天教主");
    else if (levelId >= 25) list.push("金翅大鹏");
    else if (lv.chapter === 1) list.push("白骨精");
    else list.push("牛魔王");
  }
  if (lv.rule && lv.rule.type === "final_boss" && waveIdx >= 5) {
    const levelId = lv.id || 1;
    list.push(levelId >= 40 ? "鸿钧老祖" : "如来");
  }

  return list;
}

export function createEnemy(chName, x, y) {
  const def = ENEMY_DEFS[chName];
  if (!def) return null;
  return {
    name: chName,
    hp: def.hp,
    maxHp: def.hp,
    spd: def.spd,
    atk: def.atk,
    r: def.r,
    color: def.color,
    gold: def.gold,
    elite: def.elite || false,
    boss: def.boss || false,
    x, y,
    cd: 0,
    dead: false,
    slow: 0,
    burn: 0,
    burnDps: 0,
    stun: 0,
    root: 0,
    knockback: 0,
    knockbackX: 0,
    knockbackY: 0,
    jiangSlow: 0,
  };
}

export function getRuleEffect(levelConfig, effectType) {
  if (!levelConfig || !levelConfig.rule) return null;
  if (levelConfig.rule.type === effectType) return levelConfig.rule;
  return null;
}
