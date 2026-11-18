const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// Run production gameplay methods without a renderer. Browser smoke testing still
// covers Phaser integration; these checks protect input and progression behavior.
const sandbox = {
  window: {},
  document: { getElementById: () => null },
  Phaser: { Scene: class {}, Math: { Clamp: (value, min, max) => Math.max(min, Math.min(max, value)) } },
  console
};
vm.createContext(sandbox);
for (const file of ["data/zodiac.js", "data/level-01.js", "zodiac-art.js", "game-scene.js"]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../src", file), "utf8"), sandbox, { filename: file });
}
const GameScene = sandbox.window.LiangyiGameScene;
const level = sandbox.window.createLiangyiChapter(0);
const zodiac = sandbox.window.LIANGYI_ZODIAC;
const createChapter = sandbox.window.createLiangyiChapter;

function makeScene() {
  const scene = new GameScene();
  const events = [];
  const body = {
    velocity: { x: 0, y: 0 }, acceleration: { x: 0 }, maxVelocity: { x: 0, y: 0 },
    blocked: { down: false }, touching: { down: false },
    setGravityY(value) { this.gravityY = value; return this; },
    setMaxVelocity(x, y) { this.maxVelocity = { x, y }; return this; },
    setDragX(value) { this.dragX = value; return this; },
    setAccelerationX(value) { this.acceleration.x = value; return this; },
    setVelocityX(value) { this.velocity.x = value; return this; },
    setVelocityY(value) { this.velocity.y = value; return this; },
    setVelocity(x, y) { this.velocity = { x, y }; return this; }
  };
  const anims = {
    currentAnim: null,
    play(key) { this.currentAnim = { key }; return this; },
    pause() { events.push("animation:pause"); },
    resume() { events.push("animation:resume"); }
  };
  const player = {
    x: 200, y: 500, flipX: false, body, anims,
    setFlipX(value) { this.flipX = value; return this; },
    setAlpha(value) { this.alpha = value; return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setVelocity(x, y) { body.setVelocity(x, y); return this; }
  };
  const group = () => ({ children: [], getChildren() { return this.children; }, add(child) { this.children.push(child); return child; }, clear(remove, destroy) { if (destroy) this.children.forEach(child => child.destroy?.()); this.children = []; } });
  const ui = { setPosition() { return this; }, setVisible() { return this; }, setScale() { return this; } };
  Object.assign(scene, {
    events, player, level, chapterIndex: 0, practiceMode: false, completedZodiacs: new Set(), running: true, paused: false, won: false, lost: false,
    sceneMode: "light", formMode: "light", hp: 100, maxHp: 100, mp: 100, maxMp: 100,
    levelValue: 1, xp: 0, nextXp: 60, crystalCount: 0,
    equipment: {
      lightBlade: { rangedDamage: 7, critChance: 0.14 },
      shadowBoots: { speedBonus: 34, dashBonus: 90 },
      soulVessel: { mpRegen: 3, reverseDrainReduction: 2 }
    },
    checkpoint: { ...level.start }, jumpsUsed: 0, coyoteTimer: 0, jumpBufferTimer: 0,
    lockTimer: 0, invulnTimer: 0, dashTimer: 0, dashCooldown: 0, attackCooldown: 0,
    skillCooldown: 0, shieldTimer: 0, messageTimer: 0, switchTimer: 0,
    isAttacking: false, isDashing: false,
    keys: Object.fromEntries(["left", "right", "arrowLeft", "arrowRight", "attack"].map(key => [key, { isDown: false }])),
    holdInput: { left: false, right: false, attack: false },
    input: { keyboard: { resetKeys() { events.push("input:reset"); } } },
    game: { canvas: { setAttribute() {}, focus() { events.push("canvas:focus"); } } },
    audio: { unlock() {}, play(value) { events.push(`audio:${value}`); } },
    physics: { world: { pause() { events.push("physics:pause"); }, resume() { events.push("physics:resume"); } } },
    cameras: { main: { centerOn(x, y) { this.center = { x, y }; events.push("camera:center"); } } },
    tweens: { pauseAll() { events.push("tweens:pause"); }, resumeAll() { events.push("tweens:resume"); }, killAll() { events.push("tweens:clear"); } },
    time: { now: 100, paused: false, removeAllEvents() { events.push("timers:clear"); } },
    hud: { pauseOverlay: { classList: { toggle() {}, add() {} } } },
    shieldVisual: ui, messageText: ui,
    projectiles: group(), effects: group(), bossEffects: group(), bossThreats: [], crystals: [], enemies: [], gates: [], platforms: [], hazards: [],
    boss: { sprite: { getData() { return this.model; }, model: { hp: 75, attackTimer: 0 } } },
    updateHud() {}, showMessage() {}, hideMenu() {}, applyPlayerArt() {}, applyModeVisibility() {},
    checkProjectileManualHit() {},
    emitMotes() { events.push("visual:motes"); },
    motionRing() { events.push("visual:ring"); }
  });
  setBodyBounds(scene, 28, 54, -14, -14);
  return scene;
}

function setBodyBounds(scene, width, height, offsetX, offsetY) {
  const body = scene.player.body;
  body.width = width;
  body.height = height;
  body.x = scene.player.x + offsetX;
  body.y = scene.player.y + offsetY;
  for (const [property, get] of Object.entries({
    left: () => body.x, right: () => body.x + body.width,
    top: () => body.y, bottom: () => body.y + body.height
  })) Object.defineProperty(body, property, { configurable: true, get });
  body.position = {};
  for (const axis of ["x", "y"]) Object.defineProperty(body.position, axis, {
    get: () => body[axis], set: value => { body[axis] = value; }
  });
  body.updateFromGameObject = () => {
    body.x = scene.player.x + offsetX;
    body.y = scene.player.y + offsetY;
  };
  body.reset = (x, y) => {
    scene.events.push("body:reset");
    scene.player.setPosition(x, y);
    body.updateFromGameObject();
    body.setVelocity(0, 0);
  };
}

function bodyOverlaps(scene, obstacle) {
  const body = scene.player.body;
  return body.left < obstacle.x + obstacle.w && body.right > obstacle.x &&
    body.top < obstacle.y + obstacle.h && body.bottom > obstacle.y;
}

function ground(scene) {
  scene.player.body.blocked.down = true;
  scene.player.body.velocity.y = 0;
}

function airborne(scene) {
  scene.player.body.blocked.down = false;
  scene.player.body.touching.down = false;
}

function connectTouchJump(scene) {
  const listeners = new Map();
  const button = {
    dataset: { action: "jump" },
    setPointerCapture() {},
    addEventListener(type, callback) { listeners.set(type, callback); }
  };
  Object.assign(scene.input.keyboard, {
    addKeys(keys) { return Object.fromEntries(Object.keys(keys).map(key => [key, { isDown: false }])); },
    addCapture() {}, on() {}
  });
  scene.audio.unlock = () => {};
  scene.game.events = { on() {}, off() {} };
  scene.events.once = () => {};
  const previousDocument = sandbox.document;
  sandbox.document = {
    ...previousDocument,
    querySelectorAll(selector) { return selector === "[data-action]" ? [button] : []; }
  };
  try { scene.createInput(); } finally { sandbox.document = previousDocument; }
  return (type, pointerId = 7) => listeners.get(type)?.({ pointerId, preventDefault() {} });
}

// Small rendering stand-ins let the real chapter and combat methods run together.
// They retain the state players depend on: identity, position, visibility and life.
function displayObject(x = 0, y = 0) {
  const object = {
    x, y, active: true, visible: true, scaleX: 1, scaleY: 1, data: {}, drawings: [],
    anims: { stop() { this.stopped = true; }, pause() { this.paused = true; }, resume() { this.paused = false; } },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setY(y) { this.y = y; return this; },
    setTexture(texture) { this.texture = texture; return this; },
    setOrigin(x, y) { this.originX = x; this.originY = y; return this; },
    setDisplaySize(w, h) { this.displayWidth = w; this.displayHeight = h; this.scaleX = w / 256; this.scaleY = h / 256; return this; },
    setVisible(value) { this.visible = value; return this; },
    setFlipX(value) { this.flipX = value; return this; },
    setText(value) { this.text = value; return this; },
    setData(key, value) { this.data[key] = value; return this; },
    getData(key) { return this.data[key]; },
    enableBody(reset, x, y, enable, visible) { this.active = enable; this.visible = visible; this.body.enable = enable; return this.setPosition(x, y); },
    disableBody(disable, hide) { this.body.enable = !disable; this.active = false; this.visible = !hide; return this; },
    setVelocity(x, y) { this.body.velocity = { x, y }; return this; },
    play(animation) { this.animation = animation; return this; },
    destroy() { this.active = false; this.destroyed = true; }
  };
  object.body = {
    enable: true,
    setSize(w, h) { this.width = w; this.height = h; return this; },
    setOffset(x, y) { this.offset = { x, y }; return this; },
    setImmovable(value) { this.immovable = value; return this; },
    updateFromGameObject() { this.x = object.x; this.y = object.y; }
  };
  for (const method of ["setDepth", "setStrokeStyle", "setFillStyle", "clearTint", "setTint", "setAlpha", "lineStyle", "fillStyle", "fillRect", "lineBetween", "strokeEllipse", "fillEllipse", "strokeCircle"]) {
    object[method] = function(...args) { this.drawings.push({ method, args }); return this; };
  }
  return object;
}

function makeBossScene(index = 0) {
  const scene = makeScene();
  scene.chapterIndex = index;
  scene.level = createChapter(index);
  scene.boss = { sprite: displayObject(), hpBack: displayObject(), hpBar: displayObject(), label: displayObject() };
  scene.add = { graphics: () => displayObject(), circle: (x, y) => displayObject(x, y) };
  scene.shake = () => {};
  scene.floatText = () => {};
  scene.addXp = (amount, source) => scene.events.push(`xp:${source}:${amount}`);
  scene.showEnd = (title, body, button) => { scene.ending = { title, body, button }; };
  scene.configureBoss(scene.boss, scene.level.boss);
  scene.player.body.reset(scene.level.arenaStart + 130, 500);
  scene.boss.sprite.getData("model").attackTimer = 100;
  return scene;
}

function withStorage(value, run) {
  const previous = sandbox.localStorage;
  const writes = [];
  sandbox.localStorage = {
    getItem(key) { return key === "liangyi-zodiac-progress-v1" ? value : null; },
    setItem(key, next) { writes.push({ key, value: JSON.parse(next) }); value = next; }
  };
  try { return run(writes); } finally { sandbox.localStorage = previous; }
}

function withChapterUi(scene, run) {
  const previous = sandbox.document;
  const button = chapter => ({
    dataset: chapter === undefined ? {} : { chapter: String(chapter) }, listeners: {}, attributes: {},
    classList: { toggle() {} },
    addEventListener(type, listener) { this.listeners[type] = listener; },
    setAttribute(name, value) { this.attributes[name] = value; },
    focus() { sandbox.document.activeElement = this; },
    click() { this.listeners.click?.(); }
  });
  const journalButtons = zodiac.map((_, i) => button(i));
  const options = zodiac.map((_, i) => button(i));
  const opener = button(), close = button(), practice = button();
  const panel = {
    listeners: {}, open: false,
    addEventListener(type, listener) { this.listeners[type] = listener; },
    showModal() { this.open = true; },
    close() { this.open = false; },
    querySelector(selector) { return options[Number(selector.match(/data-chapter="(\d+)"/)?.[1])]; }
  };
  const nodes = {
    "chapter-panel": panel, "chapter-close": close, "zodiac-practice": practice, "zodiac-summary": {},
    "zodiac-journal": { querySelectorAll: () => journalButtons },
    "chapter-options": { querySelectorAll: () => options }
  };
  sandbox.document = {
    activeElement: opener,
    getElementById: id => nodes[id] || null,
    querySelectorAll: selector => selector === "[data-open-chapters]" ? [opener] : []
  };
  try {
    scene.createChapterJournal();
    return run({ panel, options, opener, close, practice });
  } finally { sandbox.document = previous; }
}

test("touch release and subsequent capture loss cut the jump only once, like keyboard release", () => {
  const keyboardScene = makeScene();
  ground(keyboardScene);
  keyboardScene.jump();
  keyboardScene.releaseJump();
  const expectedVelocity = keyboardScene.player.body.velocity.y;

  for (const releaseType of ["pointerup", "pointercancel", "lostpointercapture"]) {
    const scene = makeScene();
    const dispatch = connectTouchJump(scene);
    ground(scene);
    dispatch("pointerdown");
    dispatch(releaseType);
    assert.equal(scene.player.body.velocity.y, expectedVelocity, `${releaseType} matches keyboard jump height`);
    dispatch("lostpointercapture");
    assert.equal(scene.player.body.velocity.y, expectedVelocity, `${releaseType} cannot cut ascent again on capture loss`);
  }
});

test("touch jump ignores unrelated pointers and releases from before an input reset", () => {
  const scene = makeScene();
  const dispatch = connectTouchJump(scene);
  ground(scene);
  dispatch("pointerdown", 1);
  const jumpVelocity = scene.player.body.velocity.y;
  dispatch("pointerdown", 2);
  dispatch("pointerup", 2);
  dispatch("lostpointercapture", 2);
  assert.equal(scene.player.body.velocity.y, jumpVelocity, "another finger cannot interrupt the held jump");
  scene.clearInput();
  dispatch("lostpointercapture", 1);
  assert.equal(scene.player.body.velocity.y, jumpVelocity, "old capture loss after reset cannot cut a new movement");
  ground(scene);
  dispatch("pointerdown", 3);
  dispatch("pointerup", 3);
  assert.equal(scene.player.body.velocity.y, -scene.getFormStats().jump * 0.55, "the next touch remains usable after reset");
});

test("landing restores both jumps, including when no jump was pressed on the prior landing", () => {
  const scene = makeScene();
  scene.jumpsUsed = 2;
  ground(scene);
  scene.updatePlayer(1 / 60);
  assert.equal(scene.jumpsUsed, 0);
  assert.ok(scene.coyoteTimer > 0);
  scene.jump();
  assert.equal(scene.jumpsUsed, 1);
  assert.equal(scene.player.body.velocity.y, -scene.getFormStats().jump);
  // The physics contact flag can remain set for a frame; upward motion must not
  // be mistaken for another landing.
  scene.updatePlayer(1 / 60);
  scene.jump();
  assert.equal(scene.jumpsUsed, 2);
  assert.equal(scene.player.body.velocity.y, -scene.getFormStats().airJump);
  scene.player.body.velocity.y = -123;
  scene.jump();
  assert.equal(scene.player.body.velocity.y, -123, "a third jump cannot reset vertical speed");
});

test("a jump just after walking off an edge uses the full ground jump", () => {
  const scene = makeScene();
  ground(scene);
  scene.updatePlayer(1 / 60);
  airborne(scene);
  scene.updatePlayer(0.05);
  scene.jump();
  assert.equal(scene.jumpsUsed, 1);
  assert.equal(scene.player.body.velocity.y, -scene.getFormStats().jump);
});

test("walking off beyond coyote time leaves one air jump", () => {
  const scene = makeScene();
  ground(scene);
  scene.updatePlayer(1 / 60);
  airborne(scene);
  scene.updatePlayer(0.2);
  assert.equal(scene.jumpsUsed, 1);
  scene.jump();
  assert.equal(scene.jumpsUsed, 2);
  assert.equal(scene.player.body.velocity.y, -scene.getFormStats().airJump);
});

test("a buffered jump fires on landing and is consumed once", () => {
  const scene = makeScene();
  scene.jumpsUsed = 2;
  scene.player.body.velocity.y = 300;
  scene.jump();
  assert.ok(scene.jumpBufferTimer > 0);
  assert.equal(scene.player.body.velocity.y, 300);
  scene.updateTimers(0.05);
  ground(scene);
  scene.updatePlayer(1 / 60);
  assert.equal(scene.jumpsUsed, 1);
  assert.equal(scene.jumpBufferTimer, 0);
  assert.equal(scene.player.body.velocity.y, -scene.getFormStats().jump);
});

test("an expired buffered jump does not fire on landing", () => {
  const scene = makeScene();
  scene.jumpsUsed = 2;
  scene.jump();
  scene.updateTimers(1);
  ground(scene);
  scene.updatePlayer(1 / 60);
  assert.equal(scene.jumpsUsed, 0);
  assert.equal(scene.player.body.velocity.y, 0);
});

test("releasing jump reduces ascent but never accelerates falling", () => {
  const scene = makeScene();
  ground(scene);
  scene.jump();
  const fullJumpVelocity = scene.player.body.velocity.y;
  scene.releaseJump();
  assert.ok(scene.player.body.velocity.y > fullJumpVelocity);
  assert.ok(scene.player.body.velocity.y < 0);
  scene.player.body.velocity.y = 100;
  scene.releaseJump();
  assert.equal(scene.player.body.velocity.y, 100);
});

test("dash retains its velocity cap and direction while opposite movement is held", () => {
  const scene = makeScene();
  scene.player.flipX = true;
  scene.dash();
  const stats = scene.getFormStats();
  assert.ok(stats.dashSpeed > stats.speed);
  scene.keys.right.isDown = true;
  scene.updatePlayer(1 / 60);
  assert.equal(scene.player.body.maxVelocity.x, stats.dashSpeed);
  assert.equal(scene.player.body.velocity.x, -stats.dashSpeed);
  assert.equal(scene.player.flipX, true);
  scene.updateTimers(1);
  scene.updatePlayer(1 / 60);
  assert.equal(scene.player.body.maxVelocity.x, stats.speed);
  assert.equal(scene.player.flipX, false);
});

test("pause clears held input and freezes physics, scene clock and animation; resume restores them", () => {
  const scene = makeScene();
  scene.holdInput.right = true;
  scene.holdInput.attack = true;
  scene.jumpBufferTimer = 0.1;
  scene.togglePause();
  assert.equal(scene.paused, true);
  assert.equal(scene.time.paused, true);
  assert.equal(scene.holdInput.right, false);
  assert.equal(scene.holdInput.attack, false);
  assert.equal(scene.jumpBufferTimer, 0);
  assert.ok(scene.events.includes("physics:pause"));
  assert.ok(scene.events.includes("tweens:pause"));
  assert.ok(scene.events.includes("animation:pause"));
  scene.togglePause();
  assert.equal(scene.paused, false);
  assert.equal(scene.time.paused, false);
  assert.ok(scene.events.includes("physics:resume"));
  assert.ok(scene.events.includes("animation:resume"));
});

test("action inputs cannot change gameplay while paused", () => {
  const scene = makeScene();
  ground(scene);
  scene.paused = true;
  scene.jump();
  scene.dash();
  scene.attack();
  scene.skill();
  scene.switchForm();
  scene.switchScene();
  assert.equal(scene.player.body.velocity.y, 0);
  assert.equal(scene.dashTimer, 0);
  assert.equal(scene.attackCooldown, 0);
  assert.equal(scene.mp, 100);
  assert.equal(scene.formMode, "light");
  assert.equal(scene.sceneMode, "light");
});

test("projectile expiration is measured in seconds at different update rates", () => {
  for (const fps of [30, 60, 120]) {
    const scene = makeScene();
    const projectile = { active: true, x: 200, mode: "light", life: 1.1, destroy() { this.active = false; } };
    scene.projectiles.children.push(projectile);
    for (let frame = 0; frame < fps; frame++) scene.updateProjectiles(1 / fps);
    assert.equal(projectile.active, true, `${fps} fps: remains alive after one second`);
    for (let frame = 0; frame < Math.ceil(fps * 0.12); frame++) scene.updateProjectiles(1 / fps);
    assert.equal(projectile.active, false, `${fps} fps: expires after its lifetime`);
  }
});

test("projectiles from the previous realm are removed before they can persist", () => {
  const scene = makeScene();
  const projectile = { active: true, x: 200, mode: "shadow", life: 1, destroy() { this.active = false; } };
  scene.projectiles.children.push(projectile);
  scene.updateProjectiles(1 / 60);
  assert.equal(projectile.active, false);
});

test("every checkpoint respawns above shared ground with room for the player body", () => {
  assert.ok(level.checkpoints.length >= 2);
  for (const checkpoint of level.checkpoints) {
    const support = level.platforms.find(platform => platform.mode === "both" &&
      checkpoint.set.x - 14 >= platform.x && checkpoint.set.x + 14 <= platform.x + platform.w &&
      checkpoint.set.y < platform.y && platform.y === level.floorY);
    assert.ok(support, `checkpoint ${checkpoint.x} needs safe ground in either realm`);
  }
});

test("checkpoints require landing and restore resources only on first activation", () => {
  const scene = makeScene();
  scene.player.x = level.checkpoints[0].x;
  scene.player.y = level.floorY - 50;
  scene.hp = 40;
  scene.mp = 10;
  scene.updateCheckpoints();
  assert.equal(scene.checkpoint.x, level.start.x, "flying past a checkpoint does not save");
  ground(scene);
  scene.updateCheckpoints();
  assert.equal(scene.checkpoint.x, level.checkpoints[0].set.x);
  assert.ok(scene.hp > 40 && scene.hp <= scene.maxHp);
  assert.equal(scene.mp, scene.maxMp);
  scene.hp = 30;
  scene.mp = 10;
  scene.updateCheckpoints();
  assert.equal(scene.hp, 30, "standing at a flag cannot heal repeatedly");
  assert.equal(scene.mp, 10);
});

test("checkpoint continuation preserves collected crystals, defeated foes and character progress", () => {
  const scene = makeScene();
  scene.checkpoint = { ...level.checkpoints[1].set };
  scene.lost = true;
  scene.running = false;
  scene.hp = 0;
  scene.mp = 3;
  scene.crystalCount = 3;
  scene.levelValue = 3;
  scene.xp = 42;
  scene.crystals = [{ taken: true }];
  scene.enemies = [{ hp: 0 }];
  scene.gates = [{ hp: 0 }];
  scene.projectiles.children = [{ active: true }];
  scene.effects.children = [{ active: true }];
  scene.dashTimer = 1;
  scene.continueFromCheckpoint();
  assert.equal(scene.running, true);
  assert.equal(scene.lost, false);
  assert.equal(scene.hp, scene.maxHp);
  assert.equal(scene.mp, scene.maxMp);
  assert.equal(scene.player.x, scene.checkpoint.x);
  assert.equal(scene.player.y, scene.checkpoint.y);
  assert.deepEqual(scene.cameras.main.center, { x: scene.checkpoint.x + 130, y: scene.checkpoint.y - 60 });
  assert.equal(scene.crystalCount, 3);
  assert.equal(scene.crystals[0].taken, true);
  assert.equal(scene.enemies[0].hp, 0);
  assert.equal(scene.gates[0].hp, 0);
  assert.equal(scene.boss.sprite.model.hp, 75);
  assert.equal(scene.levelValue, 3);
  assert.equal(scene.xp, 42);
  assert.equal(scene.dashTimer, 0);
  assert.equal(scene.projectiles.children.length, 0);
  assert.equal(scene.effects.children.length, 0);
  assert.ok(scene.events.includes("timers:clear"));
  assert.ok(scene.events.includes("physics:resume"));
});

test("realm switching resolves an offset body even when the sprite center is above a platform", () => {
  const scene = makeScene();
  scene.player.setPosition(200, 450);
  setBodyBounds(scene, 28, 54, -14, -14);
  const platform = { x: 170, y: 480, w: 80, h: 28, mode: "light" };
  scene.platforms = [platform];
  assert.equal(bodyOverlaps(scene, platform), true);
  scene.pushOutOfInactiveTerrain();
  assert.equal(bodyOverlaps(scene, platform), false, "the actual physics body must clear the platform");
  assert.ok(scene.player.body.bottom <= platform.y, "a newly visible platform lifts the feet onto its top");
});

test("realm switching synchronizes the body after lifting a deeply embedded player", () => {
  const scene = makeScene();
  scene.player.setPosition(200, 485);
  setBodyBounds(scene, 28, 54, -14, -14);
  scene.player.body.velocity.y = 250;
  const platform = { x: 170, y: 480, w: 80, h: 28, mode: "light" };
  scene.platforms = [platform];
  scene.pushOutOfInactiveTerrain();
  assert.equal(bodyOverlaps(scene, platform), false);
  assert.equal(scene.player.body.top, scene.player.y - 14, "sprite and Arcade body stay aligned in the same frame");
  assert.equal(scene.player.body.velocity.y, 0);
});

test("realm switching ignores platforms belonging to the other realm", () => {
  const scene = makeScene();
  scene.player.setPosition(200, 485);
  setBodyBounds(scene, 28, 54, -14, -14);
  scene.platforms = [{ x: 170, y: 480, w: 80, h: 28, mode: "shadow" }];
  scene.pushOutOfInactiveTerrain();
  assert.equal(scene.player.x, 200);
  assert.equal(scene.player.y, 485);
});

test("realm switching clears a newly visible gate without reviving a broken gate", () => {
  for (const intact of [true, false]) {
    const scene = makeScene();
    scene.player.setPosition(200, 485);
    setBodyBounds(scene, 28, 54, -14, -14);
    const model = { x: 190, y: 440, w: 46, h: 130, mode: "light", hp: intact ? 3 : 0 };
    scene.gates = [{ ...model, sprite: { active: intact, body: { enable: intact }, getData() { return model; } } }];
    scene.pushOutOfInactiveTerrain();
    if (intact) assert.equal(bodyOverlaps(scene, model), false, "a new solid gate cannot trap the player");
    else {
      assert.equal(scene.player.x, 200);
      assert.equal(scene.player.y, 485, "an already destroyed gate cannot displace the player");
    }
  }
});

test("full restart clears pending actions and starts with restored resources", () => {
  const scene = makeScene();
  scene.boss = null;
  scene.paused = true;
  scene.time.paused = true;
  scene.holdInput.left = true;
  scene.crystalCount = 4;
  scene.hp = 5;
  scene.mp = 2;
  scene.dashTimer = 1;
  scene.dashCooldown = 1;
  scene.jumpBufferTimer = 0.1;
  scene.resetGame(true);
  assert.equal(scene.running, true);
  assert.equal(scene.paused, false);
  assert.equal(scene.time.paused, false);
  assert.equal(scene.holdInput.left, false);
  assert.equal(scene.crystalCount, 0);
  assert.equal(scene.hp, scene.maxHp);
  assert.equal(scene.mp, scene.maxMp);
  assert.equal(scene.dashTimer, 0);
  assert.equal(scene.dashCooldown, 0);
  assert.equal(scene.jumpBufferTimer, 0);
  assert.equal(scene.player.x, level.start.x);
  assert.deepEqual(scene.cameras.main.center, { x: scene.player.x + 130, y: scene.player.y - 60 });
  assert.ok(scene.events.includes("timers:clear"));
  assert.ok(scene.events.includes("physics:resume"));
  assert.ok(scene.events.includes("canvas:focus"));
});

test("all twelve chapters have independent routes and the corresponding zodiac guardian", () => {
  const ids = ["rat", "ox", "tiger", "rabbit", "dragon", "snake", "horse", "goat", "monkey", "rooster", "dog", "pig"];
  assert.deepEqual(Array.from(zodiac, guardian => guardian.id), ids);
  assert.equal(sandbox.window.LIANGYI_CHAPTERS.length, 12);
  const chapters = ids.map((id, index) => {
    const chapter = createChapter(index);
    assert.equal(chapter.chapterIndex, index);
    assert.equal(chapter.boss.id, id);
    assert.equal(chapter.boss.name, zodiac[index].name);
    assert.equal(chapter.startMode, zodiac[index].realm);
    assert.equal(chapter.boss.phases[0].pattern, zodiac[index].pattern);
    assert.equal(chapter.boss.phases[1].pattern, zodiac[index].secondaryPattern);
    assert.notEqual(chapter.boss.phases[0].weakness, chapter.boss.phases[1].weakness);
    assert.equal(chapter.crystals.length, chapter.crystalsRequired);
    return chapter;
  });
  chapters[0].platforms[0].w = 1;
  chapters[0].boss.phases[0].weakness = "modified";
  chapters[0].checkpoints[0].set.x = -1;
  for (const chapter of [...chapters.slice(1), createChapter(0), sandbox.window.LIANGYI_CHAPTERS[0]]) {
    assert.equal(chapter.platforms[0].w, 470, "an old run cannot corrupt another chapter");
    assert.notEqual(chapter.boss.phases[0].weakness, "modified");
    assert.equal(chapter.checkpoints[0].set.x, 1160);
  }
  assert.equal(sandbox.window.LIANGYI_LEVEL.platforms[0].w, 470);
  for (const index of [-1, 12, 1.5, NaN]) assert.throws(() => createChapter(index), { name: "RangeError" });
});

test("every chapter provides an unbroken arena and safe shared checkpoint and practice ground", () => {
  for (let index = 0; index < 12; index++) {
    const chapter = createChapter(index);
    const floor = chapter.platforms.filter(p => p.mode === "both" && p.y === chapter.floorY).sort((a, b) => a.x - b.x);
    let covered = chapter.arenaStart;
    for (const platform of floor) if (platform.x <= covered && platform.x + platform.w > covered) covered = platform.x + platform.w;
    assert.ok(covered >= chapter.arenaEnd, `${chapter.boss.id}: charge and leap land over continuous ground`);
    assert.ok(chapter.hazards.every(h => h.x + h.w <= chapter.arenaStart || h.x >= chapter.arenaEnd), `${chapter.boss.id}: arena contains no realm hazard`);
    const respawns = [...chapter.checkpoints.map(checkpoint => checkpoint.set), { x: chapter.arenaStart + 130, y: 500 }];
    for (const spawn of respawns) assert.ok(floor.some(p => spawn.x - 14 >= p.x && spawn.x + 14 <= p.x + p.w && spawn.y < p.y), `${chapter.boss.id}: respawn ${spawn.x} is supported in both realms`);
  }
});

test("initial scene construction resolves chapter data and saved progress before creating the world", () => {
  withStorage('["rat","dragon"]', () => {
    const scene = new GameScene();
    const artNames = ["LiangyiArt", "LiangyiEnemyArt", "LiangyiWorldArt", "LiangyiZodiacArt"];
    const previous = artNames.map(name => sandbox.window[name]);
    artNames.forEach(name => { sandbox.window[name] = { install() {} }; });
    let createdWorld = false;
    for (const method of ["createTextures", "createPlayerAnimations", "createInput", "createHudHooks", "createChapterJournal", "resetGame", "showMenu"]) scene[method] = () => {};
    scene.createWorld = () => {
      createdWorld = true;
      assert.equal(scene.level.boss.id, "rat");
      assert.equal(scene.chapterIndex, 0);
      assert.equal(scene.practiceMode, false);
      assert.deepEqual([...scene.completedZodiacs], ["rat", "dragon"]);
      assert.equal(scene.checkpoint.x, scene.level.start.x);
    };
    try { scene.create(); } finally { artNames.forEach((name, i) => { sandbox.window[name] = previous[i]; }); }
    assert.equal(createdWorld, true);
  });
});

test("each live guardian uses its own art, animation, health and consistently scaled collision body", () => {
  const textures = new Set();
  for (let index = 0; index < 12; index++) {
    const scene = makeBossScene(index), sprite = scene.boss.sprite;
    const model = sprite.getData("model"), design = sandbox.window.LiangyiZodiacArt.bosses[zodiac[index].id];
    textures.add(sprite.texture);
    assert.equal(sprite.texture, design.texture);
    assert.equal(sprite.animation, design.animation);
    assert.equal(model.id, zodiac[index].id);
    assert.equal(model.hp, zodiac[index].hp);
    assert.equal(model.phaseIndex, 0);
    assert.equal(sprite.y, scene.level.floorY);
    assert.ok(Math.abs(sprite.body.width * sprite.scaleX - scene.level.boss.w) < 1e-9);
    assert.ok(Math.abs(sprite.body.height * sprite.scaleY - scene.level.boss.h) < 1e-9);
    assert.equal(sprite.body.allowGravity, false);
    assert.equal(sprite.body.immovable, true);
  }
  assert.equal(textures.size, 12, "chapter selection changes the actual sprite, not only its label");
});

test("all six boss attacks wait for a visible telegraph and then execute the marked attack", () => {
  const patterns = new Set(Array.from(zodiac).flatMap(guardian => [guardian.pattern, guardian.secondaryPattern]));
  assert.deepEqual([...patterns].sort(), ["aimed", "charge", "fan", "leap", "rain", "spiral"]);
  const counts = { aimed: 1, fan: 5, rain: 3, spiral: 10 };
  for (const pattern of patterns) {
    const scene = makeBossScene();
    scene.queueBossAttack(pattern);
    const warning = scene.bossWarning, attack = { ...scene.pendingBossAttack };
    assert.ok(warning.active && warning.drawings.length > 0, `${pattern}: a visible cue precedes damage`);
    scene.updateBoss(attack.remaining - .01);
    assert.equal(scene.bossThreats.length, 0, `${pattern}: no early projectiles`);
    assert.equal(scene.bossMotion, undefined, `${pattern}: no early charge or leap`);
    assert.equal(warning.destroyed, undefined);
    scene.player.body.reset(scene.level.arenaEnd - 80, 500);
    scene.updateBoss(.02);
    assert.equal(scene.pendingBossAttack, null);
    assert.equal(warning.destroyed, true);
    assert.equal(scene.bossWarning, null);
    if (pattern === "charge" || pattern === "leap") {
      assert.equal(scene.bossMotion.pattern, pattern);
      assert.equal(scene.bossMotion.to, attack.targetX, "movement commits to the warning instead of tracking a dodge");
    } else {
      assert.equal(scene.bossThreats.length, counts[pattern], pattern);
      if (pattern === "aimed") assert.ok(Math.abs(Math.atan2(scene.bossThreats[0].vy, scene.bossThreats[0].vx) - attack.angle) < 1e-9);
      if (pattern === "rain") {
        assert.ok(scene.bossThreats.every(orb => Math.abs(orb.vx) < 1e-9 && orb.vy > 0));
        assert.ok(scene.bossThreats.some(orb => Math.abs(orb.x - attack.targetX) < 1e-9), "rain follows the marked location");
      }
    }
  }
});

test("charge remains inside the arena and leap lands at its warning before emitting two shockwaves", () => {
  for (const pattern of ["charge", "leap"]) {
    const scene = makeBossScene();
    scene.queueBossAttack(pattern);
    const attack = { ...scene.pendingBossAttack };
    scene.clearBossAttacks();
    scene.executeBossAttack(attack);
    scene.player.body.reset(scene.level.arenaEnd - 20, 300);
    const duration = scene.bossMotion.duration;
    scene.updateBoss(duration / 2);
    assert.ok(scene.boss.sprite.x >= scene.level.arenaStart && scene.boss.sprite.x <= scene.level.arenaEnd);
    if (pattern === "leap") assert.ok(scene.boss.sprite.y < scene.level.floorY - 100);
    scene.updateBoss(duration / 2);
    assert.equal(scene.bossMotion, null);
    assert.equal(scene.boss.sprite.x, attack.targetX);
    assert.ok(Math.abs(scene.boss.sprite.y - scene.level.floorY) < 1e-9);
    assert.equal(scene.bossThreats.length, pattern === "leap" ? 2 : 0);
    if (pattern === "leap") assert.ok(scene.bossThreats[0].vx < 0 && scene.bossThreats[1].vx > 0);
  }
});

test("changing boss phase clears old warnings, motion and projectiles and changes the next attack", () => {
  const scene = makeBossScene(), model = scene.boss.sprite.getData("model");
  scene.queueBossAttack(model.phases[0].pattern);
  const warning = scene.bossWarning;
  scene.spawnBossOrb(3900, 400, 0, 100, 10);
  const projectile = scene.bossThreats[0].art;
  scene.bossMotion = { pattern: "leap" };
  scene.boss.sprite.y = 410;
  scene.damageBoss(model.maxHp / 2 + 1, model.phases[1].weakness);
  assert.equal(model.hp, model.maxHp - (model.maxHp / 2 + 1) * .45, "off-polarity attacks retain reduced damage");
  assert.equal(warning.destroyed, undefined, "a hit above the phase threshold cannot cancel an enemy attack");
  scene.damageBoss(model.maxHp / 2 + 1, model.phases[0].weakness);
  assert.equal(model.phaseIndex, 1);
  assert.equal(model.attackTimer, 1.8);
  assert.equal(scene.pendingBossAttack, null);
  assert.equal(scene.bossMotion, null);
  assert.equal(scene.bossThreats.length, 0);
  assert.equal(warning.destroyed, true);
  assert.equal(projectile.destroyed, true);
  assert.equal(scene.boss.sprite.y, scene.level.floorY);
  scene.updateBoss(1.81);
  assert.equal(scene.pendingBossAttack.pattern, model.phases[1].pattern);
});

test("a defeated boss removes every active attack and cannot launch another volley", () => {
  const scene = makeBossScene(), model = scene.boss.sprite.getData("model");
  scene.queueBossAttack("fan");
  const attack = { ...scene.pendingBossAttack }, warning = scene.bossWarning;
  scene.spawnBossOrb(3900, 400, 0, 100, 10);
  const projectile = scene.bossThreats[0].art;
  scene.damageBoss(model.hp, model.phases[0].weakness);
  assert.equal(scene.boss.sprite.active, false);
  assert.equal(scene.boss.sprite.body.enable, false);
  assert.equal(scene.boss.sprite.anims.stopped, true);
  assert.equal(scene.pendingBossAttack, null);
  assert.equal(scene.bossThreats.length, 0);
  assert.equal(warning.destroyed, true);
  assert.equal(projectile.destroyed, true);
  assert.ok(scene.events.includes("xp:boss:120"));
  scene.executeBossAttack(attack);
  assert.equal(scene.bossThreats.length, 0);
});

test("registered Boss contact marks charge and leap unblockable but preserves ordinary contact", () => {
  const scene = makeBossScene();
  const boss = scene.boss, player = scene.player, overlaps = [];
  const visual = () => {
    const object = displayObject();
    object.setScrollFactor = () => object;
    return object;
  };
  scene.level = { ...scene.level, platforms: [], hazards: [], crystals: [], enemies: [], gates: [] };
  scene.createBoss = () => boss;
  scene.createPortal = () => ({ zone: {} });
  scene.add = Object.fromEntries(["image", "tileSprite", "graphics", "ellipse", "text", "circle", "group"].map(name => [name, visual]));
  player.setDepth = player.setCollideWorldBounds = () => player;
  scene.physics.add = {
    sprite: () => player, group: visual, collider() {},
    overlap(first, second, callback) { overlaps.push({ first, second, callback }); }
  };
  scene.physics.world.setBounds = () => {};
  Object.assign(scene.cameras.main, { setBounds() {}, startFollow() {}, setDeadzone() {} });
  scene.createWorld();
  const contact = overlaps.find(entry => entry.first === player && entry.second === boss.sprite);
  assert.ok(contact, "the actual world registers the Boss contact callback");
  for (const pattern of [null, "charge", "leap"]) {
    scene.bossMotion = pattern ? { pattern } : null;
    let calls = 0;
    scene.hurt = amount => {
      calls += 1;
      assert.equal(amount, 18);
      assert.equal(scene.runeIncomingAttack.sourceX, boss.sprite.x);
      assert.equal(scene.runeIncomingAttack.unblockable, Boolean(pattern));
    };
    contact.callback();
    assert.equal(calls, 1);
    assert.equal(scene.runeIncomingAttack, null, "contact context cannot leak into subsequent damage");
  }
});

test("boss projectiles use the player body, expire, and deal damage only once", () => {
  const scene = makeBossScene();
  const damage = [];
  scene.hurt = value => damage.push(value);
  scene.spawnBossOrb(scene.player.body.right + 6, scene.player.body.top + 10, Math.PI, 100, 10);
  const hit = scene.bossThreats[0].art;
  scene.spawnBossOrb(4000, 250, 0, 0, 10);
  scene.bossThreats[1].life = .01;
  const expired = scene.bossThreats[1].art;
  scene.updateBossThreats(.02);
  assert.deepEqual(damage, [14]);
  assert.equal(hit.destroyed, true);
  assert.equal(expired.destroyed, true);
  assert.equal(scene.bossThreats.length, 0);
  scene.updateBossThreats(.02);
  assert.deepEqual(damage, [14]);
});

test("formal completion requires all seals and the defeated guardian and saves without duplicates", () => {
  withStorage(null, writes => {
    const scene = makeBossScene(4);
    scene.tryPortal();
    assert.equal(scene.won, false);
    scene.crystalCount = scene.level.crystalsRequired;
    scene.tryPortal();
    assert.equal(scene.won, false);
    assert.equal(writes.length, 0);
    scene.boss.sprite.disableBody(true, true);
    scene.tryPortal();
    assert.equal(scene.won, true);
    assert.equal(scene.running, false);
    assert.deepEqual([...scene.completedZodiacs], ["dragon"]);
    assert.deepEqual(writes, [{ key: "liangyi-zodiac-progress-v1", value: ["dragon"] }]);
    scene.tryPortal();
    assert.equal(writes.length, 1, "repeated overlap events cannot save or finish twice");
    scene.resetGame(true);
    scene.crystalCount = scene.level.crystalsRequired;
    scene.boss.sprite.disableBody(true, true);
    scene.tryPortal();
    assert.deepEqual(writes.at(-1).value, ["dragon"], "replaying a chapter cannot duplicate its stamp");
  });
});

test("practice completion bypasses exploration but never changes or saves campaign progress", () => {
  withStorage('["rat"]', writes => {
    const scene = makeBossScene(4);
    scene.completedZodiacs = scene.readCampaign();
    scene.practiceMode = true;
    scene.tryPortal();
    assert.equal(scene.won, false, "practice still requires defeating the actual guardian");
    scene.boss.sprite.disableBody(true, true);
    scene.tryPortal();
    assert.equal(scene.won, true);
    assert.equal(scene.crystalCount, 0);
    assert.deepEqual([...scene.completedZodiacs], ["rat"]);
    assert.equal(writes.length, 0);
    assert.equal(scene.ending.title, "演武完成");
    assert.equal(scene.ending.button, "进入本章历练");
  });
});

test("chapter and practice switching update live terrain and guardian while retaining campaign progress", () => {
  const scene = makeBossScene();
  scene.completedZodiacs.add("rat");
  scene.completedZodiacs.add("dragon");
  const progress = scene.completedZodiacs;
  scene.platforms = scene.level.platforms.map(p => ({ ...p, bodyHost: displayObject() }));
  scene.hazards = scene.level.hazards.map(h => ({ ...h, zone: displayObject() }));
  scene.crystals = scene.level.crystals.map(c => ({ ...c, sprite: displayObject() }));
  scene.selectChapter(11, true);
  assert.equal(scene.level.boss.id, "pig");
  assert.equal(scene.boss.sprite.getData("model").id, "pig");
  assert.equal(scene.completedZodiacs, progress);
  assert.deepEqual([...progress], ["rat", "dragon"]);
  assert.equal(scene.practiceMode, true);
  assert.equal(scene.player.x, scene.level.arenaStart + 130);
  assert.deepEqual(scene.cameras.main.center, { x: scene.player.x + 130, y: scene.player.y - 60 }, "practice teleport centers the camera immediately");
  assert.equal(scene.crystalCount, 0);
  assert.ok(scene.crystals.every(c => c.taken && !c.sprite.active));
  scene.selectChapter(1);
  assert.equal(scene.practiceMode, false);
  assert.equal(scene.player.x, scene.level.start.x);
  assert.deepEqual(scene.cameras.main.center, { x: scene.player.x + 130, y: scene.player.y - 60 }, "returning to exploration centers the camera at the chapter entrance");
  assert.equal(scene.sceneMode, zodiac[1].realm);
  assert.equal(scene.formMode, zodiac[1].realm);
  assert.equal(scene.boss.sprite.getData("model").id, "ox");
  assert.ok(scene.crystals.every(c => !c.taken && c.sprite.active && c.sprite.texture === `crystal-${c.mode}`));
  scene.platforms.forEach((p, i) => {
    assert.equal(p.y, scene.level.platforms[i].y);
    assert.equal(p.mode, scene.level.platforms[i].mode);
    assert.equal(p.bodyHost.y, p.y + p.h / 2);
  });
  assert.equal(scene.completedZodiacs, progress);
  const currentLevel = scene.level;
  scene.selectChapter(12);
  assert.equal(scene.level, currentLevel, "invalid chapter selection leaves the running chapter intact");
});

test("saved campaign data filters unknown or duplicate entries and survives unavailable storage", () => {
  withStorage('["rat","rat","unknown","pig",null,4]', () => {
    assert.deepEqual([...makeScene().readCampaign()], ["rat", "pig"]);
  });
  for (const value of ["invalid JSON", "null", "{}", "42"]) withStorage(value, () => assert.equal(makeScene().readCampaign().size, 0));
  const previous = sandbox.localStorage;
  sandbox.localStorage = { getItem() { throw new Error("unavailable"); }, setItem() { throw new Error("unavailable"); } };
  try {
    const scene = makeBossScene(11);
    assert.equal(scene.readCampaign().size, 0);
    scene.crystalCount = scene.level.crystalsRequired;
    scene.boss.sprite.disableBody(true, true);
    scene.tryPortal();
    assert.equal(scene.won, true);
    assert.equal(scene.completedZodiacs.has("pig"), true, "a storage failure retains completion for this session");
  } finally { sandbox.localStorage = previous; }
});

test("guardians face toward the player on either side of the arena", () => {
  const scene = makeBossScene(), sprite = scene.boss.sprite;
  scene.player.body.reset(sprite.x - 120, 500);
  scene.updateBoss(1 / 60);
  assert.equal(sprite.flipX, true, "right-facing art flips when the player is to its left");
  scene.player.body.reset(sprite.x + 120, 500);
  scene.updateBoss(1 / 60);
  assert.equal(sprite.flipX, false);
});

test("checkpoint continuation restores the chapter realm and resumes only active visible enemy animations", () => {
  for (const startMode of ["light", "shadow", undefined]) {
    const scene = makeBossScene();
    scene.level.startMode = startMode;
    scene.sceneMode = scene.formMode = startMode === "shadow" ? "light" : "shadow";
    scene.checkpoint = { ...scene.level.checkpoints[2].set };
    scene.enemies = [displayObject(), displayObject(), displayObject()].map(sprite => ({ sprite }));
    scene.enemies[1].sprite.disableBody(true, true);
    scene.enemies[2].sprite.setVisible(false);
    scene.pauseEnemyAnimations(true);
    assert.ok(scene.boss.sprite.anims.paused);
    assert.ok(scene.enemies.every(enemy => enemy.sprite.anims.paused));
    scene.lost = true;
    scene.running = false;
    scene.continueFromCheckpoint();
    assert.equal(scene.sceneMode, startMode || "light");
    assert.equal(scene.formMode, scene.sceneMode);
    assert.equal(scene.boss.sprite.anims.paused, false);
    assert.equal(scene.enemies[0].sprite.anims.paused, false);
    assert.equal(scene.enemies[1].sprite.anims.paused, true, "defeated enemies remain stopped");
    assert.equal(scene.enemies[2].sprite.anims.paused, true, "hidden realm enemies remain stopped");
    assert.deepEqual(scene.cameras.main.center, { x: scene.checkpoint.x + 130, y: scene.checkpoint.y - 60 });
  }
});

test("fall recovery restores the chapter realm and immediately centers the camera on the checkpoint", () => {
  for (const startMode of ["light", "shadow", undefined]) {
    const scene = makeBossScene();
    scene.level.startMode = startMode;
    scene.sceneMode = scene.formMode = startMode === "shadow" ? "light" : "shadow";
    scene.checkpoint = { ...scene.level.checkpoints[1].set };
    scene.fallCount = 0;
    scene.crystalCount = 3;
    scene.player.body.reset(3200, scene.level.height + 181);
    scene.queueBossAttack("rain");
    const warning = scene.bossWarning;
    scene.updatePlayer(1 / 60);
    assert.equal(scene.fallCount, 1);
    assert.equal(scene.hp, 82);
    assert.equal(scene.sceneMode, startMode || "light");
    assert.equal(scene.formMode, scene.sceneMode);
    assert.equal(scene.player.x, scene.checkpoint.x);
    assert.equal(scene.player.y, scene.checkpoint.y);
    assert.equal(scene.player.body.velocity.y, 0);
    assert.equal(scene.crystalCount, 3, "fall recovery preserves exploration progress");
    assert.equal(scene.pendingBossAttack, null);
    assert.equal(warning.destroyed, true);
    assert.deepEqual(scene.cameras.main.center, { x: scene.checkpoint.x + 130, y: scene.checkpoint.y - 60 });
  }
});

test("opening and cancelling chapter selection preserves the current run and keeps it paused", () => {
  const scene = makeBossScene(4);
  scene.crystalCount = 3;
  scene.hp = 47;
  scene.mp = 29;
  scene.completedZodiacs.add("rat");
  scene.queueBossAttack("rain");
  const model = scene.boss.sprite.getData("model"), attack = scene.pendingBossAttack;
  model.hp -= 21;
  const position = { x: scene.player.x, y: scene.player.y };
  withChapterUi(scene, ({ panel, options, opener }) => {
    opener.click();
    assert.equal(panel.open, true);
    assert.equal(scene.chapterPickerOpen, true);
    assert.equal(sandbox.document.activeElement, options[4], "the current chapter receives focus");
    assert.equal(scene.paused, true);
    assert.equal(scene.time.paused, true);
    assert.ok(scene.events.includes("physics:pause"));
    let prevented = false;
    panel.listeners.cancel({ preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(panel.open, false);
    assert.equal(scene.chapterPickerOpen, false);
    assert.equal(sandbox.document.activeElement, opener);
    assert.equal(scene.paused, true, "closing selection returns to the paused run");
    assert.equal(scene.time.paused, true);
    assert.equal(scene.crystalCount, 3);
    assert.equal(scene.hp, 47);
    assert.equal(scene.mp, 29);
    assert.equal(scene.boss.sprite.getData("model"), model);
    assert.equal(scene.pendingBossAttack, attack, "browsing chapters does not erase the current fight");
    assert.deepEqual({ x: scene.player.x, y: scene.player.y }, position);
    assert.deepEqual([...scene.completedZodiacs], ["rat"]);
    assert.ok(!scene.events.includes("timers:clear"), "no restart occurs before chapter selection");
  });
});

test("the intro chapter picker starts gameplay only after a specific guardian is selected", () => {
  const scene = makeBossScene();
  scene.running = false;
  scene.completedZodiacs.add("rat");
  withChapterUi(scene, ({ panel, options, opener, close }) => {
    opener.click();
    assert.equal(scene.running, false);
    assert.equal(scene.chapterIndex, 0);
    close.click();
    assert.equal(scene.running, false, "closing from the cover does not start the game");
    assert.equal(sandbox.document.activeElement, opener);
    opener.click();
    options[8].click();
    assert.equal(panel.open, false);
    assert.equal(scene.chapterPickerOpen, false);
    assert.equal(scene.chapterIndex, 8);
    assert.equal(scene.boss.sprite.getData("model").id, "monkey");
    assert.equal(scene.running, true);
    assert.equal(scene.paused, false);
    assert.deepEqual([...scene.completedZodiacs], ["rat"]);
  });
});

test("chapter selection isolates keyboard events so restart and pause shortcuts cannot change the run", () => {
  const scene = makeBossScene();
  withChapterUi(scene, ({ panel, opener }) => {
    const handlers = new Map();
    Object.assign(scene.input.keyboard, {
      addKeys(keys) { return Object.fromEntries(Object.keys(keys).map(key => [key, { isDown: false }])); },
      addCapture() {}, on(type, callback) { handlers.set(type, callback); }
    });
    scene.game.events = { on() {}, off() {} };
    scene.events.once = () => {};
    scene.createInput();
    scene.crystalCount = 3;
    opener.click();
    for (const key of ["R", "P", "SPACE", "L", "K", "J", "U", "SHIFT"]) handlers.get(`keydown-${key}`)({ repeat: false });
    assert.equal(scene.crystalCount, 3);
    assert.equal(scene.paused, true);
    assert.equal(panel.open, true);
    assert.equal(scene.hp, 100);
    assert.equal(scene.mp, 100);
    let stopped = 0;
    for (const type of ["keydown", "keyup"]) panel.listeners[type]({ stopPropagation() { stopped++; } });
    assert.equal(stopped, 2, "native dialog keys cannot reach Phaser's global captures");
    handlers.get("keydown-ESC")({ repeat: false });
    assert.equal(panel.open, false);
    assert.equal(scene.paused, true);
  });
});
