/* ============================================================
 *  weapons.js — 武器配置系统
 *  武器品质、升级消耗、属性加成、特殊效果
 * ============================================================ */

/* ===== 品质定义 ===== */
const QUALITY = {
  green:  { name: '凡品',  color: '#54a868', atkPerLv: 0.04, baseCost: 100  },
  blue:   { name: '良品',  color: '#60a5fa', atkPerLv: 0.05, baseCost: 188  },
  purple: { name: '上品',  color: '#c084fc', atkPerLv: 0.06, baseCost: 500  },
  gold:   { name: '极品',  color: '#f4c95d', atkPerLv: 0.08, baseCost: 1000 },
  orange: { name: '神品',  color: '#ff8c42', atkPerLv: 0.10, baseCost: 2000 },
  yellow: { name: '秘宝',  color: '#ffd93d', atkPerLv: 0.08, baseCost: 1500 },
};

/* ===== 武器列表 =====
 * id:        武器唯一ID
 * name:      武器名（显示）
 * ch:        对应兵种字（普通兵种）或组合名（组合兵种）
 * type:      'unit' 普通兵种 / 'combo' 组合兵种 / 'fun' 趣味梗武器 / 'beast' 神兽
 * quality:   品质
 * maxLv:     最高等级
 * baseAtk:   显示攻击力（纯展示用）
 * atkPerLv:  每级攻击增加量（覆盖品质默认，可选）
 * icon:      装饰emoji/图标
 * unlock:    解锁条件
 * special:   特殊效果（可选）
 * unitType:  趣味武器作用的兵种（type=fun时）
 */
