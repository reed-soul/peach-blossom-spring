import type { Act } from './types'

// 世界坐标约定：y 高度，角色脚部 y≈0
// 沿 z 轴展开：溪流(z≈0) → 桃林(z≈-25) → 山洞(z≈-62) → 村庄(z≈-85)
//
// 镜头策略：以「第三人称跟背」（网游式）为主——相机在角色斜后上方，
// 看向角色前方。角色 facing=π（朝 -z 走），故相机在角色 +z 侧（身后）。
// 节奏上穿插侧面/正面/俯拍特写，避免单调。
//
// 跟背公式（facing=π）：
//   cam   = (actorX + sideOffset, height, actorZ + backDist)
//   look  = (actorX, chestY, actorZ - lookAhead)
// 其中 sideOffset 微偏让角色不挡视线，backDist≈7~9，height≈3.5~4.5

export const ACTS: Act[] = [
  {
    name: 'stream',
    title: '第一幕 · 缘溪行',
    beats: [
      {
        at: 0,
        duration: 8,
        // 跟背：角色划船顺溪，一开始就在前进（z 从 6 → 2）
        camera: { pos: [1.6, 2.6, 10], lookAt: [0, 1.5, 4], fov: 42 },
        actor: { pos: [0, 0, 6], facing: Math.PI, action: 'row' },
        caption: '晋太元中，武陵人捕鱼为业。',
        narration: '东晋太元年间，武陵郡有个人，以打鱼为生。',
        sfx: 'water',
      },
      {
        at: 8,
        duration: 9,
        // 角色继续前进（z 从 2 → -2），镜头同向跟随，平滑衔接
        camera: { pos: [1.8, 2.7, 4], lookAt: [0, 1.5, -3], fov: 44 },
        actor: { pos: [0, 0, 2], facing: Math.PI, action: 'row' },
        caption: '缘溪行，忘路之远近。',
        narration: '他沿着溪流划船前行，竟忘了走了多远。',
      },
      {
        at: 17,
        duration: 11,
        // 镜头稍抬高，越过角色肩头看向前方桃林（角色 z → -5）
        camera: { pos: [2, 3.6, 1], lookAt: [0, 2, -10], fov: 50 },
        actor: { pos: [0, 0, -2], facing: Math.PI, action: 'row' },
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
        // 跟背特写进入桃林，落英纷飞（网游近距离）
        camera: { pos: [1.4, 2.6, -17], lookAt: [0, 1.6, -21], fov: 42 },
        actor: { pos: [0, 0, -20], facing: Math.PI, action: 'walk' },
        caption: '中无杂树，芳草鲜美，落英缤纷。',
        narration: '林中没有别的树，芳草鲜嫩美丽，落花纷纷飘落。',
        sfx: 'wind',
      },
      {
        at: 13,
        duration: 12,
        // 环绕：从右侧绕到前侧（展现角色全身与飘动衣袂）
        camera: { pos: [6, 2.6, -30], lookAt: [0, 1.7, -30], fov: 38 },
        actor: { pos: [0, 0, -28], facing: Math.PI * 0.85, action: 'walk' },
        caption: '渔人甚异之，复前行，欲穷其林。',
        narration: '渔人十分惊异，又向前走，想要走到这片林子的尽头。',
      },
      {
        at: 25,
        duration: 11,
        // 低角度仰拍：角色走向远山，气势感
        camera: { pos: [0, 1.6, -44], lookAt: [0, 3, -55], fov: 55 },
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
        // 跟背特写：角色立于洞口前
        camera: { pos: [1.6, 2.7, -57], lookAt: [0, 1.7, -62], fov: 42 },
        actor: { pos: [0, 0, -60], facing: Math.PI, action: 'idle' },
        caption: '山有小口，仿佛若有光。',
        narration: '山上有个小洞口，洞里隐隐约约好像有光亮。',
        sfx: 'chime',
      },
      {
        at: 11,
        duration: 12,
        // 跟背进入幽暗洞口（镜头跟进）
        camera: { pos: [1.4, 2.6, -61], lookAt: [0, 1.6, -66], fov: 46 },
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
        // 出洞瞬间：硬切 + 广角，营造'豁然开朗'的视觉冲击
        camera: { pos: [3, 5.5, -67], lookAt: [0, 2, -82], fov: 62 },
        actor: { pos: [0, 0, -72], facing: Math.PI, action: 'walk' },
        caption: '复行数十步，豁然开朗。',
        narration: '又走了几十步，眼前突然开阔明亮起来。',
        sfx: 'village',
        cut: true,
      },
      {
        at: 14,
        duration: 13,
        // 高俯拍：展现良田美池屋舍俨然
        camera: { pos: [10, 9, -76], lookAt: [0, 1.5, -84], fov: 50 },
        actor: { pos: [0, 0, -80], facing: Math.PI, action: 'walk' },
        caption: '土地平旷，屋舍俨然，有良田美池桑竹之属。',
        narration: '只见土地平坦宽广，房屋整整齐齐，有肥沃的田地、美丽的池塘和桑树竹子之类。',
      },
      {
        at: 27,
        duration: 12,
        // 跟背特写缓行于田间（网游近距离）
        camera: { pos: [1.4, 2.6, -82], lookAt: [0, 1.6, -87], fov: 42 },
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
        // 侧面中景：村人往来，渔人驻足
        camera: { pos: [5.5, 2.8, -88], lookAt: [0, 1.7, -92], fov: 40 },
        actor: { pos: [0, 0, -90], facing: Math.PI * 0.7, action: 'idle' },
        caption: '其中往来种作，男女衣着，悉如外人。',
        narration: '里面的人来来往往耕种劳作，男女的穿着打扮，完全和外面的人一样。',
      },
      {
        at: 13,
        duration: 13,
        // 正面中景：村人惊问，渔人对答（面对面感）
        camera: { pos: [0, 2.2, -97], lookAt: [0, 1.7, -92], fov: 38 },
        actor: { pos: [0, 0, -92], facing: 0, action: 'idle' },
        caption: '见渔人，乃大惊，问所从来。具答之。',
        narration: '村人见到渔人，竟然十分惊讶，问他是从哪里来的。渔人详细地回答了他们。',
      },
      {
        at: 26,
        duration: 22,
        // 环绕特写→拉远收尾：渔人落座设宴，镜头缓缓环绕后拉远，余韵悠长
        camera: { pos: [4.5, 3.2, -89], lookAt: [0, 1.4, -92], fov: 42 },
        actor: { pos: [0, 0, -90], facing: 0, action: 'sit' },
        caption: '便要还家，设酒杀鸡作食。此中人语云：“不足为外人道也。”',
        narration: '村人便邀请他回家，摆酒杀鸡做饭来款待他。村里的人嘱咐说：这里的事，不值得对外面的人说啊。',
        sfx: 'gong',
      },
    ],
  },

  // ───────── 第六幕 · 避秦（复用村庄，渔人落座听村人讲述身世） ─────────
  {
    name: 'qin',
    title: '第六幕 · 不知有汉',
    beats: [
      {
        at: 0,
        duration: 13,
        // 镜头扫过村中老幼：黄发垂髫，怡然自乐（复用村庄区域）
        camera: { pos: [6, 3.0, -88], lookAt: [-2, 1.4, -93], fov: 42 },
        actor: { pos: [0, 0, -90], facing: 0, action: 'sit' },
        caption: '黄发垂髫，并怡然自乐。',
        narration: '老人和小孩，都充满喜悦之情，自得其乐。',
      },
      {
        at: 13,
        duration: 14,
        // 村人围聚问讯：侧面中景
        camera: { pos: [-6, 2.8, -92], lookAt: [0, 1.7, -90], fov: 40 },
        actor: { pos: [0, 0, -90], facing: 0, action: 'sit' },
        caption: '村中闻有此人，咸来问讯。',
        narration: '村里的人听说来了这么一个人，都来打听消息。',
      },
      {
        at: 27,
        duration: 18,
        // 自述避秦来历：正面中景，渔人坐听（长句给足停留）
        camera: { pos: [0, 2.4, -96], lookAt: [0, 1.5, -91], fov: 38 },
        actor: { pos: [0, 0, -90], facing: 0, action: 'sit' },
        caption: '自云先世避秦时乱，率妻子邑人来此绝境，不复出焉，遂与外人间隔。',
        narration: '他们自己说，祖先为了躲避秦朝的战乱，带领妻子儿女和乡邻来到这个与世隔绝的地方，再也没有出去，于是和外面的人隔断了来往。',
      },
      {
        at: 45,
        duration: 18,
        // 最经典名句：特写渔人，慢推，给足停留
        camera: { pos: [2, 2.0, -94], lookAt: [0, 1.7, -91], fov: 34 },
        actor: { pos: [0, 0, -90], facing: 0, action: 'sit' },
        caption: '问今是何世，乃不知有汉，无论魏晋。此人一一为具言所闻，皆叹惋。',
        narration: '他们问现在是什么朝代，竟然不知道有过汉朝，更不用说魏晋了。渔人把自己知道的一一详尽地告诉他们，他们都感叹惋惜。',
        sfx: 'chime',
      },
    ],
  },

  // ───────── 第七幕 · 既出遂迷（复用桃林+洞口反向走回，浓雾去色表现迷路） ─────────
  // actor 反向走：facing 翻为 0（朝 +z 走），相机改到 actor 的 -z 侧（身后）
  {
    name: 'lost',
    title: '第七幕 · 遂迷不复得',
    beats: [
      {
        at: 0,
        duration: 13,
        // 硬切：从桃源暖色切到出舟江面，时空断裂
        camera: { pos: [2.5, 3.2, -96], lookAt: [0, 1.6, -90], fov: 44 },
        actor: { pos: [0, 0, -90], facing: 0, action: 'walk' },
        caption: '余人各复延至其家，皆出酒食。停数日，辞去。',
        narration: '其余的人又各自把渔人请到家中，都拿出酒饭招待。渔人停留了几天，辞别离去。',
        cut: true,
      },
      {
        at: 13,
        duration: 14,
        // 既出得船，扶向路处处志之：回到洞口附近，反向行走（向 +z）
        camera: { pos: [-1.8, 3.0, -68], lookAt: [0, 1.6, -62], fov: 42 },
        actor: { pos: [0, 0, -64], facing: 0, action: 'walk' },
        caption: '既出，得其船，便扶向路，处处志之。',
        narration: '出来后，找到了他的船，就顺着来时的路回去，处处都做了标记。',
      },
      {
        at: 27,
        duration: 14,
        // 诣太守：远景，借 MountainRange
        camera: { pos: [4, 5.5, -40], lookAt: [0, 2, -30], fov: 50 },
        actor: { pos: [0, 0, -38], facing: 0, action: 'walk' },
        caption: '及郡下，诣太守，说如此。',
        narration: '到了郡城，去拜见太守，报告了这番经历。',
      },
      {
        at: 41,
        duration: 16,
        // 复寻桃林却迷路：复用桃林区域，actor facing 摇摆（idle 表现张望），浓雾由 PostFX 去色暗角营造
        camera: { pos: [3, 2.8, -22], lookAt: [0, 1.6, -28], fov: 44 },
        actor: { pos: [0, 0, -25], facing: 2.4, action: 'idle' },
        caption: '太守即遣人随其往，寻向所志，遂迷，不复得路。',
        narration: '太守立即派人跟着他去，寻找先前所做的标记，结果迷了路，再也找不到原来的路了。',
        sfx: 'wind',
      },
    ],
  },

  // ───────── 第八幕 · 无问津者（空旷远景，寂灭收尾） ─────────
  {
    name: 'elegy',
    title: '第八幕 · 后遂无问津者',
    beats: [
      {
        at: 0,
        duration: 15,
        // 刘子骥规往：静态远景，借 MountainRange 远山
        camera: { pos: [5, 4.5, -10], lookAt: [0, 2.5, -25], fov: 48 },
        actor: { pos: [0, 0, -18], facing: Math.PI, action: 'idle' },
        caption: '南阳刘子骥，高尚士也，闻之，欣然规往。',
        narration: '南阳人刘子骥，是个高洁的隐士，听说了这件事，高兴地计划前往。',
      },
      {
        at: 15,
        duration: 14,
        // 未果病终：画面继续空寂
        camera: { pos: [3, 4.0, -8], lookAt: [0, 2, -22], fov: 46 },
        actor: { pos: [0, 0, -18], facing: Math.PI, action: 'idle' },
        caption: '未果，寻病终。',
        narration: '没有实现，不久就病死了。',
      },
      {
        at: 29,
        duration: 18,
        // 后遂无问津者：固定长镜头推向空山，actor 远去，cut 收尾
        camera: { pos: [0, 3.5, -5], lookAt: [0, 2, -30], fov: 44 },
        actor: { pos: [0, 0, -28], facing: Math.PI, action: 'walk' },
        caption: '后遂无问津者。',
        narration: '从此以后，就再也没有人去探寻桃花源了。',
        sfx: 'chime',
      },
    ],
  },
]
