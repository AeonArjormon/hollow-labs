const FORM = {
  light: {
    speed: 250,
    accel: 1650,
    drag: 1320,
    jump: 610,
    airJump: 520,
    gravity: 0.72,
    maxFall: 640,
    dashSpeed: 520,
    dashTime: 150,
    dashCooldown: 780,
    color: 0xfff1a8
  },
  shadow: {
    speed: 325,
    accel: 2150,
    drag: 1050,
    jump: 555,
    airJump: 485,
    gravity: 1.1,
    maxFall: 860,
    dashSpeed: 740,
    dashTime: 210,
    dashCooldown: 610,
    color: 0xd58673
  }
};

const EQUIPMENT = {
  lightBlade: {
    name: "飞剑",
    rangedDamage: 7,
    critChance: 0.14
  },
  shadowBoots: {
    name: "踏云履",
    speedBonus: 34,
    dashBonus: 90
  },
  soulVessel: {
    name: "两仪玉",
    mpRegen: 3,
    reverseDrainReduction: 2
  }
};

const SPIRIT_CORES = {
  light: {
    name: "玉清护体",
    cost: 18,
    description: "护盾并发射贯虹飞剑"
  },
  shadow: {
    name: "镇魂突袭",
    cost: 22,
    description: "突进并扩大斩击"
  }
};

const MOVEMENT = { coyoteTime: 0.12, jumpBuffer: 0.14, jumpCutSpeed: 220 };

// Each skin is a token set in styles.css plus the mobile browser chrome colour.
// The canvas art keeps its own two palettes; skins restyle the surrounding UI.
const SKINS = [
  { id: "jade", label: "青玉", theme: "#102c2d" },
  { id: "ink", label: "玄墨", theme: "#090b10" },
  { id: "ember", label: "赤霞", theme: "#1a0f0d" }
];

const HUD_IDS = {
  hpBar: "hp-bar",
  hpValue: "hp-value",
  mpBar: "mp-bar",
  mpValue: "mp-value",
  crystals: "crystals",
  level: "level",
  equipment: "equipment",
  spiritCore: "spirit-core",
  state: "state",
  pause: "pause",
  pauseOverlay: "pause-overlay",
  overlay: "overlay",
  start: "start",
  lightScene: "light-scene",
  shadowScene: "shadow-scene",
  lightForm: "light-form",
  shadowForm: "shadow-form"
};

function dom(id) {
  return document.getElementById(id);
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

class SynthAudio {
  constructor() {
    this.context = null;
    this.enabled = false;
    this.muted = false;
  }

  unlock() {
    if (!window.AudioContext && !window.webkitAudioContext) return;
    if (!this.context) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      this.context = new AudioCtor();
    }
    if (this.context.state === "suspended") this.context.resume();
    this.enabled = true;
  }

  play(type) {
    if (!this.enabled || !this.context || this.muted) return;
    const presets = {
      shoot: [740, 0.055, "triangle", 0.08],
      hit: [220, 0.09, "triangle", 0.07],
      slash: [150, 0.08, "triangle", 0.08],
      skill: [420, 0.14, "triangle", 0.12],
      crystal: [920, 0.16, "sine", 0.11],
      level: [660, 0.24, "sine", 0.13],
      hurt: [95, 0.18, "triangle", 0.09],
      switch: [360, 0.08, "triangle", 0.08]
    };
    const [frequency, duration, wave, volume] = presets[type] || presets.hit;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * 0.55), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain).connect(this.context.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }
}

