const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../src/rune-store.js"), "utf8"), sandbox);
const RuneStore = sandbox.window.ShadowJumpRuneStore;
const copy = value => JSON.parse(JSON.stringify(value));

function memory(initial = {}) {
  const data = new Map(Object.entries(initial));
  const writes = [];
  return { data, writes, getItem: key => data.get(key) ?? null, setItem(key, value) { writes.push({ key, value }); data.set(key, value); } };
}

function win(store, id) { return store.reward(id, store.createInstance(id)); }

test("old completed chapters grant exactly one rune once; the chapter journal is untouched", () => {
  const storage = memory({ "liangyi-zodiac-progress-v1": '["rat","ox"]' });
  const first = RuneStore.create({ storage, completedZodiacs: new Set(["rat", "ox", "unknown"]) });
  assert.equal(first.state.inventory.rat, 1);
  assert.equal(first.state.inventory.ox, 1);
  assert.equal(first.state.inventory.rabbit, 0);
  assert.equal(first.state.migrationVersion, 1);
  const loaded = RuneStore.create({ storage, completedZodiacs: new Set(["rat", "ox", "rabbit"]) });
  assert.equal(loaded.state.inventory.rat, 1);
  assert.equal(loaded.state.inventory.rabbit, 0);
  assert.equal(storage.getItem("liangyi-zodiac-progress-v1"), '["rat","ox"]');
});

test("a formal Boss reward commits its ownership and receipt together and survives reload", () => {
  const storage = memory();
  const store = RuneStore.create({ storage });
  const instance = store.createInstance("rabbit");
  const before = storage.writes.length;
  assert.equal(store.reward("rabbit", instance).awarded, true);
  assert.equal(storage.writes.length, before + 1);
  const saved = JSON.parse(storage.getItem(RuneStore.key));
  assert.equal(saved.inventory.rabbit, 1);
  assert.equal(saved.claimedInstances[instance], "rabbit");
  assert.equal(store.reward("rabbit", instance).awarded, false, "death continuation does not pay again");
  const loaded = RuneStore.create({ storage });
  assert.equal(loaded.state.inventory.rabbit, 1);
  assert.equal(loaded.reward("rabbit", instance).awarded, false, "reload cannot replay the receipt");
});

test("fresh formal runs grant a second rune, then convert duplicates into ink", () => {
  const store = RuneStore.create({ storage: memory() });
  assert.equal(win(store, "pig").kind, "rune");
  assert.equal(win(store, "pig").count, 2);
  const third = win(store, "pig");
  assert.equal(third.kind, "ink");
  assert.equal(third.count, 2);
  assert.equal(third.ink, RuneStore.duplicateInk);
});

test("stale and mismatched run ids cannot pay, even after bounded receipt pruning", () => {
  const storage = memory();
  let store = RuneStore.create({ storage });
  const original = store.createInstance("rat");
  assert.equal(store.reward("ox", original).awarded, false);
  assert.equal(store.reward("rat", original).awarded, true);
  for (let i = 0; i < 40; i++) win(store, "rat");
  assert.equal(Object.keys(store.state.claimedInstances).length, 32);
  assert.equal(store.state.claimedInstances[original], undefined);
  store = RuneStore.create({ storage });
  const count = store.state.ink;
  assert.equal(store.reward("rat", original).awarded, false);
  assert.equal(store.state.ink, count);
  assert.equal(store.createInstance("unknown"), null);
});

test("equip enforces owned counts, same-face uniqueness and six slots without consuming runes", () => {
  const store = RuneStore.create({ storage: memory(), completedZodiacs: ["rat"] });
  let loadouts = copy(RuneStore.blankLoadouts());
  loadouts.light[0] = "rat";
  assert.equal(store.equip(loadouts).ok, true);
  assert.equal(store.state.inventory.rat, 1);
  loadouts.shadow[0] = "rat";
  assert.equal(store.equip(loadouts).ok, false);
  win(store, "rat");
  assert.equal(store.equip(loadouts).ok, true);
  loadouts.light[1] = "rat";
  assert.equal(store.equip(loadouts).ok, false);
  loadouts.light[1] = "ox";
  assert.equal(store.equip(loadouts).ok, false);
  loadouts.light[1] = null;
  loadouts.light.pop();
  assert.equal(store.equip(loadouts).ok, false);
  assert.equal(store.getLoadouts().light.length, 6);
});

