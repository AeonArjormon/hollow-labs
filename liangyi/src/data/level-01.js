window.LIANGYI_LEVEL = {
  width: 4300,
  height: 720,
  floorY: 590,
  start: { x: 82, y: 500 },
  crystalsRequired: 5,
  portal: { x: 4100, y: 458, w: 88, h: 132 },
  checkpoints: [
    { x: 1160, y: 512, set: { x: 1160, y: 500 }, label: "渡口长明灯已点亮" },
    { x: 2250, y: 512, set: { x: 2250, y: 500 }, label: "两界长明灯已点亮" },
    { x: 3540, y: 512, set: { x: 3540, y: 500 }, label: "元辰坛前长明灯已点亮" }
  ],
  platforms: [
    { x: 0, y: 590, w: 470, h: 130, mode: "both", kind: "ground" },
    { x: 540, y: 528, w: 175, h: 28, mode: "light", kind: "cloud" },
    { x: 790, y: 464, w: 165, h: 28, mode: "shadow", kind: "rift" },
    { x: 1030, y: 590, w: 390, h: 130, mode: "both", kind: "ground" },
    { x: 1510, y: 520, w: 190, h: 28, mode: "light", kind: "ruin" },
    { x: 1800, y: 452, w: 176, h: 28, mode: "shadow", kind: "rift" },
    { x: 2090, y: 590, w: 300, h: 130, mode: "both", kind: "ground" },
    { x: 2525, y: 510, w: 144, h: 26, mode: "light", kind: "cloud" },
    { x: 2730, y: 448, w: 156, h: 26, mode: "light", kind: "cloud" },
    { x: 2960, y: 386, w: 138, h: 26, mode: "shadow", kind: "rift" },
    { x: 3185, y: 510, w: 175, h: 26, mode: "shadow", kind: "rift" },
    { x: 3470, y: 590, w: 370, h: 130, mode: "both", kind: "ground" },
    { x: 3900, y: 590, w: 400, h: 130, mode: "both", kind: "ground" },
    { x: 620, y: 382, w: 116, h: 22, mode: "shadow", kind: "glass" },
    { x: 1320, y: 420, w: 132, h: 22, mode: "shadow", kind: "glass" },
    { x: 2180, y: 438, w: 138, h: 22, mode: "light", kind: "glass" },
    { x: 3680, y: 438, w: 132, h: 22, mode: "light", kind: "cloud" }
  ],
  hazards: [
    { x: 730, y: 632, w: 260, h: 54, mode: "light" },
    { x: 1428, y: 632, w: 250, h: 54, mode: "shadow" },
    { x: 2390, y: 632, w: 118, h: 54, mode: "light" },
    { x: 3335, y: 632, w: 135, h: 54, mode: "shadow" },
    { x: 3855, y: 632, w: 72, h: 54, mode: "light" }
  ],
  crystals: [
    { x: 620, y: 480, mode: "light" },
    { x: 870, y: 410, mode: "shadow" },
    { x: 1602, y: 470, mode: "light" },
    { x: 1882, y: 398, mode: "shadow" },
    { x: 3042, y: 332, mode: "shadow" }
  ],
  enemies: [
    { x: 386, y: 568, w: 46, h: 38, hp: 30, maxHp: 30, min: 310, max: 442, vx: 55, mode: "light", weakness: "light", species: "scarab", label: "纸鹤傀" },
    { x: 1245, y: 566, w: 54, h: 42, hp: 44, maxHp: 44, min: 1120, max: 1386, vx: 70, mode: "shadow", weakness: "shadow", species: "warden", label: "提灯阴差" },
    { x: 2220, y: 416, w: 48, h: 38, hp: 34, maxHp: 34, min: 2206, max: 2292, vx: 62, mode: "light", weakness: "shadow", species: "sentinel", label: "持盾天兵" },
    { x: 3628, y: 564, w: 58, h: 46, hp: 54, maxHp: 54, min: 3510, max: 3802, vx: 86, mode: "shadow", weakness: "light", species: "hunter", label: "冥火狐妖" }
  ],
  gates: [
    { x: 2046, y: 492, w: 46, h: 98, mode: "light", hp: 3, weakness: "shadow", label: "玉阙镇魂封" },
    { x: 3140, y: 444, w: 42, h: 146, mode: "shadow", hp: 2, weakness: "light", label: "黄泉引剑符" }
  ],
  boss: {
    x: 3950,
    y: 500,
    w: 76,
    h: 90,
    hp: 120,
    maxHp: 120,
    phases: [
      { scene: "light", weakness: "shadow", label: "初试" },
      { scene: "shadow", weakness: "light", label: "元辰觉醒" }
    ]
  }
};


