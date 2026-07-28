/* ============================================================
 *  main.js —— Vite 入口模块
 *  双轨架构：新ES模块 + 旧全局脚本，渐进式迁移
 *
 *  加载顺序：
 *    1. 新架构兼容层 (src/compat/index.js) → window._Arc
 *    2. weapons.js → 武器配置 + SaveMgr (全局)
 *    3. levels.js  → 关卡布局 + 敌人配置 (全局)
 *    4. mobile.js  → 骑马单位系统 (全局)
 *    5. game.js    → 主游戏逻辑 (全局)
 *
 *  新模块统一从 window._Arc 访问，旧代码不受影响
 * ============================================================ */

import './src/compat/index.js';
import weaponsUrl from './weapons.js?url';
import levelsUrl from './levels.js?url';
import mobileUrl from './mobile.js?url';
import endlessUrl from './endless.js?url';
import gameUrl from './game.js?url';

const SCRIPTS = [weaponsUrl, levelsUrl, mobileUrl, endlessUrl, gameUrl];

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.async = false;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('Failed to load ' + src));
    document.body.appendChild(el);
  });
}

(async () => {
  try {
    for (const s of SCRIPTS) {
      await loadScript(s);
    }
    console.log('[main.js] 所有脚本加载完成');
  } catch (err) {
    console.error('[main.js] 脚本加载失败:', err);
  }
})();
