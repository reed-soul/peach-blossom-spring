import type { Act } from './types'

// 世界坐标约定：y 为高度，角色脚部 y≈0；镜头一般 y=2~6
// 沿 z 轴展开：溪流(z≈0) → 桃林(z≈-25) → 山洞(z≈-62) → 村庄(z≈-85)
export const ACTS: Act[] = [
  {
    name: 'stream',
    title: '第一幕 · 缘溪行',
    beats: [
      {
        at: 0,
        duration: 11,
        camera: { pos: [4, 4, 12], lookAt: [0, 1, 0], fov: 50 },
        actor: { pos: [0, 0, 2], facing: Math.PI, action: 'row' },
        caption: '晋太元中，武陵人捕鱼为业。',
        narration: '东晋太元年间，武陵郡有个人，以打鱼为生。',
        sfx: 'water',
      },
      {
        at: 11,
        duration: 12,
        camera: { pos: [6, 3, 6], lookAt: [0, 1, -2], fov: 55 },
        actor: { pos: [0, 0, -1], facing: Math.PI, action: 'row' },
        caption: '缘溪行，忘路之远近。',
        narration: '他沿着溪流划船前行，竟忘了走了多远。',
      },
      {
        at: 23,
        duration: 13,
        camera: { pos: [3, 5, 10], lookAt: [0, 2, -8], fov: 60 },
        actor: { pos: [0, 0, -4], facing: Math.PI, action: 'row' },
        caption: '忽逢桃花林，夹岸数百步。',
        narration: '忽然，他遇见了一片桃花林，沿着溪水两岸绵延数百步。',
        sfx: 'birds',
      },
    ],
  },
  {
    name: 'forest',
    title: '第二幕 · 落英缤纷',
    beats: [
      {
        at: 0,
        duration: 13,
        camera: { pos: [-3, 2, -18], lookAt: [0, 3, -28], fov: 55 },
        actor: { pos: [0, 0, -20], facing: Math.PI, action: 'walk' },
        caption: '中无杂树，芳草鲜美，落英缤纷。',
        narration: '林中没有别的树，芳草鲜嫩美丽，落花纷纷飘落。',
        sfx: 'wind',
      },
      {
        at: 13,
        duration: 12,
        camera: { pos: [5, 3, -22], lookAt: [0, 4, -32], fov: 50 },
        actor: { pos: [0, 0, -28], facing: Math.PI, action: 'walk' },
        caption: '渔人甚异之，复前行，欲穷其林。',
        narration: '渔人十分惊异，又向前走，想要走到这片林子的尽头。',
      },
      {
        at: 25,
        duration: 11,
        camera: { pos: [0, 6, -45], lookAt: [0, 2, -55], fov: 60 },
        actor: { pos: [0, 0, -48], facing: Math.PI, action: 'walk' },
        caption: '林尽水源，便得一山。',
        narration: '桃花林在溪水发源处到了尽头，眼前出现一座山。',
      },
    ],
  },
  {
    name: 'cave',
    title: '第三幕 · 舍船入山',
    beats: [
      {
        at: 0,
        duration: 11,
        camera: { pos: [4, 3, -58], lookAt: [0, 2, -64], fov: 55 },
        actor: { pos: [0, 0, -60], facing: Math.PI, action: 'enter' },
        caption: '山有小口，仿佛若有光。',
        narration: '山上有个小洞口，洞里隐隐约约好像有光亮。',
        sfx: 'chime',
      },
      {
        at: 11,
        duration: 12,
        camera: { pos: [0, 2, -62], lookAt: [0, 2, -68], fov: 45 },
        actor: { pos: [0, 0, -64], facing: Math.PI, action: 'enter' },
        caption: '便舍船，从口入。初极狭，才通人。',
        narration: '渔人便下了船，从洞口进去。起初洞口很窄，仅容一人通过。',
      },
    ],
  },
  {
    name: 'village',
    title: '第四幕 · 豁然开朗',
    beats: [
      {
        at: 0,
        duration: 14,
        camera: { pos: [8, 8, -68], lookAt: [0, 2, -80], fov: 65 },
        actor: { pos: [0, 0, -72], facing: Math.PI, action: 'walk' },
        caption: '复行数十步，豁然开朗。',
        narration: '又走了几十步，眼前突然开阔明亮起来。',
        sfx: 'village',
      },
      {
        at: 14,
        duration: 13,
        camera: { pos: [-6, 5, -75], lookAt: [0, 2, -85], fov: 55 },
        actor: { pos: [0, 0, -80], facing: Math.PI, action: 'walk' },
        caption: '土地平旷，屋舍俨然，有良田美池桑竹之属。',
        narration: '只见土地平坦宽广，房屋整整齐齐，有肥沃的田地、美丽的池塘和桑树竹子之类。',
      },
      {
        at: 27,
        duration: 12,
        camera: { pos: [4, 4, -82], lookAt: [0, 1, -90], fov: 50 },
        actor: { pos: [0, 0, -86], facing: Math.PI, action: 'idle' },
        caption: '阡陌交通，鸡犬相闻。',
        narration: '田间小路交错相通，村落间能互相听到鸡鸣狗叫的声音。',
      },
    ],
  },
  {
    name: 'people',
    title: '第五幕 · 不足为外人道',
    beats: [
      {
        at: 0,
        duration: 13,
        camera: { pos: [5, 3, -88], lookAt: [0, 2, -94], fov: 50 },
        actor: { pos: [0, 0, -90], facing: Math.PI, action: 'idle' },
        caption: '其中往来种作，男女衣着，悉如外人。',
        narration: '里面的人来来往往耕种劳作，男女的穿着打扮，完全和外面的人一样。',
      },
      {
        at: 13,
        duration: 13,
        camera: { pos: [-4, 2.5, -92], lookAt: [0, 2, -96], fov: 50 },
        actor: { pos: [0, 0, -92], facing: 0, action: 'idle' },
        caption: '见渔人，乃大惊，问所从来。具答之。',
        narration: '村人见到渔人，竟然十分惊讶，问他是从哪里来的。渔人详细地回答了他们。',
      },
      {
        at: 26,
        duration: 22,
        camera: { pos: [0, 4, -86], lookAt: [0, 1, -94], fov: 55 },
        actor: { pos: [0, 0, -90], facing: 0, action: 'sit' },
        caption: '便要还家，设酒杀鸡作食。此中人语云：“不足为外人道也。”',
        narration: '村人便邀请他回家，摆酒杀鸡做饭来款待他。村里的人嘱咐说：这里的事，不值得对外面的人说啊。',
        sfx: 'gong',
      },
    ],
  },
]