class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  preload() {
    // The original art is generated locally: transparent, aligned animation frames.
  }

  create() {
    this.chapterIndex = 0;
    this.completedZodiacs = this.readCampaign();
    if (window.LiangyiRuneStore) {
      let storage;
      try { storage = window.localStorage; } catch { /* Keep a playable session when storage is blocked. */ }
      this.formalRuneStore = window.LiangyiRuneStore.create({ storage, completedZodiacs: [...this.completedZodiacs] });
      this.runeStore = this.formalRuneStore;
    }
    this.practiceMode = false;
    this.level = window.createLiangyiChapter(this.chapterIndex);
    this.sceneMode = "light";
    this.formMode = "light";
    this.hp = 100;
    this.mp = 100;
    this.levelValue = 1;
    this.xp = 0;
    this.nextXp = 60;
    this.maxHp = 100;
    this.maxMp = 100;
    this.equipment = { ...EQUIPMENT };
    this.audio = new SynthAudio();
    this.preferences = this.readPreferences();
    this.audio.muted = this.preferences.muted;
    this.visualTime = 0;
    this.trailTimer = 0;
    this.crystalCount = 0;
    this.running = false;
    this.won = false;
    this.lost = false;
    this.lockTimer = 0;
    this.invulnTimer = 0;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.attackCooldown = 0;
    this.skillCooldown = 0;
    this.shieldTimer = 0;
    this.messageTimer = 0;
    this.isAttacking = false;
    this.isDashing = false;
    this.checkpoint = { ...this.level.start };

    window.LiangyiArt.install(this);
    window.LiangyiEnemyArt.install(this);
    window.LiangyiWorldArt.install(this);
    window.LiangyiZodiacArt.install(this);
    this.createTextures();
    this.createPlayerAnimations();
    this.createInput();
    this.createWorld();
    this.createHudHooks();
    this.createChapterJournal();
    this.resetGame(false);
    this.runeUI = window.LiangyiRuneUI?.create(this);
    this.showMenu();
  }

  createTextures() {
    const g = this.add.graphics();
    g.fillStyle(0xffffff).fillRect(0, 0, 8, 8).generateTexture("white", 8, 8);
    for (const [mode, color] of [["light", 0xffe7ad], ["shadow", 0xd58673]]) {
      g.clear();
      g.lineStyle(15, color, .12).beginPath().arc(55, 55, 42, -1.2, 1.2).strokePath();
      g.lineStyle(8, color, .65).beginPath().arc(55, 55, 42, -1.2, 1.2).strokePath();
      g.lineStyle(3, 0xf4f9ff, .95).beginPath().arc(55, 55, 44, -1.05, 1.05).strokePath();
      g.generateTexture(`slash-${mode}`, 112, 112);
      g.clear().fillStyle(color, .1).fillCircle(24, 30, 24);
      g.lineStyle(2, color, .9).strokeCircle(24, 8, 4);
      g.fillStyle(mode === "light" ? 0xafd9bf : 0xb77968).fillRoundedRect(12, 13, 24, 35, 5);
      g.lineStyle(1, 0xf3e4bd, .8).strokeRoundedRect(15, 16, 18, 29, 3);
      g.lineStyle(2, 0xfff1ce, .9).lineBetween(20, 23, 28, 23).lineBetween(24, 20, 24, 36);
      g.lineBetween(18, 29, 30, 29).lineBetween(19, 36, 29, 36);
      g.lineStyle(1.5, color, .8).lineBetween(24, 48, 20, 57).lineBetween(24, 48, 24, 59).lineBetween(24, 48, 28, 57);
      g.generateTexture(`crystal-${mode}`, 48, 60);
    }
    g.destroy();
  }

  createPlayerAnimations() {
    for (const mode of ["light", "shadow"]) {
      for (const [action, { start, end, frameRate, repeat }] of Object.entries(window.LiangyiArt.animations)) {
        this.anims.create({ key: `${mode}-${action}`, frames: this.anims.generateFrameNumbers(`hero-${mode}`, { start, end }), frameRate, repeat });
      }
    }
  }

  createInput() {
    this.keys = this.input.keyboard.addKeys({
      left: "A",
      right: "D",
      arrowLeft: "LEFT",
      arrowRight: "RIGHT",
      jump: "K",
      attack: "J",
      skill: "U",
      dash: "SHIFT",
      scene: "SPACE",
      form: "L",
      restart: "R",
      pause: "P"
    });

    this.input.keyboard.addCapture(["SPACE", "UP", "DOWN", "LEFT", "RIGHT"]);
    this.input.keyboard.on("keydown", () => this.audio.unlock());
    const keyActions = {
      R: () => { if (!this.helpOpen) this.resetGame(true); }, P: () => { if (!this.helpOpen) this.togglePause(); },
      ESC: () => this.helpOpen ? this.closeHelp() : this.togglePause(),
      SPACE: () => this.switchScene(), L: () => this.switchForm(),
      K: () => this.jump(), J: () => this.beginRuneAttack ? this.beginRuneAttack() : this.attack(),
      U: () => this.skill(), SHIFT: () => this.dash(), E: () => this.runeUI?.open()
    };
    Object.entries(keyActions).forEach(([key, action]) => {
      this.input.keyboard.on(`keydown-${key}`, event => {
        if (this.runeEquipmentOpen) return;
        if (this.chapterPickerOpen) {
          if (key === "ESC") this.closeChapterPicker();
          return;
        }
        if (!event.repeat) action();
      });
    });
    this.input.keyboard.on("keyup-K", () => this.releaseJump());
    this.input.keyboard.on("keyup-J", () => this.endRuneAttack?.());

    this.holdInput = { left: false, right: false, attack: false };
    document.querySelectorAll("[data-hold]").forEach(button => {
      const key = button.dataset.hold;
      const set = value => {
        if (value) this.audio.unlock();
        this.holdInput[key] = value;
      };
      button.addEventListener("pointerdown", event => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        set(true);
      });
      button.addEventListener("pointerup", () => set(false));
      button.addEventListener("pointercancel", () => set(false));
      button.addEventListener("lostpointercapture", () => set(false));
    });

    const actions = {
      jump: () => this.jump(),
      attack: () => this.beginRuneAttack ? this.beginRuneAttack() : this.attack(),
      skill: () => this.skill(),
      scene: () => this.switchScene(),
      form: () => this.switchForm(),
      dash: () => this.dash()
    };
    this.actionPointers = new Map();
    document.querySelectorAll("[data-action]").forEach(button => {
      button.addEventListener("pointerdown", event => {
        event.preventDefault();
        if (this.actionPointers.has(button)) return;
        this.actionPointers.set(button, event.pointerId);
        button.setPointerCapture(event.pointerId);
        this.audio.unlock();
        if (button.dataset.action === "attack") this.holdInput.attack = true;
        actions[button.dataset.action]?.();
      });
      const release = event => {
        if (this.actionPointers.get(button) !== event.pointerId) return;
        // pointerup/cancel also releases capture; apply the jump cut only once.
        this.actionPointers.delete(button);
        if (button.dataset.action === "jump") this.releaseJump();
        if (button.dataset.action === "attack") {
          this.holdInput.attack = false;
          if (event.type === "pointercancel" || event.type === "lostpointercapture") this.cancelRuneAttack?.();
          else this.endRuneAttack?.();
        }
      };
      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("lostpointercapture", release);
    });
    const onBlur = () => { if (this.running && !this.paused) this.togglePause(); };
    this.game.events.on("blur", onBlur);
    this.events.once("shutdown", () => this.game.events.off("blur", onBlur));
  }

  createWorld() {
    this.cameras.main.setBounds(0, 0, this.level.width, this.level.height);
    this.physics.world.setBounds(0, 0, this.level.width, this.level.height + 500);

    this.bgImage = this.add.image(576, 324, "world-light").setScrollFactor(0).setDepth(-30);
    this.ruinsImage = this.add.tileSprite(0, 0, 1152, 720, "ruins-light").setOrigin(0).setScrollFactor(0).setDepth(-25);
    this.background = this.add.graphics().setScrollFactor(0).setDepth(-29);
    this.farLayer = this.add.graphics().setScrollFactor(0.25).setDepth(-18);
    this.platformDetailLayer = this.add.graphics().setDepth(6);
    this.foregroundLayer = this.add.graphics().setDepth(20).setScrollFactor(0.78);
    this.checkpointArt = this.add.graphics().setDepth(9);
    this.worldAccents = this.add.graphics().setDepth(10);
    this.playerShadow = this.add.ellipse(82, 585, 44, 9, 0x080f1c, .4).setDepth(8);

    this.platforms = this.level.platforms.map(data => this.createPlatform(data));
    this.hazards = this.level.hazards.map(data => this.createHazard(data));
    this.crystals = this.level.crystals.map(data => this.createCrystal(data));
    this.enemies = this.level.enemies.map(data => this.createEnemy(data));
    this.gates = this.level.gates.map(data => this.createGate(data));
    this.boss = this.createBoss(this.level.boss);
    this.portal = this.createPortal(this.level.portal);

    this.player = this.physics.add.sprite(this.level.start.x, this.level.start.y, "hero-light");
    this.player.setDepth(24);
    this.applyPlayerArt();
    this.player.setCollideWorldBounds(true);
    this.player.body.setMaxVelocity(FORM.light.speed, FORM.light.maxFall);
    this.player.body.setDragX(FORM.light.drag);

    this.projectiles = this.physics.add.group();
    this.effects = this.add.group();
    this.bossEffects = this.add.group();
    this.bossThreats = [];

    this.platformBodies = this.platforms.map(p => p.bodyHost);
    this.physics.add.collider(this.player, this.platformBodies);
    this.physics.add.collider(this.player, this.gates.map(gate => gate.sprite));
    this.physics.add.collider(this.enemies.map(e => e.sprite), this.platformBodies);
    // Guardian movement is bounded to the continuous arena, independent of terraces.
    this.physics.add.overlap(this.player, this.hazards.map(h => h.zone), () => this.hurt(14), null, this);
    this.physics.add.overlap(this.player, this.crystals.map(c => c.sprite), (_player, crystal) => this.collectCrystal(crystal), null, this);
    this.physics.add.overlap(this.player, this.enemies.map(e => e.sprite), (_player, enemy) => this.touchEnemy(enemy), null, this);
    this.physics.add.overlap(this.player, this.boss.sprite, () => {
      this.runeIncomingAttack = { sourceX: this.boss.sprite.x, unblockable: Boolean(this.bossMotion) };
      try { this.hurt(18); } finally { this.runeIncomingAttack = null; }
    }, null, this);
    this.physics.add.overlap(this.player, this.portal.zone, () => this.tryPortal(), null, this);
    this.physics.add.overlap(this.projectiles, this.enemies.map(e => e.sprite), (projectile, enemy) => this.projectileHit(projectile, enemy), null, this);
    this.physics.add.overlap(this.projectiles, this.gates.map(g => g.sprite), (projectile, gate) => this.projectileGateHit(projectile, gate), null, this);
    this.physics.add.overlap(this.projectiles, this.boss.sprite, (projectile, boss) => this.projectileBossHit(projectile, boss), null, this);

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08, -130, 60);
    this.cameras.main.setDeadzone(210, 120);

    this.messageText = this.add.text(576, 112, "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "15px",
      color: "#eff8ed",
      backgroundColor: "rgba(10, 23, 34, 0.84)",
      padding: { x: 18, y: 10 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(50).setVisible(false);

    this.helpText = this.add.text(28, 608, "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "15px",
      color: "#dfe8e4"
    }).setScrollFactor(0).setDepth(50).setVisible(false);

    this.shieldVisual = this.add.circle(this.player.x, this.player.y, 42, 0xfff1a8, 0.16)
      .setStrokeStyle(3, 0xfff1a8, 0.52)
      .setDepth(26)
      .setVisible(false);
  }

  createPlatform(data) {
    const color = data.kind === "ground" ? 0x4e5751 : data.mode === "shadow" ? 0x3b1820 : 0xe8d79b;
    const rect = this.add.rectangle(data.x + data.w / 2, data.y + data.h / 2, data.w, data.h, color).setDepth(5);
    rect.setStrokeStyle(2, data.mode === "shadow" ? 0xff7048 : data.mode === "light" ? 0xfff1a8 : 0x8fa29c, 0.88);
    this.physics.add.existing(rect, true);
    rect.body.setSize(data.w, data.h);
    rect.body.updateFromGameObject();
    return { ...data, bodyHost: rect };
  }

  createHazard(data) {
    const zone = this.add.zone(data.x + data.w / 2, data.y + data.h / 2, data.w, data.h);
    this.physics.add.existing(zone, true);
    const art = this.add.graphics().setDepth(8);
    return { ...data, zone, art };
  }

  createCrystal(data) {
    const sprite = this.physics.add.sprite(data.x, data.y, data.mode === "shadow" ? "crystal-shadow" : "crystal-light");
    sprite.body.allowGravity = false;
    sprite.setDisplaySize(32, 40).setDepth(12);
    sprite.setData("model", { ...data, taken: false });
    return { ...data, sprite, taken: false };
  }

  createEnemy(data) {
    const art = window.LiangyiEnemyArt;
    const design = art.species[data.species];
    const footY = data.y + data.h / 2 + 3;
    const sprite = this.physics.add.sprite(data.x, footY, design.texture);
    sprite.setOrigin(0.5, art.footBaseline / art.frameSize);
    sprite.setDisplaySize(design.displaySize, design.displaySize);
    const bodyWidth = (data.w - 6) / sprite.scaleX;
    const bodyHeight = (data.h - 4) / sprite.scaleY;
    sprite.body.setSize(bodyWidth, bodyHeight, false);
    sprite.body.setOffset((art.frameSize - bodyWidth) / 2, art.footBaseline - bodyHeight);
    sprite.setFlipX(data.vx < 0);
    sprite.play(design.animation);
    sprite.setDepth(16);
    sprite.body.allowGravity = false;
    sprite.body.setImmovable(true);
    sprite.setData("model", { ...data });
    const hpBack = this.add.rectangle(data.x, data.y - 30, 54, 6, 0x080a10, 0.76).setDepth(30);
    const hpBar = this.add.rectangle(data.x - 27, data.y - 30, 54, 6, 0xcf7968, 1).setOrigin(0, 0.5).setDepth(31);
    const weaknessLabel = this.add.text(data.x, data.y - 46, data.weakness === "shadow" ? "弱点 · 阴" : "弱点 · 阳", {
      fontFamily: "system-ui, sans-serif", fontSize: "11px",
      color: data.weakness === "shadow" ? "#d6c7fa" : "#dcefc6",
      backgroundColor: "#142234", padding: { x: 5, y: 3 }
    }).setOrigin(0.5).setDepth(32);
    return { ...data, sprite, hpBack, hpBar, weaknessLabel, hitTimer: 0 };
  }

  createGate(data) {
    const sprite = this.physics.add.sprite(data.x + data.w / 2, data.y + data.h / 2, "white");
    sprite.setDisplaySize(data.w, data.h).setTint(data.mode === "shadow" ? 0x28393d : 0x304b4d).setDepth(7);
    sprite.body.allowGravity = false;
    sprite.body.setImmovable(true);
    sprite.setData("model", { ...data, maxHp: data.hp });
    const labelText = this.add.text(data.x + data.w / 2, data.y - 18, data.weakness === "shadow" ? "阴面破封" : "阳面破封", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "13px",
      color: "#fff1a8"
    }).setOrigin(0.5).setDepth(32);
    return { ...data, sprite, labelText };
  }

  createBoss(data) {
    const design = window.LiangyiZodiacArt.bosses[data.id];
    const sprite = this.physics.add.sprite(data.x, data.y, design.texture).setDepth(18);
    const hpBack = this.add.rectangle(576, 82, 360, 10, 0x101c22, .9).setScrollFactor(0).setDepth(70);
    const hpBar = this.add.rectangle(396, 82, 360, 10, data.color).setOrigin(0, .5).setScrollFactor(0).setDepth(71);
    const label = this.add.text(576, 58, data.name, {
      fontFamily: '"Songti SC", serif', fontSize: "17px", color: "#f3e2b7"
    }).setOrigin(.5).setScrollFactor(0).setDepth(72);
    const boss = { ...data, sprite, hpBack, hpBar, label, active: true };
    this.configureBoss(boss, data);
    return boss;
  }

  configureBoss(boss, data) {
    const art = window.LiangyiZodiacArt, design = art.bosses[data.id], sprite = boss.sprite;
    Object.assign(boss, data);
    sprite.setTexture(design.texture).setOrigin(.5, art.footBaseline / art.frameSize);
    sprite.setDisplaySize(design.displaySize, design.displaySize);
    const w = data.w / sprite.scaleX, h = data.h / sprite.scaleY;
    sprite.body.setSize(w, h, false).setOffset((art.frameSize - w) / 2, art.footBaseline - h);
    sprite.body.allowGravity = false;
    sprite.body.setImmovable(true);
    sprite.enableBody(true, data.x, data.y, true, true).setVelocity(0, 0).clearTint();
    sprite.setData("model", { ...data, phaseIndex: 0, attackTimer: 1.6, entered: false, volley: 0 });
    sprite.play(design.animation);
    boss.hpBar.setFillStyle(data.color);
    boss.hpBack.setVisible(false); boss.hpBar.setVisible(false); boss.label.setVisible(false);
  }

  createPortal(data) {
    const zone = this.add.zone(data.x + data.w / 2, data.y + data.h / 2, data.w, data.h);
    this.physics.add.existing(zone, true);
    const art = this.add.graphics().setDepth(7);
    return { ...data, zone, art };
  }

  createHudHooks() {
    const extraIds = { help: "help-panel", helpToggle: "help-toggle", chapter: "chapter-label", guide: "guide-text", progress: "journey-progress", dashStatus: "dash-status", skillStatus: "skill-status" };
    this.hud = Object.fromEntries(Object.entries({ ...HUD_IDS, ...extraIds }).map(([key, id]) => [key, dom(id)]));
    this.touchButtons = [...document.querySelectorAll(".touch-controls button")];
    // Cache the nodes updateHud touches every frame; querying them per frame forces
    // the browser to re-match selectors 60 times a second for values that rarely change.
    this.cachedNodes = {
      gameRoot: dom("game-root"),
      touchControls: document.querySelector(".touch-controls"),
      lowMeter: this.hud.mpBar?.closest(".meter") || null
    };
    this.hud.start.addEventListener("click", () => {
      this.audio.unlock();
      this.resetGame(true);
    });
    const changeMode = action => { action(); this.focusGame(); };
    this.hud.lightScene.addEventListener("click", () => changeMode(() => this.switchScene("light")));
    this.hud.shadowScene.addEventListener("click", () => changeMode(() => this.switchScene("shadow")));
    this.hud.lightForm.addEventListener("click", () => changeMode(() => this.switchForm("light")));
    this.hud.shadowForm.addEventListener("click", () => changeMode(() => this.switchForm("shadow")));
    this.hud.pause.addEventListener("click", () => this.togglePause());
    dom("resume").addEventListener("click", () => this.togglePause());
    dom("pause-restart").addEventListener("click", () => this.resetGame(true));
    dom("sound-toggle")?.addEventListener("click", () => {
      this.preferences.muted = !this.preferences.muted;
      this.audio.unlock();
      this.syncPreferences();
      this.focusGame();
    });
    dom("motion-toggle")?.addEventListener("click", () => {
      this.preferences.reducedMotion = !this.preferences.reducedMotion;
      this.syncPreferences();
      this.focusGame();
    });
    dom("skin-toggle")?.addEventListener("click", () => {
      const index = SKINS.findIndex(item => item.id === this.preferences.skin);
      this.preferences.skin = SKINS[(index + 1) % SKINS.length].id;
      this.syncPreferences();
      this.focusGame();
    });
    this.hud.helpToggle?.addEventListener("click", () => this.helpOpen ? this.closeHelp() : this.openHelp());
    dom("help-close")?.addEventListener("click", () => this.closeHelp());
    this.syncPreferences();
    // Only the top visible, non-inert dialog participates in the focus loop.
    const trapDialogFocus = event => {
      if (event.key !== "Tab" || this.chapterPickerOpen || this.runeEquipmentOpen) return;
      const panels = [...document.querySelectorAll('.overlay:not(.hidden)[role="dialog"]')];
      const panel = panels.filter(element => !element.closest('[inert], [aria-hidden="true"]')).at(-1);
      if (!panel) return;
      const controls = [...panel.querySelectorAll('button:not(:disabled), a[href], [tabindex="0"]')]
        .filter(element => !element.closest('[inert], [hidden], .hidden, [aria-hidden="true"]') && element.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (!first) return;
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", trapDialogFocus);
    this.events.once("shutdown", () => document.removeEventListener("keydown", trapDialogFocus));
    this.hud.start.focus({ preventScroll: true });
  }

  readCampaign() {
    try {
      const value = JSON.parse(localStorage.getItem("liangyi-zodiac-progress-v1") || "[]");
      return new Set(Array.isArray(value) ? value.filter(id => window.LIANGYI_ZODIAC.some(z => z.id === id)) : []);
    } catch { return new Set(); }
  }

  getRuneLoadouts() {
    return this.runeStore?.getLoadouts() || { light: Array(6).fill(null), shadow: Array(6).fill(null) };
  }

  getRuneEquipmentState() {
    const state = this.runeStore?.state;
    const nearbyEnemy = this.enemies?.some(enemy => enemy.sprite.active &&
      this.isActiveMode(enemy) && Math.abs(enemy.sprite.x - this.player.x) < 360 &&
      Math.abs(enemy.sprite.y - this.player.y) < 150);
    const bossCombat = this.boss?.sprite.active && this.player.x >= this.level.arenaStart;
    const threatened = nearbyEnemy || bossCombat || this.bossThreats?.length > 0;
    const nearStart = Math.abs(this.player.x - this.level.start.x) < 150;
    const nearLamp = this.checkpoint.x > this.level.start.x &&
      Math.abs(this.player.x - this.checkpoint.x) < 170 &&
      Math.abs(this.player.y - this.checkpoint.y) < 130;
    const settled = this.boss?.sprite.getData("model").hp <= 0;
    const safe = !this.lost && (this.practiceMode || this.won || !this.running ||
      (!threatened && (nearStart || nearLamp || settled)));
    return {
      safe, practice: Boolean(this.practiceMode), inventory: { ...state?.inventory }, ink: state?.ink || 0,
      persistent: Boolean(this.runeStore?.persistent), warning: this.runeStore?.warning || "",
      reason: this.lost ? "魂灯续行后再换装；死亡不会丢失已获得符文。" :
        this.practiceMode ? "演武试装：全部符文可用，返回历练恢复正式配装。" :
        safe ? "可确认装备。生命、灵力与技能冷却保留。" :
        "当前可编辑草案；回到已点亮的长明灯并清理周围敌人，或击败元辰后确认。"
    };
  }

  beginRuneEquipment() {
    if (this.runeEquipmentOpen) return;
    if (this.chapterPickerOpen) this.closeChapterPicker(false);
    if (this.helpOpen) this.closeHelp();
    this.runeEquipmentWasPaused = this.paused;
    this.runeEquipmentOpen = true;
    this.clearInput();
    this.paused = true;
    this.time.paused = true;
    this.physics.world.pause();
    this.tweens.pauseAll();
    this.player.anims.pause();
    this.pauseEnemyAnimations(true);
    this.updateHud();
  }

  endRuneEquipment() {
    if (!this.runeEquipmentOpen) return;
    this.runeEquipmentOpen = false;
    this.clearInput();
    this.paused = Boolean(this.runeEquipmentWasPaused);
    if (!this.paused && this.running && !this.won && !this.lost) {
      this.time.paused = false;
      this.physics.world.resume();
      this.tweens.resumeAll();
      this.player.anims.resume();
      this.pauseEnemyAnimations(false);
    }
    this.updateHud();
  }

  applyRuneLoadouts(loadouts) {
    const availability = this.getRuneEquipmentState();
    if (!availability.safe) return { ok: false, error: availability.reason };
    const result = this.runeStore.equip(loadouts);
    if (result.ok) {
      this.cancelRuneAttack?.();
      this.syncRuneCombatSide?.();
      this.updateHud();
      this.showMessage(this.practiceMode ? "演武配装已生效" : "六道配装已生效", 1800);
    }
    return result;
  }

  createChapterJournal() {
    const journal = dom("zodiac-journal");
    if (!journal) return;
    journal.innerHTML = window.LIANGYI_ZODIAC.map((z, i) =>
      `<button type="button" class="zodiac-node" data-chapter="${i}" aria-label="第${i + 1}章 ${z.name}，${z.chapterName}"><span class="zodiac-order">${z.branch}</span><span class="zodiac-animal">${z.animal}</span></button>`
    ).join("") + '<div class="zodiac-caption"><span id="zodiac-summary"></span><button type="button" class="zodiac-practice" id="zodiac-practice">演武 · 直面元辰</button></div>';
    const picker = dom("chapter-options");
    if (picker) picker.innerHTML = window.LIANGYI_ZODIAC.map((z, i) =>
      `<button type="button" class="zodiac-node" data-chapter="${i}" aria-label="开始第${i + 1}章 ${z.name}，${z.chapterName}"><span class="zodiac-animal">${z.branch}${z.animal}</span><strong>${z.name}</strong><small>${z.chapterName}</small></button>`
    ).join("");
    [journal, picker].filter(Boolean).forEach(container => container.querySelectorAll("[data-chapter]").forEach(button => button.addEventListener("click", () => {
      this.closeChapterPicker(false);
      this.selectChapter(Number(button.dataset.chapter));
    })));
    dom("zodiac-practice").addEventListener("click", () => this.selectChapter(this.chapterIndex, true));
    document.querySelectorAll("[data-open-chapters]").forEach(button => button.addEventListener("click", () => this.openChapterPicker()));
    dom("chapter-close")?.addEventListener("click", () => this.closeChapterPicker());
    dom("chapter-panel")?.addEventListener("cancel", event => { event.preventDefault(); this.closeChapterPicker(); });
    // Keep browser button/Tab behavior inside the native modal; gameplay captures
    // such as Space and R must not consume these keys or restart a paused run.
    ["keydown", "keyup"].forEach(type => dom("chapter-panel")?.addEventListener(type, event => event.stopPropagation()));
    this.refreshChapterJournal();
  }

  openChapterPicker() {
    const panel = dom("chapter-panel");
    if (!panel || this.chapterPickerOpen) return;
    this.chapterPickerReturnFocus = document.activeElement;
    if (this.running && !this.paused && !this.won && !this.lost) this.togglePause();
    this.chapterPickerOpen = true;
    this.clearInput();
    this.refreshChapterJournal();
    panel.showModal();
    panel.querySelector(`[data-chapter="${this.chapterIndex}"]`)?.focus({ preventScroll: true });
  }

  closeChapterPicker(restoreFocus = true) {
    if (!this.chapterPickerOpen) return;
    this.chapterPickerOpen = false;
    dom("chapter-panel")?.close();
    if (restoreFocus) this.chapterPickerReturnFocus?.focus({ preventScroll: true });
    this.chapterPickerReturnFocus = null;
  }

  refreshChapterJournal() {
    const journal = dom("zodiac-journal");
    if (!journal) return;
    [journal, dom("chapter-options")].filter(Boolean).forEach(container => container.querySelectorAll("[data-chapter]").forEach(button => {
      const i = Number(button.dataset.chapter), complete = this.completedZodiacs.has(window.LIANGYI_ZODIAC[i].id);
      button.classList.toggle("active", i === this.chapterIndex);
      button.classList.toggle("completed", complete);
      button.setAttribute("aria-pressed", String(i === this.chapterIndex));
      button.title = `${window.LIANGYI_ZODIAC[i].name} · ${complete ? "已归位，可再挑战" : "点击开始本章"}`;
    }));
    dom("zodiac-summary").textContent = `${this.level.chapterName} · 元辰归位 ${this.completedZodiacs.size}/12${this.practiceMode ? " · 演武不计通关" : ""}`;
  }

  selectChapter(index, practice = false) {
    if (!window.LIANGYI_ZODIAC[index]) return;
    this.runeUI?.close();
    if (this.formalRuneStore) {
      if (practice && !this.practiceMode) this.practiceRuneStore = window.LiangyiRuneStore.createPractice(this.formalRuneStore.getLoadouts());
      this.runeStore = practice ? this.practiceRuneStore : this.formalRuneStore;
    }
    this.audio.unlock();
    this.chapterIndex = index;
    this.practiceMode = practice;
    this.level = window.createLiangyiChapter(index);
    const place = (sprite, data) => {
      sprite.setPosition(data.x + data.w / 2, data.y + data.h / 2).setDisplaySize(data.w, data.h);
      sprite.body.updateFromGameObject();
    };
    this.platforms.forEach((p, i) => { Object.assign(p, this.level.platforms[i]); place(p.bodyHost, p); });
    this.hazards.forEach((h, i) => { Object.assign(h, this.level.hazards[i]); place(h.zone, h); });
    this.crystals.forEach((c, i) => {
      Object.assign(c, this.level.crystals[i]);
      c.sprite.setTexture(`crystal-${c.mode}`).setData("model", { ...this.level.crystals[i], taken: false });
    });
    this.terrainMode = this.hazardMode = null;
    this.resetGame(true);
    this.refreshChapterJournal();
  }

  readPreferences() {
    const defaults = { muted: false, reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false, skin: SKINS[0].id };
    try {
      // Read the current key first, then fall back to the legacy one so players who
      // saved preferences before the rename keep their sound and motion settings.
      const stored = JSON.parse(localStorage.getItem("liangyi-preferences") || localStorage.getItem("shadow-jump-preferences") || "{}");
      return {
        muted: typeof stored?.muted === "boolean" ? stored.muted : defaults.muted,
        reducedMotion: typeof stored?.reducedMotion === "boolean" ? stored.reducedMotion : defaults.reducedMotion,
        skin: SKINS.some(item => item.id === stored?.skin) ? stored.skin : defaults.skin
      };
    } catch { return defaults; }
  }

  syncPreferences() {
    try {
      localStorage.setItem("liangyi-preferences", JSON.stringify(this.preferences));
      localStorage.removeItem("shadow-jump-preferences");
    } catch { /* Storage may be unavailable in private browsing. */ }
    document.body?.classList.toggle("reduce-motion", this.preferences.reducedMotion);
    this.audio.muted = this.preferences.muted;
    const skin = SKINS.find(item => item.id === this.preferences.skin) || SKINS[0];
    // Guarded because lightweight test harnesses provide only part of `document`.
    const root = document.documentElement;
    if (root?.dataset) root.dataset.skin = skin.id;
    const themeMeta = document.querySelector?.('meta[name="theme-color"]');
    if (themeMeta?.setAttribute) themeMeta.setAttribute("content", skin.theme);
    const sound = dom("sound-toggle"), motion = dom("motion-toggle"), skinButton = dom("skin-toggle");
    if (sound) {
      sound.textContent = this.preferences.muted ? "音效 关" : "音效 开";
      sound.setAttribute("aria-pressed", String(!this.preferences.muted));
    }
    if (motion) {
      motion.textContent = this.preferences.reducedMotion ? "动态 柔和" : "动态 完整";
      motion.setAttribute("aria-pressed", String(this.preferences.reducedMotion));
    }
    if (skinButton) {
      skinButton.textContent = `风格 · ${skin.label}`;
      skinButton.setAttribute("aria-label", `切换界面风格，当前为${skin.label}`);
      skinButton.title = "切换界面风格：青玉 / 玄墨 / 赤霞";
    }
  }

  openHelp() {
    if (this.helpOpen || !this.hud.help) return;
    this.helpWasRunning = this.running && !this.paused && !this.won && !this.lost;
    if (this.helpWasRunning) this.togglePause();
    this.helpOpen = true;
    this.clearInput();
    this.hud.help.classList.remove("hidden");
    this.hud.pauseOverlay.classList.add("hidden");
    this.updateHud();
    dom("help-close")?.focus({ preventScroll: true });
  }

  closeHelp() {
    if (!this.helpOpen) return;
    const resumeJourney = this.helpWasRunning;
    this.helpOpen = false;
    this.helpWasRunning = false;
    this.hud.help?.classList.add("hidden");
    if (resumeJourney && this.running) this.togglePause();
    else {
      this.hud.pauseOverlay.classList.toggle("hidden", !this.paused);
      this.updateHud();
      if (this.paused) dom("resume")?.focus({ preventScroll: true });
      else if (!this.running) this.hud.overlay.querySelector("button")?.focus({ preventScroll: true });
      else this.focusGame();
    }
  }

  focusGame() {
    if (!this.running || this.paused || this.helpOpen || this.won || this.lost) return;
    const canvas = this.game.canvas;
    if (!canvas) return;
    const root = dom("game-root");
    if (root) root.inert = false;
    canvas.setAttribute("tabindex", "0");
    canvas.setAttribute("aria-label", "天庭地府游戏画面；A D 移动，K 跳跃，J 攻击，P 暂停");
    canvas.focus({ preventScroll: true });
  }

  shake(duration, strength) {
    if (!this.preferences?.reducedMotion) this.cameras.main.shake(duration, strength);
  }

  resetGame(startRunning) {
    this.runeUI?.close();
    this.clearBossAttacks();
    this.time.removeAllEvents();
    this.time.paused = false;
    this.tweens.resumeAll();
    this.tweens.killAll();
    this.player.anims.resume();
    this.paused = false;
    this.helpOpen = false;
    this.hud.help?.classList.add("hidden");
    this.hud.pauseOverlay.classList.add("hidden");
    this.clearInput();
    this.sceneMode = this.level.startMode || "light";
    this.formMode = this.sceneMode;
    this.levelValue = 1;
    this.xp = 0;
    this.nextXp = 60;
    this.maxHp = 100;
    this.maxMp = 100;
    this.hp = this.maxHp;
    this.mp = this.maxMp;
    this.crystalCount = 0;
    this.running = startRunning;
    this.won = false;
    this.lost = false;
    this.lockTimer = 0;
    this.invulnTimer = 0;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.attackCooldown = 0;
    this.skillCooldown = 0;
    this.shieldTimer = 0;
    this.switchTimer = 0;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.jumpsUsed = 0;
    this.wasGrounded = false;
    this.trailTimer = 0;
    this.runTime = 0;
    this.fallCount = 0;
    this.checkpoint = { ...this.level.start };
    this.runeInstanceId = this.runeStore?.createInstance(window.LIANGYI_ZODIAC[this.chapterIndex].id);
    this.initRuneCombat?.();

    this.player?.setPosition(this.level.start.x, this.level.start.y);
    this.player?.setVelocity(0, 0);
    this.player?.setFlipX(false);
    this.player?.setAlpha(1);
    this.player.body.setAccelerationX(0);
    this.applyPlayerArt();

    this.crystals?.forEach((crystal, index) => {
      crystal.taken = false;
      crystal.sprite.enableBody(true, this.level.crystals[index].x, this.level.crystals[index].y, true, true);
    });

    this.enemies?.forEach((enemy, index) => {
      Object.assign(enemy, this.level.enemies[index], { hitTimer: 0 });
      enemy.sprite.enableBody(true, enemy.x, enemy.y + enemy.h / 2 + 3, true, true);
      enemy.sprite.setData("model", { ...this.level.enemies[index] });
      enemy.sprite.setTint(0xffffff);
      enemy.weaknessLabel?.setText(enemy.weakness === "shadow" ? "弱点 · 阴" : "弱点 · 阳");
      enemy.sprite.setFlipX(enemy.vx < 0);
      enemy.sprite.play(window.LiangyiEnemyArt.species[enemy.species].animation);
    });

    this.gates?.forEach((gate, index) => {
      const source = this.level.gates[index];
      Object.assign(gate, {
        x: source.x,
        y: source.y,
        w: source.w,
        h: source.h,
        mode: source.mode,
        hp: source.hp,
        weakness: source.weakness
      });
      gate.sprite.enableBody(true, source.x + source.w / 2, source.y + source.h / 2, true, true);
      gate.sprite.setData("model", { ...source, maxHp: source.hp });
      gate.sprite.setAlpha(1);
      gate.labelText.setPosition(source.x + source.w / 2, source.y - 18).setVisible(true);
    });

    if (this.boss) this.configureBoss(this.boss, this.level.boss);
    if (this.practiceMode) {
      this.checkpoint = { x: this.level.arenaStart + 130, y: 500 };
      this.player.body.reset(this.checkpoint.x, this.checkpoint.y);
      // Training awards no chapter stamp. Hide exploration objects behind the arena.
      this.crystals.forEach(crystal => { crystal.taken = true; crystal.sprite.disableBody(true, true); });
      this.enemies.forEach(enemy => { enemy.sprite.getData("model").hp = 0; enemy.sprite.disableBody(true, true); });
    }
    this.cameras.main.centerOn(this.player.x + 130, this.player.y - 60);

    this.projectiles?.clear(true, true);
    this.effects?.clear(true, true);
    this.applyModeVisibility();
    this.refreshChapterJournal();
    this.updateHud();
    this.showMessage(this.practiceMode ? "演武：试招不计通关。留意预警，L 换形应对弱点" : `${this.level.chapterName || "两界之旅"} · 收集五枚灵印，赴元辰坛`, 2600);
    if (startRunning) this.physics.world.resume();
    else this.physics.world.pause();
    if (startRunning) this.hideMenu();
    if (startRunning) this.focusGame();
  }

  showMenu() {
    this.hud.overlay.classList.remove("hidden");
  }

  hideMenu() {
    this.hud.overlay.classList.add("hidden");
  }

  applyPlayerArt() {
    if (!this.player) return;
    const light = this.formMode === "light";
    this.player.setTexture(light ? "hero-light" : "hero-shadow");
    this.player.setDisplaySize(112, 112);
    // Arcade 的尺寸使用贴图坐标，按缩放换算，保证两种形态的碰撞框一致。
    const bodyWidth = 28 / this.player.scaleX;
    const bodyHeight = 54 / this.player.scaleY;
    this.player.setSize(bodyWidth, bodyHeight).setOffset(
      (this.player.width - bodyWidth) / 2,
      window.LiangyiArt.footBaseline - bodyHeight
    );
    this.isAttacking = false;
    this.isDashing = false;
    this.player.anims.play(`${this.formMode}-idle`, true);
  }

  getStats() {
    return {
      level: this.levelValue,
      rangedDamage: 15 + this.levelValue * 2 + this.equipment.lightBlade.rangedDamage,
      meleeDamage: 22 + this.levelValue * 2,
      skillPower: 1 + (this.levelValue - 1) * 0.08,
      speedBonus: this.equipment.shadowBoots.speedBonus,
      dashBonus: this.equipment.shadowBoots.dashBonus,
      mpRegen: this.equipment.soulVessel.mpRegen,
      reverseDrainReduction: this.equipment.soulVessel.reverseDrainReduction,
      critChance: this.equipment.lightBlade.critChance
    };
  }

  getFormStats() {
    const base = FORM[this.formMode];
    const stats = this.getStats();
    return {
      ...base,
      speed: base.speed + (this.formMode === "shadow" ? stats.speedBonus : Math.floor(stats.speedBonus * 0.35)),
      dashSpeed: base.dashSpeed + (this.formMode === "shadow" ? stats.dashBonus : Math.floor(stats.dashBonus * 0.4))
    };
  }

  addXp(amount, reason) {
    this.xp += amount;
    while (this.xp >= this.nextXp) {
      this.xp -= this.nextXp;
      this.levelValue += 1;
      this.nextXp = Math.floor(this.nextXp * 1.45 + 20);
      this.maxHp += 12;
      this.maxMp += 8;
      this.hp = this.maxHp;
      this.mp = this.maxMp;
      this.audio.play("level");
      this.showMessage(`等级提升 Lv ${this.levelValue}`, 1500);
    }
    if (reason && amount > 0) this.floatText(this.player.x, this.player.y - 70, `+${amount} EXP`, 0x64d9d2);
  }

  floatText(x, y, text, color = 0xfff1a8) {
    const label = this.add.text(x, y, text, {
      fontFamily: "system-ui, sans-serif",
      fontSize: "15px",
      fontStyle: "800",
      color: `#${color.toString(16).padStart(6, "0")}`
    }).setOrigin(0.5).setDepth(80);
    this.effects.add(label);
    this.tweens.add({
      targets: label,
      y: y - 34,
      alpha: 0,
      duration: 720,
      onComplete: () => label.destroy()
    });
  }

  togglePause() {
    if (!this.running || this.won || this.lost || this.helpOpen) return;
    this.paused = !this.paused;
    this.clearInput();
    this.time.paused = this.paused;
    if (this.paused) {
      this.physics.world.pause();
      this.tweens.pauseAll();
      this.player.anims.pause();
    } else {
      this.physics.world.resume();
      this.tweens.resumeAll();
      this.player.anims.resume();
    }
    this.pauseEnemyAnimations(this.paused);
    this.hud.pauseOverlay.classList.toggle("hidden", !this.paused);
    this.updateHud();
    if (this.paused) dom("resume")?.focus({ preventScroll: true });
    else this.focusGame();
  }

  clearInput() {
    this.cancelRuneAttack?.();
    Object.keys(this.holdInput).forEach(key => { this.holdInput[key] = false; });
    this.actionPointers?.clear();
    this.input.keyboard.resetKeys();
    this.jumpBufferTimer = 0;
  }

  pauseEnemyAnimations(paused) {
    const guardian = this.boss?.sprite;
    if (guardian?.anims) {
      if (paused || !guardian.active) guardian.anims.pause();
      else guardian.anims.resume();
    }
    this.enemies?.forEach(({ sprite }) => {
      if (!sprite?.anims) return;
      if (paused || !sprite.active || !sprite.visible) sprite.anims.pause();
      else sprite.anims.resume();
    });
  }

  isGrounded() {
    const body = this.player.body;
    return (body.blocked.down || body.touching.down) && body.velocity.y >= 0;
  }

  update(time, deltaMs) {
    if (this.paused) return;
    const dt = Math.min(deltaMs / 1000, 0.034);
    this.visualTime += dt * 1000;
    time = this.preferences.reducedMotion ? 0 : this.visualTime;
    this.drawBackground(time);
    this.drawPlatformDetails(time);
    this.drawHazards();
    this.drawPortal(time);
    this.drawForeground(time);
    this.drawCheckpoints(time);
    this.drawWorldAccents(time);

    if (!this.running || this.won || this.lost) {
      this.updateFloatingUi(time);
      return;
    }

    this.runTime += dt;
    this.updateTimers(dt);
    this.tickRuneCombat?.(dt);
    this.updateResources(dt);
    this.updatePlayer(dt);
    if (!this.running) return;
    this.updateMotionFeedback(dt);
    this.updateEnemies(dt);
    this.updateBoss(dt);
    this.updateProjectiles(dt);
    this.updateCheckpoints();
    this.updateFloatingUi(time);
    this.updateHud();
  }

  updateTimers(dt) {
    this.lockTimer = Math.max(0, this.lockTimer - dt);
    this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    this.dashTimer = Math.max(0, this.dashTimer - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.skillCooldown = Math.max(0, this.skillCooldown - dt);
    this.shieldTimer = Math.max(0, this.shieldTimer - dt);
    this.messageTimer = Math.max(0, this.messageTimer - dt);
    this.switchTimer = Math.max(0, this.switchTimer - dt);
    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    this.isAttacking = this.attackCooldown > 0;
    this.isDashing = this.dashTimer > 0;
    this.messageText.setVisible(this.messageTimer > 0);
  }

  updateResources(dt) {
    this.mp += (this.sceneMode === this.formMode ? 6 : 4) * dt;
    this.mp = Phaser.Math.Clamp(this.mp, 0, this.maxMp);
  }

  updatePlayer(dt) {
    const body = this.player.body;
    const form = this.getFormStats();
    const left = this.keys.left.isDown || this.keys.arrowLeft.isDown || this.holdInput.left;
    const right = this.keys.right.isDown || this.keys.arrowRight.isDown || this.holdInput.right;

    body.setGravityY(1450 * (form.gravity - 1));
    body.setMaxVelocity(this.dashTimer > 0 ? form.dashSpeed : form.speed, form.maxFall);
    body.setDragX(form.drag);

    const grounded = this.isGrounded();
    if (grounded && !this.wasGrounded) this.emitMotes(this.player.x, body.bottom, FORM[this.formMode].color, 6, 26);
    this.wasGrounded = grounded;
    if (grounded) {
      this.jumpsUsed = 0;
      this.coyoteTimer = MOVEMENT.coyoteTime;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
      if (this.coyoteTimer <= 0 && this.jumpsUsed === 0) this.jumpsUsed = 1;
    }
    if (this.jumpBufferTimer > 0) this.tryJump();
    if (this.keys.attack.isDown || this.holdInput.attack) this.attack();

    if (this.lockTimer <= 0 && this.dashTimer <= 0) {
      if (left) {
        body.setAccelerationX(-form.accel);
        this.player.setFlipX(true);
      } else if (right) {
        body.setAccelerationX(form.accel);
        this.player.setFlipX(false);
      } else {
        body.setAccelerationX(0);
      }
    } else {
      body.setAccelerationX(0);
    }

    if (this.dashTimer > 0) {
      body.setVelocityX(this.dashDirection * form.dashSpeed);
      body.setVelocityY(body.velocity.y * Math.pow(0.72, dt * 60));
    }

    if (this.player.y > this.level.height + 180) {
      this.fallCount += 1;
      this.hurt(18, true);
      if (!this.lost) {
        this.sceneMode = this.level.startMode || "light";
        this.formMode = this.sceneMode;
        this.syncRuneCombatSide?.();
        this.dashTimer = 0;
        this.attackCooldown = 0;
        this.switchTimer = 0;
        this.shieldTimer = 0;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.jumpsUsed = 0;
        this.clearInput();
        this.applyPlayerArt();
        this.applyModeVisibility();
        body.reset(this.checkpoint.x, this.checkpoint.y);
        body.setVelocity(0, 0);
        this.cameras.main.centerOn(this.player.x + 130, this.player.y - 60);
        this.projectiles.clear(true, true);
        this.effects.clear(true, true);
        this.clearBossAttacks();
        this.wasGrounded = false;
        this.showMessage("已回到检查点，灵印与战斗进度保留", 1800);
      }
      return;
    }

    if (this.invulnTimer > 0) {
      this.player.setAlpha(this.preferences?.reducedMotion ? .65 : Math.floor(this.time.now / 110) % 2 ? 0.45 : 1);
    } else {
      this.player.setAlpha(1);
    }

    const action = this.lockTimer > 0 ? "hurt"
      : this.dashTimer > 0 ? "dash"
      : this.attackCooldown > 0 ? "attack"
      : this.switchTimer > 0 ? "switch"
      : !this.isGrounded() ? (body.velocity.y < 0 ? "jump" : "fall")
      : Math.abs(body.velocity.x) > 10 ? "walk" : "idle";
    const animKey = `${this.formMode}-${action}`;
    if (this.player.anims.currentAnim?.key !== animKey) this.player.anims.play(animKey);

    this.shieldVisual.setPosition(this.player.x, this.player.y - 4);
    this.shieldVisual.setVisible(this.shieldTimer > 0);
    if (this.shieldTimer > 0) {
      this.shieldVisual.setScale(this.preferences?.reducedMotion ? 1 : 1 + Math.sin(this.visualTime * 0.007) * 0.05);
    }
  }

  updateEnemies(dt) {
    for (const enemy of this.enemies) {
      const model = enemy.sprite.getData("model");
      if (!enemy.sprite.active || !this.isActiveMode(model)) continue;
      enemy.sprite.x += (model.vx * dt);
      if (enemy.sprite.x < model.min || enemy.sprite.x > model.max) {
        enemy.sprite.x = Phaser.Math.Clamp(enemy.sprite.x, model.min, model.max);
        model.vx *= -1;
        enemy.sprite.setFlipX(model.vx < 0);
      }
      enemy.sprite.body.updateFromGameObject();
      enemy.hitTimer = Math.max(0, enemy.hitTimer - dt);
      if (enemy.hitTimer <= 0) enemy.sprite.setTint(0xffffff);
    }
  }

  updateBoss(dt) {
    const sprite = this.boss.sprite, model = sprite.getData("model");
    const active = sprite.active && this.player.x >= this.level.arenaStart;
    this.boss.hpBack.setVisible(active); this.boss.hpBar.setVisible(active); this.boss.label.setVisible(active);
    if (!active) {
      if (model.entered) { this.clearBossAttacks(); model.entered = false; model.attackTimer = 1.6; }
      return;
    }
    if (!model.entered) {
      model.entered = true;
      this.showMessage(`${model.name} · ${model.telegraph}`, 3600);
    }
    const phase = model.phases[model.phaseIndex];
    this.boss.label.setText(`${model.name}  ·  ${phase.label}  ·  ${phase.weakness === "shadow" ? "弱点：阴" : "弱点：阳"}`);
    sprite.setFlipX(this.player.x < sprite.x);
    if (this.pendingBossAttack) {
      this.pendingBossAttack.remaining -= dt;
      if (this.pendingBossAttack.remaining <= 0) {
        const attack = this.pendingBossAttack;
        this.pendingBossAttack = null;
        this.bossWarning?.destroy(); this.bossWarning = null;
        this.executeBossAttack(attack);
      }
    }
    if (this.bossMotion) {
      const motion = this.bossMotion;
      motion.elapsed = Math.min(motion.duration, motion.elapsed + dt);
      const t = motion.elapsed / motion.duration;
      sprite.setPosition(motion.from + (motion.to - motion.from) * t,
        this.level.floorY - (motion.pattern === "leap" ? Math.sin(t * Math.PI) * 190 : 0));
      sprite.body.updateFromGameObject();
      if (t >= 1) {
        this.bossMotion = null;
        if (motion.pattern === "leap") {
          this.spawnBossOrb(sprite.x, this.level.floorY - 24, Math.PI, 245, 12);
          this.spawnBossOrb(sprite.x, this.level.floorY - 24, 0, 245, 12);
          this.motionRing(sprite.x, this.level.floorY, model.color);
          this.shake(130, .003);
        }
      }
    }
    this.updateBossThreats(dt);
    model.attackTimer -= dt;
    if (model.attackTimer <= 0 && !this.pendingBossAttack && !this.bossMotion) {
      this.queueBossAttack(phase.pattern);
      model.attackTimer = model.attackInterval + .85;
    }
  }

  clearBossAttacks() {
    this.pendingBossAttack = null;
    this.bossMotion = null;
    this.bossWarning?.destroy(); this.bossWarning = null;
    this.bossThreats?.forEach(threat => threat.art.destroy());
    this.bossThreats = [];
    this.bossEffects?.clear(true, true);
    const sprite = this.boss?.sprite;
    if (sprite?.body && this.level) {
      sprite.setY(this.level.floorY);
      sprite.body.updateFromGameObject();
    }
  }

  queueBossAttack(pattern) {
    const model = this.boss.sprite.getData("model"), sprite = this.boss.sprite;
    const targetX = Phaser.Math.Clamp(this.player.x, this.level.arenaStart + 60, this.level.arenaEnd - 60);
    const targetY = this.player.body.y + this.player.body.height / 2;
    const warmup = pattern === "charge" || pattern === "leap" ? .95 : .8;
    this.pendingBossAttack = { pattern, remaining: warmup, targetX, targetY };
    const g = this.add.graphics().setDepth(39);
    this.bossEffects.add(g); this.bossWarning = g;
    g.lineStyle(2, model.color, .8);
    if (pattern === "charge") {
      const destination = targetX < sprite.x ? this.level.arenaStart + 70 : this.level.arenaEnd - 70;
      this.pendingBossAttack.targetX = destination;
      const x = Math.min(sprite.x, destination), w = Math.abs(sprite.x - destination);
      g.fillStyle(model.color, .12).fillRect(x, this.level.floorY - 30, w, 30);
      for (let px = x; px < x + w; px += 38) g.lineBetween(px, 583, px + 20, 575);
    } else if (pattern === "leap") {
      g.strokeEllipse(targetX, this.level.floorY - 3, 150, 25);
      g.fillStyle(model.color, .13).fillEllipse(targetX, this.level.floorY - 3, 150, 25);
    } else if (pattern === "rain") {
      for (let i = -1; i <= 1; i++) {
        const x = Phaser.Math.Clamp(targetX + i * 180, this.level.arenaStart + 40, this.level.arenaEnd - 40);
        g.strokeEllipse(x, this.level.floorY - 3, 64, 18);
        g.lineStyle(1, model.color, .3).lineBetween(x, 265, x, this.level.floorY - 12);
      }
    } else {
      const angle = Math.atan2(targetY - (sprite.y - 65), targetX - sprite.x);
      g.strokeCircle(sprite.x, sprite.y - 65, 30);
      if (pattern !== "spiral") {
        g.lineStyle(1, model.color, .45).lineBetween(sprite.x, sprite.y - 65, targetX, targetY);
        g.strokeCircle(targetX, targetY, 15);
      }
      this.pendingBossAttack.angle = angle;
    }
    const hints = { aimed: "锁魂符 · 标记后横移或跳跃", fan: "散灵扇 · 拉开距离，跃过飞符", charge: "冲阵 · 蓄力后起跳越过", rain: "符雨 · 远离地面标记", leap: "飞扑 · 离开落点，落地后跳过冲击", spiral: "回旋灵流 · 拉开距离穿过间隙" };
    this.showMessage(hints[pattern], 1700);
  }

  executeBossAttack(attack) {
    if (!this.running || this.won || this.lost || !this.boss.sprite.active) return;
    const sprite = this.boss.sprite, model = sprite.getData("model"), x = sprite.x, y = sprite.y - 65;
    model.volley += 1;
    const speed = 225 + model.speed * .65;
    if (attack.pattern === "charge" || attack.pattern === "leap") {
      this.bossMotion = { pattern: attack.pattern, from: x, to: attack.targetX, elapsed: 0,
        duration: attack.pattern === "leap" ? 1.05 : Math.max(.7, Math.abs(x - attack.targetX) / (420 + model.speed)) };
    } else if (attack.pattern === "rain") {
      for (let i = -1; i <= 1; i++) {
        const rainX = Phaser.Math.Clamp(attack.targetX + i * 180, this.level.arenaStart + 40, this.level.arenaEnd - 40);
        this.spawnBossOrb(rainX, 265 - Math.abs(i) * 26, Math.PI / 2, 330, 16);
      }
    } else if (attack.pattern === "spiral") {
      for (let i = 0; i < 10; i++) this.spawnBossOrb(x, y, i * Math.PI * 2 / 10 + model.volley * .27, speed * .8, 10);
    } else if (attack.pattern === "fan") {
      for (let i = -2; i <= 2; i++) this.spawnBossOrb(x, y, attack.angle + i * .24, speed, 10);
    } else this.spawnBossOrb(x, y, attack.angle, speed * 1.15, 13);
  }

  spawnBossOrb(x, y, angle, speed, radius) {
    const color = this.boss.sprite.getData("model").color;
    const art = this.add.circle(x, y, radius, color, .7).setStrokeStyle(2, 0xf3e4bd, .8).setDepth(33);
    this.bossEffects.add(art);
    this.bossThreats.push({ art, x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius, life: 4.5 });
  }

  updateBossThreats(dt) {
    const body = this.player.body;
    this.bossThreats = this.bossThreats.filter(orb => {
      orb.x += orb.vx * dt; orb.y += orb.vy * dt; orb.life -= dt;
      orb.art.setPosition(orb.x, orb.y);
      const x = Phaser.Math.Clamp(orb.x, body.x, body.x + body.width);
      const y = Phaser.Math.Clamp(orb.y, body.y, body.y + body.height);
      const hit = Math.hypot(orb.x - x, orb.y - y) < orb.radius;
      if (hit) {
        this.runeIncomingAttack = { sourceX: orb.x, unblockable: true };
        try { this.hurt(14); } finally { this.runeIncomingAttack = null; }
      }
      if (hit || orb.life <= 0 || orb.y > this.level.floorY + 20 || orb.x < this.level.arenaStart - 100 || orb.x > this.level.width + 40) {
        orb.art.destroy(); return false;
      }
      return true;
    });
  }

  updateProjectiles(dt) {
    this.projectiles.getChildren().forEach(projectile => {
      if (!projectile.active) return;
      projectile.life -= dt;
      this.checkProjectileManualHit(projectile);
      if (!projectile.active) return;
      if (projectile.life <= 0 || Math.abs(projectile.x - this.player.x) > 950 || projectile.mode !== this.sceneMode) {
        projectile.destroy();
      }
    });
  }

  checkProjectileManualHit(projectile) {
    if (!projectile.active || projectile.mode !== this.sceneMode) return;
    const box = {
      x: projectile.x - projectile.displayWidth / 2 - 8,
      y: projectile.y - projectile.displayHeight / 2 - 10,
      w: projectile.displayWidth + 16,
      h: projectile.displayHeight + 20
    };

    for (const enemy of this.enemies) {
      const model = enemy.sprite.getData("model");
      if (!enemy.sprite.active || !this.isActiveMode(model)) continue;
      const enemyBox = {
        x: enemy.sprite.body.x,
        y: enemy.sprite.body.y,
        w: enemy.sprite.body.width,
        h: enemy.sprite.body.height
      };
      if (overlaps(box, enemyBox)) {
        this.projectileHit(projectile, enemy.sprite);
        return;
      }
    }

    for (const gate of this.gates) {
      const model = gate.sprite.getData("model");
      if (!gate.sprite.active || !this.isActiveMode(model)) continue;
      if (overlaps(box, { x: model.x, y: model.y, w: model.w, h: model.h })) {
        this.projectileGateHit(projectile, gate.sprite);
        return;
      }
    }

    if (this.boss.sprite.active && this.player.x >= this.level.arenaStart && overlaps(box, {
      x: this.boss.sprite.body.x,
      y: this.boss.sprite.body.y,
      w: this.boss.sprite.body.width,
      h: this.boss.sprite.body.height
    })) {
      this.projectileBossHit(projectile, this.boss.sprite);
    }
  }

  updateCheckpoints() {
    for (const checkpoint of this.level.checkpoints) {
      if (this.isGrounded() && this.player.y > this.level.floorY - 100 &&
          this.player.x >= checkpoint.x && this.player.x < checkpoint.x + 180 &&
          this.checkpoint.x < checkpoint.set.x) {
        this.checkpoint = { ...checkpoint.set };
        this.hp = Math.min(this.maxHp, this.hp + 25);
        this.mp = this.maxMp;
        this.audio.play("crystal");
        this.showMessage(`${checkpoint.label} · 恢复生命与灵力`, 1800);
      }
    }
  }

  updateFloatingUi(time) {
    for (const enemy of this.enemies) {
      const model = enemy.sprite.getData("model");
      const visible = enemy.sprite.active && this.isActiveMode(model);
      enemy.hpBack.setVisible(visible);
      enemy.hpBar.setVisible(visible);
      enemy.weaknessLabel.setVisible(visible);
      if (!visible) continue;
      const barY = enemy.sprite.y - enemy.sprite.displayHeight * enemy.sprite.originY - 2;
      enemy.hpBack.setPosition(enemy.sprite.x, barY);
      enemy.hpBar.setPosition(enemy.sprite.x - 27, barY);
      enemy.weaknessLabel.setPosition(enemy.sprite.x, barY - 17);
      enemy.hpBar.displayWidth = 54 * Math.max(0, model.hp / model.maxHp);
      enemy.hpBar.fillColor = model.hp / model.maxHp < 0.3 ? 0xffd34f : 0xcf7968;
    }

    const bossModel = this.boss.sprite.getData("model");
    this.boss.hpBar.displayWidth = 360 * Math.max(0, bossModel.hp / bossModel.maxHp);

    for (const crystal of this.crystals) {
      if (crystal.sprite.active) {
        crystal.sprite.y = crystal.y + Math.sin(time * 0.004 + crystal.x) * 5;
      }
    }

    // Phaser re-renders a Text texture on every setText call; skip identical hints.
    const help = this.helpTextForPosition();
    if (help !== this.lastHelpText) {
      this.lastHelpText = help;
      this.helpText.setText(help);
    }
  }

  helpTextForPosition() {
    if (this.player.x < 950) return "第一段：K 二段跳，轻按低跳、长按高跳；空格切场景找路。";
    if (this.player.x < 2150) return "第二段：L 切换阴阳配装；对准极性弱点破封。E 打开六道装备。";
    if (this.player.x < 3450) return "第三段：两界都能恢复灵力；青玉高跳缓降，朱砂擅长快速冲刺。";
    return "元辰坛：留意招式预警，按弱点换形出招。";
  }

  switchScene(nextMode, forced = false) {
    if (!forced && !this.canAct()) return;
    const target = nextMode || (this.sceneMode === "light" ? "shadow" : "light");
    if (target === this.sceneMode) return;
    this.sceneMode = target;
    this.shake(120, 0.004);
    this.applyModeVisibility();
    this.pushOutOfInactiveTerrain();
    this.showMessage(target === "light" ? "天庭展开" : "地府展开", 800);
    this.audio.play("switch");
  }

  switchForm(nextMode) {
    if (!this.canAct() || this.switchTimer > 0) return;
    const target = nextMode || (this.formMode === "light" ? "shadow" : "light");
    if (target === this.formMode) return;
    this.cancelRuneAttack?.();
    this.formMode = target;
    this.syncRuneCombatSide?.();
    this.applyPlayerArt();
    this.switchTimer = 0.6;
    this.burst(target);
    this.audio.play("switch");
    this.showMessage(`${target === "light" ? "阳面 · 青玉" : "阴面 · 朱砂"}：${this.getRuneWeapon?.().name || (target === "light" ? "飞剑" : "镇魂斩")}`, 1100);
  }

  jump() {
    if (!this.canAct()) return;
    this.jumpBufferTimer = MOVEMENT.jumpBuffer;
    this.tryJump();
  }

  tryJump() {
    if (!this.canAct() || this.jumpBufferTimer <= 0) return;
    const groundJump = this.isGrounded() || this.coyoteTimer > 0;
    if (!groundJump && this.jumpsUsed >= 2) return;
    const form = this.getFormStats();
    this.player.body.setVelocityY(-(groundJump ? form.jump : form.airJump));
    this.jumpsUsed = groundJump ? 1 : 2;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    if (!groundJump) this.motionRing(this.player.x, this.player.body.bottom - 4, FORM[this.formMode].color);
    this.audio.play("switch");
  }

  releaseJump() {
    if (!this.canAct()) return;
    const body = this.player.body;
    if (body.velocity.y < -MOVEMENT.jumpCutSpeed) body.setVelocityY(body.velocity.y * 0.55);
  }

  dash() {
    if (!this.canAct() || this.dashCooldown > 0 || this.isDashing) return;
    const form = this.getFormStats();
    const dir = this.player.flipX ? -1 : 1;
    this.isDashing = true;
    this.dashDirection = dir;
    this.player.body.setMaxVelocity(form.dashSpeed, form.maxFall);
    this.player.anims.play(`${this.formMode}-dash`, true);
    this.player.body.setVelocityX(dir * form.dashSpeed);
    this.player.body.setVelocityY(this.player.body.velocity.y * 0.35);
    this.dashTimer = form.dashTime / 1000;
    this.dashCooldown = form.dashCooldown / 1000;
    this.audio.play("slash");
  }

  attack() {
    if (!this.canAct() || this.attackCooldown > 0) return;
    this.isAttacking = true;
    this.player.anims.play(`${this.formMode}-attack`, true);
    if (this.formMode === "light") {
      this.fireProjectile(false);
      this.attackCooldown = 0.24;
      return;
    }
    this.melee(false);
    this.attackCooldown = 0.28;
  }

  skill() {
    if (!this.canAct() || this.skillCooldown > 0) return;
    const core = SPIRIT_CORES[this.formMode];
    if (this.mp < core.cost) {
      this.showMessage("灵力不足", 800);
      return;
    }
    this.mp -= core.cost;
    if (this.formMode === "light") {
      this.shieldTimer = 2.4;
      this.fireProjectile(true);
      this.showMessage(`灵格·${core.name}：${core.description}`, 1200);
    } else {
      this.dash();
      this.melee(true);
      this.showMessage(`灵格·${core.name}：${core.description}`, 1000);
    }
    this.audio.play("skill");
    this.skillCooldown = 0.72;
  }

  fireProjectile(powered) {
    const dir = this.player.flipX ? -1 : 1;
    const texture = this.sceneMode === "light" ? "feather-light" : "feather-shadow";
    const stats = this.getStats();
    const projectile = this.projectiles.create(this.player.x + dir * 34, this.player.y + 16, texture);
    projectile.body.allowGravity = false;
    projectile.setDisplaySize(powered ? 82 : 68, powered ? 38 : 32);
    projectile.body.setSize((powered ? 62 : 52) / projectile.scaleX, 18 / projectile.scaleY, true);
    projectile.setVelocityX(dir * (powered ? 760 : 610));
    projectile.setFlipX(dir < 0);
    const crit = Math.random() < stats.critChance;
    projectile.setData("damage", (powered ? stats.rangedDamage * 1.5 : stats.rangedDamage) * (crit ? 1.6 : 1));
    projectile.setData("form", "light");
    projectile.setData("crit", crit);
    projectile.mode = this.sceneMode;
    projectile.life = powered ? 1.4 : 1.1;
    projectile.setBlendMode(Phaser.BlendModes.ADD);
    projectile.setDepth(34);
    this.audio.play(powered ? "skill" : "shoot");
  }

  melee(powered) {
    const dir = this.player.flipX ? -1 : 1;
    const stats = this.getStats();
    const box = {
      x: this.player.x + (dir > 0 ? 12 : -(powered ? 150 : 124)),
      y: this.player.body.y - 12,
      w: powered ? 138 : 112,
      h: powered ? 92 : 76
    };
    const effect = this.add.image(this.player.x + dir * 40, this.player.y + 8, `slash-${this.formMode}`)
      .setFlipX(dir < 0)
      .setAlpha(0.9)
      .setDepth(40);
    this.effects.add(effect);
    this.tweens.add({ targets: effect, alpha: 0, scaleX: powered ? 1.5 : 1.15, scaleY: powered ? 1.4 : 1.1, duration: 170, onComplete: () => effect.destroy() });

    for (const enemy of this.enemies) {
      const model = enemy.sprite.getData("model");
      if (!enemy.sprite.active || !this.isActiveMode(model)) continue;
      const body = enemy.sprite.body;
      if (overlaps(box, { x: body.x, y: body.y, w: body.width, h: body.height })) {
        this.damageEnemy(enemy, (powered ? stats.meleeDamage * 1.55 : stats.meleeDamage) * stats.skillPower, "shadow");
      }
    }
    for (const gate of this.gates) {
      const model = gate.sprite.getData("model");
      if (!gate.sprite.active || !this.isActiveMode(model)) continue;
      if (overlaps(box, { x: model.x, y: model.y, w: model.w, h: model.h })) {
        this.damageGate(gate, "shadow");
      }
    }
    if (this.boss.sprite.active && this.player.x >= this.level.arenaStart && overlaps(box, {
      x: this.boss.sprite.body.x,
      y: this.boss.sprite.body.y,
      w: this.boss.sprite.body.width,
      h: this.boss.sprite.body.height
    })) {
      this.damageBoss((powered ? 34 : 24) * stats.skillPower, "shadow");
    }
    this.audio.play(powered ? "skill" : "slash");
  }

  projectileHit(projectile, enemySprite) {
    if (!projectile.active) return;
    const enemy = this.enemies.find(item => item.sprite === enemySprite);
    if (!enemy?.sprite.active || !this.isActiveMode(enemy) || projectile.mode !== this.sceneMode) return;
    this.damageEnemy(enemy, projectile.getData("damage"), projectile.getData("form"));
    projectile.destroy();
  }

  projectileGateHit(projectile, gateSprite) {
    if (!projectile.active) return;
    const gate = this.gates.find(item => item.sprite === gateSprite);
    if (!gate?.sprite.active || !this.isActiveMode(gate) || projectile.mode !== this.sceneMode) return;
    this.damageGate(gate, projectile.getData("form"));
    projectile.destroy();
  }

  projectileBossHit(projectile) {
    if (!projectile.active || !this.boss.sprite.active || this.player.x < this.level.arenaStart || projectile.mode !== this.sceneMode) return;
    this.damageBoss(projectile.getData("damage"), projectile.getData("form"));
    projectile.destroy();
  }

  damageEnemy(enemy, amount, form) {
    const model = enemy.sprite.getData("model");
    const finalDamage = model.weakness === form ? amount * 1.35 : amount * 0.7;
    model.hp -= finalDamage;
    enemy.hitTimer = 0.5;
    enemy.sprite.setTint(FORM[form].color);
    this.emitMotes(enemy.sprite.x, enemy.sprite.y - enemy.h / 2, FORM[form].color, 7, 40);
    enemy.sprite.x = Phaser.Math.Clamp(enemy.sprite.x + (this.player.flipX ? -12 : 12), model.min, model.max);
    enemy.sprite.body.updateFromGameObject();
    if (!this.runeStore) this.mp = Phaser.Math.Clamp(this.mp + 4, 0, this.maxMp);
    this.floatText(enemy.sprite.x, enemy.sprite.y - 42, `${Math.ceil(finalDamage)}`, FORM[form].color);
    this.audio.play("hit");
    if (model.hp <= 0) {
      enemy.sprite.anims.stop();
      enemy.sprite.disableBody(true, true);
      enemy.hpBack.setVisible(false);
      enemy.hpBar.setVisible(false);
      enemy.weaknessLabel.setVisible(false);
      // A short ring marks the kill so the last hit reads differently from a graze.
      this.motionRing?.(enemy.sprite.x, enemy.sprite.y, FORM[form].color);
      this.emitMotes(enemy.sprite.x, enemy.sprite.y, FORM[form].color, 12, 62);
      this.addXp(24, "enemy");
      this.showMessage(`${model.label} 已击倒`, 1000);
    }
  }

  damageGate(gate, form) {
    const model = gate.sprite.getData("model");
    if (model.weakness !== form) {
      this.showMessage(model.weakness === "shadow" ? "按 L 切阴面破门" : "按 L 切阳面净化", 900);
      return;
    }
    model.hp -= 1;
    this.emitMotes(gate.sprite.x, gate.sprite.y, FORM[form].color, 8, 44);
    gate.sprite.setAlpha(0.35 + model.hp / model.maxHp * 0.65);
    this.shake(90, 0.003);
    this.audio.play("hit");
    if (model.hp <= 0) {
      gate.sprite.disableBody(true, true);
      gate.labelText.setVisible(false);
      this.addXp(35, "gate");
      this.showMessage(`${model.label} 已解除`, 1100);
    }
  }

  damageBoss(amount, form) {
    const model = this.boss.sprite.getData("model");
    if (model.hp <= 0) return;
    const phase = model.phases[model.phaseIndex];
    if (phase.weakness !== form) {
      amount *= 0.45;
      this.showMessage(phase.weakness === "shadow" ? "护体减伤：按 L 切阴面可造成完整伤害" : "护体减伤：按 L 切阳面可造成完整伤害", 1000);
    }
    model.hp -= amount;
    if (!this.runeStore) this.mp = Phaser.Math.Clamp(this.mp + 8, 0, this.maxMp);
    this.shake(120, 0.004);
    this.floatText(this.boss.sprite.x, this.boss.sprite.y - 72, `${Math.ceil(amount)}`, FORM[form].color);
    this.emitMotes(this.boss.sprite.x, this.boss.sprite.y, FORM[form].color, 10, 54);
    this.audio.play("hit");
    if (model.hp <= 0) {
      this.clearBossAttacks();
      this.boss.sprite.anims.stop();
      this.boss.sprite.disableBody(true, true);
      this.boss.hpBack.setVisible(false); this.boss.hpBar.setVisible(false); this.boss.label.setVisible(false);
      this.addXp(120, "boss");
      const reward = this.runeStore?.reward(window.LIANGYI_ZODIAC[this.chapterIndex].id, this.runeInstanceId, this.practiceMode);
      const drop = reward?.awarded ? (reward.kind === "rune" ? `获得${window.LIANGYI_ZODIAC[this.chapterIndex].animal}符文 · 按 E 装备` : "符文已满 · 转为符墨") : "试炼通过，前往右侧两界门";
      this.showMessage(`${model.name} · ${drop}${reward?.awarded && !this.runeStore.persistent ? "（本次会话有效）" : ""}`, 4200);
      return;
    }
    if (model.hp <= model.maxHp * 0.5 && model.phaseIndex === 0) {
      this.clearBossAttacks();
      model.phaseIndex = 1;
      model.attackTimer = 1.8;
      const next = model.phases[1];
      // Awakening is a turning point: a cool flash plus ring reads as a realm shift.
      if (!this.preferences?.reducedMotion) this.cameras.main.flash?.(220, 120, 150, 210);
      this.motionRing?.(this.boss.sprite.x, this.boss.sprite.y, next.weakness === "light" ? 0xfff1a8 : 0xd58673);
      this.showMessage(`${model.name}觉醒 · 弱点改为${next.weakness === "light" ? "阳" : "阴"}，按 L 换形`, 2500);
    }
  }

  touchEnemy(enemySprite) {
    const enemy = this.enemies.find(item => item.sprite === enemySprite);
    if (!enemy?.sprite.active) return;
    this.hurt(12);
  }

  hurt(amount, ignoreInvulnerability = false) {
    if (!this.running || this.paused || (!ignoreInvulnerability && this.invulnTimer > 0) || this.won || this.lost) return;
    const final = this.shieldTimer > 0 ? amount * 0.35 : amount;
    this.hp = Phaser.Math.Clamp(this.hp - final, 0, this.maxHp);
    this.invulnTimer = 1.05;
    this.lockTimer = 0.18;
    this.dashTimer = 0;
    this.attackCooldown = 0;
    this.cancelRuneAttack?.();
    this.jumpBufferTimer = 0;
    this.shake(150, 0.006);
    // A brief warm flash sells the hit without adding any objects to the effect budget.
    if (!this.preferences?.reducedMotion) this.cameras.main.flash?.(90, 130, 42, 38);
    this.player.body.setVelocity(this.player.flipX ? 260 : -260, -360);
    this.audio.play("hurt");
    if (this.hp <= 0) {
      this.lost = true;
      this.running = false;
      const hasCheckpoint = this.checkpoint.x > this.level.start.x;
      this.showEnd("魂灯未灭", hasCheckpoint ? "检查点已保存，继续挑战会保留灵印与战斗进度。R 可从头开始。" : "你暂歇于两界之间。按 R 或点击按钮重新挑战。", hasCheckpoint ? "从检查点继续" : "重新开始");
    }
  }

  collectCrystal(sprite) {
    if (!this.running || this.paused || this.won || this.lost) return;
    const crystal = this.crystals.find(item => item.sprite === sprite);
    if (!crystal || crystal.taken || !this.isActiveMode(crystal)) return;
    crystal.taken = true;
    sprite.disableBody(true, true);
    this.crystalCount += 1;
    this.mp = Phaser.Math.Clamp(this.mp + 12, 0, this.maxMp);
    this.addXp(18, "crystal");
    this.audio.play("crystal");
    // Seal opens with a bright ring plus motes so pickup is unmistakable mid-jump.
    this.motionRing?.(sprite.x, sprite.y, FORM[this.sceneMode].color);
    this.emitMotes(sprite.x, sprite.y, FORM[this.sceneMode].color, 9, 38);
    this.showMessage(`获得元辰灵印 ${this.crystalCount}/${this.level.crystalsRequired}`, 1200);
  }

  tryPortal() {
    if (!this.running || this.paused || this.won || this.lost) return;
    if (!this.practiceMode && this.crystalCount < this.level.crystalsRequired) {
      this.showMessage(`还需要 ${this.level.crystalsRequired - this.crystalCount} 枚灵印`, 1000);
      return;
    }
    if (this.boss.sprite.active) {
      this.showMessage("元辰试炼未完成，两界门尚未开启", 1000);
      return;
    }
    this.won = true;
    this.running = false;
    const zodiac = window.LIANGYI_ZODIAC[this.chapterIndex];
    if (!this.practiceMode) {
      this.completedZodiacs.add(zodiac.id);
      try { localStorage.setItem("liangyi-zodiac-progress-v1", JSON.stringify([...this.completedZodiacs])); } catch { /* Completion remains available in this session. */ }
    }
    this.refreshChapterJournal();
    const all = this.completedZodiacs.size === 12;
    this.showEnd(this.practiceMode ? "演武完成" : all ? "十二元辰 · 归位" : `${zodiac.branch}${zodiac.animal}灵印归位`,
      this.practiceMode ? `${zodiac.name}的招式已领教。返回本章探索，收集灵印后即可记录通关。` : all ? "十二枚元辰印重归星盘，天庭云路复明，地府魂灯长亮。" : `${zodiac.lore} 本章已保存，可以继续下一位元辰。`,
      this.practiceMode ? "进入本章历练" : this.chapterIndex < 11 ? "前往下一元辰" : "重游子夜渡口");
  }

  burst(target) {
    const ring = this.add.circle(this.player.x, this.player.y, 18, FORM[target].color, 0.12).setStrokeStyle(2, FORM[target].color, .7).setDepth(35);
    this.effects.add(ring);
    this.tweens.add({ targets: ring, scale: this.preferences.reducedMotion ? 1.5 : 3.5, alpha: 0, duration: 260, onComplete: () => ring.destroy() });
  }

  canAct() {
    return this.running && !this.won && !this.lost && this.lockTimer <= 0 && !this.paused && !this.helpOpen && !this.runeEquipmentOpen;
  }

  isActiveMode(entity) {
    return !entity.mode || entity.mode === "both" || entity.mode === this.sceneMode;
  }

  applyModeVisibility() {
    this.platforms?.forEach(platform => {
      const active = this.isActiveMode(platform);
      platform.bodyHost.body.enable = active;
      platform.bodyHost.setAlpha(active ? 1 : 0.16);
      platform.bodyHost.setVisible(true);
    });

    this.hazards?.forEach(hazard => {
      const active = this.isActiveMode(hazard);
      hazard.zone.body.enable = active;
      hazard.art.setVisible(active);
    });

    this.crystals?.forEach(crystal => {
      const active = this.isActiveMode(crystal) && !crystal.taken;
      crystal.sprite.body.enable = active;
      crystal.sprite.setVisible(active);
    });

    this.enemies?.forEach(enemy => {
      const model = enemy.sprite.getData("model");
      const active = this.isActiveMode(model) && model.hp > 0;
      enemy.sprite.body.enable = active;
      enemy.sprite.setVisible(active);
      enemy.hpBack.setVisible(active);
      enemy.hpBar.setVisible(active);
      enemy.weaknessLabel.setVisible(active);
      if (active && this.running && !this.paused) enemy.sprite.anims.resume();
      else enemy.sprite.anims.pause();
    });

    this.gates?.forEach(gate => {
      const model = gate.sprite.getData("model");
      const active = this.isActiveMode(model) && model.hp > 0;
      gate.sprite.body.enable = active;
      gate.sprite.setVisible(active);
      gate.labelText.setVisible(active);
    });
  }

  pushOutOfInactiveTerrain() {
    const body = this.player.body;
    body.updateFromGameObject();
    const solids = [
      ...this.platforms.filter(p => this.isActiveMode(p)).map(p => ({ ...p, gate: false })),
      ...this.gates.filter(g => g.sprite.active && g.sprite.getData("model").hp > 0 && this.isActiveMode(g)).map(g => ({ ...g, gate: true }))
    ];
    // Resolve using the actual, offset Arcade body, synchronizing it immediately.
    // Recheck after moving: leaving a gate may place the feet inside a platform.
    for (let pass = 0; pass < solids.length + 1; pass++) {
      const box = { x: body.x, y: body.y, w: body.width, h: body.height };
      const solid = solids.find(s => overlaps(box, s));
      if (!solid) break;
      let dx = 0, dy = 0;
      if (solid.gate) {
        const left = solid.x - (box.x + box.w) - 1;
        const right = solid.x + solid.w - box.x + 1;
        dx = Math.abs(left) <= Math.abs(right) ? left : right;
      } else dy = solid.y - (box.y + box.h) - 1;
      const vx = body.velocity.x, vy = body.velocity.y;
      body.reset(this.player.x + dx, this.player.y + dy);
      body.setVelocity(dx ? 0 : vx, dy ? 0 : vy);
    }
  }

  emitMotes(x, y, color, count = 6, spread = 30) {
    if (this.effects.getLength() > 70) return;
    if (this.preferences?.reducedMotion) count = Math.min(2, count);
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI + i / Math.max(1, count - 1) * Math.PI;
      const distance = spread * (.5 + (i % 3) * .24);
      const mote = this.add.circle(x, y, 1.5 + i % 2, color, .8).setDepth(36);
      this.effects.add(mote);
      this.tweens.add({ targets: mote, x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance - 5,
        alpha: 0, scale: .25, duration: 250 + i * 24, ease: "Quad.Out", onComplete: () => mote.destroy() });
    }
  }

  motionRing(x, y, color) {
    const ring = this.add.ellipse(x, y, 26, 8).setStrokeStyle(2, color, .7).setDepth(22);
    this.effects.add(ring);
    this.tweens.add({ targets: ring, scaleX: this.preferences?.reducedMotion ? 1.3 : 2.4, scaleY: 1.6,
      alpha: 0, duration: 240, onComplete: () => ring.destroy() });
  }

  updateMotionFeedback(dt) {
    this.trailTimer = Math.max(0, this.trailTimer - dt);
    if (!this.isDashing || this.trailTimer > 0 || this.preferences.reducedMotion || this.effects.getLength() > 70) return;
    this.trailTimer = .045;
    const echo = this.add.image(this.player.x, this.player.y, this.player.texture.key, this.player.frame.name)
      .setOrigin(this.player.originX, this.player.originY)
      .setDisplaySize(this.player.displayWidth, this.player.displayHeight).setFlipX(this.player.flipX)
      .setTint(FORM[this.formMode].color).setAlpha(.28).setDepth(23);
    this.effects.add(echo);
    this.tweens.add({ targets: echo, alpha: 0, duration: 190, onComplete: () => echo.destroy() });
  }

  drawBackground(time) {
    const light = this.sceneMode === "light";
    const bgKey = `world-${this.sceneMode}`;
    if (this.bgImage.texture.key !== bgKey) {
      this.bgImage.setTexture(bgKey);
      this.ruinsImage.setTexture(`ruins-${this.sceneMode}`);
    }
    this.ruinsImage.tilePositionX = this.cameras.main.scrollX * .22;
    this.background.clear();
    const color = light ? 0xbef1cf : 0xcb8274;
    // A small, fixed particle budget avoids allocating objects every frame.
    for (let i = 0; i < 36; i++) {
      const x = ((i * 173 + Math.sin(time * .0004 + i) * 30 - this.cameras.main.scrollX * .35) % 1200 + 1200) % 1200;
      const y = 130 + (i * 67 % 430) + Math.sin(time * .001 + i) * 14;
      this.background.fillStyle(color, .12 + (Math.sin(time * .002 + i) + 1) * .13).fillCircle(x, y, i % 6 === 0 ? 2.3 : 1.1);
    }
    // Soft vertical light shafts from the moon keep the upper third from going flat.
    // Five flat fills per frame cost far less than a texture-backed shader would.
    // Positions wrap by the canvas width and are drawn twice so deep scroll never
    // leaves the left or right edge bare.
    const shaft = light ? 0xd6efc4 : 0xe4a68b;
    const drift = this.cameras.main.scrollX * .12;
    for (let i = 0; i < 5; i++) {
      const sway = Math.sin(time * .00007 + i * 1.7) * 34;
      const anchor = ((150 + i * 250 - drift + sway) % 1152 + 1152) % 1152;
      for (const base of [anchor, anchor - 1152]) {
        this.background.fillStyle(shaft, .035).fillTriangle(base - 70, 0, base + 70, 0, base + 210, 648);
        this.background.fillStyle(shaft, .022).fillTriangle(base - 26, 0, base + 26, 0, base + 120, 648);
      }
    }
    // Halo around the painted moon, breathing slowly so the sky never reads as a still image.
    const halo = 1 + Math.sin(time * .0006) * .06;
    this.background.fillStyle(light ? 0xfff4c8 : 0xe8f0d6, .05).fillCircle(824, 139, 96 * halo);
    this.background.fillStyle(light ? 0xfff4c8 : 0xe8f0d6, .035).fillCircle(824, 139, 140 * halo);
  }

  drawPlatformDetails() {
    if (this.terrainMode === this.sceneMode) return;
    this.terrainMode = this.sceneMode;
    const g = this.platformDetailLayer; g.clear();
    for (const p of this.platforms) {
      const active = this.isActiveMode(p), ground = p.kind === "ground";
      const underworld = p.mode === "shadow" || (p.mode === "both" && this.sceneMode === "shadow");
      const edge = underworld ? 0xba8d75 : 0xcbd5b6;
      p.bodyHost.setFillStyle(underworld ? 0x213337 : 0x536b67, active ? 1 : .14);
      p.bodyHost.setStrokeStyle(1, edge, active ? .4 : .15);
      if (!active) {
        g.lineStyle(1, edge, .3);
        for (let x = p.x + 4; x < p.x + p.w - 4; x += 18) g.lineBetween(x, p.y, Math.min(x + 9, p.x + p.w), p.y);
        continue;
      }
      g.fillStyle(edge, .15).fillRect(p.x - 2, p.y - 4, p.w + 4, 8);
      // Top highlight plus a soft under-glow give flat rectangles a lit stone read.
      g.fillGradientStyle(0xffffff, 0xffffff, edge, edge, active ? .16 : .05).fillRect(p.x + 2, p.y + 1, p.w - 4, 5);
      g.fillStyle(edge, active ? .10 : .03).fillRect(p.x + 6, p.y + p.h - 3, p.w - 12, 3);
      g.fillStyle(edge, .9).fillRoundedRect(p.x, p.y, p.w, 5, 2);
      g.fillStyle(underworld ? 0x43514d : 0x8c9b85).fillRect(p.x + 2, p.y + 5, p.w - 4, 10);
      g.lineStyle(1, edge, .45).lineBetween(p.x + 3, p.y + 17, p.x + p.w - 3, p.y + 17);
      // Mortar courses and carved cloud curls on the jade / basalt parapet.
      for (let row = 0; row < (ground ? 3 : 1); row++) {
        const y = p.y + 24 + row * 32;
        g.lineStyle(1, edge, .13).lineBetween(p.x + 4, y + 24, p.x + p.w - 4, y + 24);
        for (let x = p.x + 12 + (row % 2) * 39; x < p.x + p.w - 12; x += 78) {
          g.lineBetween(x, y - 7, x, y + 24);
          if (x + 48 < p.x + p.w) {
            g.lineStyle(1.3, edge, .24).beginPath().arc(x + 31, y + 5, 6, Math.PI * .1, Math.PI * 1.9).strokePath();
            g.lineBetween(x + 14, y + 11, x + 43, y + 11).lineBetween(x + 25, y + 15, x + 47, y + 15);
          }
        }
      }
      if (!ground) {
        g.fillStyle(underworld ? 0x16292e : 0x405d59, .95).fillTriangle(p.x + 5, p.y + p.h, p.x + p.w / 2, p.y + p.h + 22, p.x + p.w - 5, p.y + p.h);
        g.lineStyle(1, edge, .45).lineBetween(p.x + 12, p.y + p.h, p.x + p.w - 12, p.y + p.h);
      }
      if (ground && p.w > 300) {
        for (let x = p.x + 52; x < p.x + p.w - 25; x += 190) {
          // Lotus finials in heaven; red spider lilies along the underworld road.
          g.lineStyle(1.4, underworld ? 0xa66359 : 0x93b79a, .8).lineBetween(x, p.y, x, p.y - 21);
          for (let i = -2; i <= 2; i++) {
            g.lineBetween(x, p.y - 20, x + i * 5, p.y - 29 + Math.abs(i) * 3);
            g.fillStyle(underworld ? 0xbc6859 : 0xc7d8b0, .8).fillEllipse(x + i * 5, p.y - 28 + Math.abs(i) * 3, 4, 7);
          }
        }
      }
    }
  }

  drawForeground(time) {
    const g = this.foregroundLayer, color = this.sceneMode === "light" ? 0x91c6b6 : 0xbd776b;
    g.clear();
    for (let i = 0; i < 18; i++) {
      const x = i * 280 - 100;
      g.fillStyle(color, .025).fillEllipse(x + Math.sin(time * .0005 + i) * 30, 669, 370, 92);
      g.lineStyle(3, 0x142b33, .72).lineBetween(x, 720, x + 18, 640);
      g.fillStyle(0x142b33, .72).fillEllipse(x + 7, 664, 32, 10).fillEllipse(x + 26, 649, 30, 10);
    }
  }

  drawHazards() {
    if (this.hazardMode === this.sceneMode) return;
    this.hazardMode = this.sceneMode;
    for (const h of this.hazards) {
      const g = h.art; g.clear();
      if (!this.isActiveMode(h)) continue;
      const color = h.mode === "shadow" ? 0xd48670 : 0xe1ba8c;
      g.fillStyle(color, .1).fillRect(h.x, h.y, h.w, h.h);
      for (let x = h.x; x < h.x + h.w; x += 22) {
        g.fillStyle(color, .8).fillTriangle(x, h.y + h.h, x + 10, h.y + 8, x + 21, h.y + h.h);
        g.fillStyle(0xffffff, .3).fillTriangle(x + 10, h.y + 8, x + 10, h.y + h.h, x + 16, h.y + h.h);
      }
    }
  }

  drawPortal(time) {
    const ready = (this.practiceMode || this.crystalCount >= this.level.crystalsRequired) && !this.boss.sprite.active;
    const g = this.portal.art, x = this.portal.x + this.portal.w / 2, foot = this.portal.y + this.portal.h;
    const color = ready ? 0xd4d6ad : 0x7e9c92, red = this.sceneMode === "shadow";
    // A slow breath on the aura signals "enter here" without adding objects.
    const breath = ready ? 1 + Math.sin(time * .0018) * .07 : 1;
    g.clear().fillStyle(color, ready ? .14 : .04).fillEllipse(x, foot - 66, 150 * breath, 172 * breath);
    if (ready) {
      g.fillStyle(0xfff6d0, .10).fillEllipse(x, foot - 66, 92 * breath, 118 * breath);
      g.lineStyle(1.5, 0xfff6d0, .35 + Math.sin(time * .0026) * .12).strokeEllipse(x, foot - 66, 128 * breath, 152 * breath);
    }
    g.fillStyle(red ? 0x101f28 : 0x173b40, .7).fillRoundedRect(x - 37, foot - 127, 74, 127, 18);
    // Paifang: upright columns, crossbeam, carved sign and lifted roof corners.
    g.fillStyle(red ? 0x784e45 : 0x8a9a86).fillRect(x - 48, foot - 127, 10, 127).fillRect(x + 38, foot - 127, 10, 127);
    g.lineStyle(2, color, .7).lineBetween(x - 43, foot - 120, x - 43, foot - 5).lineBetween(x + 43, foot - 120, x + 43, foot - 5);
    g.fillStyle(red ? 0x57463b : 0x597a70).fillRect(x - 57, foot - 135, 114, 12);
    g.fillStyle(0x18363b).fillTriangle(x - 66, foot - 139, x, foot - 157, x + 66, foot - 139);
    g.lineStyle(3, color, .9).lineBetween(x - 66, foot - 147, x - 51, foot - 138).lineBetween(x - 51, foot - 138, x + 51, foot - 138).lineBetween(x + 51, foot - 138, x + 66, foot - 147);
    g.fillStyle(0x1c383a).fillRect(x - 20, foot - 133, 40, 21);
    g.lineStyle(1, color, .8).strokeRect(x - 20, foot - 133, 40, 21);
    g.lineBetween(x - 8, foot - 126, x + 8, foot - 126).lineBetween(x, foot - 129, x, foot - 116).lineBetween(x - 10, foot - 119, x + 10, foot - 119);
    const cy = foot - 62, radius = 29;
    g.lineStyle(1, color, ready ? .8 : .3).strokeCircle(x, cy, radius + 8);
    g.fillStyle(color, ready ? .8 : .3).beginPath().arc(x, cy, radius, -Math.PI / 2, Math.PI / 2).closePath().fillPath();
    g.fillCircle(x, cy - radius / 2, radius / 2);
    g.fillStyle(0x183139).fillCircle(x, cy + radius / 2, radius / 2);
    g.fillStyle(0x183139).fillCircle(x, cy - radius / 2, 4);
    g.fillStyle(color, ready ? .9 : .4).fillCircle(x, cy + radius / 2, 4);
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4 + time * .00015;
      g.lineStyle(2, color, .65).lineBetween(x + Math.cos(angle) * 43, cy + Math.sin(angle) * 43, x + Math.cos(angle) * 48, cy + Math.sin(angle) * 48);
    }
    g.fillStyle(red ? 0x3c4845 : 0x879888).fillRoundedRect(x - 60, foot - 4, 120, 12, 3);
    g.lineStyle(1, color, .6).lineBetween(x - 60, foot, x + 60, foot);
  }

  drawCheckpoints(time) {
    const g = this.checkpointArt; g.clear();
    for (const checkpoint of this.level.checkpoints) {
      const active = this.checkpoint.x >= checkpoint.set.x, x = checkpoint.x, y = this.level.floorY;
      const color = active ? 0xead4a1 : 0x8da198;
      g.fillStyle(0x455e5a).fillRoundedRect(x - 21, y - 8, 42, 8, 2).fillRect(x - 8, y - 24, 16, 17);
      g.lineStyle(3, 0x8d9d85, .9).lineBetween(x, y - 25, x, y - 44);
      g.fillStyle(color, active ? .13 : .03).fillCircle(x, y - 60, 32);
      g.fillStyle(active ? 0xdba567 : 0x5a6e61, .9).fillRoundedRect(x - 13, y - 76, 26, 33, 5);
      g.lineStyle(1, color, .85).strokeRoundedRect(x - 13, y - 76, 26, 33, 5);
      g.lineBetween(x - 5, y - 75, x - 5, y - 44).lineBetween(x + 5, y - 75, x + 5, y - 44);
      g.fillStyle(0x213d3d).fillTriangle(x - 20, y - 76, x, y - 86, x + 20, y - 76);
      g.lineStyle(2, color, .8).lineBetween(x - 20, y - 77, x + 20, y - 77);
      if (active) {
        g.fillStyle(0xffe8ac, .75 + Math.sin(time * .003) * .15).fillEllipse(x, y - 59, 7, 15);
        g.lineStyle(1, color, .3).strokeEllipse(x, y - 3, 64, 13);
      }
    }
  }

  drawWorldAccents(time) {
    const g = this.worldAccents; g.clear();
    for (const gate of this.gates) {
      if (!gate.sprite.visible || !gate.sprite.active) continue;
      const color = gate.weakness === "light" ? 0xf0dba6 : 0xd58673;
      const x = gate.x + gate.w / 2, y = gate.y;
      g.lineStyle(2, color, .6).strokeRoundedRect(gate.x + 4, y + 3, gate.w - 8, gate.h - 6, 6);
      for (let i = 0; i < 3; i++) {
        const cy = y + 20 + i * 26;
        g.lineStyle(1.5, color, .7).strokeTriangle(x, cy - 7, x - 7, cy, x, cy + 7);
        g.lineBetween(x, cy - 7, x + 7, cy).lineBetween(x + 7, cy, x, cy + 7);
      }
    }
    if (this.playerShadow) {
      let below;
      for (const p of this.platforms) {
        if (this.isActiveMode(p) && this.player.x >= p.x && this.player.x <= p.x + p.w &&
            p.y >= this.player.body.bottom - 4 && (!below || p.y < below.y)) below = p;
      }
      this.playerShadow.setVisible(Boolean(below));
      if (below) {
        const height = Math.max(0, below.y - this.player.body.bottom);
        this.playerShadow.setPosition(this.player.x, below.y - 2).setScale(Math.max(.25, 1 - height / 380), 1).setAlpha(Math.max(.06, .4 - height / 650));
      }
    }
  }

  updateHud(forcedState) {
    const text = (element, value) => {
      const next = String(value);
      if (element && element.textContent !== next) element.textContent = next;
    };
    // Setting style.width on every frame triggers a style recalculation even when
    // nothing changed, so only write when the displayed tenth-of-a-percent moves.
    const width = (element, ratio) => {
      if (!element) return;
      const next = `${Math.round(Math.max(0, ratio) * 1000) / 10}%`;
      if (element.style.width !== next) element.style.width = next;
    };
    width(this.hud.hpBar, this.hp / this.maxHp);
    text(this.hud.hpValue, Math.ceil(this.hp));
    width(this.hud.mpBar, this.mp / this.maxMp);
    text(this.hud.mpValue, Math.ceil(this.mp));
    const nodes = this.cachedNodes || (this.cachedNodes = {
      gameRoot: dom("game-root"),
      touchControls: document.querySelector?.(".touch-controls") || null,
      lowMeter: this.hud.mpBar?.closest?.(".meter") || null
    });
    nodes.lowMeter?.classList.toggle("low", this.mp / this.maxMp < 0.25 && this.sceneMode !== this.formMode);
    text(this.hud.crystals, this.practiceMode ? "演武 · 不计通关" : `灵印 ${this.crystalCount}/${this.level.crystalsRequired}`);
    text(this.hud.level, `Lv ${this.levelValue} · ${this.xp}/${this.nextXp}`);
    const weapon = this.getRuneWeapon?.();
    text(this.hud.equipment, weapon ? `${this.formMode === "light" ? "阳" : "阴"} · ${weapon.name} · E 六道` : "E 六道轮回");
    const core = this.getRuneSkill?.() || SPIRIT_CORES[this.formMode];
    text(this.hud.spiritCore, `灵格：${core.name} · ${core.cost} 灵力`);
    text(this.hud.state, forcedState || (this.won ? (this.practiceMode ? "演武完成" : "已通关") : this.lost ? "旅程暂歇" : this.paused ? "已暂停" : !this.running ? "准备出发" : "巡界中"));
    text(this.hud.pause, this.paused ? "继续" : "暂停");
    this.hud.pause.disabled = !this.running || this.helpOpen;
    const canInteract = this.running && !this.paused && !this.helpOpen && !this.runeEquipmentOpen && !this.won && !this.lost;
    for (const [key, selected] of [["lightScene", this.sceneMode === "light"], ["shadowScene", this.sceneMode === "shadow"], ["lightForm", this.formMode === "light"], ["shadowForm", this.formMode === "shadow"]]) {
      const button = this.hud[key];
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
      button.disabled = !canInteract;
    }
    const dashText = this.dashCooldown > 0 ? `冲刺 ${this.dashCooldown.toFixed(1)}s` : "冲刺就绪";
    const skillText = this.skillCooldown > 0 ? `${core.name} ${this.skillCooldown.toFixed(1)}s` : this.mp < core.cost ? `需 ${core.cost} 灵力` : `${core.name}就绪`;
    text(this.hud.dashStatus, dashText);
    text(this.hud.skillStatus, skillText);
    this.hud.dashStatus?.classList.toggle("cooling", this.dashCooldown > 0);
    this.hud.skillStatus?.classList.toggle("cooling", this.skillCooldown > 0 || this.mp < core.cost);
    this.touchButtons?.forEach(button => {
      button.disabled = !canInteract;
      if (button.dataset.action === "dash") button.setAttribute("aria-label", dashText);
      if (button.dataset.action === "skill") button.setAttribute("aria-label", `${skillText}，消耗 ${core.cost} 灵力`);
    });
    const position = this.player?.x || this.level.start.x;
    const zodiac = window.LIANGYI_ZODIAC[this.chapterIndex];
    const area = position < 1100 ? "渡口" : position < 2400 ? "两界回廊" : position < this.level.arenaStart ? "凌云阶" : "元辰坛";
    text(this.hud.chapter, `${String(this.chapterIndex + 1).padStart(2, "0")} / ${zodiac.chapterName} · ${area}`);
    let guide = "A / D 行走，K 二段跳；收集沿途五枚元辰灵印。";
    if (position >= 300 && position < 1100) guide = "空格往返天庭地府，让对应的云台与灵印显现。";
    else if (position >= 1100 && position < 2400) guide = "L 切阴阳配装；对应极性弱点出招。长明灯附近可按 E 装备。";
    else if (position >= 2400 && position < this.level.arenaStart) guide = "空中再按 K 二段跳，Shift 踏云冲刺，跨越凌云阶。";
    else if (position >= this.level.arenaStart) guide = this.boss?.sprite.active ? `${zodiac.name} · ${zodiac.telegraph}` : !this.practiceMode && this.crystalCount < this.level.crystalsRequired ? `两界门还需 ${this.level.crystalsRequired - this.crystalCount} 枚灵印，可沿原路回访。` : "元辰已认可你的修为，进入右侧两界门。";
    if (this.mp / this.maxMp < .25) guide = "灵力恢复中：天庭配阳面、地府配阴面时恢复更快。";
    if (this.won) guide = this.practiceMode ? "演武完成，回到本章历练即可收录元辰印。" : "元辰印已归位；继续下一章，重整两界秩序。";
    text(this.hud.guide, guide);
    const progress = this.won ? 100 : Math.round(Math.min(1, Math.max(0, (position - this.level.start.x) / (this.level.portal.x - this.level.start.x))) * 100);
    if (this.hud.progress && this.hud.progress.dataset?.value !== String(progress)) {
      if (this.hud.progress.dataset) this.hud.progress.dataset.value = String(progress);
      this.hud.progress.style.width = `${progress}%`;
      this.hud.progress.parentElement.setAttribute("aria-valuenow", String(progress));
    }
    this.hud.helpToggle?.setAttribute("aria-expanded", String(Boolean(this.helpOpen)));
    this.hud.overlay.inert = Boolean(this.helpOpen);
    this.hud.pauseOverlay.inert = Boolean(this.helpOpen);
    if (this.helpOpen) this.hud.overlay.setAttribute("aria-hidden", "true");
    else this.hud.overlay.removeAttribute("aria-hidden");
    if (nodes.gameRoot) nodes.gameRoot.inert = !canInteract;
    if (nodes.touchControls) nodes.touchControls.inert = !canInteract;
  }

  showMessage(text, ms) {
    this.messageText.setText(text);
    this.messageTimer = ms / 1000;
  }

  showEnd(title, body, buttonText) {
    this.physics.world.pause();
    this.time.paused = true;
    this.tweens.pauseAll();
    this.player.anims.pause();
    this.pauseEnemyAnimations(true);
    this.clearInput();
    this.paused = false;
    this.helpOpen = false;
    this.hud.help?.classList.add("hidden");
    this.hud.pauseOverlay.classList.add("hidden");
    const elapsed = Math.max(0, Math.floor(this.runTime || 0));
    const duration = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;
    const canContinue = this.lost && this.checkpoint.x > this.level.start.x;
    this.hud.overlay.innerHTML = `
      <div class="panel end-panel">
        <span class="dialog-symbol" aria-hidden="true">${this.won ? "✦" : "☾"}</span>
        <div class="eyebrow">${this.won ? "元辰星盘 · 归位之路" : "长明灯 · 仍候归人"}</div>
        <h1 id="end-title"></h1>
        <p id="end-description"></p>
        <dl class="journey-stats"><div><dt>旅程时间</dt><dd>${duration}</dd></div><div><dt>${this.practiceMode ? "本次试炼" : "元辰灵印"}</dt><dd>${this.practiceMode ? '<small>演武 · 不计通关</small>' : `${this.crystalCount}<small> / ${this.level.crystalsRequired}</small>`}</dd></div><div><dt>跌落次数</dt><dd>${this.fallCount || 0}</dd></div></dl>
        <div class="dialog-actions"><button class="primary" id="restart" type="button"></button>${canContinue ? '<button class="secondary" id="end-restart-full" type="button">从头开始</button>' : ""}</div>
      </div>`;
    dom("end-title").textContent = title;
    dom("end-description").textContent = canContinue ? "长明灯仍为你亮着。从那里继续，灵印与战斗进度都会保留。" : body;
    dom("restart").textContent = canContinue ? "从长明灯继续" : buttonText;
    this.hud.overlay.removeAttribute("aria-label");
    this.hud.overlay.setAttribute("aria-labelledby", "end-title");
    this.hud.overlay.classList.remove("hidden");
    dom("restart").addEventListener("click", () => {
      if (canContinue) this.continueFromCheckpoint();
      else if (this.won) this.selectChapter(this.practiceMode ? this.chapterIndex : (this.chapterIndex + 1) % 12);
      else this.resetGame(true);
    });
    dom("end-restart-full")?.addEventListener("click", () => this.resetGame(true));
    this.updateHud();
    dom("restart").focus({ preventScroll: true });
  }

  continueFromCheckpoint() {
    this.clearBossAttacks();
    this.time.removeAllEvents();
    this.time.paused = false;
    this.tweens.resumeAll();
    this.tweens.killAll();
    this.player.anims.resume();
    this.pauseEnemyAnimations(false);
    this.effects.clear(true, true);
    this.projectiles.clear(true, true);
    this.clearInput();
    this.hp = this.maxHp;
    this.mp = this.maxMp;
    this.lost = false;
    this.won = false;
    this.paused = false;
    this.helpOpen = false;
    this.helpWasRunning = false;
    this.hud.help?.classList.add("hidden");
    this.hud.pauseOverlay.classList.add("hidden");
    this.running = true;
    this.sceneMode = this.level.startMode || "light";
    this.formMode = this.sceneMode;
    this.lockTimer = this.dashTimer = this.dashCooldown = this.attackCooldown = this.skillCooldown = this.shieldTimer = this.switchTimer = 0;
    this.syncRuneCombatSide?.();
    this.jumpsUsed = this.coyoteTimer = 0;
    this.invulnTimer = 1.05;
    this.applyPlayerArt();
    this.player.setPosition(this.checkpoint.x, this.checkpoint.y).setVelocity(0, 0).setAlpha(1);
    this.cameras.main.centerOn(this.player.x + 130, this.player.y - 60);
    this.player.body.setAccelerationX(0);
    this.boss.sprite.getData("model").attackTimer = 1.5;
    this.applyModeVisibility();
    this.hideMenu();
    this.physics.world.resume();
    this.updateHud();
    this.focusGame();
    this.showMessage("从长明灯继续，灵印与战斗进度已保留", 1800);
  }

}

window.LiangyiGameScene = GameScene;
window.LiangyiRunes?.install(GameScene);
