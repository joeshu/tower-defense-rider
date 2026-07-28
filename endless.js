/* ============================================================
 *  endless.js —— 无尽模式 + 日常挑战 + 排行榜
 *
 *  功能模块：
 *    1. EndlessMgr   无尽模式：无限波次，难度递增
 *    2. DailyMgr     日常挑战：每日3任务，刷新机制
 *    3. LeaderboardMgr 本地排行榜（基于localStorage）
 *
 *  暴露接口（全局）：
 *    window.EndlessMgr / window.DailyMgr / window.LeaderboardMgr
 *
 *  game.js 通过 isEndlessMode() 判定当前是否为无尽模式
 * ============================================================ */
'use strict';

/* ============================================================
 *  无尽模式管理器
 * ============================================================ */
const EndlessMgr = {
  /* 当前会话状态 */
  session: {
    active: false,         // 是否处于无尽模式
    wave: 0,               // 当前波次（从1开始）
    totalKills: 0,         // 总击杀
    bossKills: 0,          // BOSS击杀数
    elementReactions: 0,   // 元素反应次数
    startTime: 0,          // 开始时间戳
    unitUsed: {},          // 本局使用过的兵种 { ch: count }
  },

  /* 重置会话 */
  startSession() {
    this.session = {
      active: true,
      wave: 0,
      totalKills: 0,
      bossKills: 0,
      elementReactions: 0,
      startTime: Date.now(),
      unitUsed: {},
    };
  },

  endSession() {
    const save = SaveMgr.get();
    const wave = this.session.wave;
    if (wave > (save.endless?.highestWave || 0)) {
      if (!save.endless) save.endless = {};
      save.endless.highestWave = wave;
    }
    save.endless = save.endless || {};
    save.endless.totalRuns = (save.endless.totalRuns || 0) + 1;
    save.endless.totalKills = (save.endless.totalKills || 0) + this.session.totalKills;
    SaveMgr.save();

    // 加入排行榜
    LeaderboardMgr.add({
      wave,
      kills: this.session.totalKills,
      bossKills: this.session.bossKills,
      duration: Math.floor((Date.now() - this.session.startTime) / 1000),
      date: Date.now(),
    });

    this.session.active = false;
  },

  isActive() { return this.session.active; },

  /* 生成无尽模式的波次
   * 难度公式：
   *   - 敌人数量 = 5 + wave * 2
   *   - 每5波出现精英怪（小钻风×3）
   *   - 每10波出现BOSS
   *   - 每30波出现终极BOSS
   */
  generateWave(wave) {
    const list = [];
    let count = 5 + wave * 2;

    // 基础敌人池（随波次扩大）
    const pool = ['妖', '妖', '妖', '魔'];
    if (wave >= 3)  pool.push('鬼', '鬼');
    if (wave >= 5)  pool.push('小钻风');
    if (wave >= 10) pool.push('魔', '魔', '小钻风');
    if (wave >= 20) pool.push('鬼', '魔', '小钻风');
    if (wave >= 30) pool.push('鬼', '魔', '小钻风');

    for (let i = 0; i < count; i++) {
      list.push(pool[Math.floor(Math.random() * pool.length)]);
    }

    // BOSS规则
    if (wave % 30 === 0) {
      // 30波：鸿钧老祖（终极）
      list.push('鸿钧老祖');
    } else if (wave % 20 === 0) {
      // 20波：通天教主
      list.push('通天教主');
    } else if (wave % 10 === 0) {
      // 10波：如来
      list.push('如来');
    } else if (wave % 5 === 0) {
      // 5波：金翅大鹏 或 牛魔王
      list.push(wave % 15 === 0 ? '牛魔王' : '金翅大鹏');
    }

    return list;
  },

  /* 敌人属性倍率（基于波次）
   * HP: 1 + wave * 0.18
   * ATK: 1 + wave * 0.12
   * SPD: 1 + min(wave * 0.02, 0.8)
   */
  getEnemyScale(wave) {
    return {
      hpMul:  1 + wave * 0.18,
      atkMul: 1 + wave * 0.12,
      spdMul: 1 + Math.min(wave * 0.02, 0.8),
      goldMul: 1 + wave * 0.05,
    };
  },

  /* 波次奖励（每清完一波） */
  getWaveReward(wave) {
    const scale = this.getEnemyScale(wave);
    return {
      gold: Math.floor((8 + wave * 4) * scale.goldMul),
      diamond: wave % 5 === 0 ? Math.floor(2 + wave / 5) : 0,
    };
  },

  /* 记录击杀 */
  recordKill(enemy) {
    if (!this.session.active) return;
    this.session.totalKills++;
    if (enemy.boss) this.session.bossKills++;
  },

  /* 记录元素反应 */
  recordReaction() {
    if (!this.session.active) return;
    this.session.elementReactions++;
  },

  /* 记录使用兵种 */
  recordUnitUse(ch) {
    if (!this.session.active) return;
    this.session.unitUsed[ch] = (this.session.unitUsed[ch] || 0) + 1;
  },

  /* 当前会话状态摘要（用于UI显示） */
  getSessionInfo() {
    const s = this.session;
    const duration = s.active ? Math.floor((Date.now() - s.startTime) / 1000) : 0;
    return {
      active: s.active,
      wave: s.wave,
      kills: s.totalKills,
      bossKills: s.bossKills,
      reactions: s.elementReactions,
      duration,
      unitCount: Object.keys(s.unitUsed).length,
    };
  },

  /* 历史最高（从存档） */
  getHighest() {
    const e = SaveMgr.get().endless || {};
    return {
      highestWave: e.highestWave || 0,
      totalRuns: e.totalRuns || 0,
      totalKills: e.totalKills || 0,
    };
  },
};

