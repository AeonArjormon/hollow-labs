const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = { window: {}, console };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../src/rune-combat.js"), "utf8"), context);
const runes = context.window.LiangyiRunes;
const ids = ["rat", "ox", "tiger", "rabbit", "dragon", "snake", "horse", "goat", "monkey", "rooster", "dog", "pig"];
const chainObject = () => new Proxy({ active: true, destroy() { this.active = false; } }, { get(obj, key) { if (key in obj) return obj[key]; return function () { return this; }; } });
function enemy(x = 280, hp = 1000) {
  const model = { hp, maxHp: hp, min: 0, max: 1000, vx: 20 };
  return { hp, sprite: {
    active: true, x, y: 100, body: { x: x - 12, y: 60, width: 24, height: 80, updateFromGameObject() {} },
    getData() { return model; }
  } };
}
function projectile() {
  const data = new Map();
  const p = {
    active: true, x: 234, y: 112, scaleX: 1, scaleY: 1,
    body: { allowGravity: true, velocity: { x: 0, y: 0 }, setSize() {} },
    setData(key, value) { data.set(key, value); return this; }, getData(key) { return data.get(key); },
    setVelocityX(value) { this.body.velocity.x = value; return this; }, setVelocityY(value) { this.body.velocity.y = value; return this; },
    setDisplaySize(w, h) { this.displayWidth = w; this.displayHeight = h; return this; },
    setFlipX() { return this; }, setDepth() { return this; }, setTint() { return this; }, setAngularVelocity() { return this; },
    destroy() { this.active = false; }
  };
  return p;
}
class Scene {
  canAct() { return this.running && !this.paused && !this.lost; }
  attack() { this.legacy = true; }
  skill() { this.legacy = true; }
  projectileHit() { this.legacy = true; }
  projectileBossHit() { this.legacy = true; }
  projectileGateHit() { this.legacy = true; }
  getFormStats() { return { speed: 250, jump: 600, airJump: 500, dashSpeed: 600, dashCooldown: 800, maxFall: 650 }; }
  dash() { if (!this.canAct() || this.dashCooldown > 0) return; this.dashCooldown = .8; this.dashTimer = .2; }
  hurt(n) { this.hp -= n; }
  touchEnemy() { this.hurt(12); }
  updateEnemies(dt) { for (const t of this.enemies) t.sprite.x += t.sprite.getData("model").vx * dt; }
  getStats() { return { rangedDamage: 24, meleeDamage: 24, skillPower: 1, critChance: 0 }; }
  isActiveMode() { return true; }
  damageEnemy(t, damage, form) { t.sprite.getData("model").hp -= damage; this.damageLog.push({ t, damage, form }); }
  damageBoss(damage, form) { this.damageEnemy(this.boss, damage, form); }
  damageGate(gate, form) { this.gateLog.push(form); }
  showMessage() {}
  emitMotes() {}
}
runes.install(Scene);
function setup(light = [], shadow = []) {
  const s = new Scene();
  const loadouts = { light: [...light, ...Array(6)].slice(0, 6).map(v => v || null), shadow: [...shadow, ...Array(6)].slice(0, 6).map(v => v || null) };
  Object.assign(s, {
    runeStore: {}, getRuneLoadouts: () => loadouts, loadouts,
    running: true, paused: false, lost: false, won: false,
    formMode: "light", sceneMode: "light", hp: 50, maxHp: 100, mp: 60, maxMp: 100,
    attackCooldown: 0, skillCooldown: 0, dashCooldown: 0, shieldTimer: 0, invulnTimer: 0,
    player: { active: true, x: 200, y: 100, flipX: false, anims: { play() {} }, body: { velocity: { x: 0, y: 0 }, setVelocityX(v) { this.velocity.x = v; } } },
    enemies: [enemy()], gates: [], boss: enemy(700), level: { arenaStart: 500 },
    audio: { play() {} }, damageLog: [], gateLog: [],
    add: { graphics: chainObject, text: chainObject }, effects: { add() {} }, tweens: { add() {} },
    projectiles: { children: [], getChildren() { return this.children; }, create(x, y) { const p = projectile(); p.x = x; p.y = y; this.children.push(p); return p; } }
  });
  s.initRuneCombat();
  return s;
}