const WEAPONS = [
  /* ===== 基础武器（蓝色/紫色） ===== */
  { id: 'jian',   name: '箭兵',   ch: '箭',  type: 'unit',  quality: 'blue',   maxLv: 30, icon: '🏹', unlock: { type: 'start' } },
  { id: 'qiang',  name: '枪兵',   ch: '枪',  type: 'unit',  quality: 'blue',   maxLv: 30, icon: '🔱', unlock: { type: 'start' } },
  { id: 'dao',    name: '叨兵',   ch: '切',  type: 'unit',  quality: 'purple', maxLv: 30, icon: '🗡️', unlock: { type: 'start' } },
  { id: 'dun',    name: '盾兵',   ch: '盾',  type: 'unit',  quality: 'purple', maxLv: 30, icon: '🛡️', unlock: { type: 'start' } },
  { id: 'bao',    name: '炸弹',   ch: '爆',  type: 'unit',  quality: 'purple', maxLv: 30, icon: '💣', unlock: { type: 'chapter', chapter: 2 } },
  { id: 'shen',   name: '神',     ch: '神',  type: 'unit',  quality: 'gold',   maxLv: 30, icon: '👼', unlock: { type: 'start' } },
  { id: 'tu',     name: '屠夫',   ch: '屠',  type: 'unit',  quality: 'gold',   maxLv: 30, icon: '🔪', unlock: { type: 'chapter', chapter: 3 } },
  { id: 'hao',    name: '豪火球', ch: '豪',  type: 'unit',  quality: 'gold',   maxLv: 30, icon: '🔥', unlock: { type: 'chapter', chapter: 2 } },
  { id: 'e',      name: '娥',     ch: '娥',  type: 'unit',  quality: 'gold',   maxLv: 30, icon: '🌙', unlock: { type: 'chapter', chapter: 4 } },
  { id: 'tui',    name: '退',     ch: '退',  type: 'unit',  quality: 'blue',   maxLv: 30, icon: '💨', unlock: { type: 'start' } },
  { id: 'liao',   name: '疗',     ch: '疗',  type: 'unit',  quality: 'purple', maxLv: 30, icon: '💚', unlock: { type: 'chapter', chapter: 2 } },
  { id: 'gong',   name: '弓',     ch: '弓',  type: 'unit',  quality: 'purple', maxLv: 30, icon: '🏹', unlock: { type: 'chapter', chapter: 3 } },
  { id: 'pao',    name: '炮',     ch: '炮',  type: 'unit',  quality: 'gold',   maxLv: 30, icon: '💥', unlock: { type: 'chapter', chapter: 4 } },
  { id: 'lei',    name: '雷',     ch: '雷',  type: 'unit',  quality: 'gold',   maxLv: 30, icon: '⚡', unlock: { type: 'chapter', chapter: 5 } },
  { id: 'yu',     name: '雨',     ch: '雨',  type: 'unit',  quality: 'orange', maxLv: 30, icon: '🌧️', unlock: { type: 'chapter', chapter: 6 } },
  { id: 'feng',   name: '风',     ch: '风',  type: 'unit',  quality: 'orange', maxLv: 30, icon: '🌪️', unlock: { type: 'chapter', chapter: 6 } },
  { id: 'ju',     name: '巨人',   ch: '巨',  type: 'unit',  quality: 'orange', maxLv: 30, icon: '🦍', unlock: { type: 'chapter', chapter: 7 } },

  /* ===== 西游组合武器（紫色/绿色） ===== */
  { id: 'wukong', name: '悟空',   ch: '悟+空', type: 'combo', quality: 'purple', maxLv: 12, icon: '🍌',  comboKey: '悟空',
    unlock: { type: 'chapter', chapter: 2 } },
  { id: 'bajie',  name: '八戒',   ch: '八+戒', type: 'combo', quality: 'purple', maxLv: 12, icon: '🐷',  comboKey: '八戒',
    unlock: { type: 'chapter', chapter: 2 } },
  { id: 'tangseng', name: '唐僧', ch: '唐+僧', type: 'combo', quality: 'purple', maxLv: 12, icon: '📿',  comboKey: '唐僧',
    unlock: { type: 'chapter', chapter: 3 } },
  { id: 'shaseng', name: '沙僧',  ch: '沙+僧', type: 'combo', quality: 'green',  maxLv: 12, icon: '🧹',  comboKey: '沙僧',
    unlock: { type: 'chapter', chapter: 3 } },
  { id: 'ziya', name: '子牙',  ch: '姜+牙', type: 'combo', quality: 'purple',  maxLv: 12, icon: '🎣',  comboKey: '子牙',
    unlock: { type: 'chapter', chapter: 4 } },
  { id: 'gongbao', name: '公豹',  ch: '申+豹', type: 'combo', quality: 'purple',  maxLv: 12, icon: '🐆',  comboKey: '公豹',
    unlock: { type: 'chapter', chapter: 5 } },
  { id: 'bailong', name: '白龙马', ch: '骑',    type: 'combo', quality: 'green', maxLv: 12, icon: '🐴',  comboKey: 'horse',
    unlock: { type: 'chapter', chapter: 3 } },

  /* ===== 神级进阶武器（橙色） ===== */
  { id: 'shenwukong', name: '神悟空', ch: '悟+空', type: 'combo', quality: 'orange', maxLv: 20, icon: '⚡🐵', comboKey: '悟空',
    unlock: { type: 'weapon', weaponId: 'wukong', costDiamond: 500 },
    special: { '大闹天宫概率+10%': true, atkBonus: 0.10 } },
  { id: 'shenbajie', name: '神八戒', ch: '八+戒', type: 'combo', quality: 'orange', maxLv: 20, icon: '⚡🐷', comboKey: '八戒',
    unlock: { type: 'weapon', weaponId: 'bajie', costDiamond: 500 },
    special: { '吸血效果+15%': true, atkBonus: 0.10 } },
  { id: 'shenhao', name: '神豪', ch: '豪', type: 'unit', quality: 'orange', maxLv: 20, icon: '💰⚡',
    unlock: { type: 'weapon', weaponId: 'hao', costDiamond: 300 },
    special: { '金币掉落+50%': true, atkBonus: 0.10 } },
  { id: 'shenqiang', name: '神枪', ch: '枪', type: 'unit', quality: 'orange', maxLv: 20, icon: '⚡🔱',
    unlock: { type: 'weapon', weaponId: 'qiang', costDiamond: 300 },
    special: { '穿刺伤害+30%': true, atkBonus: 0.10 } },

  /* ===== 趣味梗武器（黄色秘宝） ===== */
  { id: 'daodun',  name: '刀盾',   unitType: '盾', type: 'fun', quality: 'yellow', maxLv: 20,
    unlock: { type: 'diamond', cost: 200 },
    special: { '单位血量+20%': true, hpBonus: 0.20 } },
  { id: 'hangbao', name: '夯爆',   unitType: '爆', type: 'fun', quality: 'yellow', maxLv: 20,
    unlock: { type: 'diamond', cost: 200 },
    special: { '爆炸范围+30%': true, aoeBonus: 0.30 } },
  { id: 'tuiqian', name: '退钱',   unitType: '退', type: 'fun', quality: 'yellow', maxLv: 20,
    unlock: { type: 'diamond', cost: 200 },
    special: { '击退距离+50%': true, knockBonus: 0.50 } },
  { id: 'tulong',  name: '屠龙刀', unitType: '切', type: 'fun', quality: 'yellow', maxLv: 20,
    unlock: { type: 'diamond', cost: 400 },
    special: { '对BOSS伤害+50%': true, bossBonus: 0.50 } },

  /* ===== 神兽武器（红色/橙色） ===== */
  { id: 'dragon', name: '巨龙', ch: '龙', type: 'beast', quality: 'orange', maxLv: 20, icon: '🐲',
    unlock: { type: 'chapter', chapter: 8 },
    special: { '龙息灼烧': true, burnDps: 0.05 } },
];