/* ============================================================
 *  日常挑战管理器
 * ============================================================ */
const DailyMgr = {
  /* 任务定义池（按类型分组） */
  TASK_POOL: [
    // 击杀类
    { type: 'kill',       target: 30,  diamond: 10, desc: '击杀30个敌人' },
    { type: 'kill',       target: 80,  diamond: 20, desc: '击杀80个敌人' },
    { type: 'kill',       target: 150, diamond: 35, desc: '击杀150个敌人' },
    { type: 'kill_boss',  target: 1,   diamond: 15, desc: '击败1个BOSS' },
    { type: 'kill_boss',  target: 3,   diamond: 40, desc: '击败3个BOSS' },
    // 关卡类
    { type: 'clear_wave', target: 5,   diamond: 15, desc: '完成5波（任意模式）' },
    { type: 'clear_wave', target: 10,  diamond: 25, desc: '完成10波（任意模式）' },
    { type: 'pass_level', target: 1,   diamond: 20, desc: '通关1个关卡' },
    { type: 'pass_level', target: 3,   diamond: 50, desc: '通关3个关卡' },
    // 战术类
    { type: 'reaction',   target: 5,   diamond: 15, desc: '触发5次元素反应' },
    { type: 'reaction',   target: 15,  diamond: 30, desc: '触发15次元素反应' },
    { type: 'use_units',  target: 8,   diamond: 20, desc: '使用8种不同兵种' },
    { type: 'use_units',  target: 15,  diamond: 45, desc: '使用15种不同兵种' },
    // 无尽模式
    { type: 'endless_wave', target: 10, diamond: 30, desc: '无尽模式到达第10波' },
    { type: 'endless_wave', target: 20, diamond: 60, desc: '无尽模式到达第20波' },
  ],

  /* 当日key（YYYYMMDD） */
  todayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  },

  /* 获取今日任务（自动刷新） */
  getToday() {
    const save = SaveMgr.get();
    if (!save.daily) save.daily = { date: '', tasks: [], unitsUsedToday: [] };

    const today = this.todayKey();
    if (save.daily.date !== today) {
      // 刷新任务
      save.daily = {
        date: today,
        tasks: this._rollDailyTasks(),
        unitsUsedToday: [],
      };
      SaveMgr.save();
    }
    if (!save.daily.unitsUsedToday) save.daily.unitsUsedToday = [];
    return save.daily;
  },

  /* 记录使用过的兵种（去重，跨游戏模式） */
  recordUnitUsed(ch) {
    const today = this.getToday();
    if (!today.unitsUsedToday.includes(ch)) {
      today.unitsUsedToday.push(ch);
      this.setProgress('use_units', today.unitsUsedToday.length);
      SaveMgr.save();
    }
  },

  /* 抽取3个日常任务（不同类型） */
  _rollDailyTasks() {
    const pool = [...this.TASK_POOL];
    const picked = [];
    const usedTypes = new Set();

    while (picked.length < 3 && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      const t = pool.splice(idx, 1)[0];
      if (usedTypes.has(t.type)) continue;
      usedTypes.add(t.type);
      picked.push({
        id: 'd_' + Math.random().toString(36).slice(2, 8),
        type: t.type,
        target: t.target,
        diamond: t.diamond,
        desc: t.desc,
        progress: 0,
        claimed: false,
      });
    }
    return picked;
  },

  /* 增加任务进度 */
  addProgress(type, amount = 1) {
    const today = this.getToday();
    let changed = false;
    for (const t of today.tasks) {
      if (t.type !== type || t.claimed) continue;
      if (t.progress >= t.target) continue;
      t.progress = Math.min(t.target, t.progress + amount);
      changed = true;
    }
    if (changed) SaveMgr.save();
    return changed;
  },

  /* 设置进度到指定值（用于 endless_wave, clear_wave） */
  setProgress(type, value) {
    const today = this.getToday();
    let changed = false;
    for (const t of today.tasks) {
      if (t.type !== type || t.claimed) continue;
      if (value > t.progress) {
        t.progress = Math.min(t.target, value);
        changed = true;
      }
    }
    if (changed) SaveMgr.save();
    return changed;
  },

  /* 领取奖励 */
  claim(taskId) {
    const today = this.getToday();
    const t = today.tasks.find(x => x.id === taskId);
    if (!t || t.claimed) return { ok: false, msg: '已领取或任务不存在' };
    if (t.progress < t.target) return { ok: false, msg: '任务未完成' };
    t.claimed = true;
    SaveMgr.addDiamond(t.diamond);
    SaveMgr.save();
    return { ok: true, diamond: t.diamond };
  },

  /* 今日完成数 */
  getCompletedCount() {
    return this.getToday().tasks.filter(t => t.progress >= t.target).length;
  },
};

