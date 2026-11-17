const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../src/main.js"), "utf8");
const dependencies = [
  "SHADOW_JUMP_LEVEL", "ShadowJumpGameScene", "ShadowJumpArt", "ShadowJumpWorldArt",
  "ShadowJumpEnemyArt", "SHADOW_JUMP_ZODIAC", "ShadowJumpZodiacArt", "createShadowJumpChapter"
];

test("page keeps existing local scripts deferred with Phaser before game code", () => {
  const projectRoot = path.resolve(__dirname, "..");
  const html = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
  const scriptTags = [...html.matchAll(/<script\b[^>]*>/gi)].map(match => match[0]);
  assert.ok(scriptTags.length > 0, "The page must load its game scripts.");
  const scripts = scriptTags.map(tag => {
    const src = tag.match(/\bsrc\s*=\s*(["'])(.*?)\1/i)?.[2];
    assert.ok(src, `Expected a script file: ${tag}`);
    assert.doesNotMatch(src, /^(?:[a-z][a-z0-9+.-]*:|[/\\])/i, `Script must use a local relative path: ${src}`);
    assert.match(tag, /\sdefer(?:\s|=|\/?>)/i, `Script must keep defer: ${src}`);
    assert.doesNotMatch(tag, /\sasync(?:\s|=|\/?>)/i, `Async would break script order: ${src}`);
    const scriptPath = path.resolve(projectRoot, src.split(/[?#]/)[0]);
    assert.ok(scriptPath.startsWith(projectRoot + path.sep), `Script must stay within the game directory: ${src}`);
    assert.ok(fs.statSync(scriptPath).isFile(), `Script must be included in the published files: ${src}`);
    return path.relative(projectRoot, scriptPath);
  });
  const engineIndex = scripts.indexOf(path.join("vendor", "phaser.min.js"));
  assert.ok(engineIndex >= 0, "The page must load the bundled Phaser engine.");
  assert.ok(scripts.includes(path.join("src", "main.js")), "The page must load the game entry point.");
  for (const [index, script] of scripts.entries()) {
    if (script.startsWith("src" + path.sep)) {
      assert.ok(engineIndex < index, `Phaser must load before ${script}`);
    }
  }
});

function makeElement(tagName) {
  return {
    tagName,
    children: [],
    listeners: {},
    textContent: "",
    classList: {
      names: new Set(["hidden"]),
      remove(name) { this.names.delete(name); }
    },
    set innerHTML(value) { throw new Error("Boot messages must use textContent."); },
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = children; },
    addEventListener(name, listener) { this.listeners[name] = listener; }
  };
}

function createBoot({ missing = [], overlayPresent = true } = {}) {
  const overlay = makeElement("div");
  const games = [];
  let reloads = 0;
  const sandbox = {
    document: {
      getElementById: id => id === "overlay" && overlayPresent ? overlay : null,
      createElement: makeElement
    },
    location: { reload() { reloads += 1; } },
    Phaser: {
      AUTO: "auto",
      Scale: { FIT: "fit", CENTER_BOTH: "center" },
      Game: class {
        constructor(config) { this.config = config; games.push(this); }
      }
    },
    ...Object.fromEntries(dependencies.map(name => [name, {}]))
  };
  for (const name of missing) delete sandbox[name];
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  return {
    sandbox, overlay, games,
    run: () => vm.runInContext(source, sandbox, { filename: "main.js" }),
    reloadCount: () => reloads
  };
}

test("missing Phaser shows the local engine path and deployment help", () => {
  const boot = createBoot({ missing: ["Phaser"] });
  assert.throws(boot.run, /Phaser is unavailable/);
  const [title, detail, help] = boot.overlay.children[0].children;
  assert.equal(title.textContent, "启动失败");
  assert.match(detail.textContent, /vendor\/phaser\.min\.js/);
  assert.match(help.textContent, /等待部署完成/);
  assert.equal(boot.overlay.classList.names.has("hidden"), false);
  assert.equal(boot.games.length, 0);
});

test("each missing local dependency prevents game creation and explains the script directory", () => {
  for (const dependency of dependencies) {
    const boot = createBoot({ missing: [dependency] });
    assert.throws(boot.run, /local game scripts are unavailable/, dependency);
    const [, detail, help] = boot.overlay.children[0].children;
    assert.match(detail.textContent, /游戏脚本没有加载完整/, dependency);
    assert.match(help.textContent, /src\//, dependency);
    assert.equal(boot.games.length, 0, dependency);
  }
});

test("complete dependencies start one game in the expected container and scene", () => {
  const boot = createBoot();
  boot.run();
  assert.equal(boot.games.length, 1);
  assert.equal(boot.sandbox.shadowJump, boot.games[0]);
  assert.equal(boot.games[0].config.parent, "game-root");
  assert.equal(boot.games[0].config.scene.length, 1);
  assert.equal(boot.games[0].config.scene[0], boot.sandbox.ShadowJumpGameScene);
  assert.equal(boot.overlay.children.length, 0);
});

test("error details stay literal text and the retry button reloads the page", () => {
  const boot = createBoot();
  boot.run();
  const message = '<img src="missing" onerror="throw 1">';
  const help = "<script>unexpected()</script>";
  boot.sandbox.showBootError(message, help);
  const panel = boot.overlay.children[0];
  assert.deepEqual(panel.children.map(child => child.tagName), ["h1", "p", "p", "button"]);
  assert.equal(panel.children[1].textContent, message);
  assert.equal(panel.children[2].textContent, help);
  const retry = panel.children[3];
  assert.equal(retry.type, "button");
  assert.equal(retry.textContent, "重新加载");
  retry.listeners.click();
  assert.equal(boot.reloadCount(), 1);
});

test("missing overlay preserves the original boot failure", () => {
  const boot = createBoot({ missing: ["Phaser"], overlayPresent: false });
  assert.throws(boot.run, /Shadow Jump boot failed: Phaser is unavailable/);
  assert.equal(boot.games.length, 0);
});
