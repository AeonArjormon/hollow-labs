function showBootError(message, help) {
  const overlay = document.getElementById("overlay");
  if (!overlay) return;
  const panel = document.createElement("div");
  panel.className = "panel";
  const title = document.createElement("h1");
  title.textContent = "启动失败";
  const detail = document.createElement("p");
  detail.textContent = message;
  const suggestion = document.createElement("p");
  suggestion.textContent = help;
  const retry = document.createElement("button");
  retry.className = "primary";
  retry.type = "button";
  retry.textContent = "重新加载";
  retry.addEventListener("click", () => window.location.reload());
  panel.append(title, detail, suggestion, retry);
  overlay.replaceChildren(panel);
  overlay.classList.remove("hidden");
}

if (!window.Phaser) {
  showBootError(
    "游戏引擎文件 vendor/phaser.min.js 未能加载。",
    "请刷新重试；如果刚更新了 GitHub Pages，请等待部署完成。仍无法启动时，请确认发布内容包含完整的 vendor/ 目录。"
  );
  throw new Error("Shadow Jump boot failed: Phaser is unavailable.");
}

if (!window.SHADOW_JUMP_LEVEL || !window.ShadowJumpGameScene || !window.ShadowJumpArt || !window.ShadowJumpWorldArt || !window.ShadowJumpEnemyArt || !window.SHADOW_JUMP_ZODIAC || !window.ShadowJumpZodiacArt || !window.createShadowJumpChapter) {
  showBootError(
    "游戏脚本没有加载完整，无法启动。",
    "请刷新重试，并确认发布内容包含完整的 src/ 目录，且与 index.html 位于同一项目目录下。"
  );
  throw new Error("Shadow Jump boot failed: local game scripts are unavailable.");
}

const config = {
  type: Phaser.AUTO,
  parent: "game-root",
  width: 1152,
  height: 648,
  backgroundColor: "#080a10",
  antialias: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 1450 },
      debug: false
    }
  },
  scene: [window.ShadowJumpGameScene]
};

window.shadowJump = new Phaser.Game(config);