test("every rune has six implemented descriptions on each side and 24 distinct weapon names", () => {
  const names = new Set();
  for (const side of ["light", "shadow"]) for (const id of ids) for (let slot = 0; slot < 6; slot++) {
    const entry = runes.getEntry(id, side, slot);
    assert.ok(entry.name && entry.description, `${side} ${id} ${slot}`);
    assert.doesNotMatch(entry.description, /尚未|设计提案|undefined/);
    if (slot === 0) names.add(entry.name);
  }
  assert.equal(names.size, 24);
  for (let slot = 0; slot < 6; slot++) assert.ok(runes.getEntry(null, "light", slot).description);
});

test("all 24 weapons execute their own production attack path", () => {
  for (const side of ["light", "shadow"]) for (const id of ids) {
    const s = setup(side === "light" ? [id] : [], side === "shadow" ? [id] : []);
    s.formMode = side;
    s.beginRuneAttack();
    if (s.getRuneWeapon().charge) { s.tickRuneCombat(1.3); s.endRuneAttack(); }
    assert.ok(s.damageLog.length || s.projectiles.children.length, `${side} ${id} must deal or emit an attack`);
    assert.ok(s.attackCooldown > 0);
    assert.ok(s.runeHeld.active);
  }
});

test("heavy weapon charges until release; cancel never emits a heavy attack", () => {
  const s = setup([], ["ox"]); s.formMode = "shadow";
  s.beginRuneAttack(); s.attack(); s.tickRuneCombat(.9);
  assert.equal(s.damageLog.length, 0);
  s.endRuneAttack();
  assert.equal(s.damageLog.length, 1);
  assert.ok(s.damageLog[0].damage > 50);
  s.attackCooldown = 0; s.beginRuneAttack(); s.tickRuneCombat(1.3); s.cancelRuneAttack(); s.endRuneAttack();
  assert.equal(s.damageLog.length, 1);
  assert.equal(s.projectiles.children.length, 0);
});

test("charged blade pays only for a full release and retains its recovery", () => {
  const s = setup([], ["pig"]); s.formMode = "shadow";
  s.beginRuneAttack(); s.tickRuneCombat(1.2); const before = s.mp; s.endRuneAttack();
  assert.equal(s.mp, before - 8);
  const cooldown = s.attackCooldown;
  s.formMode = "light"; s.syncRuneCombatSide();
  assert.equal(s.attackCooldown, cooldown);
  s.attack(); assert.equal(s.projectiles.children.length, 0);
});

test("projectile polarity and affliction are captured before changing equipment or side", () => {
  const s = setup([null, null, null, null, "rabbit", "snake"]);
  s.attack(); const p = s.projectiles.children[0];
  s.formMode = "shadow"; s.loadouts.light[5] = "tiger"; s.syncRuneCombatSide();
  const mp = s.mp;
  s.projectileHit(p, s.enemies[0].sprite);
  assert.equal(s.damageLog[0].form, "light");
  assert.ok(s.runeStatuses.get(s.enemies[0]).poison);
  assert.equal(s.runeStatuses.get(s.enemies[0]).bleed, undefined);
  assert.equal(s.mp, mp, "inactive originating side cannot recover mana");
});

test("returning wheel hits once on each leg and grants mana only once", () => {
  const s = setup(["rabbit", null, null, null, "rat", "snake"]);
  s.attack(); const p = s.projectiles.children[0], target = s.enemies[0];
  s.projectileHit(p, target.sprite); const mp = s.mp;
  s.projectileHit(p, target.sprite);
  assert.equal(s.damageLog.length, 1);
  assert.equal(s.mp, 66);
  s.runeResourceCooldown = 0; p.rune.returned = true;
  s.projectileHit(p, target.sprite);
  assert.equal(s.damageLog.length, 2);
  assert.equal(s.mp, mp);
  assert.equal(s.runeStatuses.get(target).poison.stacks, 1, "same attack does not reapply affliction on its return");
});

test("fan damage has a three-projectile cap per target", () => {
  const s = setup(["rooster"]); s.attack();
  for (const p of s.projectiles.children) s.projectileHit(p, s.enemies[0].sprite);
  assert.equal(s.damageLog.length, 3);
});

test("skill cooldowns count down on both sides and equipment cannot refresh either", () => {
  const s = setup([null, "rat"], [null, "ox"]);
  s.skill(); assert.equal(s.runeSkillCooldowns.light, 8);
  s.formMode = "shadow"; s.syncRuneCombatSide(); s.skill(); assert.equal(s.runeSkillCooldowns.shadow, 10);
  s.tickRuneCombat(2);
  assert.equal(s.runeSkillCooldowns.light, 6); assert.equal(s.runeSkillCooldowns.shadow, 8);
  s.loadouts.shadow[1] = "tiger"; s.syncRuneCombatSide(); const mp = s.mp; s.skill();
  assert.equal(s.mp, mp); assert.equal(s.skillCooldown, 8);
  s.formMode = "light"; s.syncRuneCombatSide(); assert.equal(s.skillCooldown, 6);
});

