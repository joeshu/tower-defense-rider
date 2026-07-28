export const CHAPTER_THEMES = {
  1: {
    name: '黄风岭',
    bg: { top: '#f8ecd0', mid: '#f0e0b8', bot: '#e8d4a0' },
    cell: 'rgba(255,248,226,0.25)',
    cellFill: '#fff8e8',
    cellEmpty: '#f5ecd4',
    border: 'rgba(101,76,40,0.4)',
    borderUnit: '#c49a48',
    borderEmpty: '#c9a878',
    gold: '#c49a48',
    goldLight: '#e8c860',
    obs: '#a08560',
    obsDark: '#7a6548',
  },
  2: {
    name: '火焰山',
    bg: { top: '#f8e8d0', mid: '#f0d8b0', bot: '#e8c898' },
    cell: 'rgba(255,220,180,0.25)',
    cellFill: 'rgba(255,235,200,0.98)',
    cellEmpty: '#f0e0c0',
    border: 'rgba(140,60,30,0.45)',
    borderUnit: '#d97827',
    borderEmpty: '#d9a066',
    gold: '#d97827',
    goldLight: '#f4a460',
    obs: '#8b4513',
    obsDark: '#5a2d0c',
  },
  3: {
    name: '盘丝洞',
    bg: { top: '#f0e8f8', mid: '#e4d8f0', bot: '#d8c8e8' },
    cell: 'rgba(220,200,255,0.25)',
    cellFill: 'rgba(240,230,255,0.98)',
    cellEmpty: '#e8dff0',
    border: 'rgba(80,60,120,0.45)',
    borderUnit: '#9333ea',
    borderEmpty: '#b088d0',
    gold: '#9333ea',
    goldLight: '#c084fc',
    obs: '#6b4c8a',
    obsDark: '#4a3560',
  },
  4: {
    name: '小雷音',
    bg: { top: '#faf0d8', mid: '#f4e4c0', bot: '#ecd4a8' },
    cell: 'rgba(255,240,200,0.25)',
    cellFill: 'rgba(255,248,220,0.98)',
    cellEmpty: '#f0e8d0',
    border: 'rgba(160,120,30,0.45)',
    borderUnit: '#daa520',
    borderEmpty: '#d4b870',
    gold: '#daa520',
    goldLight: '#ffd700',
    obs: '#b8860b',
    obsDark: '#8b6914',
  },
};

export function getTheme(chapter) {
  return CHAPTER_THEMES[chapter] || CHAPTER_THEMES[1];
}

export const SPECIAL_CELL = {
  speed: { color: '#4fc07a', icon: '速', label: '疾速' },
  rage:  { color: '#ff6a4a', icon: '怒', label: '狂暴' },
  heal:  { color: '#66ddff', icon: '愈', label: '治愈' },
};
