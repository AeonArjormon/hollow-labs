/* Six-path combat: descriptions below are generated from the same rules the game executes. */
(() => {
  "use strict";
  const IDS = ["rat", "ox", "tiger", "rabbit", "dragon", "snake", "horse", "goat", "monkey", "rooster", "dog", "pig"];
  const ANIMALS = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "犬", "猪"];
  const COLORS = { light: 0xf5d98b, shadow: 0xe78883 };
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const rows = (values) => Object.fromEntries(IDS.map((id, i) => [id, values[i]]));
  const WEAPONS = {
    light: rows([
      { name: "灯火双匕", type: "dagger", range: 76, damage: .63, cooldown: .18, note: "短距快刺；每第三击追加一枚寻敌灯火。" },
      { name: "青铜盾枪", type: "guard", range: 152, damage: 1.12, cooldown: .43, guard: .16, note: "长距直刺；新按 J 开启 0.16 秒格挡窗，成功格挡间隔 1 秒。" },
      { name: "虎牙双刀", type: "twin", range: 106, damage: .78, cooldown: .23, note: "左右交替斩；第三击扩大为 148 范围横扫。" },
      { name: "望舒月轮", type: "return", range: 420, damage: .9, cooldown: .72, speed: 500, note: "投出回旋月轮，去程与回程各能命中一次；同次投掷只触发一次回灵。" },
      { name: "盘龙长枪", type: "spear", range: 202, damage: 1.05, cooldown: .39, note: "窄幅长刺；第三击向另一名近敌导雷，单个目标不重复导雷。" },
      { name: "青绫剑", type: "rapier", range: 158, damage: .77, cooldown: .27, note: "狭长软剑连刺，附加每秒 3 点侵蚀，持续 3 秒，最多三层。" },
      { name: "烈曜骑枪", type: "lance", range: 170, damage: 1.1, cooldown: .46, note: "突刺时向前加速；奔跑时范围增至 220，移动遵守地形碰撞。" },
      { name: "云纹法杖", type: "orbs", range: 550, damage: .52, cooldown: .78, speed: 360, count: 3, note: "发出三枚缓慢寻敌符珠；每第三轮获得 0.6 秒减伤护体。" },
      { name: "盘云长棍", type: "staff", range: 158, damage: .95, cooldown: .34, note: "扫、挑、劈三段循环；第三击环扫身前身后。" },
      { name: "丹羽战扇", type: "fan", range: 350, damage: .4, cooldown: .62, speed: 470, count: 5, note: "五羽扇射，近距覆盖；同一目标每轮最多受到三羽伤害。" },
      { name: "巡关剑", type: "seek", range: 580, damage: 1.02, cooldown: .43, speed: 570, note: "放出略微转向的追猎剑气，追击前方最近目标。" },
      { name: "玄坛九齿耙", type: "rake", range: 158, damage: 1.35, cooldown: .58, note: "宽幅耙扫，轻拉小怪 18 距离；Boss 不受牵引。" }
    ]),
    shadow: rows([
      { name: "引魂索刃", type: "hook", range: 186, damage: .94, cooldown: .36, note: "长索回斩；命中前方目标时向目标迈进，仍受墙体碰撞。" },
      { name: "镇岳重锤", type: "hammer", range: 135, damage: 1.3, cooldown: .7, charge: 1.2, note: "按住 J 蓄力、松开落锤；满蓄力为 2.2 倍伤害并发出贴地震波，轻点也可出招。" },
      { name: "幽虎爪", type: "claw", range: 88, damage: .68, cooldown: .19, note: "近距快爪；第三击向前扑进并追加一层撕裂。" },
      { name: "残月短弓", type: "bow", range: 680, damage: .95, cooldown: .46, charge: .85, speed: 720, note: "按住 J 蓄力、松开射箭；满蓄力伤害 2.2 倍，可穿透三名目标。" },
      { name: "云龙软鞭", type: "whip", range: 218, damage: 1.05, cooldown: .49, note: "大幅弧形鞭扫；轻拉小怪并在第三击导雷，Boss 免疫牵引。" },
      { name: "蜕影钩镰", type: "sickle", range: 175, damage: 1.08, cooldown: .46, note: "钩镰横斩；命中带侵蚀目标时消耗侵蚀，将剩余伤害立即结算。" },
      { name: "踏影双镰", type: "scythes", range: 128, damage: 1.08, cooldown: .43, note: "双镰环扫两侧，随后产生一次较弱的原地回斩。" },
      { name: "幽祈铜铃", type: "bell", range: 175, damage: .85, cooldown: .82, note: "震铃环攻，0.3 秒后原地回响一次；回响不触发符文。" },
      { name: "镜影双短棍", type: "mirror", range: 104, damage: .75, cooldown: .36, note: "双棍快击，原位残影延迟 0.22 秒补击；残影不会跟随目标。" },
      { name: "司晨羽弩", type: "crossbow", range: 760, damage: 1.07, cooldown: .48, speed: 840, note: "高速直线弩矢，可穿透三名目标，适合压制一线敌人。" },
      { name: "锁魂链镰", type: "chain", range: 245, damage: 1.2, cooldown: .59, guard: .12, note: "远距甩链；新按 J 开启 0.12 秒格挡窗，成功格挡间隔 1 秒。" },
      { name: "归元重刃", type: "cleaver", range: 148, damage: 1.4, cooldown: .76, charge: 1.1, note: "按住 J 蓄力、松开重劈；满蓄力可消耗 8 灵力扩大范围并提高 25% 伤害。" }
    ])
  };
  const DEFAULT_WEAPONS = {
    light: { name: "巡界飞剑", type: "bolt", range: 650, damage: 1, cooldown: .24, speed: 610, note: "按住 J 连续发射阳性飞剑。" },
    shadow: { name: "镇魂剑斩", type: "slash", range: 124, damage: 1, cooldown: .28, note: "按住 J 连续挥出阴性剑斩。" }
  };
  // type, cost, cooldown, damage scale, radius / range
  const SKILL_ROWS = {
    light: [["seek",25,8,2,600],["shield",26,9,1.8,175],["rush",25,7,2.5,165],["fan",24,8,1.2,550],["field",30,10,1.8,210],["poison",24,8,1.7,180],["rush",26,7,2.8,215],["heal",28,12,1,175],["nova",25,8,2.3,215],["fan",26,8,1.35,620],["seek",22,7,2.4,720],["shield",28,10,2.2,205]],
    shadow: [["nova",24,7,2.2,165],["nova",30,10,3.2,230],["rush",26,8,3,145],["field",25,9,1.7,190],["field",30,12,2.2,235],["poison",28,10,2.5,205],["fan",25,8,1.4,500],["heal",30,12,1.5,205],["nova",24,7,1.9,250],["bolt",24,7,3.1,850],["shield",26,9,2.4,250],["nova",32,11,3.5,190]]
  };
  const SKILL_NAMES = {
    light: ["引灯照夜","镇门金障","白虎破军","望舒散华","九霄雷阵","青绫缚灵","烈曜奔袭","护愿清辉","翻云震地","丹羽朝阳","巡关追猎","玄坛护身"],
    shadow: ["夜渡回灯","负岳坠星","幽虎噬影","残月留影","玄云归涡","蜕影蚀魂","踏影回阵","幽祈回响","镜影散身","司晨破晓","锁魂迎击","归元重劫"]
  };
  // Mobility values use the existing Arcade body and never teleport through terrain.
  const MOBILITY = {
    light: rows([{speed:28},{dashCooldown:.8},{speed:20,dashSpeed:45},{jump:42},{fall:.8},{speed:16,dashCooldown:.9},{dashSpeed:85},{jump:20,fall:.88},{airJump:48},{speed:18,fall:.88},{dashCooldown:.85},{dashShield:.3}]),
    shadow: rows([{dashSpeed:55},{dashShield:.4},{jump:25,speed:18},{airJump:55},{dashCooldown:.8},{dashShield:.22,speed:12},{speed:35},{fall:.78},{jump:35,airJump:22},{dashSpeed:75},{dashShield:.3,dashCooldown:.95},{dashCooldown:.88,fall:.9}])
  };
  const RESOURCE_TYPES = {
    light: ["new","guard","combo","hit","multi","poison","dash","skill","combo","crit","new","guard"],
    shadow: ["kill","charged","kill","charged","skill","poison","dash","hit","multi","crit","guard","charged"]
  };
  const RESOURCE_AMOUNT = [6,8,5,4,6,5,5,5,4,6,5,7];
  const AFFLICTIONS = {
    light: ["mark","stagger","bleed","slow","chain","poison","burn","siphon","stagger","mark","hunt","execute"],
    shadow: ["hunt","execute","bleed","mark","chain","poison","burn","siphon","mark","slow","stagger","execute"]
  };
  const AFFIX_TEXT = {
    mark: "直接普攻留下印记；下一次直接普攻消耗印记，追加 8 点伤害。",
    stagger: "直接普攻额外推开小怪 18 距离；Boss 免疫推移，改为每 1.5 秒追加 6 点伤害。",
    bleed: "直接普攻附加撕裂：每秒 3 点伤害，持续 3 秒，最多三层。",
    slow: "直接普攻使小怪移动减速 35%，持续 2 秒；Boss 免疫减速。",
    chain: "第三段直接普攻向另一名 210 范围内敌人导雷，造成 9 点伤害，间隔 1 秒。",
    poison: "直接普攻叠加侵蚀：每秒 4 点伤害，持续 3 秒，最多三层。",
    burn: "直接普攻附加灼烧：每秒 5 点伤害，持续 2 秒，不叠层。",
    siphon: "直接普攻命中恢复 2 生命，间隔 2 秒。",
    hunt: "连续直接普攻同一目标，第二击起额外 5 点伤害；更换目标后重新积累。",
    execute: "直接普攻对生命低于 35% 的目标追加 10 点伤害，间隔 1 秒。"
  };
  const RESOURCE_TEXT = {new:"首次命中新目标",guard:"成功格挡",combo:"第三段普攻命中",hit:"直接普攻命中",multi:"一次普攻命中第二名目标",poison:"直接普攻命中带侵蚀或撕裂的目标",dash:"冲刺后 2 秒内直接普攻命中",skill:"付费术法首次直接命中",charged:"蓄力至少 70% 的直接普攻命中",crit:"暴击普攻命中",kill:"直接普攻击败目标"};
  const skillFor = (id, form) => {
    if (!id || !SKILL_ROWS[form] || !IDS.includes(id)) return {name:form==="light"?"玉清护体":"镇魂突袭",type:form==="light"?"defaultShield":"defaultRush",cost:form==="light"?18:22,cooldown:3,damage:1.5,range:150};
    const i=IDS.indexOf(id), [type,cost,cooldown,damage,range]=SKILL_ROWS[form][i];
    return {id,name:SKILL_NAMES[form][i],type,cost,cooldown,damage,range};
  };
  function getEntry(id, form, slot) {
    const i=IDS.indexOf(id), f=form==="shadow"?"shadow":"light";
    if(i<0){if(slot===0)return {name:DEFAULT_WEAPONS[f].name,description:DEFAULT_WEAPONS[f].note};if(slot===1){const s=skillFor(null,f);return {name:s.name,description:`U 消耗 ${s.cost} 灵力，冷却 ${s.cooldown} 秒。${f==="light"?"获得 2.4 秒减伤护体并发射飞剑。":"向前突进并扩大剑斩。"}`};}return {name:["","","基础身法","无灵契","自然回灵","无附效"][slot],description:["","","保留二段跳、轻重跳和基础冲刺。","未召唤灵契。","每秒回复 4 灵力；与所在世界同极性时额外回复 2。","直接攻击不附加额外状态。"][slot]};}
    const polarity=f==="light"?"阳":"阴", animal=ANIMALS[i];
    if(slot===0){const w=WEAPONS[f][id];return {name:w.name,description:`${w.note} 基础间隔 ${w.cooldown} 秒，${w.charge?`蓄满需 ${w.charge} 秒，`:""}射程 / 范围 ${w.range}。`};}
    if(slot===1){const s=skillFor(id,f);const text={seek:"发出追踪灵弹。",shield:"获得 3 秒减伤护体并横扫前方。",rush:"向前突进并横扫前方。",fan:"向前释放五道扇形灵弹。",field:"在前方布下 3 秒灵阵；首击为直接伤害，随后每秒造成一次较弱的衍生伤害。",poison:"环击并附加三层侵蚀。",heal:"回复 12 生命并释放护身环击。",nova:"以自身为中心释放一次环击。",bolt:"发出可穿透三名目标的高速灵弹。"}[s.type];return {name:s.name,description:`U 消耗 ${s.cost} 灵力，冷却 ${s.cooldown} 秒。${text}`};}
    if(slot===2){const m=MOBILITY[f][id], parts=[];if(m.speed)parts.push(`移速 +${m.speed}`);if(m.jump)parts.push(`地面起跳速度 +${m.jump}`);if(m.airJump)parts.push(`二段跳速度 +${m.airJump}`);if(m.dashSpeed)parts.push(`冲刺速度 +${m.dashSpeed}`);if(m.dashCooldown)parts.push(`冲刺冷却缩短 ${Math.round((1-m.dashCooldown)*100)}%`);if(m.fall)parts.push(`下落速度上限降低 ${Math.round((1-m.fall)*100)}%`);if(m.dashShield)parts.push(`冲刺开始获得 ${m.dashShield} 秒减伤护体`);return {name:`${animal}行 · ${polarity}`,description:parts.join("；")+"。保持原有地形碰撞与两次跳跃。"};}
    if(slot===3){const interval=companionInterval(id,f);return {name:`${polarity}契 · ${animal}灵`,description:`召唤一只${animal}灵随行，每 ${interval} 秒攻击 420 范围内最近敌人，造成 ${companionDamage(id,f)} 点${polarity}性衍生伤害。切面后改为当前面的灵契；不会触发回灵或附效。`};}
    if(slot===4)return {name:`${animal}息 · ${polarity}`,description:`${RESOURCE_TEXT[RESOURCE_TYPES[f][i]]}回复 ${RESOURCE_AMOUNT[i]} 灵力，触发间隔 1.5 秒。每个攻击编号最多触发一次，离开来源面后不触发。`};
    return {name:`${animal}劫 · ${polarity}`,description:AFFIX_TEXT[AFFLICTIONS[f][i]]+"同次攻击每目标最多触发一次；衍生伤害不再触发。"};
  }
  function companionInterval(id,form){return Math.round((3+IDS.indexOf(id)%4*.45+(form==="shadow"?.25:0))*100)/100;}
  function companionDamage(id,form){return 8+IDS.indexOf(id)%5*2+(form==="shadow"?2:0);}
  const intersects=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
  const enabled=s=>!!(s.runeStore&&s.getRuneLoadouts);
  const slots=(s,form=s.formMode)=>s.getRuneLoadouts?.()[form]||[null,null,null,null,null,null];
  const active=s=>s.canAct?.()&&!s.runeEquipmentOpen;
  const targetModel=t=>t.sprite.getData("model");
  const targetAlive=t=>t?.sprite?.active&&targetModel(t).hp>0;
  function targets(s){const enemies=(s.enemies||[]).filter(t=>targetAlive(t)&&s.isActiveMode(t));if(s.boss&&targetAlive(s.boss)&&s.player.x>=s.level.arenaStart)enemies.push(s.boss);return enemies;}
  function boxOf(t){const b=t.sprite.body;return {x:b.x,y:b.y,w:b.width,h:b.height};}
  function nearest(s,x,y,range,exclude,front=0){return targets(s).filter(t=>t!==exclude&&(!front||(t.sprite.x-x)*front>=-12)).map(t=>({t,d:Math.hypot(t.sprite.x-x,t.sprite.y-y)})).filter(v=>v.d<=range).sort((a,b)=>a.d-b.d)[0]?.t;}
  function withContext(s,ctx,fn){const prev=s.runeHitContext;s.runeHitContext=ctx;try{return fn();}finally{s.runeHitContext=prev;}}
  function snapshot(s,kind="attack",charge=0,derived=false){const loadout=slots(s).slice();return {id:++s.runeAttackId,form:s.formMode,world:s.sceneMode,loadout,kind,charge,derived,combo:s.runeCombo||1,damageScale:s.getStats().skillPower||1,crit:kind==="attack"&&Math.random()<(s.getStats().critChance||0),hits:new Set(),damaged:new Map(),resourceGranted:false};}
  function childContext(s,parent){return {...parent,id:++s.runeAttackId,derived:true,hits:new Set(),damaged:new Map(),resourceGranted:true};}
  function area(s,ctx,x,y,range,damage,round=false,height=105){const dir=s.player.flipX?-1:1;const b={x:round?x-range:x+(dir>0?0:-range),y:y-height*.5,w:round?range*2:range,h:height};for(const t of targets(s))if(intersects(b,boxOf(t)))hit(s,t,damage,ctx);for(const g of s.gates||[])if(g.sprite.active&&s.isActiveMode(g)&&intersects(b,boxOf(g)))s.damageGate(g,ctx.form);}
  function hit(s,target,damage,ctx){if(!targetAlive(target)||ctx.world!==s.sceneMode)return false;const m=targetModel(target),before=m.hp;if(target===s.boss)withContext(s,ctx,()=>s.damageBoss(damage,ctx.form));else withContext(s,ctx,()=>s.damageEnemy(target,damage,ctx.form));if(m.hp>=before)return false;if(!ctx.derived&&!ctx.hits.has(target)){ctx.hits.add(target);applyHit(s,target,ctx,m.hp<=0);}return true;}
  function damageBase(s,ctx,ranged=false){const stats=s.getStats();return (ranged?stats.rangedDamage:stats.meleeDamage)*(ctx.damageScale||1)*(ctx.crit?1.6:1);}
  function addEffect(s,effect,duration=220){if(!effect)return;s.effects?.add(effect);s.tweens?.add({targets:effect,alpha:0,duration,onComplete:()=>effect.destroy()});}
  function ring(s,x,y,radius,form,duration=280){if(!s.add?.graphics)return;const g=s.add.graphics().setDepth(38);g.lineStyle(3,COLORS[form],.8).strokeCircle(x,y,radius);g.lineStyle(1,COLORS[form],.4).strokeCircle(x,y,radius*.77);addEffect(s,g,duration);}
  function stroke(s,w,ctx,range){if(!s.add?.graphics)return;const g=s.add.graphics().setDepth(39),x=s.player.x,y=s.player.y+8,dir=s.player.flipX?-1:1,c=COLORS[ctx.form];g.lineStyle(w.charge?5:3,c,.95);g.beginPath();const end=x+dir*range;
    if(["spear","guard","lance","rapier","chain","hook","crossbow"].includes(w.type)){g.moveTo(x,y);g.lineTo(end,y);g.moveTo(end-dir*20,y-12);g.lineTo(end,y);g.lineTo(end-dir*20,y+12);if(w.type==="guard")g.strokeEllipse(x+dir*30,y,26,60);if(w.type==="chain"||w.type==="hook")for(let i=1;i<6;i++)g.strokeCircle(x+dir*range*i/6,y+Math.sin(i)*7,5);}
    else if(w.type==="hammer"){g.moveTo(x,y);g.lineTo(end,y+16);g.strokeRect(end-18,y-14,36,48);}
    else if(w.type==="bow"){g.arc(x+dir*24,y,40,-1.2,1.2,false);g.moveTo(x+dir*38,y-36);g.lineTo(x-dir*10,y);g.lineTo(x+dir*38,y+36);}
    else if(w.type==="bell"||w.type==="scythes"){g.strokeCircle(x,y,range*.75);g.strokeCircle(x,y,range);}
    else{g.moveTo(x,y+24);g.lineTo(x+dir*range*.4,y-42);g.lineTo(end,y-16);g.lineTo(x+dir*range*.7,y+42);if(w.type==="rake")for(let i=0;i<7;i++){g.moveTo(end-dir*22,y-32+i*10);g.lineTo(end,y-30+i*10);}if(w.type==="twin"||w.type==="dagger"||w.type==="claw")for(let i=0;i<3;i++){g.moveTo(x+dir*12,y-20+i*15);g.lineTo(end-dir*8,y-33+i*16);}}
    g.strokePath();addEffect(s,g,w.charge?300:180);
  }
  function emit(s,ctx,options={}){const dir=s.player.flipX?-1:1,angle=options.angle||0,speed=options.speed||610;const p=s.projectiles.create(options.x??s.player.x+dir*34,options.y??s.player.y+12,`feather-${ctx.form}`);p.body.allowGravity=false;p.setDisplaySize(options.returning?64:options.size||52,options.returning?54:22);p.body.setSize(36/p.scaleX,18/p.scaleY,true);p.setVelocityX(dir*Math.cos(angle)*speed);p.setVelocityY?.(Math.sin(angle)*speed);p.setFlipX(dir<0);p.setTint?.(COLORS[ctx.form]);p.setDepth(36);p.mode=ctx.world;p.life=options.life||1.35;p.setData("damage",options.damage??damageBase(s,ctx,true));p.setData("form",ctx.form);p.setData("crit",ctx.crit);p.rune={ctx,speed,age:0,returning:!!options.returning,returned:false,homing:!!options.homing,hitOut:new Set(),hitBack:new Set(),pierce:options.pierce||1,limit:options.limit||Infinity,phaseHits:0};if(options.returning)p.setAngularVelocity?.(520);return p;}
  function dot(s,target,ctx,type,power=4,duration=3){let state=s.runeStatuses.get(target);if(!state){state={};s.runeStatuses.set(target,state);}const old=state[type];state[type]={form:ctx.form,world:ctx.world,remaining:duration,tick:old?.tick??1,stacks:Math.min(type==="burn"?1:3,(old?.stacks||0)+1),power,ctx:childContext(s,ctx)};}
  function chain(s,target,ctx,amount=9){const other=nearest(s,target.sprite.x,target.sprite.y,210,target);if(!other)return;ring(s,other.sprite.x,other.sprite.y,27,ctx.form,180);hit(s,other,amount,childContext(s,ctx));}
  function resource(s,ctx,event,target){if(ctx.derived||ctx.resourceGranted||ctx.form!==s.formMode||ctx.loadout[4]!==slots(s)[4]||!ctx.loadout[4]||s.runeResourceCooldown>0)return;const index=IDS.indexOf(ctx.loadout[4]),type=RESOURCE_TYPES[ctx.form][index];let ok=type===event;if(type==="new"&&event==="hit")ok=!s.runeSeenTargets.has(target);if(type==="combo"&&event==="hit")ok=ctx.combo%3===0&&ctx.kind==="attack";if(type==="multi"&&event==="hit")ok=ctx.hits.size>=2;if(type==="charged"&&event==="hit")ok=ctx.charge>=.7;if(type==="crit"&&event==="hit")ok=ctx.crit;if(type==="dash"&&event==="hit")ok=s.runeDashWindow>0;if(type==="poison"&&event==="hit"){const st=s.runeStatuses.get(target);ok=!!(st?.poison||st?.bleed);}if(type==="skill"&&event==="hit")ok=ctx.kind==="skill";if(type==="hit")ok=event==="hit"&&ctx.kind==="attack";if(type!=="skill"&&event==="hit"&&ctx.kind!=="attack")ok=false;if(!ok)return;ctx.resourceGranted=true;s.runeResourceCooldown=1.5;s.mp=clamp(s.mp+RESOURCE_AMOUNT[index],0,s.maxMp);s.emitMotes?.(s.player.x,s.player.y,COLORS[ctx.form],4,18);}
  function applyHit(s,target,ctx,killed){resource(s,ctx,"hit",target);if(killed)resource(s,ctx,"kill",target);s.runeSeenTargets.add(target);if(ctx.kind!=="attack")return;const id=ctx.loadout[5],i=IDS.indexOf(id),type=i<0?null:AFFLICTIONS[ctx.form][i];let st=s.runeStatuses.get(target);if(!st){st={};s.runeStatuses.set(target,st);}const derived=()=>childContext(s,ctx);
    if(type==="poison"||type==="bleed"||type==="burn")dot(s,target,ctx,type,type==="poison"?4:type==="burn"?5:3,type==="burn"?2:3);
    if(type==="mark"){if(st.mark){st.mark=false;hit(s,target,8,derived());}else st.mark=true;}
    if(type==="slow"&&target!==s.boss)st.slow=2;
    if(type==="stagger"){if(target!==s.boss){const m=targetModel(target);target.sprite.x=clamp(target.sprite.x+(s.player.flipX?-18:18),m.min,m.max);target.sprite.body.updateFromGameObject();}else if(s.runeAffixCooldown<=0){hit(s,target,6,derived());s.runeAffixCooldown=1.5;}}
    if(type==="chain"&&ctx.combo%3===0&&s.runeAffixCooldown<=0){chain(s,target,ctx);s.runeAffixCooldown=1;}
    if(type==="siphon"&&s.runeAffixCooldown<=0){s.hp=clamp(s.hp+2,0,s.maxHp);s.runeAffixCooldown=2;}
    if(type==="hunt"){if(s.runeHuntTarget===target)hit(s,target,5,derived());s.runeHuntTarget=target;}
    if(type==="execute"&&targetModel(target).hp<((targetModel(target).maxHp||target.hp||80)*.35)&&s.runeAffixCooldown<=0){hit(s,target,10,derived());s.runeAffixCooldown=1;}
    const w=ctx.weapon;if(!w)return;
    if(w.type==="rapier")dot(s,target,ctx,"poison",3,3);
    if(w.type==="claw"&&ctx.combo%3===0)dot(s,target,ctx,"bleed",3,3);
    if((w.type==="spear"||w.type==="whip")&&ctx.combo%3===0&&!ctx.weaponChain){ctx.weaponChain=true;chain(s,target,ctx,10);}
    if(w.type==="sickle"&&st.poison){const p=st.poison;delete st.poison;hit(s,target,p.power*p.stacks*p.remaining,derived());}
    if((w.type==="rake"||w.type==="whip")&&target!==s.boss){const m=targetModel(target);target.sprite.x=clamp(target.sprite.x+(target.sprite.x>s.player.x?-18:18),m.min,m.max);target.sprite.body.updateFromGameObject();}
    if(w.type==="hook"&&ctx.form===s.formMode)s.player.body.setVelocityX((target.sprite.x>s.player.x?1:-1)*180);
  }
  function performAttack(s,w,charge=0){if(!active(s)||s.attackCooldown>0)return;s.runeCombo=(s.runeCombo||0)+1;const ctx=snapshot(s,"attack",charge);ctx.weapon={...w};const dir=s.player.flipX?-1:1,base=damageBase(s,ctx,["bolt","return","orbs","fan","seek","bow","crossbow"].includes(w.type));let scale=w.damage*(1+charge*1.2),range=w.range;
    if(w.type==="cleaver"&&charge>=.95&&s.mp>=8){s.mp-=8;scale*=1.25;range+=55;}
    if(w.type==="lance"&&Math.abs(s.player.body.velocity.x)>150)range+=50;
    if(w.type==="twin"&&ctx.combo%3===0)range=148;
    s.attackCooldown=w.cooldown;s.isAttacking=true;s.player.anims.play(`${ctx.form}-attack`,true);
    s.audio.play(["bolt","return","orbs","fan","seek","bow","crossbow"].includes(w.type)?"shoot":"slash");
    if(w.type==="return"){emit(s,ctx,{returning:true,pierce:30,speed:w.speed,damage:base*scale,life:1.65});}
    else if(["fan","orbs"].includes(w.type)){const n=w.count;for(let i=0;i<n;i++)emit(s,ctx,{angle:(i-(n-1)/2)*(w.type==="fan"?.17:.19),speed:w.speed,homing:w.type==="orbs",damage:base*scale,life:w.range/w.speed,limit:w.type==="fan"?3:3});}
    else if(["bolt","seek","bow","crossbow"].includes(w.type)){emit(s,ctx,{speed:w.speed,homing:w.type==="seek",pierce:w.type==="crossbow"||(w.type==="bow"&&charge>.7)?3:1,damage:base*scale,life:w.range/w.speed});if(w.type==="bow")stroke(s,w,ctx,65);}
    else{stroke(s,w,ctx,range);const round=w.type==="bell"||w.type==="scythes"||(w.type==="staff"&&ctx.combo%3===0);area(s,ctx,s.player.x,s.player.y+8,range,base*scale,round,w.type==="spear"||w.type==="rapier"?65:120);
      if(["bell","mirror","scythes"].includes(w.type)){const x=s.player.x,y=s.player.y+8,echo=childContext(s,ctx),face=s.player.flipX;s.runeDelayed.push({wait:w.type==="mirror"?.22:.3,world:ctx.world,run:()=>{const facing=s.player.flipX;s.player.flipX=face;ring(s,x+dir*(round?0:range*.5),y,range*.55,ctx.form);area(s,echo,x,y,range,base*scale*.6,round,120);s.player.flipX=facing;}});}
      if(w.type==="hammer"&&charge>=.9)emit(s,childContext(s,ctx),{y:s.player.y+25,speed:430,damage:base*.85,pierce:5,life:.65,size:72});
    }
    if(w.type==="dagger"&&ctx.combo%3===0)emit(s,childContext(s,ctx),{speed:340,homing:true,damage:base*.7,life:1.1,size:30});
    if(w.type==="lance"||(w.type==="claw"&&ctx.combo%3===0))s.player.body.setVelocityX(dir*(w.type==="lance"?210:260));
    if(w.type==="orbs"&&ctx.combo%3===0)s.shieldTimer=Math.max(s.shieldTimer,.6);
  }
  function projectileCollision(s,p,target,gate=false){if(!p.active||!p.rune||p.mode!==s.sceneMode||!target?.sprite.active)return;const r=p.rune,hitSet=r.returned?r.hitBack:r.hitOut;if(hitSet.has(target))return;const sharedCount=r.ctx.damaged.get(target)||0;if(sharedCount>=r.limit){p.destroy();return;}hitSet.add(target);r.ctx.damaged.set(target,sharedCount+1);if(gate)s.damageGate(target,r.ctx.form);else hit(s,target,p.getData("damage"),r.ctx);r.phaseHits++;if(!r.returning&&r.phaseHits>=r.pierce)p.destroy();}
  function drawHeld(s){if(!s.add?.graphics)return;if(!s.runeHeld||!s.runeHeld.active)s.runeHeld=s.add.graphics().setDepth(37);const g=s.runeHeld;g.clear();if(s.lost||s.won||!s.player?.active)return;const w=s.getRuneWeapon(),type=w.type,dir=s.player.flipX?-1:1,c=COLORS[s.formMode],x=s.player.x+dir*18,y=s.player.y+7,charge=s.runeCharge?clamp(s.runeCharge.elapsed/s.runeCharge.weapon.charge,0,1):0;
    g.setPosition(x,y);g.setScale(dir,1);g.lineStyle(3,c,.95);g.beginPath();
    if(["spear","guard","lance","rapier","staff"].includes(type)){g.moveTo(-15,24);g.lineTo(57,-20);g.moveTo(43,-19);g.lineTo(66,-27);g.lineTo(56,-8);if(type==="guard"){g.strokeEllipse(10,1,30,48);g.lineStyle(1,0xffffff,.7).strokeEllipse(10,1,20,36);}}
    else if(type==="hammer"){g.moveTo(-8,27);g.lineTo(30,-23-charge*16);g.strokeRoundedRect(13,-39-charge*16,40,27,4);}
    else if(type==="bow"){g.arc(18,0,32,-1.1,1.1,false);g.moveTo(33,-28);g.lineTo(-8-charge*16,0);g.lineTo(33,28);g.moveTo(-12,0);g.lineTo(60,0);}
    else if(type==="fan"){g.moveTo(0,22);g.lineTo(10,-28);g.arc(12,3,37,-1.6,.35,false);g.lineTo(0,22);for(let j=0;j<4;j++){g.moveTo(0,22);g.lineTo(12+j*10,-25+j*7);}}
    else if(type==="rake"){g.moveTo(-10,28);g.lineTo(42,-18);g.moveTo(28,-30);g.lineTo(60,-3);for(let j=0;j<7;j++){g.moveTo(28+j*5,-30+j*4);g.lineTo(37+j*5,-41+j*4);}}
    else if(["hook","whip","chain","sickle"].includes(type)){g.moveTo(0,0);g.lineTo(13,20);g.lineTo(30,25);g.lineTo(48,10);g.lineTo(54,-12);g.arc(42,-16,16,-.2,3,false);}
    else if(type==="return"){g.strokeCircle(25,0,25);g.lineStyle(1,c,.8).strokeCircle(25,0,17);}
    else if(type==="bell"){g.strokeEllipse(28,7,30,26);g.moveTo(13,7);g.lineTo(20,-17);g.lineTo(35,-17);g.lineTo(43,7);g.strokeCircle(28,23,4);}
    else if(type==="orbs"){g.moveTo(-7,30);g.lineTo(30,-29);g.strokeCircle(34,-35,13);g.strokeCircle(34,-35,6);}
    else if(type==="crossbow"){g.moveTo(0,14);g.lineTo(56,-11);g.moveTo(20,-29);g.lineTo(33,-1);g.lineTo(44,20);g.moveTo(20,-29);g.lineTo(9,11);g.lineTo(44,20);}
    else{const heavy=type==="cleaver";g.moveTo(-7,20);g.lineTo(43,-26-charge*20);g.lineTo(heavy?61:48,heavy?-30-charge*20:-20);g.lineTo(8,19);if(["dagger","twin","claw","mirror","scythes"].includes(type)){g.moveTo(-22,4);g.lineTo(13,-29);g.lineTo(17,-21);g.lineTo(-16,10);}}
    g.strokePath();if(s.runeCharge){g.lineStyle(4,c,.9);g.beginPath();g.arc(-18,-47,18,-Math.PI/2,-Math.PI/2+Math.PI*2*charge,false);g.strokePath();}
  }
  function companionTick(s,dt){const id=slots(s)[3],key=id?`${s.formMode}:${id}`:null;if(key!==s.runeCompanionKey){s.runeCompanionVisual?.destroy();s.runeCompanionVisual=null;s.runeCompanionKey=key;s.runeCompanionTimer=1.2;if(id){const art=window.LiangyiZodiacArt?.bosses[id];if(art&&s.add?.image){s.runeCompanionVisual=s.add.image(s.player.x,s.player.y,art.texture,0).setDisplaySize(64,64).setTint(COLORS[s.formMode]).setOrigin(.5).setDepth(36);}else if(s.add?.text){s.runeCompanionVisual=s.add.text(s.player.x,s.player.y,"",{fontFamily:"serif",fontSize:"20px",fontStyle:"bold",color:s.formMode==="light"?"#ffe6a0":"#f7aaa0",backgroundColor:s.formMode==="light"?"#254340":"#49343f",padding:{x:7,y:4}}).setOrigin(.5).setDepth(36);s.runeCompanionVisual.runeAsText=true;}}}
    if(!id)return;const v=s.runeCompanionVisual;if(v){if(v.runeAsText)v.setText(`${ANIMALS[IDS.indexOf(id)]}灵`);v.setFlipX?.(s.player.flipX);v.setPosition(s.player.x+(s.player.flipX?43:-43),s.player.y-36+Math.sin((s.visualTime||0)*.004)*4);v.setAlpha(.83);}
    s.runeCompanionTimer-=dt;if(s.runeCompanionTimer>0)return;const target=nearest(s,s.player.x,s.player.y,420);if(!target)return;s.runeCompanionTimer=companionInterval(id,s.formMode);const ctx=snapshot(s,"companion",0,true);ring(s,target.sprite.x,target.sprite.y,24,s.formMode,220);hit(s,target,companionDamage(id,s.formMode),ctx);
  }
  function install(Scene){const p=Scene.prototype;if(p.__runeCombatInstalled)return;p.__runeCombatInstalled=true;const original={};for(const name of ["attack","skill","projectileHit","projectileBossHit","projectileGateHit","getFormStats","dash","hurt","touchEnemy","updateEnemies"])original[name]=p[name];
    p.initRuneCombat=function(){this.runeHeld?.destroy();this.runeCompanionVisual?.destroy();this.runeHeld=null;this.runeCompanionVisual=null;this.runeCompanionKey=null;this.runeCompanionTimer=1;this.runeSkillCooldowns={light:0,shadow:0};this.runeAttackId=0;this.runeCombo=0;this.runeStatuses=new Map();this.runeSeenTargets=new Set();this.runeDelayed=[];this.runeResourceCooldown=0;this.runeAffixCooldown=0;this.runeGuardCooldown=0;this.runeGuardWindow=0;this.runeDashWindow=0;this.runeHuntTarget=null;this.cancelRuneAttack();this.syncRuneCombatSide();};
    p.getRuneWeapon=function(form=this.formMode){const id=slots(this,form)[0];return id&&WEAPONS[form]?.[id]?WEAPONS[form][id]:DEFAULT_WEAPONS[form];};
    p.getRuneSkill=function(form=this.formMode){return skillFor(slots(this,form)[1],form);};
    p.syncRuneCombatSide=function(){if(this.runeSkillCooldowns)this.skillCooldown=this.runeSkillCooldowns[this.formMode]||0;this.cancelRuneAttack();drawHeld(this);};
    p.cancelRuneAttack=function(){this.runeAttackPressed=false;this.runeCharge=null;this.runeGuardWindow=0;};
    p.beginRuneAttack=function(){if(!enabled(this))return original.attack.call(this);if(!active(this)||this.runeAttackPressed)return;this.runeAttackPressed=true;const w=this.getRuneWeapon();if(this.attackCooldown>0)return;if(w.guard&&this.runeGuardCooldown<=0)this.runeGuardWindow=w.guard;if(w.charge){this.runeCharge={weapon:{...w},elapsed:0,form:this.formMode};return;}this.attack();};
    p.endRuneAttack=function(){if(!enabled(this))return;const charge=this.runeCharge;this.runeCharge=null;this.runeAttackPressed=false;if(charge&&charge.form===this.formMode&&active(this))performAttack(this,charge.weapon,clamp(charge.elapsed/charge.weapon.charge,0,1));};
    p.attack=function(){if(!enabled(this))return original.attack.call(this);if(!active(this))return;const w=this.getRuneWeapon();if(w.charge)return;performAttack(this,w);};
    p.skill=function(){if(!enabled(this))return original.skill.call(this);if(!active(this)||(this.runeSkillCooldowns?.[this.formMode]||0)>0)return;const sk=this.getRuneSkill();if(this.mp<sk.cost){this.showMessage("灵力不足",800);return;}this.mp-=sk.cost;this.runeSkillCooldowns[this.formMode]=sk.cooldown;this.skillCooldown=sk.cooldown;this.cancelRuneAttack();const ctx=snapshot(this,"skill"),damage=damageBase(this,ctx,true)*sk.damage,x=this.player.x,y=this.player.y+8;this.player.anims.play(`${this.formMode}-attack`,true);this.audio.play("skill");
      if(["seek","bolt","defaultShield"].includes(sk.type)){if(sk.type==="defaultShield")this.shieldTimer=Math.max(this.shieldTimer,2.4);emit(this,ctx,{homing:sk.type==="seek",pierce:sk.type==="bolt"?3:1,speed:sk.type==="bolt"?850:650,damage,life:sk.type==="seek"?1.6:1.2,size:74});}
      else if(sk.type==="fan"){for(let i=0;i<5;i++)emit(this,ctx,{angle:(i-2)*.19,damage:damage*.48,speed:550,pierce:1,life:sk.range/550,limit:3});}
      else{const round=["nova","poison","heal","field"].includes(sk.type);if(sk.type==="shield")this.shieldTimer=Math.max(this.shieldTimer,3);if(sk.type==="heal")this.hp=clamp(this.hp+12,0,this.maxHp);if(sk.type==="rush"||sk.type==="defaultRush")this.dash();const ax=sk.type==="field"?x+(this.player.flipX?-110:110):x;ring(this,ax,y,sk.range,ctx.form,400);area(this,ctx,ax,y,sk.range,damage,round,150);
        if(sk.type==="poison")for(const target of ctx.hits)for(let n=0;n<3;n++)dot(this,target,ctx,"poison",4,3);
        if(sk.type==="field"){for(let n=1;n<=3;n++){const echo=childContext(this,ctx);this.runeDelayed.push({wait:n,world:ctx.world,run:()=>{ring(this,ax,y,sk.range,ctx.form,350);area(this,echo,ax,y,sk.range,damage*.35,true,150);}});}}
      }
      this.showMessage(`${sk.name} · ${sk.cost} 灵力 · ${sk.cooldown} 秒冷却`,1000);
    };
    p.projectileHit=function(projectile,enemySprite){if(!projectile.rune)return original.projectileHit.call(this,projectile,enemySprite);const target=this.enemies.find(t=>t.sprite===enemySprite);if(target&&this.isActiveMode(target))projectileCollision(this,projectile,target);};
    p.projectileBossHit=function(projectile){if(!projectile.rune)return original.projectileBossHit.call(this,projectile);if(this.player.x>=this.level.arenaStart)projectileCollision(this,projectile,this.boss);};
    p.projectileGateHit=function(projectile,gateSprite){if(!projectile.rune)return original.projectileGateHit.call(this,projectile,gateSprite);const target=this.gates.find(t=>t.sprite===gateSprite);if(target&&this.isActiveMode(target))projectileCollision(this,projectile,target,true);};
    p.getFormStats=function(){const stats=original.getFormStats.call(this);if(!enabled(this))return stats;const m=MOBILITY[this.formMode][slots(this)[2]];if(!m)return stats;return {...stats,speed:stats.speed+(m.speed||0),jump:stats.jump+(m.jump||0),airJump:stats.airJump+(m.airJump||0),dashSpeed:stats.dashSpeed+(m.dashSpeed||0),dashCooldown:stats.dashCooldown*(m.dashCooldown||1),maxFall:stats.maxFall*(m.fall||1)};};
    p.dash=function(){const before=this.dashCooldown;original.dash.call(this);if(!enabled(this)||before>0||this.dashCooldown<=0)return;this.cancelRuneAttack();this.runeDashWindow=2;const m=MOBILITY[this.formMode][slots(this)[2]];if(m?.dashShield)this.shieldTimer=Math.max(this.shieldTimer,m.dashShield);};
    p.hurt=function(amount,ignoreInvulnerability=false){if(enabled(this)){const incoming=this.runeIncomingAttack,dir=this.player.flipX?-1:1;if(active(this)&&this.invulnTimer<=0&&!ignoreInvulnerability&&!incoming?.unblockable&&Number.isFinite(incoming?.sourceX)&&dir*(incoming.sourceX-this.player.x)>=-8&&this.runeGuardWindow>0&&this.runeGuardCooldown<=0){this.runeGuardWindow=0;this.runeGuardCooldown=1;this.invulnTimer=Math.max(this.invulnTimer,.18);const ctx=snapshot(this,"guard");resource(this,ctx,"guard");ring(this,this.player.x,this.player.y,44,this.formMode);this.showMessage("格挡成功",600);return;}if(!this.invulnTimer||ignoreInvulnerability)this.cancelRuneAttack();}return original.hurt.call(this,amount,ignoreInvulnerability);};
    p.touchEnemy=function(sprite){const before=this.runeIncomingAttack;this.runeIncomingAttack={sourceX:sprite.x};try{return original.touchEnemy.call(this,sprite);}finally{this.runeIncomingAttack=before;}};
    p.updateEnemies=function(dt){original.updateEnemies.call(this,dt);if(!enabled(this)||!this.runeStatuses)return;for(const [t,st]of this.runeStatuses){if(st.slow>0&&t!==this.boss&&targetAlive(t)&&this.isActiveMode(t)){const m=targetModel(t);t.sprite.x=clamp(t.sprite.x-m.vx*dt*.35,m.min,m.max);t.sprite.body.updateFromGameObject();}}};
    p.tickRuneCombat=function(dt){if(!enabled(this))return;if(!this.runeSkillCooldowns)this.initRuneCombat();for(const f of ["light","shadow"])this.runeSkillCooldowns[f]=Math.max(0,this.runeSkillCooldowns[f]-dt);this.skillCooldown=this.runeSkillCooldowns[this.formMode];for(const key of ["runeResourceCooldown","runeAffixCooldown","runeGuardCooldown","runeGuardWindow","runeDashWindow"])this[key]=Math.max(0,this[key]-dt);if(this.runeAttackPressed&&!this.runeCharge&&this.attackCooldown<=0&&this.getRuneWeapon().charge&&active(this))this.runeCharge={weapon:{...this.getRuneWeapon()},elapsed:0,form:this.formMode};if(this.runeCharge&&active(this)){this.runeCharge.elapsed+=dt;this.isAttacking=true;}
      const pending=this.runeDelayed;this.runeDelayed=[];for(const item of pending){item.wait-=dt;if(item.wait<=0){if(item.world===this.sceneMode)item.run();}else this.runeDelayed.push(item);}
      for(const [t,st]of this.runeStatuses){if(!targetAlive(t)){this.runeStatuses.delete(t);continue;}if(st.slow)st.slow=Math.max(0,st.slow-dt);for(const type of ["poison","bleed","burn"]){const d=st[type];if(!d)continue;d.remaining-=dt;d.tick-=dt;if(d.tick<=0){d.tick+=1;if(d.world===this.sceneMode&&(t===this.boss||this.isActiveMode(t)))hit(this,t,d.power*d.stacks,d.ctx);}if(d.remaining<=0)delete st[type];}}
      for(const projectile of this.projectiles?.getChildren()||[]){const r=projectile.rune;if(!r||!projectile.active)continue;r.age+=dt;if(r.returning){if(r.age>.58&&!r.returned){r.returned=true;r.phaseHits=0;}if(r.returned){const dx=this.player.x-projectile.x,dy=this.player.y+10-projectile.y,len=Math.hypot(dx,dy);if(len<22){projectile.destroy();continue;}projectile.setVelocityX(dx/len*r.speed*1.3);projectile.setVelocityY(dy/len*r.speed*1.3);}}else if(r.homing){const target=nearest(this,projectile.x,projectile.y,350);if(target){const dx=target.sprite.x-projectile.x,dy=target.sprite.y-projectile.y,len=Math.max(1,Math.hypot(dx,dy)),vx=projectile.body.velocity.x,vy=projectile.body.velocity.y;projectile.setVelocityX(vx+(dx/len*r.speed-vx)*Math.min(1,dt*4));projectile.setVelocityY(vy+(dy/len*r.speed-vy)*Math.min(1,dt*4));}}}
      companionTick(this,dt);drawHeld(this);
    };
  }
  window.LiangyiRunes={install,getEntry,weapons:WEAPONS};
})();
