/* 十二元辰：每位星君有自己的战场、招式与二阶段变化。 */
(() => {
  "use strict";
  const guardians = [
    { id: "rat", animal: "鼠", branch: "子", name: "子鼠 · 掌灯使", title: "夜路引魂", realm: "shadow", color: 0x70c6ba, hp: 120, speed: 64, attackInterval: 2.7, pattern: "aimed", secondaryPattern: "fan", telegraph: "引魂灯将锁定你的位置，看到灯火蓄亮后移步闪避。", lore: "一盏魂灯，照尽子夜归途。掌灯使守着天庭与地府之间最初的门。", chapterName: "子夜渡口" },
    { id: "ox", animal: "牛", branch: "丑", name: "丑牛 · 镇岳君", title: "负山镇门", realm: "light", color: 0xc9af73, hp: 140, speed: 47, attackInterval: 3.0, pattern: "charge", secondaryPattern: "rain", telegraph: "镇岳君俯首蓄力后直线冲锋，跃起越过牛角。", lore: "青铜双角托起重门，云山之重也压不弯他的脊梁。", chapterName: "镇岳天门" },
    { id: "tiger", animal: "虎", branch: "寅", name: "寅虎 · 破军将", title: "风雷啸谷", realm: "shadow", color: 0xdb9663, hp: 152, speed: 94, attackInterval: 2.4, pattern: "leap", secondaryPattern: "fan", telegraph: "破军将伏身后飞扑，离开落点，再从背后出招。", lore: "金瞳照破阴霾，虎啸惊醒沉睡在黄泉山谷中的风雷。", chapterName: "伏虎幽谷" },
    { id: "rabbit", animal: "兔", branch: "卯", name: "卯兔 · 望舒仙", title: "月华落露", realm: "light", color: 0xd8d5bb, hp: 148, speed: 78, attackInterval: 2.6, pattern: "rain", secondaryPattern: "aimed", telegraph: "月华从标记处落下，留意地面光圈，穿过空隙。", lore: "月宫药杵轻响，落下的银华既是灵药，也是守关的试炼。", chapterName: "月桂仙台" },
    { id: "dragon", animal: "龙", branch: "辰", name: "辰龙 · 沧溟帝", title: "云海行雷", realm: "shadow", color: 0x72b6a5, hp: 204, speed: 72, attackInterval: 2.7, pattern: "spiral", secondaryPattern: "rain", telegraph: "龙珠吐出旋转灵流，沿空隙绕行，勿贴身久留。", lore: "青鳞横贯两界云海。失序的元辰星盘，让行雨的龙君也困在幽都。", chapterName: "沧溟龙渊" },
    { id: "snake", animal: "蛇", branch: "巳", name: "巳蛇 · 青绫仙", title: "回风绕魂", realm: "light", color: 0x94c8aa, hp: 166, speed: 66, attackInterval: 2.3, pattern: "fan", secondaryPattern: "spiral", telegraph: "青绫扇开数道灵息，保持距离，在灵息之间穿行。", lore: "长身如一匹青绫，盘守仙苑，听得见每一缕风中的脚步。", chapterName: "青绫仙苑" },
    { id: "horse", animal: "马", branch: "午", name: "午马 · 烈曜君", title: "踏火逐日", realm: "shadow", color: 0xd48165, hp: 188, speed: 112, attackInterval: 2.2, pattern: "charge", secondaryPattern: "fan", telegraph: "烈曜君踏火疾驰，提早起跳，避开冲锋后的火扇。", lore: "朱鬃燃起不熄的霞光，烈马驮着最后一缕日色踏进黄泉。", chapterName: "赤焰古道" },
    { id: "goat", animal: "羊", branch: "未", name: "未羊 · 祈岁翁", title: "云纹护生", realm: "light", color: 0xc7bc8c, hp: 182, speed: 45, attackInterval: 2.8, pattern: "rain", secondaryPattern: "spiral", telegraph: "祈岁翁召来云纹符雨，持续横移，寻找下一处空位。", lore: "双角盘着岁月的纹路，云须之间藏着四季不歇的祝祷。", chapterName: "祈岁云庭" },
    { id: "monkey", animal: "猴", branch: "申", name: "申猴 · 灵霄客", title: "踏云弄影", realm: "shadow", color: 0xd0a468, hp: 202, speed: 108, attackInterval: 2.1, pattern: "leap", secondaryPattern: "aimed", telegraph: "灵霄客借长棍跃起，拉开落点，提防紧随而来的灵弹。", lore: "一根盘云长棍，一身不受拘束的灵气，连幽都的影子也追不上他。", chapterName: "灵猿幽阶" },
    { id: "rooster", animal: "鸡", branch: "酉", name: "酉鸡 · 司晨官", title: "丹羽破晓", realm: "light", color: 0xd4a06d, hp: 194, speed: 70, attackInterval: 2.2, pattern: "fan", secondaryPattern: "rain", telegraph: "丹羽展开便会放出扇形飞羽，越远越容易穿过间隙。", lore: "冠上凝着第一点朱霞，金声响起，天门的长夜便走到尽头。", chapterName: "丹霞晓台" },
    { id: "dog", animal: "狗", branch: "戌", name: "戌犬 · 守夜神", title: "踏月巡关", realm: "shadow", color: 0x89aeb8, hp: 222, speed: 100, attackInterval: 2.0, pattern: "aimed", secondaryPattern: "charge", telegraph: "守夜神会追踪气息，灵弹蓄成后换位，低吼时准备跳跃。", lore: "玉铃声过处，幽魂都停下脚步。他守的是门，也是两界的安宁。", chapterName: "守夜冥关" },
    { id: "pig", animal: "猪", branch: "亥", name: "亥猪 · 玄坛尊", title: "藏锋归元", realm: "light", color: 0xb9957d, hp: 260, speed: 54, attackInterval: 2.6, pattern: "charge", secondaryPattern: "spiral", telegraph: "玄坛尊冲阵后吐出回旋灵流，先跃过冲锋，再回到空隙。", lore: "最后一枚元辰印藏在厚重玄甲下。十二印归位，天阙与幽都重归秩序。", chapterName: "归元玄坛" }
  ];
  window.SHADOW_JUMP_ZODIAC = Object.freeze(guardians.map(guardian => Object.freeze(guardian)));
})();
