/* The equipment dialog edits a draft; only the scene can apply it to combat. */
(() => {
  "use strict";

  const FORMS = ["light", "shadow"];
  const PATHS = [
    { name: "阿修罗", role: "主武器", key: "J", sign: "兵" },
    { name: "天道", role: "主动术法", key: "U", sign: "术" },
    { name: "人间", role: "身法", key: "K / ⇧", sign: "行" },
    { name: "畜生", role: "灵契", key: "随行", sign: "契" },
    { name: "饿鬼", role: "回灵", key: "被动", sign: "灵" },
    { name: "地狱", role: "攻击附效", key: "被动", sign: "印" }
  ];
  const FACE_NAMES = { light: "阳", shadow: "阴" };
  const pathName = index => PATHS[index].name.endsWith("道") ? PATHS[index].name : `${PATHS[index].name}道`;
  const copy = value => ({ light: [...value.light], shadow: [...value.shadow] });
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const escape = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));

  function create(scene) {
    const zodiacs = window.LIANGYI_ZODIAC || [];
    const zodiacById = Object.fromEntries(zodiacs.map(zodiac => [zodiac.id, zodiac]));
    const drafts = new WeakMap();
    const fallbackContext = {};
    let context = fallbackContext;
    let draft;
    let baseline;
    let form = "light";
    let slot = 0;
    let selectedRune = null;
    let opened = false;
    let turning = false;
    let turnFinishTimer = null;
    let returnFocus = null;
    let notice = "";
    const panel = document.createElement("dialog");
    panel.id = "rune-panel";
    panel.className = "rune-dialog";
    panel.setAttribute("aria-labelledby", "rune-title");
    panel.setAttribute("aria-describedby", "rune-intro");
    panel.innerHTML = `
      <header class="rune-heading">
        <div><div class="rune-eyebrow">两仪巡界录 <span>·</span> 六道轮回</div><h1 id="rune-title">十二元辰符盘</h1><p id="rune-intro">一符六用，阴阳各成一式。翻转符盘，编排你的巡界之术。</p></div>
        <button type="button" class="rune-close" aria-label="关闭符文装备">×</button>
      </header>
      <div class="rune-session"><span class="rune-context"></span><span class="rune-ink"></span></div>
      <div class="rune-workbench">
        <section class="rune-disc-section" aria-label="阴阳六道装备槽">
          <div class="rune-face-switch" role="group" aria-label="查看符盘的另一面">
            <button type="button" data-rune-face="light" aria-pressed="true"><span>阳</span>照世之面</button>
            <button type="button" data-rune-face="shadow" aria-pressed="false"><span>阴</span>渡魂之面</button>
          </div>
          <div class="rune-wheel">
            <svg class="rune-wheel-etching" viewBox="0 0 400 400" aria-hidden="true"><circle cx="200" cy="200" r="182"/><circle cx="200" cy="200" r="176"/><circle cx="200" cy="200" r="132"/><path d="M200 54 326 127 326 273 200 346 74 273 74 127Z M200 54V346 M74 127 326 273 M326 127 74 273"/><circle cx="200" cy="200" r="64"/></svg>
            <div class="rune-orbit">${FORMS.map(side => `<div class="rune-face rune-face-${side}" data-disc-face="${side}">${PATHS.map((path, index) => `<button type="button" class="rune-slot rune-slot-${index}" data-rune-slot="${index}" data-slot-face="${side}"><span class="rune-slot-number">${["壹", "贰", "叁", "肆", "伍", "陆"][index]}</span><strong class="rune-slot-sign">${path.sign}</strong><span class="rune-slot-path">${path.name}</span><small class="rune-slot-rune">空槽</small></button>`).join("")}</div>`).join("")}</div>
            <button type="button" class="rune-flip" aria-label="翻转符盘，查看阴面"><span class="rune-taiji" aria-hidden="true">☯</span><strong class="rune-flip-name">阳面</strong><small>点击翻面 ↻</small></button>
          </div>
          <div class="rune-disc-caption"><span class="rune-viewing"></span><span>翻面仅查看 · 战斗按 L 切换</span></div>
          <div class="rune-loadout-summary"></div>
        </section>
        <section class="rune-selection" aria-label="选择并装备生肖符文">
          <div class="rune-inventory-heading"><h2>元辰符匣</h2><span class="rune-inventory-count"></span></div>
          <p class="rune-inventory-hint">选择符盘上的道位，再挑一枚符文。</p>
          <div class="rune-inventory" aria-label="生肖符文库存">${zodiacs.map(zodiac => `<button type="button" class="rune-item" data-rune-id="${escape(zodiac.id)}"><span class="rune-item-branch">${escape(zodiac.branch)}</span><strong>${escape(zodiac.animal)}</strong><span class="rune-item-count"></span><span class="rune-item-mark"></span></button>`).join("")}</div>
          <article class="rune-detail" aria-live="polite">
            <div class="rune-detail-path"></div><h3 class="rune-detail-name"></h3><p class="rune-detail-description"></p>
            <div class="rune-detail-stock"></div>
            <div class="rune-detail-actions"><button type="button" class="rune-place">放入此道</button><button type="button" class="rune-remove">卸下</button></div>
          </article>
        </section>
      </div>
      <div class="rune-storage-warning" role="status" hidden></div>
      <footer class="rune-footer"><div><p class="rune-apply-reason"></p><p class="rune-notice" role="status" aria-live="polite"></p></div><div class="rune-footer-actions"><button type="button" class="rune-discard">还原草案</button><button type="button" class="rune-confirm">确认装备</button></div></footer>`;
    document.body.append(panel);
    const find = selector => panel.querySelector(selector);
    const all = selector => [...panel.querySelectorAll(selector)];

    function state() {
      return scene.getRuneEquipmentState();
    }

    function entry(id, side, index) {
      const runtime = window.LiangyiRunes?.getEntry?.(id, side, index);
      if (runtime?.name) return runtime;
      return { name: id ? `${zodiacById[id]?.branch || ""}${zodiacById[id]?.animal || ""} · ${PATHS[index].role}` : "基础能力", description: id ? "此道位的符文效果将在确认装备后生效。" : "未放入生肖符文，保留巡界使的基础能力。" };
    }

    function countUsed(id, value = draft) {
      return FORMS.reduce((total, side) => total + value[side].filter(item => item === id).length, 0);
    }

    function remember() {
      drafts.set(context, { draft: copy(draft), baseline: copy(baseline), form, slot });
    }

    function validate(value, equipmentState) {
      for (const side of FORMS) {
        const seen = new Set();
        for (const id of value[side]) {
          if (!id) continue;
          if (!zodiacById[id]) return "这枚生肖符文不可用。";
          if (seen.has(id)) return "同一面只能装备一枚相同生肖的符文。";
          seen.add(id);
        }
      }
      for (const id of Object.keys(zodiacById)) {
        if (countUsed(id, value) > (equipmentState.inventory?.[id] || 0)) return "阴阳两面同时装备同生肖，需要拥有两枚符文。";
      }
      return "";
    }

    function candidate() {
      const next = copy(draft);
      const from = selectedRune ? next[form].indexOf(selectedRune) : -1;
      if (from !== -1) next[form][from] = null;
      next[form][slot] = selectedRune;
      return { next, from };
    }

    function render() {
      if (!draft) return;
      const equipmentState = state();
      const dirty = !same(draft, baseline);
      panel.dataset.face = form;
      panel.dataset.turning = String(turning);
      find(".rune-wheel").setAttribute("aria-busy", String(turning));
      find(".rune-context").textContent = equipmentState.practice ? "演武试装 · 全部符文可用" : "正式符盘 · 击败元辰获得对应符文";
      find(".rune-ink").textContent = `符墨 ${equipmentState.ink || 0}`;
      all("[data-rune-face]").forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.runeFace === form));
        button.disabled = turning;
      });
      all("[data-disc-face]").forEach(face => {
        const active = face.dataset.discFace === form;
        face.inert = !active;
        face.setAttribute("aria-hidden", String(!active));
      });
      all("[data-rune-slot]").forEach(button => {
        const index = Number(button.dataset.runeSlot), side = button.dataset.slotFace, id = draft[side][index], zodiac = zodiacById[id];
        const selected = side === form && index === slot;
        button.disabled = turning || side !== form;
        button.classList.toggle("selected", selected);
        button.classList.toggle("filled", Boolean(id));
        button.setAttribute("aria-pressed", String(selected));
        button.setAttribute("aria-label", `${FACE_NAMES[side]}面 ${PATHS[index].name} ${PATHS[index].role}，${id ? `${zodiac.branch}${zodiac.animal} · ${entry(id, side, index).name}` : "空槽，基础能力"}`);
        button.querySelector(".rune-slot-sign").textContent = zodiac?.animal || PATHS[index].sign;
        button.querySelector(".rune-slot-rune").textContent = zodiac ? `${zodiac.branch}${zodiac.animal}符` : "未装符文";
      });
      const other = form === "light" ? "shadow" : "light";
      find(".rune-flip").setAttribute("aria-label", `翻转符盘，查看${FACE_NAMES[other]}面`);
      find(".rune-flip").disabled = turning;
      find(".rune-flip-name").textContent = `${FACE_NAMES[form]}面`;
      find(".rune-viewing").textContent = turning ? "符盘翻转中…" : `已装 ${draft[form].filter(Boolean).length} / 6 道`;
      find(".rune-loadout-summary").innerHTML = PATHS.map((path, index) => `<span${index === slot ? ' class="selected"' : ""}><small>${path.role}</small><b>${escape(draft[form][index] ? entry(draft[form][index], form, index).name : "基础")}</b></span>`).join("");
      const ownedCount = zodiacs.filter(zodiac => (equipmentState.inventory?.[zodiac.id] || 0) > 0).length;
      find(".rune-inventory-count").textContent = `${ownedCount} / 12 已收集`;
      find(".rune-inventory-hint").textContent = ownedCount ? "先选道位，再选符文；同面同生肖可移位。" : "符匣尚空。击败任一元辰获得符文，也可进入演武自由试装。";
      all("[data-rune-id]").forEach(button => {
        const id = button.dataset.runeId, count = equipmentState.inventory?.[id] || 0, used = countUsed(id), zodiac = zodiacById[id];
        button.disabled = turning;
        button.classList.toggle("unowned", count === 0);
        button.classList.toggle("selected", selectedRune === id);
        button.classList.toggle("equipped", used > 0);
        button.setAttribute("aria-pressed", String(selectedRune === id));
        button.setAttribute("aria-label", `${zodiac.branch}${zodiac.animal}符文，拥有 ${count} 枚，草案已用 ${used} 枚${count ? "" : "，尚未获得，可查看效果"}`);
        button.querySelector(".rune-item-count").textContent = count ? `${used} / ${count}` : "未得";
        button.querySelector(".rune-item-mark").textContent = used ? "已置" : count ? "可用" : "";
      });
      const effect = entry(selectedRune, form, slot);
      const selectedName = selectedRune ? `${zodiacById[selectedRune].branch}${zodiacById[selectedRune].animal}符` : "空槽";
      const destination = PATHS[slot];
      find(".rune-detail-path").innerHTML = `<span>${FACE_NAMES[form]} · ${escape(pathName(slot))}</span><span>${escape(destination.role)} <kbd>${destination.key}</kbd></span>`;
      find(".rune-detail-name").textContent = effect.name;
      find(".rune-detail-description").textContent = effect.description || "";
      const { next, from } = candidate();
      const error = selectedRune ? validate(next, equipmentState) : "先从符匣选择一枚符文。";
      const current = draft[form][slot];
      let stockText = selectedRune ? `${selectedName} · 拥有 ${equipmentState.inventory?.[selectedRune] || 0} 枚 · 草案使用 ${countUsed(selectedRune)} 枚` : "选择上方生肖，可查看在此道位的效果。";
      if (selectedRune && !(equipmentState.inventory?.[selectedRune] > 0)) stockText = "尚未获得：击败对应元辰即可永久收入符匣。";
      else if (selectedRune && error) stockText = error;
      else if (selectedRune && from >= 0 && from !== slot) stockText = `将从${pathName(from)}移至${pathName(slot)}；原道位恢复基础能力。`;
      find(".rune-detail-stock").textContent = stockText;
      const place = find(".rune-place");
      place.disabled = turning || !selectedRune || Boolean(error) || current === selectedRune;
      place.textContent = current === selectedRune && selectedRune ? "已放入此道" : from >= 0 && from !== slot ? `从${PATHS[from].name}移入` : current ? "替换此道符文" : "放入此道";
      find(".rune-remove").disabled = turning || !current;
      find(".rune-remove").setAttribute("aria-label", `卸下${FACE_NAMES[form]}面${pathName(slot)}的符文`);
      const storageWarning = find(".rune-storage-warning");
      storageWarning.hidden = equipmentState.practice || (!equipmentState.warning && equipmentState.persistent !== false);
      storageWarning.textContent = equipmentState.warning || "浏览器存储不可用，本次符文与装备仅在本次会话有效。";
      const unavailableReason = (equipmentState.reason || "战斗中无法应用装备").replace(/[。\s]+$/g, "");
      find(".rune-apply-reason").textContent = equipmentState.safe ? equipmentState.practice ? "演武配装即时应用，退出演武恢复正式符盘。" : "当前可换装。确认后保存阴阳两面，不补充生命或灵力。" : `${unavailableReason}。草案会保留，可在安全处再次打开并确认。`;
      find(".rune-notice").textContent = notice || (dirty ? "草案尚未应用。" : "符盘与当前装备一致。 ");
      find(".rune-discard").disabled = turning || !dirty;
      find(".rune-confirm").disabled = turning || !dirty || !equipmentState.safe || Boolean(validate(draft, equipmentState));
      find(".rune-confirm").textContent = equipmentState.safe ? "确认装备" : "安全处可确认";
      remember();
    }

    function finishTurn() {
      window.clearTimeout(turnFinishTimer);
      turnFinishTimer = null;
      if (!turning) return;
      turning = false;
      if (opened) render();
    }

    function flip(nextForm) {
      if (turning || !FORMS.includes(nextForm) || form === nextForm) return;
      const reducedMotion = document.body.classList.contains("reduce-motion") ||
        window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      // Moving hit targets must never accept a placement or a stale face click.
      // Native disabled controls also make keyboard and automated interactions wait.
      turning = !reducedMotion;
      form = nextForm;
      selectedRune = draft[form][slot];
      notice = "";
      render();
      if (turning) turnFinishTimer = window.setTimeout(finishTurn, 750);
    }

    function finishClose() {
      if (!opened) return;
      opened = false;
      finishTurn();
      remember();
      scene.endRuneEquipment();
      if (returnFocus?.isConnected && returnFocus.getClientRects().length && !returnFocus.closest('[inert], [hidden], .hidden')) returnFocus.focus({ preventScroll: true });
      else if (scene.running && !scene.paused && !scene.won && !scene.lost) scene.focusGame?.();
      returnFocus = null;
    }

    function close() {
      if (!opened) return;
      panel.close();
      finishClose();
    }

    function open() {
      if (opened) return;
      returnFocus = document.activeElement;
      context = scene.runeStore && typeof scene.runeStore === "object" ? scene.runeStore : fallbackContext;
      const actual = scene.getRuneLoadouts();
      const saved = drafts.get(context);
      baseline = copy(actual);
      draft = saved && same(saved.baseline, actual) ? copy(saved.draft) : copy(actual);
      form = saved?.form || (scene.formMode === "shadow" ? "shadow" : "light");
      slot = saved?.slot || 0;
      selectedRune = draft[form][slot];
      notice = "";
      if (scene.beginRuneEquipment() === false) return;
      opened = true;
      render();
      panel.showModal();
      find(`[data-slot-face="${form}"][data-rune-slot="${slot}"]`).focus({ preventScroll: true });
    }

    all("[data-rune-slot]").forEach(button => button.addEventListener("click", () => {
      if (turning || button.dataset.slotFace !== form) return;
      slot = Number(button.dataset.runeSlot);
      selectedRune = draft[form][slot];
      notice = "";
      render();
    }));
    all("[data-rune-face]").forEach(button => button.addEventListener("click", () => flip(button.dataset.runeFace)));
    find(".rune-flip").addEventListener("click", () => flip(form === "light" ? "shadow" : "light"));
    all("[data-rune-id]").forEach(button => button.addEventListener("click", () => {
      if (turning) return;
      selectedRune = button.dataset.runeId;
      notice = "";
      render();
    }));
    find(".rune-place").addEventListener("click", () => {
      if (turning || !selectedRune) return;
      const { next } = candidate();
      const error = validate(next, state());
      if (error) { notice = error; render(); return; }
      draft = next;
      notice = "已更新草案，点击确认装备后生效。";
      render();
    });
    find(".rune-remove").addEventListener("click", () => {
      if (turning) return;
      draft[form][slot] = null;
      selectedRune = null;
      notice = "已从草案卸下；符文仍在符匣中。";
      render();
    });
    find(".rune-discard").addEventListener("click", () => {
      if (turning) return;
      draft = copy(scene.getRuneLoadouts());
      baseline = copy(draft);
      selectedRune = draft[form][slot];
      notice = "已还原为当前装备。";
      render();
    });
    find(".rune-confirm").addEventListener("click", () => {
      if (turning) return;
      const equipmentState = state();
      const error = validate(draft, equipmentState);
      if (!equipmentState.safe || error) { notice = error || equipmentState.reason; render(); return; }
      const result = scene.applyRuneLoadouts(copy(draft));
      if (result?.ok) {
        baseline = copy(scene.getRuneLoadouts());
        draft = copy(baseline);
        notice = equipmentState.practice ? "演武符盘已生效。关闭符盘即可试招。" : "阴阳符盘已装备。关闭符盘即可继续巡界。";
      } else notice = result?.error || "暂时无法应用装备，请稍后重试。";
      render();
    });
    find(".rune-close").addEventListener("click", close);
    find(".rune-orbit").addEventListener("transitionend", event => {
      if (event.target === find(".rune-orbit") && event.propertyName === "transform") finishTurn();
    });
    find(".rune-orbit").addEventListener("transitioncancel", event => {
      if (event.target === find(".rune-orbit") && event.propertyName === "transform") finishTurn();
    });
    panel.addEventListener("cancel", event => { event.preventDefault(); close(); });
    panel.addEventListener("close", finishClose);
    ["keydown", "keyup"].forEach(type => panel.addEventListener(type, event => event.stopPropagation()));
    const triggers = [...document.querySelectorAll("[data-open-runes]")];
    triggers.forEach(button => button.addEventListener("click", open));
    scene.events?.once?.("shutdown", () => {
      window.clearTimeout(turnFinishTimer);
      triggers.forEach(button => button.removeEventListener("click", open));
      panel.remove();
    });
    return { open, close, refresh: () => { if (opened) render(); } };
  }

  window.LiangyiRuneUI = Object.freeze({ create });
})();
