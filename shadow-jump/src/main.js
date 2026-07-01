function showBootError(message) {
  const overlay = document.getElementById("overlay");
  if (!overlay) return;
  overlay.innerHTML = `
    <div class="panel">
      <h1>启动失败</h1>
      <p>${message}</p>
      <p>建议通过本地服务器或 GitHub Pages 打开；如果是离线环境，需要先恢复 Phaser 脚本访问。</p>
      <button class="primary" type="button" onclick="location.reload()">重新加载</button>
    </div>`;
  overlay.classList.remove("hidden");
}

if (!window.Phaser) {
  showBootError("Phaser 没有加载成功，游戏引擎不可用。");
  throw new Error("Shadow Jump boot failed: Phaser is unavailable.");
}

if (!window.SHADOW_JUMP_LEVEL || !window.ShadowJumpGameScene) {
  showBootError("本地游戏脚本没有加载完整，请确认 src/ 目录与 index.html 在同一项目目录下。");
  throw new Error("Shadow Jump boot failed: local game scripts are unavailable.");
}

const config = {
  type: Phaser.AUTO,
  parent: "game-root",
  width: 1152,
  height: 648,
  backgroundColor: "#080a10",
  pixelArt: false,
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