/* ===== 计算升级消耗 ===== */
function getWeaponUpgradeCost(weapon, currentLv) {
  const q = QUALITY[weapon.quality];
  const base = q.baseCost;
  return Math.floor(base * Math.pow(1.35, currentLv - 1));
}

/* ===== 计算武器属性加成 =====
 * 返回: { atkMul: 攻击倍率, hpMul: 血量倍率, special: {...} }
 */
function getWeaponBonus(weaponId, level) {
  const w = WEAPONS.find(x => x.id === weaponId);
  if (!w || !level || level <= 1) return { atkMul: 1, hpMul: 1, special: null };

  const q = QUALITY[w.quality];
  const atkPerLv = w.atkPerLv || q.atkPerLv;
  const atkMul = 1 + (level - 1) * atkPerLv;
  const hpMul  = 1 + (level - 1) * atkPerLv * 0.5;

  return {
    atkMul,
    hpMul,
    special: w.special || null,
  };
}

/* ===== 获取兵种对应的最佳武器 =====
 * 普通兵种：查找 type='unit' 且 ch 匹配的
 * 组合兵种：查找 type='combo' 且 comboKey 匹配的
 * 优先选品质高的、已解锁的
 */
function getBestWeaponForUnit(unit) {
  if (!unit) return null;
  const save = SaveMgr.get();
  let best = null;
  let bestQualityRank = -1;

  const qualityRank = { green:0, blue:1, purple:2, gold:3, orange:4, mythic:5 };

  WEAPONS.forEach(w => {
    // 检查是否已解锁
    if (!isWeaponUnlocked(w, save)) return;

    let match = false;
    if (w.type === 'unit' && w.ch === unit.ch) match = true;
    if (w.type === 'fun' && w.unitType === unit.ch) match = true;
    if (w.type === 'combo' && unit.combo && w.comboKey === UNITS[unit.ch].combo) match = true;
    if (w.type === 'beast' && w.ch === unit.ch) match = true;

    if (match) {
      const rank = qualityRank[w.quality] || 0;
      if (rank > bestQualityRank) {
        bestQualityRank = rank;
        best = w;
      }
    }
  });

  return best;
}

