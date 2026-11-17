const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// The persistent store and production scene methods run together. Rendering is
// replaced by small stand-ins; no copy of the reward/equip/lifecycle logic lives here.
const sandbox = {
  window: {}, document: { getElementById: () => null },
  Phaser: { Scene: class {}, Math: { Clamp: (v, min, max) => Math.max(min, Math.min(max, v)) } }
};
vm.createContext(sandbox);
for (const file of ["data/zodiac.js", "data/level-01.js", "rune-store.js", "game-scene.js"]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../src", file), "utf8"), sandbox, { filename: file });
}
const Scene = sandbox.window.ShadowJumpGameScene;
const RuneStore = sandbox.window.ShadowJumpRuneStore;
const clone = value => JSON.parse(JSON.stringify(value));

function memory() {
  const values = new Map();
  return { values, writes: [], getItem(key) { return values.get(key) ?? null; }, setItem(key, value) { values.set(key, value); this.writes.push({ key, value }); } };
}

function renderObject() {
  const object = {
    active: true, visible: true, x: 0, y: 500, model: null,
    anims: { pause() {}, resume() {}, stop() {} },
    getData() { return this.model; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setY(y) { this.y = y; return this; },
    setVelocity(x, y) { this.body.velocity = { x, y }; return this; },
    setAlpha() { return this; }, setFlipX(value) { this.flipX = value; return this; },
    setVisible(value) { this.visible = value; return this; },
    disableBody() { this.active = false; return this; }
  };
  object.body = { velocity: { x: 0, y: 0 }, setAccelerationX() {}, updateFromGameObject() {}, reset(x, y) { object.setPosition(x, y); } };
  return object;
}

function fixture(index = 0) {
  const scene = new Scene();
  const storage = memory();
  const stateEvents = [];
  const player = renderObject();
  const group = () => ({ clear() {}, getChildren: () => [] });
  const layer = () => ({ classList: { add() {}, remove() {}, toggle() {} } });
  Object.assign(scene, {
    chapterIndex: index, level: sandbox.window.createShadowJumpChapter(index), completedZodiacs: new Set(),
    practiceMode: false, running: true, paused: false, lost: false, won: false,
    formMode: "light", sceneMode: "light", lockTimer: 0, switchTimer: 0,
    hp: 37, mp: 19, maxHp: 100, maxMp: 100, levelValue: 1, crystalCount: 0,
    dashCooldown: 0.5, attackCooldown: 0.4, skillCooldown: 6, shieldTimer: 0,
    player, enemies: [], gates: [], crystals: [], platforms: [], hazards: [], bossThreats: [],
    effects: group(), projectiles: group(), bossEffects: group(),
    boss: { sprite: renderObject(), hpBack: renderObject(), hpBar: renderObject(), label: renderObject() },
    formalRuneStore: RuneStore.create({ storage, completedZodiacs: ["ox"] }),
    audio: { unlock() {}, play() {} }, time: { paused: false, removeAllEvents() {} },
    physics: { world: { pause() { stateEvents.push("physics:pause"); }, resume() { stateEvents.push("physics:resume"); } } },
    tweens: { pauseAll() {}, resumeAll() {}, killAll() {} },
    cameras: { main: { centerOn() {} } },
    input: { keyboard: { resetKeys() {} } }, holdInput: { left: false, right: false, attack: false },
    hud: { help: layer(), overlay: layer(), pauseOverlay: layer() },
    messageText: { setVisible() {} },
    shake() {}, floatText() {}, emitMotes() {}, burst() {},
    addXp(amount) { this.xpAwarded = (this.xpAwarded || 0) + amount; },
    showMessage(message) { this.lastMessage = message; },
    updateHud() {}, applyPlayerArt() {}, applyModeVisibility() {}, refreshChapterJournal() {},
    hideMenu() {}, focusGame() {},
    configureBoss(boss, source) {
      boss.sprite.model = { ...clone(source), maxHp: source.hp, phaseIndex: 0 };
      boss.sprite.active = true;
    }
  });
  scene.runeStore = scene.formalRuneStore;
  scene.runeInstanceId = scene.runeStore.createInstance(scene.level.boss.id);
  scene.configureBoss(scene.boss, scene.level.boss);
  scene.checkpoint = { ...scene.level.start };
  player.x = scene.level.start.x;
  return { scene, storage, stateEvents };
}

function defeat(scene) {
  const model = scene.boss.sprite.getData("model");
  scene.damageBoss(model.hp + 1, model.phases[model.phaseIndex].weakness);
}

test("real Boss death grants the matching persistent rune immediately without seals or exit", () => {
  for (let index = 0; index < 12; index++) {
    const { scene, storage } = fixture(index);
    const id = scene.level.boss.id;
    const before = scene.runeStore.state.inventory[id];
    defeat(scene);
    assert.equal(scene.runeStore.state.inventory[id], before + 1, id);
    assert.equal(scene.crystalCount, 0);
    assert.equal(scene.completedZodiacs.size, 0);
    assert.equal(scene.won, false);
    assert.equal(scene.boss.sprite.active, false);
    assert.match(scene.lastMessage, /获得.*符文/);
    assert.equal(RuneStore.create({ storage }).state.inventory[id], before + 1);
    scene.damageBoss(1000, "light");
    scene.damageBoss(1000, "shadow");
    assert.equal(scene.runeStore.state.inventory[id], before + 1, "dead Boss cannot award twice");
    assert.equal(scene.xpAwarded, 120);
  }
});

test("practice chapter selection isolates equipment and drops, then restores formal loadouts", () => {
  const { scene, storage } = fixture();
  const formal = scene.getRuneLoadouts();
  formal.light[0] = "ox";
  assert.equal(scene.applyRuneLoadouts(formal).ok, true);
  const savedBeforePractice = storage.getItem(RuneStore.key);
  scene.selectChapter(3, true);
  assert.equal(scene.practiceMode, true);
  assert.equal(scene.runeStore.practice, true);
  const rehearsal = scene.getRuneLoadouts();
  rehearsal.light[0] = "rabbit";
  rehearsal.shadow[0] = "rabbit";
  assert.equal(scene.applyRuneLoadouts(rehearsal).ok, true);
  defeat(scene);
  assert.equal(scene.formalRuneStore.state.inventory.rabbit, 0);
  assert.equal(storage.getItem(RuneStore.key), savedBeforePractice, "practice never writes the formal save");
  scene.selectChapter(0, false);
  assert.equal(scene.runeStore, scene.formalRuneStore);
  assert.equal(scene.getRuneLoadouts().light[0], "ox");
  assert.equal(scene.getRuneLoadouts().shadow[0], null);
});

test("equipment applies at the active lamp but battle pause alone cannot bypass safety", () => {
  const { scene } = fixture();
  scene.checkpoint = { ...scene.level.checkpoints[0].set };
  scene.player.setPosition(scene.checkpoint.x, scene.checkpoint.y);
  assert.equal(scene.getRuneEquipmentState().safe, true);
  const enemy = { mode: "both", sprite: renderObject() };
  enemy.sprite.setPosition(scene.player.x + 50, scene.player.y);
  scene.enemies.push(enemy);
  scene.paused = true;
  const proposed = scene.getRuneLoadouts();
  proposed.light[0] = "ox";
  assert.equal(scene.getRuneEquipmentState().safe, false);
  assert.equal(scene.applyRuneLoadouts(proposed).ok, false);
  assert.equal(scene.getRuneLoadouts().light[0], null);
  enemy.sprite.active = false;
  assert.equal(scene.applyRuneLoadouts(proposed).ok, true);
  scene.player.x = scene.level.arenaStart + 30;
  assert.equal(scene.getRuneEquipmentState().safe, false, "the live guardian keeps the arena unsafe");
  scene.lost = true;
  scene.running = false;
  assert.equal(scene.getRuneEquipmentState().safe, false, "a death screen is not preparation");
});

test("applying or removing a rune preserves HP, MP and committed cooldowns", () => {
  const { scene } = fixture();
  scene.runeSkillCooldowns = { light: 7, shadow: 4 };
  const before = [scene.hp, scene.mp, scene.skillCooldown, scene.attackCooldown, scene.dashCooldown, clone(scene.runeSkillCooldowns)];
  const loadouts = scene.getRuneLoadouts();
  loadouts.light[1] = "ox";
  assert.equal(scene.applyRuneLoadouts(loadouts).ok, true);
  assert.deepEqual([scene.hp, scene.mp, scene.skillCooldown, scene.attackCooldown, scene.dashCooldown, clone(scene.runeSkillCooldowns)], before);
  loadouts.light[1] = null;
  assert.equal(scene.applyRuneLoadouts(loadouts).ok, true);
  assert.deepEqual([scene.hp, scene.mp, scene.skillCooldown, scene.attackCooldown, scene.dashCooldown, clone(scene.runeSkillCooldowns)], before);
});

test("equipment modal blocks gameplay and closing restores the prior pause state", () => {
  for (const wasPaused of [false, true]) {
    const { scene, stateEvents } = fixture();
    scene.paused = wasPaused;
    scene.holdInput.attack = true;
    scene.beginRuneEquipment();
    assert.equal(scene.runeEquipmentOpen, true);
    assert.equal(scene.paused, true);
    assert.equal(scene.time.paused, true);
    assert.equal(scene.holdInput.attack, false);
    const originalSide = scene.formMode;
    scene.switchForm();
    assert.equal(scene.formMode, originalSide);
    scene.endRuneEquipment();
    assert.equal(scene.runeEquipmentOpen, false);
    assert.equal(scene.paused, wasPaused);
    assert.equal(stateEvents.includes("physics:resume"), !wasPaused);
  }
});

test("switching yin and yang cannot refill resources or bypass its shared 0.6 second interval", () => {
  const { scene } = fixture();
  const before = [scene.hp, scene.mp, scene.skillCooldown];
  scene.switchForm();
  assert.equal(scene.formMode, "shadow");
  assert.equal(scene.switchTimer, 0.6);
  assert.deepEqual([scene.hp, scene.mp, scene.skillCooldown], before);
  scene.switchForm();
  assert.equal(scene.formMode, "shadow");
  scene.updateTimers(0.3);
  scene.switchForm("light");
  assert.equal(scene.formMode, "shadow");
  scene.updateTimers(0.3);
  scene.switchForm("light");
  assert.equal(scene.formMode, "light");
  assert.equal(scene.hp, before[0]);
  assert.equal(scene.mp, before[1]);
});

test("out-of-realm equipment remains usable at zero MP and recovers naturally", () => {
  const { scene } = fixture();
  scene.formMode = "shadow";
  scene.sceneMode = "light";
  scene.mp = 0;
  scene.updateResources(1);
  assert.equal(scene.formMode, "shadow");
  assert.equal(scene.mp, 4);
  scene.sceneMode = "shadow";
  scene.updateResources(1);
  assert.equal(scene.mp, 10);
  scene.updateResources(100);
  assert.equal(scene.mp, scene.maxMp);
});

test("death continuation retains the rewarded run, while a full restart mints a new one", () => {
  const { scene } = fixture();
  defeat(scene);
  const instance = scene.runeInstanceId;
  scene.lost = true;
  scene.running = false;
  scene.continueFromCheckpoint();
  assert.equal(scene.runeInstanceId, instance);
  assert.equal(scene.runeStore.state.inventory.rat, 1);
  assert.equal(scene.boss.sprite.getData("model").hp <= 0, true);
  assert.equal(scene.runeStore.reward("rat", instance).awarded, false);
  scene.resetGame(true);
  assert.notEqual(scene.runeInstanceId, instance);
  assert.equal(scene.boss.sprite.getData("model").hp > 0, true);
  defeat(scene);
  assert.equal(scene.runeStore.state.inventory.rat, 2);
});