test("dot ticks and companion damage never trigger resource or recursive afflictions", () => {
  const s = setup([null, null, null, "dog", "rabbit", "snake"]);
  s.attack(); s.projectileHit(s.projectiles.children[0], s.enemies[0].sprite);
  const mp = s.mp, count = s.damageLog.length;
  s.runeResourceCooldown = 0; s.tickRuneCombat(1.3); s.tickRuneCombat(1);
  assert.ok(s.damageLog.length > count);
  assert.equal(s.mp, mp);
  assert.equal(s.runeStatuses.get(s.enemies[0]).poison.stacks, 1);
});

test("weapon is independent of polarity and slot zero is the only weapon source", () => {
  const s = setup(["ox", "rabbit", "tiger"]);
  assert.equal(s.getRuneWeapon().name, "青铜盾枪");
  s.attack(); assert.equal(s.damageLog[0].form, "light"); assert.equal(s.projectiles.children.length, 0);
  assert.equal(s.getRuneSkill().name, "望舒散华");
  assert.equal(s.getFormStats().speed, 270);
});

test("guard opens on a fresh press; rear and unblockable hits are not parried", () => {
  const s = setup(["ox", null, null, null, "pig"]);
  s.beginRuneAttack(); s.runeIncomingAttack = { sourceX: 280 }; s.hurt(12);
  assert.equal(s.hp, 50); assert.equal(s.mp, 67);
  s.runeGuardCooldown = 0; s.attackCooldown = 0; s.attack(); s.hurt(12);
  assert.equal(s.hp, 38, "held automatic attacks cannot reopen the guard");
  s.endRuneAttack(); s.attackCooldown = 0; s.beginRuneAttack(); s.runeIncomingAttack = { sourceX: 100 }; s.hurt(12);
  assert.equal(s.hp, 26);
  s.endRuneAttack(); s.attackCooldown = 0; s.beginRuneAttack(); s.runeIncomingAttack = { sourceX: 280, unblockable: true }; s.hurt(12);
  assert.equal(s.hp, 14);
});

test("reset removes old companion and clears status effects; legacy scenes remain compatible", () => {
  const s = setup([null, null, null, "dog"]); s.tickRuneCombat(.1); const visual = s.runeCompanionVisual;
  s.initRuneCombat(); assert.equal(visual.active, false); assert.equal(s.runeStatuses.size, 0);
  delete s.runeStore; s.attack(); assert.equal(s.legacy, true);
});

test("holding a heavy attack during recovery starts charging only after recovery ends", () => {
  const s = setup([], ["ox"]); s.formMode = "shadow"; s.attackCooldown = .4;
  s.beginRuneAttack(); s.tickRuneCombat(.1);
  assert.equal(s.runeCharge, null);
  s.attackCooldown = 0; s.tickRuneCombat(.1);
  assert.equal(s.runeCharge.elapsed, .1);
  s.endRuneAttack(); assert.equal(s.damageLog.length, 1);
});

test("guard cannot produce a mana reward while an earlier hit already grants invulnerability", () => {
  const s = setup(["ox", null, null, null, "pig"]);
  s.invulnTimer = .5; s.beginRuneAttack(); s.runeIncomingAttack = { sourceX: 280 };
  s.hurt(12);
  assert.equal(s.mp, 60);
  assert.equal(s.runeGuardCooldown, 0);
});

test("all 24 rune skills pay the displayed cost and use the displayed cooldown", () => {
  for (const form of ["light", "shadow"]) for (const id of ids) {
    const s = setup(form === "light" ? [null, id] : [], form === "shadow" ? [null, id] : []);
    s.formMode = form;
    const skill = s.getRuneSkill(), mp = s.mp;
    s.skill();
    assert.equal(s.mp, mp - skill.cost, `${form} ${id}`);
    assert.equal(s.runeSkillCooldowns[form], skill.cooldown, `${form} ${id}`);
    assert.ok(s.damageLog.length || s.projectiles.children.length);
    s.tickRuneCombat(1.1);
  }
});
