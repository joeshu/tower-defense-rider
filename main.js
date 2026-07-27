/* ============================================================
 *  main.js —— Vite 入口模块
 *  按依赖顺序加载各经典脚本，保持全局变量共享
 *
 *  使用 ?url 导入让 Vite 在构建时识别并复制资源文件
 *  加载顺序：weapons → levels → mobile → game
 *  原因：后加载的文件依赖前面文件中定义的全局变量
 *  （UNITS/LEVELS/WEAPONS/SaveMgr 等）
 * ============================================================ */

import weaponsUrl from './weapons.js?url';
import levelsUrl from './levels.js?url';
import mobileUrl from './mobile.js?url';
import gameUrl from './game.js?url';

const SCRIPTS = [weaponsUrl, levelsUrl, mobileUrl, gameUrl];

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.async = false; // 保证执行顺序
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
  } catch (err) {
    console.error('[main.js] 脚本加载失败:', err);
  }
})();
