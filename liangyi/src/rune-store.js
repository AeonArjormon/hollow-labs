/* Permanent rune ownership is separate from the chapter completion journal. */
(function (global) {
  "use strict";

  const KEY = "liangyi-runes-v1";
  const IDS = Object.freeze(["rat", "ox", "tiger", "rabbit", "dragon", "snake", "horse", "goat", "monkey", "rooster", "dog", "pig"]);
  const SIDES = ["light", "shadow"];
  const CLAIM_LIMIT = 32;
  const DUPLICATE_INK = 10;
  const clone = value => JSON.parse(JSON.stringify(value));
  const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
  const isCount = value => Number.isSafeInteger(value) && value >= 0;
  const blankLoadouts = () => ({ light: Array(6).fill(null), shadow: Array(6).fill(null) });
  const nonce = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

  function validateLoadouts(loadouts, inventory) {
    if (!isRecord(loadouts)) return "配装数据不完整，请重新选择符文。";
    const used = Object.fromEntries(IDS.map(id => [id, 0]));
    for (const side of SIDES) {
      if (!Array.isArray(loadouts[side]) || loadouts[side].length !== 6) return "阴阳两面都需要保留六个槽位。";
      const seen = new Set();
      for (const id of loadouts[side]) {
        if (id === null) continue;
        if (!IDS.includes(id)) return "配装中包含未知生肖符文。";
        if (seen.has(id)) return "同一面不能重复装备同一种生肖符文，请移动已有符文。";
        seen.add(id);
        used[id] += 1;
        if (used[id] > inventory[id]) return "持有的符文数量不足；阴阳两面同时装备需要两枚。";
      }
    }
    return null;
  }

  function freshState(completedZodiacs = []) {
    const completed = new Set(completedZodiacs);
    return {
      version: 1,
      migrationVersion: 1,
      inventory: Object.fromEntries(IDS.map(id => [id, completed.has(id) ? 1 : 0])),
      ink: 0,
      loadouts: blankLoadouts(),
      instanceNamespace: nonce(),
      nextInstance: 0,
      currentInstance: null,
      claimedInstances: {}
    };
  }

  function validState(value) {
    if (!isRecord(value) || value.version !== 1 || value.migrationVersion !== 1 || !isRecord(value.inventory)) return false;
    if (Object.keys(value.inventory).some(id => !IDS.includes(id))) return false;
    if (!IDS.every(id => isCount(value.inventory[id]) && value.inventory[id] <= 2) || !isCount(value.ink)) return false;
    if (validateLoadouts(value.loadouts, value.inventory)) return false;
    if (typeof value.instanceNamespace !== "string" || !/^[a-z0-9-]{1,80}$/.test(value.instanceNamespace)) return false;
    if (!isCount(value.nextInstance)) return false;
    if (value.currentInstance !== null && (!isRecord(value.currentInstance) ||
        typeof value.currentInstance.id !== "string" || value.currentInstance.id.length > 150 ||
        !IDS.includes(value.currentInstance.chapterId))) return false;
    if (!isRecord(value.claimedInstances) || Object.keys(value.claimedInstances).length > CLAIM_LIMIT) return false;
    if (Object.entries(value.claimedInstances).some(([instance, id]) => !instance || instance.length > 150 || !IDS.includes(id))) return false;
    return true;
  }

  function create(options = {}) {
    let storage;
    let blocked = false;
    let persistent = false;
    let warning = "";
    let state;
    let corruptionNotice = "";
    const practice = options.practice === true;
    try {
      storage = Object.prototype.hasOwnProperty.call(options, "storage") ? options.storage : global.localStorage;
      if (!practice && (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function")) throw new Error("storage unavailable");
    } catch {
      blocked = true;
      warning = "无法读取本地存档，本次符文与配装仅会话有效。";
    }

    function persist() {
      if (practice) return false;
      if (blocked) { persistent = false; return false; }
      try {
        storage.setItem(KEY, JSON.stringify(state));
        persistent = true;
        warning = corruptionNotice;
      } catch {
        persistent = false;
        warning = "存档写入失败，本次符文与配装仅会话有效；请保留此页面。";
      }
      return persistent;
    }

    if (!practice && !blocked) {
      let raw;
      try { raw = storage.getItem(KEY); }
      catch {
        blocked = true;
        warning = "无法读取本地存档，原存档未覆盖；本次仅会话有效。";
      }
      if (!blocked && raw !== null && raw !== undefined) {
        try {
          const parsed = JSON.parse(raw);
          if (!validState(parsed)) throw new Error("invalid rune save");
          state = parsed;
          persistent = true;
        } catch {
          // Never discard damaged data until its exact original value is backed up.
          try {
            storage.setItem(`${KEY}-corrupt-${nonce()}`, raw);
            corruptionNotice = "符文存档损坏，原值已备份；已重建配装并补回旧章节符文。";
            warning = corruptionNotice;
          } catch {
            blocked = true;
            warning = "符文存档损坏且备份失败，原存档未覆盖；本次仅会话有效。";
          }
        }
      }
    }

    if (!state) {
      state = freshState(options.completedZodiacs || []);
      if (practice) {
        IDS.forEach(id => { state.inventory[id] = 2; });
        if (options.loadouts && !validateLoadouts(options.loadouts, state.inventory)) state.loadouts = clone(options.loadouts);
        warning = "";
      } else persist();
    }

    const store = {
      get state() { return clone(state); },
      get persistent() { return persistent; },
      get warning() { return warning; },
      get practice() { return practice; },
      getLoadouts() { return clone(state.loadouts); },
      equip(loadouts) {
        const error = validateLoadouts(loadouts, state.inventory);
        if (error) return { ok: false, error, persistent };
        state.loadouts = clone(loadouts);
        persist();
        return { ok: true, error: null, persistent };
      },
      createInstance(chapterId) {
        if (!IDS.includes(chapterId)) return null;
        if (state.nextInstance >= Number.MAX_SAFE_INTEGER - 1) {
          state.instanceNamespace = nonce();
          state.nextInstance = 0;
        }
        state.nextInstance += 1;
        const id = `${state.instanceNamespace}:${state.nextInstance}:${chapterId}`;
        state.currentInstance = { id, chapterId };
        persist();
        return id;
      },
      reward(zodiacId, instanceId, isPractice = false) {
        const result = { awarded: false, kind: null, id: zodiacId, count: state.inventory[zodiacId] || 0, ink: state.ink, persistent };
        if (practice || isPractice || !IDS.includes(zodiacId)) return result;
        // Only the live run can claim. Retired ids stay invalid even after the
        // bounded receipt history is pruned, including after a page reload.
        if (!state.currentInstance || state.currentInstance.id !== instanceId || state.currentInstance.chapterId !== zodiacId ||
            Object.prototype.hasOwnProperty.call(state.claimedInstances, instanceId)) return result;
        const kind = state.inventory[zodiacId] < 2 ? "rune" : "ink";
        if (kind === "rune") state.inventory[zodiacId] += 1;
        else state.ink = Math.min(Number.MAX_SAFE_INTEGER, state.ink + DUPLICATE_INK);
        state.claimedInstances[instanceId] = zodiacId;
        const receipts = Object.keys(state.claimedInstances);
        receipts.slice(0, Math.max(0, receipts.length - CLAIM_LIMIT)).forEach(id => { delete state.claimedInstances[id]; });
        // Ownership and the receipt are committed as one localStorage value.
        persist();
        return { awarded: true, kind, id: zodiacId, count: state.inventory[zodiacId], ink: state.ink, persistent };
      }
    };
    return store;
  }

  global.LiangyiRuneStore = Object.freeze({
    key: KEY, ids: IDS, duplicateInk: DUPLICATE_INK, blankLoadouts, validateLoadouts,
    create,
    createPractice(loadouts) { return create({ practice: true, storage: null, loadouts }); }
  });
})(window);