/* ===== 检查武器是否解锁 ===== */
function isWeaponUnlocked(weapon, save) {
  if (!weapon.unlock) return true;
  const u = weapon.unlock;
  save = save || SaveMgr.get();

  switch (u.type) {
    case 'start':
      return true;
    case 'chapter':
      return (save.highestChapter || 1) >= u.chapter;
    case 'diamond':
      return save.unlockedWeapons && save.unlockedWeapons.includes(weapon.id);
    case 'weapon':
      // 需要先拥有某个武器 + 钻石解锁
      const hasBase = save.unlockedWeapons && save.unlockedWeapons.includes(u.weaponId);
      const hasAdvanced = save.unlockedWeapons && save.unlockedWeapons.includes(weapon.id);
      return hasAdvanced || (hasBase && false); // 需要主动解锁
    default:
      return false;
  }
}

/* ===== 获取单位最终属性（含武器加成） ===== */
function calcUnitFinalStats(unit) {
  const base = {
    atk: UNITS[unit.ch]?.atk || 0,
    hp:  UNITS[unit.ch]?.hp || 0,
  };

  // 武器加成
  const w = getBestWeaponForUnit(unit);
  if (w) {
    const lv = SaveMgr.getWeaponLevel(w.id);
    const bonus = getWeaponBonus(w.id, lv);
    base.atk *= bonus.atkMul;
    base.hp  *= bonus.hpMul;
    if (bonus.special) {
      if (bonus.special.hpBonus) base.hp *= (1 + bonus.special.hpBonus);
    }
  }

  // 天赋加成
  const t = SaveMgr.get().talents || {};
  const atkTalent = t.attack || 0;
  const defTalent = t.defense || 0;
  base.atk *= (1 + atkTalent * 0.10); // 每级+10%攻击
  // 防御天赋：减伤 = 等级 * 5%（转化为等效血量增加）
  const damageReduction = Math.min(0.8, defTalent * 0.05);
  base.hp *= (1 / (1 - damageReduction));

  return base;
}

/* ===== 获取单位的特殊效果（来自武器） =====
 * 返回包含各种特殊加成的对象
 */
function getUnitWeaponSpecials(unit) {
  const specials = {
    bossDamageMul: 1,       // BOSS伤害倍率
    aoeRangeMul: 1,         // 范围伤害倍率
    knockbackMul: 1,        // 击退距离倍率
    goldDropMul: 1,         // 金币掉落倍率
    burnDps: 0,             // 灼烧DPS（每秒最大生命百分比）
    monkeySkillBonus: 0,    // 悟空技能概率加成
    pigLifestealBonus: 0,   // 八戒吸血加成
  };

  const w = getBestWeaponForUnit(unit);
  if (!w || !w.special) return specials;

  const s = w.special;
  if (s.bossBonus) specials.bossDamageMul = 1 + s.bossBonus;
  if (s.aoeBonus) specials.aoeRangeMul = 1 + s.aoeBonus;
  if (s.knockBonus) specials.knockbackMul = 1 + s.knockBonus;
  if (s.goldBonus) specials.goldDropMul = 1 + s.goldBonus;
  if (s.burnDps) specials.burnDps = s.burnDps;
  if (s['大闹天宫概率+10%']) specials.monkeySkillBonus = 0.10;
  if (s['吸血效果+15%']) specials.pigLifestealBonus = 0.15;
  if (s['金币掉落+50%']) specials.goldDropMul *= 1.5;

  return specials;
}

/* ============================================================
 *  SaveMgr — 存档管理器
 * ============================================================ */