// Keep each chapter's objects independent. Shared counts let the scene reuse its
// Arcade colliders while changing routes, realms and the actual guardian.
window.createLiangyiChapter = function(index = 0) {
  const zodiac = window.LIANGYI_ZODIAC[index];
  if (!zodiac) throw new RangeError("Unknown zodiac chapter");
  const level = JSON.parse(JSON.stringify(window.LIANGYI_LEVEL));
  level.chapterIndex = index;
  level.chapterName = zodiac.chapterName;
  level.startMode = zodiac.realm;
  level.arenaStart = 3470;
  level.arenaEnd = 4280;
  const flip = zodiac.realm === "shadow";
  const swap = mode => flip && mode !== "both" ? (mode === "light" ? "shadow" : "light") : mode;
  // Three elevation rhythms: cloud terraces, hanging bridges, stepped shrines.
  const route = index % 3;
  const raised = new Map();
  level.platforms.forEach((platform, i) => {
    platform.mode = swap(platform.mode);
    if (i < 11 && platform.kind !== "ground") {
      const dy = route === 1 ? (i % 2 ? -16 : 12) : route === 2 ? (i % 2 ? 14 : -22) : 0;
      platform.y += dy;
      raised.set(i, dy);
    }
  });
  [1, 2, 4, 5, 9].forEach((platformIndex, i) => {
    level.crystals[i].mode = level.platforms[platformIndex].mode;
    level.crystals[i].y += raised.get(platformIndex) || 0;
  });
  level.hazards.forEach(hazard => { hazard.mode = swap(hazard.mode); });
  level.gates.forEach(gate => { gate.mode = swap(gate.mode); });
  level.enemies.forEach((enemy, i) => {
    enemy.mode = swap(enemy.mode);
    enemy.hp = enemy.maxHp = enemy.hp + Math.floor(index / 3) * 6;
    enemy.vx *= 1 + index * .025;
    if (i === 2) enemy.mode = level.platforms[15].mode;
  });
  // The arena is safe in either realm, including during a charge or world switch.
  level.platforms[11].w = 830;
  level.platforms[12] = { x: 3900, y: 704, w: 400, h: 16, mode: "both", kind: "ground" };
  level.platforms[16] = { x: 3360, y: 438, w: 110, h: 22, mode: "both", kind: "cloud" };
  level.hazards[4] = { x: 3395, y: 656, w: 70, h: 30, mode: "both" };
  const weakness = zodiac.realm === "light" ? "shadow" : "light";
  level.boss = {
    ...zodiac, x: 3950, y: level.floorY, w: 88, h: 110,
    maxHp: zodiac.hp,
    phases: [
      { scene: zodiac.realm, weakness, label: "初试", pattern: zodiac.pattern },
      { scene: zodiac.realm === "light" ? "shadow" : "light", weakness: weakness === "light" ? "shadow" : "light", label: "元辰觉醒", pattern: zodiac.secondaryPattern }
    ]
  };
  return level;
};
window.LIANGYI_CHAPTERS = window.LIANGYI_ZODIAC.map((_, index) => window.createLiangyiChapter(index));