/* ============================================================
 *  本地排行榜管理器
 * ============================================================ */
const LeaderboardMgr = {
  KEY: 'xy_td_leaderboard_v1',
  MAX: 10,

  _load() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY) || '[]');
    } catch (e) { return []; }
  },

  _save(list) {
    try { localStorage.setItem(this.KEY, JSON.stringify(list)); } catch (e) {}
  },

  /* 添加一条记录，返回排名（0表示未上榜） */
  add(record) {
    let list = this._load();
    list.push(record);
    list.sort((a, b) => b.wave - a.wave || b.kills - a.kills);
    list = list.slice(0, this.MAX);
    this._save(list);
    const rank = list.findIndex(x => x === record) + 1;
    return rank > 0 ? rank : 0;
  },

  /* 获取排行榜 */
  list() {
    return this._load();
  },

  /* 清空 */
  clear() { this._save([]); },
};

/* ============================================================
 *  暴露到全局
 * ============================================================ */
window.EndlessMgr = EndlessMgr;
window.DailyMgr = DailyMgr;
window.LeaderboardMgr = LeaderboardMgr;

/* ============================================================
 *  UI 渲染函数（由 game.js 调用）
 * ============================================================ */

/* 渲染日常挑战面板 */
function renderDailyPanel() {
  const container = document.getElementById('dailyContainer');
  if (!container) return;
  const today = DailyMgr.getToday();

  // 头部
  const dateStr = today.date.slice(0, 4) + '-' + today.date.slice(4, 6) + '-' + today.date.slice(6, 8);
  const completed = DailyMgr.getCompletedCount();

  let html = `
    <div class="daily-header">
      <div class="daily-date">📅 ${dateStr}</div>
      <div class="daily-progress">已完成 ${completed}/${today.tasks.length}</div>
    </div>
    <div class="daily-tasks">
  `;

  today.tasks.forEach(t => {
    const isDone = t.progress >= t.target;
    const isClaimed = t.claimed;
    const pct = Math.min(100, Math.floor((t.progress / t.target) * 100));

    html += `
      <div class="daily-task ${isClaimed ? 'claimed' : (isDone ? 'done' : '')}">
        <div class="dt-info">
          <div class="dt-desc">${t.desc}</div>
          <div class="dt-bar">
            <div class="dt-bar-fill" style="width:${pct}%"></div>
          </div>
          <div class="dt-meta">
            <span class="dt-progress">${t.progress}/${t.target}</span>
            <span class="dt-reward">💎 ${t.diamond}</span>
          </div>
        </div>
        <button class="dt-btn" data-task-id="${t.id}" ${isClaimed || !isDone ? 'disabled' : ''}>
          ${isClaimed ? '已领取' : (isDone ? '领取' : '未完成')}
        </button>
      </div>
    `;
  });

  html += '</div>';

  // 无尽模式入口
  const highest = EndlessMgr.getHighest();
  html += `
    <div class="endless-section">
      <div class="es-title">♾️ 无尽模式</div>
      <div class="es-info">
        <div class="es-stat">最高波次: <b>${highest.highestWave}</b></div>
        <div class="es-stat">累计击杀: <b>${highest.totalKills}</b></div>
        <div class="es-stat">挑战次数: <b>${highest.totalRuns}</b></div>
      </div>
      <button class="es-btn" id="btnStartEndless">${EndlessMgr.isActive() ? '继续当前会话' : '开始无尽挑战'}</button>
    </div>
  `;

  // 排行榜
  const board = LeaderboardMgr.list();
  html += `
    <div class="leaderboard-section">
      <div class="lb-title">🏆 本地排行榜</div>
      ${board.length === 0 ? '<div class="lb-empty">暂无记录，去无尽模式挑战吧！</div>' : `
        <div class="lb-list">
          ${board.map((r, i) => `
            <div class="lb-row ${i === 0 ? 'first' : ''}">
              <span class="lb-rank">${i + 1}</span>
              <span class="lb-wave">第${r.wave}波</span>
              <span class="lb-kills">击杀${r.kills}</span>
              <span class="lb-time">${_fmtDuration(r.duration)}</span>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;

  container.innerHTML = html;

  // 绑定按钮
  container.querySelectorAll('.dt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.taskId;
      const result = DailyMgr.claim(id);
      if (result.ok) {
        toast(`领取成功！+${result.diamond}💎`);
        renderDailyPanel();
        if (typeof updateAllResourceUI === 'function') updateAllResourceUI();
      } else {
        toast(result.msg);
      }
    });
  });

  const startBtn = document.getElementById('btnStartEndless');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      if (typeof startEndlessMode === 'function') startEndlessMode();
    });
  }
}

/* 渲染无尽模式会话HUD（顶部状态） */
function renderEndlessHUD() {
  if (!EndlessMgr.isActive()) return null;
  const info = EndlessMgr.getSessionInfo();
  return {
    wave: info.wave,
    kills: info.kills,
    bossKills: info.bossKills,
    duration: _fmtDuration(info.duration),
  };
}

/* 格式化时长 */
function _fmtDuration(sec) {
  if (!sec) return '0:00';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
