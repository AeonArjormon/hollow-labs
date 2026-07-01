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
    color: 0xff7048
  }
};

const EQUIPMENT = {
  lightBlade: {
    name: "羽刃",
    rangedDamage: 7,
    critChance: 0.14
  },
  shadowBoots: {
    name: "影靴",
    speedBonus: 34,
    dashBonus: 90
  },
  soulVessel: {
    name: "魂匣",
    mpRegen: 3,
    reverseDrainReduction: 2
  }
};

const SPIRIT_CORES = {
  light: {
    name: "圣盾",
    cost: 18,
    description: "护盾并发射强化圣羽"
  },
  shadow: {
    name: "影突",
    cost: 22,
    description: "突进并扩大斩击"
  }
};

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
    if (!this.enabled || !this.context) return;
    const presets = {
      shoot: [740, 0.055, "triangle", 0.08],
      hit: [180, 0.09, "square", 0.12],
      slash: [120, 0.08, "sawtooth", 0.1],
      skill: [420, 0.14, "triangle", 0.12],
      crystal: [920, 0.16, "sine", 0.11],
      level: [660, 0.24, "sine", 0.13],
      hurt: [95, 0.18, "sawtooth", 0.12],
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
    this.load.svg("spriteReference", "assets/shadow-jump-sprites.svg", { width: 512, height: 256 });
    this.load.image("bg-light", "assets/raster/background-light.png");
    this.load.image("bg-shadow", "assets/raster/background-shadow.png");
    this.load.spritesheet("hero-light", "assets/raster/hero-light.png", {
      frameWidth: 256,
      frameHeight: 170,
      spacing: 0,
      margin: 0
    });
    this.load.spritesheet("hero-shadow", "assets/raster/hero-shadow.png", {
      frameWidth: 205,
      frameHeight: 170,
      spacing: 0,
      margin: 0
    });
    this.load.image("enemy-light", "assets/raster/enemy-light.png");
    this.load.image("enemy-shadow", "assets/raster/enemy-shadow.png");
    this.load.image("feather-light", "assets/raster/feather-light.png");
    this.load.image("feather-shadow", "assets/raster/feather-shadow.png");
  }

  create() {
    this.level = window.SHADOW_JUMP_LEVEL;
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

    this.createTextures();
    this.createPlayerAnimations();
    this.createInput();
    this.createWorld();
    this.createHudHooks();
    this.resetGame(false);
    this.showMenu();
  }

  createTextures() {
    const g = this.add.graphics();

    g.clear().fillStyle(0xffffff, 1).fillRect(0, 0, 8, 8).generateTexture("white", 8, 8);

    if (!this.textures.exists("hero-light")) {
    g.clear();
    g.fillStyle(0xffffff, 0.16).fillEllipse(28, 38, 82, 44);
    g.lineStyle(3, 0xfff1a8, 0.82).strokeEllipse(28, 8, 30, 9);
    g.fillStyle(0xffffff, 0.86);
    g.fillTriangle(19, 25, 0, 38, 17, 58);
    g.fillTriangle(37, 25, 56, 38, 39, 58);
    g.fillStyle(0xe9dfbe, 1).fillEllipse(28, 38, 28, 46);
    g.fillStyle(0xfff1a8, 1).fillRoundedRect(16, 16, 24, 32, 10);
    g.fillStyle(0x64d9d2, 1).fillRect(32, 27, 4, 5);
    g.fillStyle(0xd6b059, 1).fillRect(18, 47, 20, 5);
    g.fillStyle(0xe9dfbe, 1).fillRect(18, 58, 7, 12).fillRect(31, 58, 7, 12);
    g.lineStyle(2, 0xd6b059, 0.55);
    for (let i = 0; i < 4; i++) {
      g.lineBetween(16, 28 + i * 6, 3, 42 + i * 4);
      g.lineBetween(40, 28 + i * 6, 53, 42 + i * 4);
    }
    g.generateTexture("hero-light", 56, 74);
    }

    if (!this.textures.exists("hero-shadow")) {
    g.clear();
    g.fillStyle(0xff7048, 0.15).fillEllipse(29, 43, 78, 38);
    g.fillStyle(0x2a0710, 0.92).fillTriangle(20, 22, 0, 42, 19, 62);
    g.fillTriangle(38, 22, 58, 42, 39, 62);
    g.fillStyle(0x16080a, 1).fillRoundedRect(13, 18, 32, 48, 7);
    g.fillStyle(0xff7048, 0.85).fillTriangle(18, 21, 8, 5, 26, 20);
    g.fillTriangle(40, 21, 50, 5, 32, 20);
    g.fillStyle(0xff7048, 1).fillRect(32, 31, 5, 5);
    g.fillStyle(0xbd2f2f, 1).fillRect(17, 49, 24, 5);
    g.lineStyle(3, 0xbd2f2f, 0.9);
    g.lineBetween(18, 59, 4, 67);
    g.lineBetween(4, 67, 13, 78);
    g.fillStyle(0x0d0508, 1).fillRect(18, 66, 8, 12).fillRect(33, 66, 8, 12);
    g.generateTexture("hero-shadow", 58, 82);
    }

    if (!this.textures.exists("feather-light")) {
    g.clear();
    g.fillStyle(0xfff1a8, 0.28).fillEllipse(32, 16, 64, 28);
    g.fillStyle(0xfff1a8, 1).fillEllipse(32, 15, 52, 16);
    g.fillStyle(0xffffff, 1).fillTriangle(61, 15, 23, 3, 30, 15).fillTriangle(61, 15, 23, 27, 30, 15);
    g.lineStyle(2, 0xd6b059, 0.8).lineBetween(8, 15, 52, 15);
    g.generateTexture("feather-light", 68, 32);
    }

    if (!this.textures.exists("feather-shadow")) {
    g.clear();
    g.fillStyle(0x9be8ff, 0.22).fillEllipse(30, 16, 60, 26);
    g.fillStyle(0x9be8ff, 1).fillEllipse(30, 15, 46, 15);
    g.fillStyle(0xffffff, 0.92).fillTriangle(56, 15, 20, 4, 25, 15).fillTriangle(56, 15, 20, 26, 25, 15);
    g.lineStyle(2, 0x64d9d2, 0.9).lineBetween(8, 15, 48, 15);
    g.generateTexture("feather-shadow", 62, 32);
    }

    if (!this.textures.exists("enemy-light")) {
    g.clear();
    g.fillStyle(0xff7048, 0.88).fillEllipse(50, 26, 100, 36);
    g.fillStyle(0xfff1a8, 0.72).fillEllipse(58, 23, 68, 18);
    g.generateTexture("slash-light", 112, 56);

    g.clear();
    g.fillStyle(0xbd2f2f, 0.88).fillEllipse(52, 28, 104, 38);
    g.fillStyle(0xff7048, 0.78).fillEllipse(62, 25, 72, 18);
    g.generateTexture("slash-shadow", 116, 58);

    g.clear();
    g.fillStyle(0x5a4218, 0.32).fillEllipse(30, 37, 58, 14);
    g.fillStyle(0xc69a42, 1).fillRoundedRect(3, 8, 54, 35, 15);
    g.fillStyle(0xfff1a8, 0.45).fillEllipse(18, 14, 22, 12).fillEllipse(38, 14, 22, 12);
    g.fillStyle(0x17151c, 1).fillRect(36, 22, 8, 7);
    g.lineStyle(2, 0x74551d, 0.85).lineBetween(12, 42, 6, 51).lineBetween(46, 42, 52, 51);
    g.generateTexture("enemy-light", 62, 56);
    }

    if (!this.textures.exists("enemy-shadow")) {
    g.clear();
    g.fillStyle(0x1a050a, 0.44).fillEllipse(32, 42, 64, 16);
    g.fillStyle(0xbd2f2f, 1).fillRoundedRect(2, 8, 60, 42, 14);
    g.fillStyle(0x3a0d0d, 1).fillTriangle(10, 12, 2, 0, 22, 10).fillTriangle(54, 12, 62, 0, 42, 10);
    g.fillStyle(0x130609, 1).fillRect(40, 23, 8, 8);
    g.lineStyle(2, 0xff7048, 0.75).strokeRoundedRect(5, 11, 54, 36, 12);
    g.generateTexture("enemy-shadow", 66, 58);
    }

    g.clear();
    g.fillStyle(0xfff1a8, 1).fillTriangle(16, 0, 32, 23, 16, 46).fillTriangle(16, 0, 0, 23, 16, 46);
    g.fillStyle(0xffffff, 1).fillRect(13, 11, 6, 9);
    g.generateTexture("crystal-light", 32, 46);

    g.clear();
    g.fillStyle(0xff7048, 1).fillTriangle(16, 0, 32, 23, 16, 46).fillTriangle(16, 0, 0, 23, 16, 46);
    g.fillStyle(0xffd3c4, 1).fillRect(13, 11, 6, 9);
    g.generateTexture("crystal-shadow", 32, 46);

    g.destroy();
  }

  createPlayerAnimations() {
    // 光形态动画
    this.anims.create({
      key: "light-idle",
      frames: this.anims.generateFrameNumbers("hero-light", { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1
    });
    this.anims.create({
      key: "light-walk",
      frames: this.anims.generateFrameNumbers("hero-light", { start: 4, end: 7 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: "light-jump",
      frames: this.anims.generateFrameNumbers("hero-light", { start: 8, end: 9 }),
      frameRate: 5,
      repeat: 0
    });
    this.anims.create({
      key: "light-attack",
      frames: this.anims.generateFrameNumbers("hero-light", { start: 10, end: 12 }),
      frameRate: 12,
      repeat: 0
    });
    this.anims.create({
      key: "light-dash",
      frames: this.anims.generateFrameNumbers("hero-light", { start: 13, end: 14 }),
      frameRate: 8,
      repeat: 0
    });
    this.anims.create({
      key: "light-hurt",
      frames: this.anims.generateFrameNumbers("hero-light", { start: 15, end: 16 }),
      frameRate: 8,
      repeat: 0
    });
    this.anims.create({
      key: "light-switch",
      frames: this.anims.generateFrameNumbers("hero-light", { start: 17, end: 20 }),
      frameRate: 10,
      repeat: 0
    });

    // 影形态动画
    this.anims.create({
      key: "shadow-idle",
      frames: this.anims.generateFrameNumbers("hero-shadow", { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1
    });
    this.anims.create({
      key: "shadow-walk",
      frames: this.anims.generateFrameNumbers("hero-shadow", { start: 4, end: 9 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: "shadow-jump",
      frames: this.anims.generateFrameNumbers("hero-shadow", { start: 10, end: 11 }),
      frameRate: 5,
      repeat: 0
    });
    this.anims.create({
      key: "shadow-attack",
      frames: this.anims.generateFrameNumbers("hero-shadow", { start: 12, end: 14 }),
      frameRate: 12,
      repeat: 0
    });
    this.anims.create({
      key: "shadow-dash",
      frames: this.anims.generateFrameNumbers("hero-shadow", { start: 15, end: 16 }),
      frameRate: 8,
      repeat: 0
    });
    this.anims.create({
      key: "shadow-hurt",
      frames: this.anims.generateFrameNumbers("hero-shadow", { start: 17, end: 18 }),
      frameRate: 8,
      repeat: 0
    });
    this.anims.create({
      key: "shadow-switch",
      frames: this.anims.generateFrameNumbers("hero-shadow", { start: 19, end: 22 }),
      frameRate: 10,
      repeat: 0
    });
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

    this.input.keyboard.on("keydown-SPACE", event => event.preventDefault());
    this.input.keyboard.on("keydown", () => this.audio.unlock());
    this.input.keyboard.on("keydown-R", () => this.resetGame(true));
    this.input.keyboard.on("keydown-P", () => this.togglePause());
    this.input.keyboard.on("keydown-SPACE", () => this.switchScene());
    this.input.keyboard.on("keydown-L", () => this.switchForm());
    this.input.keyboard.on("keydown-K", () => this.jump());
    this.input.keyboard.on("keydown-J", () => this.attack());
    this.input.keyboard.on("keydown-U", () => this.skill());
    this.input.keyboard.on("keydown-SHIFT", () => this.dash());

    this.holdInput = { left: false, right: false };
    document.querySelectorAll("[data-hold]").forEach(button => {
      const key = button.dataset.hold;
      const set = value => {
        if (value) this.audio.unlock();
        this.holdInput[key] = value;
      };
      button.addEventListener("pointerdown", () => set(true));
      button.addEventListener("pointerup", () => set(false));
      button.addEventListener("pointercancel", () => set(false));
      button.addEventListener("pointerleave", () => set(false));
    });

    const actions = {
      jump: () => this.jump(),
      attack: () => this.attack(),
      skill: () => this.skill(),
      scene: () => this.switchScene(),
      form: () => this.switchForm(),
      dash: () => this.dash()
    };
    document.querySelectorAll("[data-action]").forEach(button => {
      button.addEventListener("click", () => {
        this.audio.unlock();
        actions[button.dataset.action]?.();
      });
    });
  }

  createWorld() {
    this.cameras.main.setBounds(0, 0, this.level.width, this.level.height);
    this.physics.world.setBounds(0, 0, this.level.width, this.level.height + 500);

    this.bgImage = this.add.image(576, 324, "bg-light").setScrollFactor(0).setDepth(-30).setDisplaySize(1152, 648);
    this.background = this.add.graphics().setScrollFactor(0).setDepth(-29);
    this.farLayer = this.add.graphics().setScrollFactor(0.25).setDepth(-18);
    this.platformDetailLayer = this.add.graphics().setDepth(6);
    this.foregroundLayer = this.add.graphics().setDepth(20).setScrollFactor(0.78);

    this.platforms = this.level.platforms.map(data => this.createPlatform(data));
    this.hazards = this.level.hazards.map(data => this.createHazard(data));
    this.crystals = this.level.crystals.map(data => this.createCrystal(data));
    this.enemies = this.level.enemies.map(data => this.createEnemy(data));
    this.gates = this.level.gates.map(data => this.createGate(data));
    this.boss = this.createBoss(this.level.boss);
    this.portal = this.createPortal(this.level.portal);

    this.player = this.physics.add.sprite(this.level.start.x, this.level.start.y, "hero-light");
    this.applyPlayerArt();
    this.player.setCollideWorldBounds(true);
    this.player.body.setMaxVelocity(FORM.light.speed, FORM.light.maxFall);
    this.player.body.setDragX(FORM.light.drag);

    this.projectiles = this.physics.add.group();
    this.effects = this.add.group();

    this.platformBodies = this.platforms.map(p => p.bodyHost);
    this.physics.add.collider(this.player, this.platformBodies);
    this.physics.add.collider(this.enemies.map(e => e.sprite), this.platformBodies);
    this.physics.add.collider(this.boss.sprite, this.platformBodies);
    this.physics.add.overlap(this.player, this.hazards.map(h => h.zone), () => this.hurt(14), null, this);
    this.physics.add.overlap(this.player, this.crystals.map(c => c.sprite), (_player, crystal) => this.collectCrystal(crystal), null, this);
    this.physics.add.overlap(this.player, this.enemies.map(e => e.sprite), (_player, enemy) => this.touchEnemy(enemy), null, this);
    this.physics.add.overlap(this.player, this.boss.sprite, () => this.hurt(18), null, this);
    this.physics.add.overlap(this.player, this.portal.zone, () => this.tryPortal(), null, this);
    this.physics.add.overlap(this.projectiles, this.enemies.map(e => e.sprite), (projectile, enemy) => this.projectileHit(projectile, enemy), null, this);
    this.physics.add.overlap(this.projectiles, this.gates.map(g => g.sprite), (projectile, gate) => this.projectileGateHit(projectile, gate), null, this);
    this.physics.add.overlap(this.projectiles, this.boss.sprite, (projectile, boss) => this.projectileBossHit(projectile, boss), null, this);

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08, -130, 60);
    this.cameras.main.setDeadzone(210, 120);

    this.messageText = this.add.text(576, 48, "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "17px",
      fontStyle: "700",
      color: "#fff1a8",
      backgroundColor: "rgba(7, 9, 12, 0.58)",
      padding: { x: 14, y: 8 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(50).setVisible(false);

    this.helpText = this.add.text(28, 608, "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "15px",
      color: "#dfe8e4"
    }).setScrollFactor(0).setDepth(50);

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
    sprite.setData("model", { ...data, taken: false });
    return { ...data, sprite, taken: false };
  }

  createEnemy(data) {
    const sprite = this.physics.add.sprite(data.x, data.y, data.mode === "shadow" ? "enemy-shadow" : "enemy-light");
    sprite.setDisplaySize(data.w * 1.55, data.h * 1.55);
    sprite.setSize(data.w - 6, data.h - 4);
    sprite.body.allowGravity = false;
    sprite.body.setImmovable(true);
    sprite.setData("model", { ...data });
    const hpBack = this.add.rectangle(data.x, data.y - 30, 54, 6, 0x080a10, 0.76).setDepth(30);
    const hpBar = this.add.rectangle(data.x - 27, data.y - 30, 54, 6, 0xff405c, 1).setOrigin(0, 0.5).setDepth(31);
    return { ...data, sprite, hpBack, hpBar, hitTimer: 0 };
  }

  createGate(data) {
    const sprite = this.physics.add.sprite(data.x + data.w / 2, data.y + data.h / 2, "white");
    sprite.setDisplaySize(data.w, data.h).setTint(data.mode === "shadow" ? 0x4a1230 : 0xf0d184);
    sprite.body.allowGravity = false;
    sprite.body.setImmovable(true);
    sprite.setData("model", { ...data, maxHp: data.hp });
    const labelText = this.add.text(data.x + data.w / 2, data.y - 18, data.weakness === "shadow" ? "影斩" : "圣羽", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "13px",
      color: "#fff1a8"
    }).setOrigin(0.5).setDepth(32);
    return { ...data, sprite, labelText };
  }

  createBoss(data) {
    const sprite = this.physics.add.sprite(data.x, data.y, "enemy-shadow");
    sprite.setDisplaySize(data.w, data.h);
    sprite.body.setSize(data.w * 0.85, data.h * 0.9);
    sprite.body.allowGravity = true;
    sprite.body.setImmovable(true);
    sprite.setData("model", { ...data, phaseIndex: 0, attackTimer: 0 });
    const hpBack = this.add.rectangle(576, 82, 360, 12, 0x080a10, 0.78).setScrollFactor(0).setDepth(70);
    const hpBar = this.add.rectangle(396, 82, 360, 12, 0xff405c, 1).setOrigin(0, 0.5).setScrollFactor(0).setDepth(71);
    const label = this.add.text(576, 58, "双界监视者", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "15px",
      fontStyle: "800",
      color: "#fff1a8"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(72);
    return { ...data, sprite, hpBack, hpBar, label, active: true };
  }

  createPortal(data) {
    const zone = this.add.zone(data.x + data.w / 2, data.y + data.h / 2, data.w, data.h);
    this.physics.add.existing(zone, true);
    const art = this.add.graphics().setDepth(7);
    return { ...data, zone, art };
  }

  createHudHooks() {
    this.hud = Object.fromEntries(Object.entries(HUD_IDS).map(([key, id]) => [key, dom(id)]));
    this.hud.start.addEventListener("click", () => {
      this.audio.unlock();
      this.resetGame(true);
    });
    this.hud.lightScene.addEventListener("click", () => this.switchScene("light"));
    this.hud.shadowScene.addEventListener("click", () => this.switchScene("shadow"));
    this.hud.lightForm.addEventListener("click", () => this.switchForm("light"));
    this.hud.shadowForm.addEventListener("click", () => this.switchForm("shadow"));
  }

  resetGame(startRunning) {
    this.sceneMode = "light";
    this.formMode = "light";
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
    this.checkpoint = { ...this.level.start };

    this.player?.setPosition(this.level.start.x, this.level.start.y);
    this.player?.setVelocity(0, 0);
    this.player?.setFlipX(false);
    this.applyPlayerArt();

    this.crystals?.forEach((crystal, index) => {
      crystal.taken = false;
      crystal.sprite.enableBody(true, this.level.crystals[index].x, this.level.crystals[index].y, true, true);
    });

    this.enemies?.forEach((enemy, index) => {
      Object.assign(enemy, this.level.enemies[index], { hitTimer: 0 });
      enemy.sprite.enableBody(true, enemy.x, enemy.y, true, true);
      enemy.sprite.setData("model", { ...this.level.enemies[index] });
      enemy.sprite.setTint(0xffffff);
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
      gate.labelText.setVisible(true);
    });

    if (this.boss) {
      this.boss.sprite.enableBody(true, this.level.boss.x, this.level.boss.y, true, true);
      this.boss.sprite.setData("model", { ...this.level.boss, phaseIndex: 0, attackTimer: 0 });
      this.boss.sprite.setTint(0xffffff);
      this.boss.active = true;
    }

    this.projectiles?.clear(true, true);
    this.effects?.clear(true, true);
    this.applyModeVisibility();
    this.updateHud();
    this.showMessage("空格切场景，L 切形态，反向组合会持续消耗 MP", 2400);
    if (startRunning) this.hideMenu();
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
    this.player.setDisplaySize(light ? 80 : 64, 85);
    this.player.setSize(32, 50).setOffset(16, 18);
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
    this.tweens.add({
      targets: label,
      y: y - 34,
      alpha: 0,
      duration: 720,
      onComplete: () => label.destroy()
    });
  }

  togglePause() {
    if (!this.running || this.won || this.lost) return;
    this.scene.isPaused() ? this.scene.resume() : this.scene.pause();
    this.updateHud(this.scene.isPaused() ? "暂停" : "冒险中");
  }

  update(time, deltaMs) {
    const dt = Math.min(deltaMs / 1000, 0.034);
    this.drawBackground(time);
    this.drawPlatformDetails(time);
    this.drawHazards();
    this.drawPortal(time);
    this.drawForeground(time);

    if (!this.running || this.won || this.lost) {
      this.updateFloatingUi(time);
      return;
    }

    this.updateTimers(dt);
    this.updateResources(dt);
    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateBoss(dt);
    this.updateProjectiles();
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
    this.messageText.setVisible(this.messageTimer > 0);
  }

  updateResources(dt) {
    const reversed = this.sceneMode !== this.formMode;
    const before = this.mp;
    const stats = this.getStats();
    this.mp += reversed ? -(14 - stats.reverseDrainReduction) * dt : (10 + stats.mpRegen) * dt;
    this.mp = Phaser.Math.Clamp(this.mp, 0, this.maxMp);
    if (before > 0 && this.mp <= 0 && reversed) {
      this.forceMatchingForm();
    }
  }

  updatePlayer(dt) {
    const body = this.player.body;
    const form = this.getFormStats();
    const left = this.keys.left.isDown || this.keys.arrowLeft.isDown || this.holdInput.left;
    const right = this.keys.right.isDown || this.keys.arrowRight.isDown || this.holdInput.right;

    body.setGravityY(1450 * (form.gravity - 1));
    body.setMaxVelocity(form.speed, form.maxFall);
    body.setDragX(form.drag);

    if (this.lockTimer <= 0) {
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
      const dir = this.player.flipX ? -1 : 1;
      body.setVelocityX(dir * form.dashSpeed);
      body.setVelocityY(body.velocity.y * 0.72);
    }

    if (this.player.y > this.level.height + 180) {
      this.hurt(18);
      if (!this.lost) {
        this.player.setPosition(this.checkpoint.x, this.checkpoint.y);
        body.setVelocity(0, 0);
      }
    }

    if (this.invulnTimer > 0) {
      this.player.setAlpha(Math.floor(this.time.now / 70) % 2 ? 0.45 : 1);
    } else {
      this.player.setAlpha(1);
    }

    // 动画状态机
    const form = this.formMode;
    if (this.lockTimer > 0 || (this.isAttacking && this.player.anims.currentAnim?.key !== `${form}-attack`)) {
      if (!this.player.anims.isPlaying || !this.player.anims.currentAnim.key.endsWith("-hurt")) {
        this.player.anims.play(`${form}-hurt`, true);
      }
    } else if (this.isAttacking && this.player.anims.currentAnim?.key !== `${form}-attack`) {
      this.player.anims.play(`${form}-attack`, true);
    } else if (this.isDashing && this.player.anims.currentAnim?.key !== `${form}-dash`) {
      this.player.anims.play(`${form}-dash`, true);
    } else if (!body.blocked.down) {
      const animKey = body.velocity.y < 0 ? `${form}-jump` : `${form}-fall`;
      if (!this.player.anims.isPlaying || this.player.anims.currentAnim.key !== animKey) {
        this.player.anims.play(animKey, true);
      }
    } else if (Math.abs(body.velocity.x) > 10) {
      if (this.player.anims.currentAnim?.key !== `${form}-walk`) {
        this.player.anims.play(`${form}-walk`, true);
      }
    } else {
      if (this.player.anims.currentAnim?.key !== `${form}-idle`) {
        this.player.anims.play(`${form}-idle`, true);
      }
    }

    this.shieldVisual.setPosition(this.player.x, this.player.y - 4);
    this.shieldVisual.setVisible(this.shieldTimer > 0);
    if (this.shieldTimer > 0) {
      this.shieldVisual.setScale(1 + Math.sin(this.time.now * 0.012) * 0.08);
    }
  }

  updateEnemies(dt) {
    for (const enemy of this.enemies) {
      const model = enemy.sprite.getData("model");
      if (!enemy.sprite.active || !this.isActiveMode(model)) continue;
      enemy.sprite.x += (model.vx * dt);
      if (enemy.sprite.x < model.min || enemy.sprite.x > model.max) {
        model.vx *= -1;
        enemy.sprite.setFlipX(model.vx < 0);
      }
      enemy.hitTimer = Math.max(0, enemy.hitTimer - dt);
      if (enemy.hitTimer <= 0) enemy.sprite.setTint(0xffffff);
    }
  }

  updateBoss(dt) {
    const model = this.boss.sprite.getData("model");
    if (!this.boss.sprite.active) {
      this.boss.hpBack.setVisible(false);
      this.boss.hpBar.setVisible(false);
      this.boss.label.setVisible(false);
      return;
    }

    const active = this.player.x > 3480;
    this.boss.hpBack.setVisible(active);
    this.boss.hpBar.setVisible(active);
    this.boss.label.setVisible(active);
    if (!active) return;

    const phase = model.phases[model.phaseIndex];
    this.boss.sprite.setTint(phase.weakness === "shadow" ? 0xffd36d : 0x9be8ff);
    model.attackTimer -= dt;
    if (model.attackTimer <= 0) {
      this.switchScene(phase.scene, true);
      this.showMessage(`Boss 阶段：${phase.label}`, 1600);
      this.spawnBossHazard(phase.scene);
      model.attackTimer = 5.2;
    }
  }

  updateProjectiles() {
    this.projectiles.getChildren().forEach(projectile => {
      if (!projectile.active) return;
      projectile.life -= 1;
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
        x: enemy.sprite.x - enemy.w / 2,
        y: enemy.sprite.y - enemy.h / 2,
        w: enemy.w,
        h: enemy.h
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

    if (this.boss.sprite.active && this.player.x > 3480 && overlaps(box, {
      x: this.boss.sprite.x - this.boss.w / 2,
      y: this.boss.sprite.y - this.boss.h / 2,
      w: this.boss.w,
      h: this.boss.h
    })) {
      this.projectileBossHit(projectile, this.boss.sprite);
    }
  }

  updateCheckpoints() {
    for (const checkpoint of this.level.checkpoints) {
      if (this.player.x >= checkpoint.x && this.checkpoint.x < checkpoint.set.x) {
        this.checkpoint = { ...checkpoint.set };
        this.showMessage(checkpoint.label, 1600);
      }
    }
  }

  updateFloatingUi(time) {
    for (const enemy of this.enemies) {
      const model = enemy.sprite.getData("model");
      const visible = enemy.sprite.active && this.isActiveMode(model);
      enemy.hpBack.setVisible(visible);
      enemy.hpBar.setVisible(visible);
      if (!visible) continue;
      enemy.hpBack.setPosition(enemy.sprite.x, enemy.sprite.y - enemy.sprite.displayHeight * 0.72);
      enemy.hpBar.setPosition(enemy.sprite.x - 27, enemy.sprite.y - enemy.sprite.displayHeight * 0.72);
      enemy.hpBar.displayWidth = 54 * Math.max(0, model.hp / model.maxHp);
      enemy.hpBar.fillColor = model.hp / model.maxHp < 0.3 ? 0xffd34f : 0xff405c;
    }

    const bossModel = this.boss.sprite.getData("model");
    this.boss.hpBar.displayWidth = 360 * Math.max(0, bossModel.hp / bossModel.maxHp);

    for (const crystal of this.crystals) {
      if (crystal.sprite.active) {
        crystal.sprite.y = crystal.y + Math.sin(time * 0.004 + crystal.x) * 5;
      }
    }

    this.helpText.setText(this.helpTextForPosition());
  }

  helpTextForPosition() {
    if (this.player.x < 950) return "第一段：空格切换光/影场景，找出现的平台。";
    if (this.player.x < 2150) return "第二段：L 切换形态。光远程，影近战，重门需要影斩。";
    if (this.player.x < 3450) return "第三段：反向组合限时。用影场景+光形态缓降，或光场景+影形态冲刺。";
    return "终点段：Boss 会改变场景和护盾，按弱点切形态输出。";
  }

  switchScene(nextMode, forced = false) {
    if (!forced && !this.canAct()) return;
    const target = nextMode || (this.sceneMode === "light" ? "shadow" : "light");
    if (target === this.sceneMode) return;
    this.sceneMode = target;
    this.cameras.main.shake(120, 0.004);
    this.applyModeVisibility();
    this.pushOutOfInactiveTerrain();
    this.showMessage(target === "light" ? "光场景展开" : "影场景展开", 800);
    this.audio.play("switch");
  }

  switchForm(nextMode) {
    if (!this.canAct()) return;
    const target = nextMode || (this.formMode === "light" ? "shadow" : "light");
    if (target === this.formMode) return;
    const oldForm = this.formMode;
    this.formMode = target;
    // 播放切换动画
    this.player.anims.play(`${oldForm}-switch`, true);
    this.time.delayedCall(400, () => {
      this.applyPlayerArt();
      const stats = this.getStats();
      const targetForm = {
        ...FORM[target],
        speed: FORM[target].speed + (target === "shadow" ? stats.speedBonus : Math.floor(stats.speedBonus * 0.35))
      };
      this.player.body.setMaxVelocity(targetForm.speed, targetForm.maxFall);
      this.player.body.setDragX(targetForm.drag);
      this.burst(target);
      this.audio.play("switch");
      this.showMessage(target === "light" ? "光形态：高跳、缓降、圣羽" : "影形态：高速、长冲刺、斩击", 1100);
    });
  }

  forceMatchingForm() {
    this.formMode = this.sceneMode;
    this.applyPlayerArt();
    this.player.body.setVelocityX(this.player.body.velocity.x * 0.25);
    this.lockTimer = 0.35;
    this.cameras.main.shake(160, 0.006);
    this.showMessage("MP 耗尽，形态被拉回当前场景", 1500);
    this.updateHud();
  }

  jump() {
    if (!this.canAct()) return;
    const onFloor = this.player.body.blocked.down || this.player.body.touching.down;
    if (onFloor) this.player.setData("jumps", 0);
    const jumps = this.player.getData("jumps") || 0;
    if (onFloor || jumps < 2) {
      const form = this.getFormStats();
      this.player.body.setVelocityY(-(onFloor ? form.jump : form.airJump));
      this.player.setData("jumps", jumps + 1);
      this.audio.play("switch");
    }
  }

  dash() {
    if (!this.canAct() || this.dashCooldown > 0 || this.isDashing) return;
    const form = this.getFormStats();
    const dir = this.player.flipX ? -1 : 1;
    this.isDashing = true;
    this.player.anims.play(`${this.formMode}-dash`, true);
    this.player.body.setVelocityX(dir * form.dashSpeed);
    this.player.body.setVelocityY(this.player.body.velocity.y * 0.35);
    this.dashTimer = form.dashTime / 1000;
    this.dashCooldown = form.dashCooldown / 1000;
    this.time.delayedCall(form.dashTime, () => { this.isDashing = false; });
    this.audio.play("slash");
  }

  attack() {
    if (!this.canAct() || this.attackCooldown > 0) return;
    this.isAttacking = true;
    this.player.anims.play(`${this.formMode}-attack`, true);
    this.time.delayedCall(250, () => { this.isAttacking = false; });
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
      this.showMessage("MP 不足", 800);
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
    projectile.body.setSize(powered ? 62 : 52, 32);
    projectile.setVelocityX(dir * (powered ? 760 : 610));
    projectile.setFlipX(dir < 0);
    const crit = Math.random() < stats.critChance;
    projectile.setData("damage", (powered ? stats.rangedDamage * 1.5 : stats.rangedDamage) * (crit ? 1.6 : 1));
    projectile.setData("form", "light");
    projectile.setData("crit", crit);
    projectile.mode = this.sceneMode;
    projectile.life = powered ? 82 : 64;
    projectile.setBlendMode(Phaser.BlendModes.ADD);
    projectile.setDepth(34);
    this.audio.play(powered ? "skill" : "shoot");
  }

  melee(powered) {
    const dir = this.player.flipX ? -1 : 1;
    const stats = this.getStats();
    const box = {
      x: this.player.x + (dir > 0 ? 12 : -110),
      y: this.player.y - 52,
      w: powered ? 138 : 112,
      h: powered ? 92 : 76
    };
    const effect = this.add.image(this.player.x + dir * 54, this.player.y - 22, this.sceneMode === "light" ? "slash-light" : "slash-shadow")
      .setFlipX(dir < 0)
      .setAlpha(0.9)
      .setDepth(40);
    this.tweens.add({ targets: effect, alpha: 0, scaleX: 1.35, scaleY: 1.25, duration: 170, onComplete: () => effect.destroy() });

    for (const enemy of this.enemies) {
      const model = enemy.sprite.getData("model");
      if (!enemy.sprite.active || !this.isActiveMode(model)) continue;
      if (overlaps(box, { x: enemy.sprite.x - enemy.w / 2, y: enemy.sprite.y - enemy.h / 2, w: enemy.w, h: enemy.h })) {
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
    if (this.boss.sprite.active && this.player.x > 3480 && overlaps(box, {
      x: this.boss.sprite.x - this.boss.w / 2,
      y: this.boss.sprite.y - this.boss.h / 2,
      w: this.boss.w,
      h: this.boss.h
    })) {
      this.damageBoss((powered ? 34 : 24) * stats.skillPower, "shadow");
    }
    this.audio.play(powered ? "skill" : "slash");
  }

  projectileHit(projectile, enemySprite) {
    if (!projectile.active) return;
    const enemy = this.enemies.find(item => item.sprite === enemySprite);
    if (!enemy) return;
    this.damageEnemy(enemy, projectile.getData("damage"), projectile.getData("form"));
    projectile.destroy();
  }

  projectileGateHit(projectile, gateSprite) {
    if (!projectile.active) return;
    const gate = this.gates.find(item => item.sprite === gateSprite);
    if (!gate) return;
    this.damageGate(gate, projectile.getData("form"));
    projectile.destroy();
  }

  projectileBossHit(projectile) {
    if (!projectile.active) return;
    this.damageBoss(projectile.getData("damage"), projectile.getData("form"));
    projectile.destroy();
  }

  damageEnemy(enemy, amount, form) {
    const model = enemy.sprite.getData("model");
    const finalDamage = model.weakness === form ? amount * 1.35 : amount * 0.7;
    model.hp -= finalDamage;
    enemy.hitTimer = 0.5;
    enemy.sprite.setTint(form === "light" ? 0xfff1a8 : 0xff7048);
    this.mp = Phaser.Math.Clamp(this.mp + 4, 0, this.maxMp);
    this.floatText(enemy.sprite.x, enemy.sprite.y - 42, `${Math.ceil(finalDamage)}`, form === "light" ? 0xfff1a8 : 0xff7048);
    this.audio.play("hit");
    if (model.hp <= 0) {
      enemy.sprite.disableBody(true, true);
      enemy.hpBack.setVisible(false);
      enemy.hpBar.setVisible(false);
      this.addXp(24, "enemy");
      this.showMessage(`${model.label} 已击倒`, 1000);
    }
  }

  damageGate(gate, form) {
    const model = gate.sprite.getData("model");
    if (model.weakness !== form) {
      this.showMessage(model.weakness === "shadow" ? "需要影形态破门" : "需要光形态净化", 900);
      return;
    }
    model.hp -= 1;
    gate.sprite.setAlpha(0.35 + model.hp / model.maxHp * 0.65);
    this.cameras.main.shake(90, 0.003);
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
    const phase = model.phases[model.phaseIndex];
    if (phase.weakness !== form) {
      this.showMessage(phase.weakness === "shadow" ? "Boss 当前怕影斩" : "Boss 当前怕圣羽", 900);
      return;
    }
    model.hp -= amount;
    this.mp = Phaser.Math.Clamp(this.mp + 8, 0, this.maxMp);
    this.cameras.main.shake(120, 0.004);
    this.floatText(this.boss.sprite.x, this.boss.sprite.y - 72, `${Math.ceil(amount)}`, form === "light" ? 0xfff1a8 : 0xff7048);
    this.audio.play("hit");
    if (model.hp <= 0) {
      this.boss.sprite.disableBody(true, true);
      this.addXp(120, "boss");
      this.showMessage("双界监视者已崩解，传送门稳定", 1800);
      return;
    }
    if (model.hp < model.maxHp * 0.5) model.phaseIndex = 1;
    else model.phaseIndex = model.phaseIndex === 0 ? 1 : 0;
  }

  touchEnemy(enemySprite) {
    const enemy = this.enemies.find(item => item.sprite === enemySprite);
    if (!enemy?.sprite.active) return;
    this.hurt(12);
  }

  hurt(amount) {
    if (!this.running || this.invulnTimer > 0 || this.won || this.lost) return;
    const final = this.shieldTimer > 0 ? amount * 0.35 : amount;
    this.hp = Phaser.Math.Clamp(this.hp - final, 0, this.maxHp);
    this.invulnTimer = 1.05;
    this.cameras.main.shake(150, 0.006);
    this.player.body.setVelocity(this.player.flipX ? 260 : -260, -360);
    this.audio.play("hurt");
    if (this.hp <= 0) {
      this.lost = true;
      this.running = false;
      this.showEnd("影子消散", "你倒在双界遗迹中。按 R 或点击按钮重新挑战。", "重新开始");
    }
  }

  collectCrystal(sprite) {
    const crystal = this.crystals.find(item => item.sprite === sprite);
    if (!crystal || crystal.taken || !this.isActiveMode(crystal)) return;
    crystal.taken = true;
    sprite.disableBody(true, true);
    this.crystalCount += 1;
    this.mp = Phaser.Math.Clamp(this.mp + 12, 0, this.maxMp);
    this.addXp(18, "crystal");
    this.audio.play("crystal");
    this.showMessage(`获得月辉晶石 ${this.crystalCount}/${this.level.crystalsRequired}`, 1200);
  }

  tryPortal() {
    if (!this.running || this.won || this.lost) return;
    if (this.crystalCount < this.level.crystalsRequired) {
      this.showMessage(`还需要 ${this.level.crystalsRequired - this.crystalCount} 枚晶石`, 1000);
      return;
    }
    if (this.boss.sprite.active) {
      this.showMessage("Boss 未击败，传送门仍不稳定", 1000);
      return;
    }
    this.won = true;
    this.running = false;
    this.showEnd("传送门开启", "你完成了 Shadow Jump 的完整一关。", "再玩一次");
  }

  spawnBossHazard(mode) {
    const x = mode === "light" ? 3710 : 3860;
    const blast = this.add.rectangle(x, 585, 126, 16, mode === "light" ? 0xfff1a8 : 0xff7048, 0.7).setDepth(45);
    this.physics.add.existing(blast, true);
    this.physics.add.overlap(this.player, blast, () => this.hurt(16), null, this);
    this.tweens.add({
      targets: blast,
      alpha: 0,
      scaleY: 5,
      duration: 900,
      onComplete: () => blast.destroy()
    });
  }

  burst(target) {
    const ring = this.add.circle(this.player.x, this.player.y - 24, 18, target === "light" ? 0xfff1a8 : 0xff7048, 0.32).setDepth(35);
    this.tweens.add({ targets: ring, radius: 96, alpha: 0, duration: 260, onComplete: () => ring.destroy() });
  }

  canAct() {
    return this.running && !this.won && !this.lost && this.lockTimer <= 0 && !this.scene.isPaused();
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
    const playerBox = {
      x: this.player.x - 16,
      y: this.player.y - 25,
      w: 32,
      h: 50
    };
    for (const platform of this.platforms) {
      if (!this.isActiveMode(platform)) continue;
      if (overlaps(playerBox, platform)) {
        this.player.y = platform.y - 32;
        this.player.body.setVelocityY(0);
      }
    }
  }

  drawBackground(time) {
    const light = this.sceneMode === "light";
    this.background.clear();
    const bgKey = light ? "bg-light" : "bg-shadow";
    const hasRasterBg = this.textures.exists(bgKey);
    if (this.bgImage && hasRasterBg && this.bgImage.texture.key !== bgKey) this.bgImage.setTexture(bgKey);
    if (this.bgImage) this.bgImage.setVisible(hasRasterBg);
    if (!hasRasterBg) {
      const top = light ? 0xcdefff : 0x06050b;
      const mid = light ? 0xf7eec7 : 0x1c0c18;
      const bottom = light ? 0x8fc3d5 : 0x3a0d0d;
      this.background.fillGradientStyle(top, top, mid, bottom, 1);
      this.background.fillRect(0, 0, 1152, 648);
    }
    this.background.lineStyle(1, light ? 0xffffff : 0xff7048, light ? 0.12 : 0.08);
    for (let y = 80; y < 640; y += 52) this.background.lineBetween(0, y, 1152, y + Math.sin(y + time * 0.001) * 8);

    this.farLayer.clear();
    if (light) {
      this.farLayer.fillStyle(0xfff1a8, 0.9).fillCircle(180, 110, 48);
      this.farLayer.lineStyle(5, 0xfff1a8, 0.35).strokeCircle(180, 110, 70 + Math.sin(time * 0.002) * 4);
      this.farLayer.fillStyle(0xffffff, 0.44);
      for (let i = -1; i < 15; i++) {
        this.farLayer.fillEllipse(i * 270 + 110, 130 + Math.sin(i + time * 0.001) * 12, 96, 30);
        this.farLayer.fillEllipse(i * 270 + 155, 150 + Math.cos(i + time * 0.001) * 9, 130, 34);
      }
      for (let i = -1; i < 15; i++) {
        const x = i * 220 + 60;
        this.farLayer.fillStyle(0xe8d79b, 0.5).fillRect(x + 62, 292, 20, 270);
        this.farLayer.fillStyle(0xfff1a8, 0.58).fillRect(x + 45, 284, 54, 12);
        this.farLayer.lineStyle(2, 0xffffff, 0.2).lineBetween(x + 72, 304, x + 72, 520);
      }
    } else {
      for (let i = -1; i < 17; i++) {
        this.farLayer.fillStyle(i % 2 ? 0x210a16 : 0x4a1010, i % 2 ? 0.76 : 0.58);
        this.farLayer.fillTriangle(i * 230 + 20, 648, i * 230 + 110, 238 + Math.sin(i) * 48, i * 230 + 204, 648);
        this.farLayer.lineStyle(3, 0xff7048, 0.28).lineBetween(i * 230 + 108, 270, i * 230 + 118, 620);
      }
      for (let i = 0; i < 36; i++) {
        const x = i * 98 + Math.sin(i * 2.4 + time * 0.001) * 18;
        const y = 80 + ((i * 61 + time * 0.04) % 360);
        this.farLayer.fillStyle(i % 3 ? 0xff7048 : 0xa26df2, i % 3 ? 0.46 : 0.34).fillCircle(x, y, i % 3 ? 2 : 3);
      }
    }
  }

  drawPlatformDetails(time) {
    const g = this.platformDetailLayer;
    g.clear();
    for (const platform of this.platforms) {
      if (!this.isActiveMode(platform)) continue;
      const host = platform.bodyHost;
      const light = platform.mode !== "shadow" && this.sceneMode === "light";
      const glow = platform.mode === "shadow" ? 0xff7048 : 0xfff1a8;
      host.setFillStyle(platform.kind === "ground" ? (this.sceneMode === "light" ? 0x5f695c : 0x251014) : platform.mode === "shadow" ? 0x3b1820 : 0xe8d79b, 1);
      host.setStrokeStyle(platform.kind === "glass" ? 3 : 2, glow, platform.kind === "glass" ? 0.92 : 0.72);
      g.fillStyle(glow, light ? 0.2 : 0.17).fillRect(platform.x, platform.y, platform.w, 5);
      for (let x = platform.x + 20; x < platform.x + platform.w - 12; x += 52) {
        if (platform.mode === "shadow") {
          g.lineStyle(2, 0xff7048, 0.34).lineBetween(x, platform.y + 16, x + 22, platform.y + platform.h - 8);
        } else {
          g.lineStyle(2, 0xffffff, 0.22).strokeCircle(x, platform.y + 16, 5 + Math.sin(time * 0.003 + x) * 1.5);
        }
      }
    }
  }

  drawForeground(time) {
    const light = this.sceneMode === "light";
    this.foregroundLayer.clear();
    if (light) {
      this.foregroundLayer.fillStyle(0xffffff, 0.18);
      for (let i = -1; i < 10; i++) {
        const x = i * 180 + ((time * 0.018) % 180);
        this.foregroundLayer.fillEllipse(x, 610 + Math.sin(i + time * 0.001) * 5, 220, 28);
      }
      this.foregroundLayer.lineStyle(2, 0xfff1a8, 0.22);
      for (let i = 0; i < 10; i++) this.foregroundLayer.lineBetween(i * 150, 648, i * 150 + 70, 586);
    } else {
      this.foregroundLayer.fillStyle(0x130609, 0.42);
      for (let i = -1; i < 11; i++) this.foregroundLayer.fillTriangle(i * 150, 648, i * 150 + 64, 574 + Math.sin(i) * 22, i * 150 + 130, 648);
      this.foregroundLayer.lineStyle(3, 0xff7048, 0.28);
      for (let i = 0; i < 9; i++) this.foregroundLayer.lineBetween(i * 170 + 20, 640, i * 170 + 90, 600 + Math.sin(i + time * 0.002) * 10);
    }
  }

  drawHazards() {
    for (const hazard of this.hazards) {
      hazard.art.clear();
      if (!this.isActiveMode(hazard)) continue;
      const color = hazard.mode === "shadow" ? 0xff7048 : 0xfff1a8;
      hazard.art.fillStyle(hazard.mode === "shadow" ? 0x19070b : 0x7d6a38, 1).fillRect(hazard.x, hazard.y + hazard.h - 8, hazard.w, 10);
      for (let x = hazard.x; x < hazard.x + hazard.w; x += 24) {
        hazard.art.fillStyle(color, 0.92).fillTriangle(x, hazard.y + hazard.h, x + 12, hazard.y, x + 24, hazard.y + hazard.h);
      }
    }
  }

  drawPortal(time) {
    const ready = this.crystalCount >= this.level.crystalsRequired && !this.boss.sprite.active;
    this.portal.art.clear();
    const pulse = 0.86 + Math.sin(time * 0.005) * 0.08;
    this.portal.art.fillStyle(ready ? 0x64d9d2 : 0x2f3d48, 0.24).fillEllipse(this.portal.x + this.portal.w / 2, this.portal.y + this.portal.h / 2, this.portal.w * pulse, this.portal.h * 0.76);
    this.portal.art.lineStyle(7, ready ? 0xfff1a8 : this.sceneMode === "light" ? 0xfff1a8 : 0xff7048, ready ? 0.9 : 0.5);
    this.portal.art.strokeEllipse(this.portal.x + this.portal.w / 2, this.portal.y + this.portal.h / 2, this.portal.w * 0.72, this.portal.h * 0.88);
    this.portal.art.fillStyle(0x152128, 1).fillRect(this.portal.x + 8, this.portal.y + this.portal.h - 10, this.portal.w - 16, 18);
  }

  updateHud(forcedState) {
    this.hud.hpBar.style.width = `${(this.hp / this.maxHp) * 100}%`;
    this.hud.hpValue.textContent = Math.ceil(this.hp);
    this.hud.mpBar.style.width = `${(this.mp / this.maxMp) * 100}%`;
    this.hud.mpValue.textContent = Math.ceil(this.mp);
    this.hud.mpBar.closest(".meter").classList.toggle("low", this.mp < 25 && this.sceneMode !== this.formMode);
    this.hud.crystals.textContent = `晶石 ${this.crystalCount}/${this.level.crystalsRequired}`;
    this.hud.level.textContent = `Lv ${this.levelValue} · ${this.xp}/${this.nextXp}`;
    this.hud.equipment.textContent = `${this.equipment.lightBlade.name} / ${this.equipment.shadowBoots.name} / ${this.equipment.soulVessel.name}`;
    this.hud.spiritCore.textContent = `灵格：${SPIRIT_CORES[this.formMode].name}`;
    this.hud.state.textContent = forcedState || (this.won ? "通关" : this.lost ? "失败" : this.running ? "冒险中" : "准备");
    this.hud.lightScene.classList.toggle("active", this.sceneMode === "light");
    this.hud.shadowScene.classList.toggle("active", this.sceneMode === "shadow");
    this.hud.lightForm.classList.toggle("active", this.formMode === "light");
    this.hud.shadowForm.classList.toggle("active", this.formMode === "shadow");
  }

  showMessage(text, ms) {
    this.messageText.setText(text);
    this.messageTimer = ms / 1000;
  }

  showEnd(title, body, buttonText) {
    this.updateHud();
    this.hud.overlay.innerHTML = `
      <div class="panel">
        <h1>${title}</h1>
        <p>${body}</p>
        <p>已收集 ${this.crystalCount}/${this.level.crystalsRequired} 枚月辉晶石。</p>
        <button class="primary" id="restart" type="button">${buttonText}</button>
      </div>`;
    this.hud.overlay.classList.remove("hidden");
    document.getElementById("restart").addEventListener("click", () => this.resetGame(true));
  }
}

window.ShadowJumpGameScene = GameScene;
