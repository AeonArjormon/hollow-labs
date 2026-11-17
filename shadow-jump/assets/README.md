# 两仪行·十二元辰 美术资源

当前版本采用墨线勾勒、青玉与朱砂配色的国风 Canvas 美术。故事横跨天庭和地府，主角是巡界剑修，十二生肖星君分别镇守十二关。所有精灵在场景创建时绘制并缓存为透明纹理，后续直接复用，不额外下载角色图片。

## 当前使用

- `hero-portrait.svg`：开始界面的国风巡界剑修与两界背景插图。
- `../src/art.js`：巡界使的御剑、镇魂两种形态，八组动作，以及飞剑。主角采用露出人脸的修长比例、黑发玉簪、交领汉服、宽袖、玉佩流苏与中国直剑。御剑为白衣青玉，镇魂为玄衣朱砂。`ShadowJumpArt.install(scene)` 注册纹理，`animations` 描述帧区间。
- `../src/enemy-art.js`：云中纸鹤傀、提灯阴差、持盾天兵、冥火狐妖，分别拥有六帧行走循环。纸翼、灯笼、朱缨与狐尾随步态运动。`ShadowJumpEnemyArt.install(scene)` 注册精灵表与动画，`species` 提供纹理名、显示尺寸和帧率。
- `../src/zodiac-art.js`：十二生肖星君的独立造型和六帧循环，使用 `ShadowJumpZodiacArt.install(scene)` 注册。造型包含生肖特征、国风法器与各自服饰，不共用单一 Boss 轮廓。
- `../src/data/zodiac.js`：十二元辰名称、守护领域、故事、关卡名、战斗招式和战斗提示。
- `../src/world-art.js`：天庭、地府的远景图层与建筑，初始化时生成并复用，由场景负责视差移动。
- `../src/game-scene.js`：平台、检查点、传送门、灵石、剑光和其他动态效果。

## 巡界使动画

角色以 `96 × 96` 逻辑坐标绘制，按 2 倍分辨率生成 `192 × 192` 透明帧，六列五行，共 26 个有效帧。游戏中等比显示为 `112 × 112`，物理碰撞体仍为 `28 × 54`。两种形态共享动作顺序和接地点；站立足底为逻辑 `y = 88`，对应帧内的 `footBaseline = 176`。

| 动作 | 帧区间 |
| --- | --- |
| 待机 | 0–3 |
| 奔跑 | 4–9 |
| 起跳 | 10–11 |
| 下落 | 12–13 |
| 攻击 | 14–17 |
| 冲刺 | 18–19 |
| 受伤 | 20–21 |
| 切换形态 | 22–25 |

纹理 key 仍为 `hero-light` 与 `hero-shadow`。飞剑保留 `feather-light` 与 `feather-shadow` 两个兼容 key。实际动画播放速度以 `game-scene.js` 的 `createPlayerAnimations()` 为准。修改动作时需要一起检查帧区间、足底与碰撞体，不要单独拉伸某一种形态。

## 两界众生

四类敌人使用 `96 × 96` 逻辑坐标、`192 × 192` 透明帧，足底基线为 `176`。每种有六帧行走动画；显示尺寸由 `species` 决定，碰撞尺寸保留关卡配置。内部类型 key 保持兼容，造型及世界观已经更换。

| 关卡类型 | 精灵纹理 | 名称与特征 |
| --- | --- | --- |
| `scarab` | `enemy-scarab` | 云中纸鹤傀：折纸翼、金折痕、朱砂符箓与鹤喙 |
| `warden` | `enemy-warden` | 提灯阴差：高冠、玄袍、苍白人脸与青魂灯 |
| `sentinel` | `enemy-sentinel` | 持盾天兵：金色札甲、云纹玉盾、朱缨长枪 |
| `hunter` | `enemy-hunter` | 冥火狐妖：三条长尾、朱砂面纹、铜铃与青色狐火 |

## 十二生肖星君

Boss 使用 `128 × 128` 逻辑坐标、`256 × 256` 透明帧，六帧循环，足底基线 `232`。每位 Boss 的纹理、动画 key 与显示尺寸由 `ShadowJumpZodiacArt.bosses` 提供。原先的单张 `enemy-boss` 纹理已移除。

| 生肖 id | 星君 |
| --- | --- |
| `rat` | 子鼠 · 掌灯使 |
| `ox` | 丑牛 · 镇岳君 |
| `tiger` | 寅虎 · 破军将 |
| `rabbit` | 卯兔 · 望舒仙 |
| `dragon` | 辰龙 · 沧溟帝 |
| `snake` | 巳蛇 · 青绫仙 |
| `horse` | 午马 · 烈曜君 |
| `goat` | 未羊 · 祈岁翁 |
| `monkey` | 申猴 · 灵霄客 |
| `rooster` | 酉鸡 · 司晨官 |
| `dog` | 戌犬 · 守夜神 |
| `pig` | 亥猪 · 玄坛尊 |

## 动态图鉴

`../art-preview.html` 为独立开发图鉴。它并排展示两种主角形态的放大画面与实机尺寸，支持切换全部动作、暂停观察，并展示四类小怪和十二生肖星君的动态立绘、故事与战斗提示。页面直接调用游戏绘制接口，不依赖 Phaser：

- `ShadowJumpArt.renderHero(ctx, form, action, step, count)`：逻辑 `96 × 96`。
- `ShadowJumpEnemyArt.render(ctx, type, step)`：逻辑 `96 × 96`。
- `ShadowJumpZodiacArt.render(ctx, id, step)`：逻辑 `128 × 128`。

## 早期素材

`shadow-jump-sprites.svg`、`raster/` 下的旧背景／人物／敌人／羽刃 PNG，以及 `../tools/generate_raster_assets.py` 仅保留作为历史参考。当前游戏不再加载这些 PNG，也不依赖该生成脚本。