const SaveMgr = {
  KEY: 'xy_td_save_v1',

  _cache: null,

  get() {
    if (this._cache) return this._cache;
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) {
        this._cache = JSON.parse(raw);
      } else {
        this._cache = this._default();
      }
    } catch (e) {
      this._cache = this._default();
    }
    return this._cache;
  },

  _default() {
    return {
      gold: 500,
      diamond: 50,
      weapons: {
        jian:  { level: 1 },
        qiang: { level: 1 },
        dao:   { level: 1 },
        dun:   { level: 1 },
        shen:  { level: 1 },
        tui:   { level: 1 },
        hao:   { level: 1 },
        e:     { level: 1 },
        bao:   { level: 1 },
        liao:  { level: 1 },
        gong:  { level: 1 },
        pao:   { level: 1 },
        lei:   { level: 1 },
        tu:    { level: 1 },
      },
      talents: {
        attack: 0,
        hp: 0,
        defense: 0,
      },
      highestChapter: 1,
      highestWave: 0,
      unlockedWeapons: ['jian','qiang','dao','dun','shen','tui','hao','e','bao','liao','gong','pao','lei','tu'],
    };
  },

  save() {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(this._cache));
    } catch (e) {}
  },

  reset() {
    this._cache = this._default();
    this.save();
  },

  /* ===== 武器相关 ===== */
  getWeaponLevel(weaponId) {
    const s = this.get();
    return s.weapons[weaponId]?.level || 0;
  },

  upgradeWeapon(weaponId) {
    const s = this.get();
    const w = WEAPONS.find(x => x.id === weaponId);
    if (!w) return { ok: false, msg: '武器不存在' };
    if (!isWeaponUnlocked(w, s)) return { ok: false, msg: '未解锁' };

    const current = s.weapons[weaponId]?.level || 1;
    if (current >= w.maxLv) return { ok: false, msg: '已满级' };

    const cost = getWeaponUpgradeCost(w, current);
    if (s.gold < cost) return { ok: false, msg: '金币不足' };

    s.gold -= cost;
    s.weapons[weaponId] = { level: current + 1 };
    this.save();
    return { ok: true, newLevel: current + 1, cost };
  },

  /* ===== 天赋相关 ===== */
  upgradeTalent(talentKey) {
    const s = this.get();
    const lv = s.talents[talentKey] || 0;
    const maxLv = 20;
    if (lv >= maxLv) return { ok: false, msg: '已满级' };

    const cost = this.talentCost(lv);
    if (s.diamond < cost) return { ok: false, msg: '钻石不足' };

    s.diamond -= cost;
    s.talents[talentKey] = lv + 1;
    this.save();
    return { ok: true, newLevel: lv + 1, cost };
  },

  talentCost(currentLv) {
    const tiers = [
      { upTo: 5,  cost: 40  },
      { upTo: 10, cost: 80  },
      { upTo: 15, cost: 160 },
      { upTo: 20, cost: 320 },
    ];
    for (const t of tiers) {
      if (currentLv < t.upTo) return t.cost;
    }
    return 640;
  },

  /* ===== 资源相关 ===== */
  addGold(amount) {
    const s = this.get();
    s.gold += amount;
    this.save();
  },

  addDiamond(amount) {
    const s = this.get();
    s.diamond += amount;
    this.save();
  },

  spendGold(amount) {
    const s = this.get();
    if (s.gold < amount) return false;
    s.gold -= amount;
    this.save();
    return true;
  },

  spendDiamond(amount) {
    const s = this.get();
    if (s.diamond < amount) return false;
    s.diamond -= amount;
    this.save();
    return true;
  },

  /* ===== 进度 ===== */
  setHighestChapter(ch) {
    const s = this.get();
    if (ch > (s.highestChapter || 1)) {
      s.highestChapter = ch;
      this.save();
    }
  },

  setHighestWave(wave) {
    const s = this.get();
    if (wave > (s.highestWave || 0)) {
      s.highestWave = wave;
      this.save();
    }
  },

  /* ===== 解锁武器 ===== */
  unlockWeapon(weaponId) {
    const s = this.get();
    if (!s.unlockedWeapons) s.unlockedWeapons = [];
    if (!s.unlockedWeapons.includes(weaponId)) {
      s.unlockedWeapons.push(weaponId);
      s.weapons[weaponId] = { level: 1 };
      this.save();
      return true;
    }
    return false;
  },
};