test("slot movement, removal and returned snapshots cannot mutate ownership or live loadouts", () => {
  const store = RuneStore.create({ storage: memory(), completedZodiacs: ["snake"] });
  const loadouts = store.getLoadouts();
  loadouts.light[0] = "snake";
  assert.equal(store.getLoadouts().light[0], null);
  store.equip(loadouts);
  loadouts.light[0] = null;
  loadouts.light[5] = "snake";
  store.equip(loadouts);
  assert.equal(store.getLoadouts().light[0], null);
  assert.equal(store.getLoadouts().light[5], "snake");
  const state = store.state;
  state.inventory.snake = 2;
  state.loadouts.light[5] = null;
  assert.equal(store.state.inventory.snake, 1);
  assert.equal(store.getLoadouts().light[5], "snake");
});

test("practice owns two of each temporarily and can neither write nor award permanent loot", () => {
  const storage = memory();
  const formal = RuneStore.create({ storage, completedZodiacs: ["ox"] });
  const oldSave = storage.getItem(RuneStore.key);
  const practice = RuneStore.createPractice(formal.getLoadouts());
  assert.ok(RuneStore.ids.every(id => practice.state.inventory[id] === 2));
  const loadouts = practice.getLoadouts();
  loadouts.light[0] = "rabbit";
  assert.equal(practice.equip(loadouts).ok, true);
  assert.equal(win(practice, "pig").awarded, false);
  assert.equal(practice.persistent, false);
  assert.equal(practice.warning, "");
  assert.equal(formal.state.inventory.rabbit, 0);
  assert.equal(formal.getLoadouts().light[0], null);
  assert.equal(storage.getItem(RuneStore.key), oldSave);
  assert.equal(formal.reward("ox", formal.createInstance("ox"), true).awarded, false);
});

test("corrupt saves are backed up exactly before recovery and players see an explicit warning", () => {
  const raw = "{broken, rune save";
  const storage = memory({ [RuneStore.key]: raw });
  const store = RuneStore.create({ storage, completedZodiacs: ["dog"] });
  assert.match(storage.writes[0].key, /-corrupt-/);
  assert.equal(storage.writes[0].value, raw);
  assert.equal(storage.writes[1].key, RuneStore.key);
  assert.equal(store.state.inventory.dog, 1);
  assert.match(store.warning, /已备份/);
  assert.equal(store.persistent, true);
});

test("failed corruption backup preserves the original and all new rewards remain session-only", () => {
  const raw = "bad";
  const storage = memory({ [RuneStore.key]: raw });
  storage.setItem = () => { throw new Error("quota"); };
  const store = RuneStore.create({ storage });
  assert.equal(win(store, "goat").count, 1);
  assert.equal(storage.getItem(RuneStore.key), raw);
  assert.equal(store.persistent, false);
  assert.match(store.warning, /原存档未覆盖/);
});

test("an unavailable storage read cannot be overwritten by an empty save", () => {
  let writes = 0;
  const storage = { getItem() { throw new Error("denied"); }, setItem() { writes++; } };
  const store = RuneStore.create({ storage, completedZodiacs: ["horse"] });
  assert.equal(win(store, "horse").count, 2);
  assert.equal(writes, 0);
  assert.equal(store.persistent, false);
});

test("write failure preserves session inventory and its idempotent receipt, then retries atomically", () => {
  const storage = memory();
  const store = RuneStore.create({ storage });
  const instance = store.createInstance("tiger");
  const write = storage.setItem;
  storage.setItem = () => { throw new Error("quota"); };
  assert.equal(store.reward("tiger", instance).persistent, false);
  assert.equal(store.state.inventory.tiger, 1);
  assert.equal(store.reward("tiger", instance).awarded, false);
  assert.match(store.warning, /仅会话有效/);
  storage.setItem = write;
  store.equip(store.getLoadouts());
  assert.equal(store.persistent, true);
  assert.equal(store.warning, "");
  const reloaded = RuneStore.create({ storage });
  assert.equal(reloaded.state.inventory.tiger, 1);
  assert.equal(reloaded.reward("tiger", instance).awarded, false);
});

test("syntactically valid but impossible loadouts are preserved as corrupt data", () => {
  const storage = memory();
  const store = RuneStore.create({ storage });
  const tampered = store.state;
  tampered.inventory.rat = 1;
  tampered.loadouts.light[0] = "rat";
  tampered.loadouts.shadow[0] = "rat";
  const raw = JSON.stringify(tampered);
  storage.data.set(RuneStore.key, raw);
  const recovered = RuneStore.create({ storage });
  assert.equal(recovered.state.inventory.rat, 0);
  assert.equal([...storage.data.entries()].some(([key, value]) => key.includes("-corrupt-") && value === raw), true);
});
