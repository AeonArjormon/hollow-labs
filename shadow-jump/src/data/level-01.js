window.SHADOW_JUMP_LEVEL = {
  width: 4300,
  height: 720,
  floorY: 590,
  start: { x: 82, y: 500 },
  crystalsRequired: 5,
  portal: { x: 4100, y: 458, w: 88, h: 132 },
  checkpoints: [
    { x: 1160, y: 512, set: { x: 1160, y: 500 }, label: "第一段已完成" },
    { x: 2460, y: 512, set: { x: 2500, y: 500 }, label: "反向组合路线已解锁" }
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
    { x: 386, y: 540, w: 46, h: 38, hp: 30, maxHp: 30, min: 310, max: 492, vx: 55, mode: "light", weakness: "light", label: "圣甲虫" },
    { x: 1245, y: 538, w: 54, h: 42, hp: 44, maxHp: 44, min: 1120, max: 1408, vx: 70, mode: "shadow", weakness: "shadow", label: "裂隙守卫" },
    { x: 2220, y: 392, w: 48, h: 38, hp: 34, maxHp: 34, min: 2140, max: 2340, vx: 62, mode: "light", weakness: "shadow", label: "重甲门卫" },
    { x: 3628, y: 540, w: 58, h: 46, hp: 54, maxHp: 54, min: 3510, max: 3820, vx: 86, mode: "shadow", weakness: "light", label: "深渊猎手" }
  ],
  gates: [
    { x: 2046, y: 492, w: 46, h: 98, mode: "light", hp: 3, weakness: "shadow", label: "光场景重门" },
    { x: 3140, y: 444, w: 42, h: 146, mode: "shadow", hp: 2, weakness: "light", label: "暗影封印" }
  ],
  boss: {
    x: 3950,
    y: 500,
    w: 76,
    h: 90,
    hp: 120,
    maxHp: 120,
    phases: [
      { scene: "light", weakness: "shadow", label: "破光盾" },
      { scene: "shadow", weakness: "light", label: "净化影核" }
    ]
  }
};
