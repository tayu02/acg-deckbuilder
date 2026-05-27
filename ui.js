// ============================================================
// effects/ui.js
// シミュレーター用 汎用UIライブラリ
// simulator.htmlのG・cards・renderGame等をグローバルとして参照
// ============================================================

// ------------------------------------------------------------
// askYesNo(message, onYes, onNo)
// 「〜してもよい」系の任意効果に使う
// ------------------------------------------------------------
function askYesNo(message, onYes, onNo) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay trigger-notice";
  overlay.style.cssText = "display:flex;z-index:500;";
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:320px;" onclick="event.stopPropagation()">
      <p style="font-size:13px;color:#e0e8d0;line-height:1.6;margin-bottom:14px;">${message}</p>
      <div class="modal-btn-row">
        <button class="modal-btn confirm" id="eff-yes">はい</button>
        <button class="modal-btn cancel"  id="eff-no">いいえ</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById("eff-yes").onclick = () => { overlay.remove(); onYes && onYes(); };
  document.getElementById("eff-no").onclick  = () => { overlay.remove(); onNo  && onNo();  };
}

// ------------------------------------------------------------
// askNumber(message, min, max, callback)
// 「Xは〜に等しい」可変値を入力させる
// callback(number)で結果を返す
// ------------------------------------------------------------
function askNumber(message, min, max, callback) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay trigger-notice";
  overlay.style.cssText = "display:flex;z-index:500;";
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:300px;" onclick="event.stopPropagation()">
      <p style="font-size:13px;color:#e0e8d0;line-height:1.6;margin-bottom:10px;">${message}</p>
      <input id="eff-num-input" type="number" min="${min}" max="${max}" value="${min}"
        style="width:100%;padding:8px;background:#1a2a3a;border:1px solid #4a8a4a;border-radius:8px;color:#ffdd88;font-size:20px;text-align:center;margin-bottom:12px;">
      <div class="modal-btn-row">
        <button class="modal-btn confirm" id="eff-num-ok">決定</button>
        <button class="modal-btn cancel"  id="eff-num-cancel">キャンセル</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const input = document.getElementById("eff-num-input");
  input.focus(); input.select();
  document.getElementById("eff-num-ok").onclick = () => {
    const val = Math.min(max, Math.max(min, parseInt(input.value) || min));
    overlay.remove();
    callback && callback(val);
  };
  document.getElementById("eff-num-cancel").onclick = () => overlay.remove();
}

// ------------------------------------------------------------
// askChoice(message, options, callback)
// 複数選択肢から1つ選ぶ（●から1つ選んで発動 など）
// options: [{label, value}] または [string, ...]
// callback(value)で結果を返す
// ------------------------------------------------------------
function askChoice(message, options, callback) {
  const opts = options.map(o => typeof o === "string" ? {label: o, value: o} : o);
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay trigger-notice";
  overlay.style.cssText = "display:flex;z-index:500;";
  const btns = opts.map((o, i) =>
    `<button class="modal-btn confirm" id="eff-choice-${i}"
      style="width:100%;margin-bottom:6px;text-align:left;padding:10px 12px;">
      ${o.label}
    </button>`
  ).join('');
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:340px;" onclick="event.stopPropagation()">
      <p style="font-size:13px;color:#e0e8d0;line-height:1.6;margin-bottom:12px;">${message}</p>
      ${btns}
      <button class="modal-btn cancel" id="eff-choice-cancel" style="width:100%;margin-top:4px;">キャンセル</button>
    </div>`;
  document.body.appendChild(overlay);
  opts.forEach((o, i) => {
    document.getElementById(`eff-choice-${i}`).onclick = () => {
      overlay.remove();
      callback && callback(o.value, i);
    };
  });
  document.getElementById("eff-choice-cancel").onclick = () => overlay.remove();
}

// ------------------------------------------------------------
// pickFromZone(zoneName, options, callback)
// 指定ゾーンからカードを選ばせる
//
// zoneName: "field" | "hand" | "grave" | "exile" | "pile" | "deck"
// options: {
//   message: string,        表示するメッセージ
//   count: number,          選ぶ枚数（デフォルト1）
//   filter: fn(obj, card),  絞り込み条件（省略で全部）
//   canCancel: bool,        キャンセル可能か（デフォルトtrue）
// }
// callback(selectedObjs[]) で結果を返す
// ------------------------------------------------------------
function pickFromZone(zoneName, options, callback) {
  const zoneMap = {
    field: G.field,
    hand:  G.hand,
    grave: G.grave,
    exile: G.exile,
    pile:  G.pile,
    deck:  G.mainDeck,
  };
  const zoneLabel = {
    field: "戦場", hand: "手札", grave: "墓地",
    exile: "除外", pile: "パイル", deck: "デッキ"
  };

  const zone = zoneMap[zoneName] || [];
  const count = options.count || 1;
  const filter = options.filter || (() => true);
  const message = options.message || `${zoneLabel[zoneName]}からカードを${count}枚選んでください`;
  const canCancel = options.canCancel !== false;

  // フィルタ適用
  const candidates = zone
    .map((obj, idx) => ({ obj, idx, card: cards.find(c => c.code === obj.code) }))
    .filter(({ obj, card }) => filter(obj, card));

  if(candidates.length === 0) {
    setMsg(`対象となるカードが${zoneLabel[zoneName]}にありません。`);
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay trigger-notice";
  overlay.style.cssText = "display:flex;z-index:500;align-items:flex-start;padding-top:30px;";

  const selected = new Set();

  overlay.innerHTML = `
    <div class="modal-box" style="max-width:380px;" onclick="event.stopPropagation()">
      <p style="font-size:13px;color:#e0e8d0;margin-bottom:4px;">${message}</p>
      <p style="font-size:11px;color:#aaa;margin-bottom:10px;">
        ${count === 1 ? "1枚選んでください" : `最大${count}枚選べます（現在：<span id="pick-count">0</span>枚）`}
      </p>
      <div class="modal-card-list" id="pick-zone-list" style="max-height:45vh;overflow-y:auto;"></div>
      <div id="pick-info" style="font-size:11px;color:#ffdd88;min-height:16px;margin:6px 0;text-align:center;"></div>
      <div class="modal-btn-row">
        <button class="modal-btn confirm" id="pick-confirm">決定</button>
        ${canCancel ? '<button class="modal-btn cancel" id="pick-cancel">キャンセル</button>' : ''}
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const list = document.getElementById("pick-zone-list");

  candidates.forEach(({ obj, card }, i) => {
    const div = document.createElement("div");
    div.className = "modal-select-card";
    div.style.cssText = "width:56px;height:78px;position:relative;flex-shrink:0;";
    div.dataset.idx = i;

    const img = document.createElement("img");
    img.src = obj.night ? "uramuki.JPG" : getImg(obj.code);
    img.style.pointerEvents = "none";
    img.onerror = () => {
      img.remove();
      const s = document.createElement("span");
      s.className = "card-label";
      s.textContent = card?.name || obj.code;
      div.appendChild(s);
    };
    div.appendChild(img);

    const lbl = document.createElement("div");
    lbl.style.cssText = "position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.7);font-size:6px;color:#e0e8d0;text-align:center;padding:1px;line-height:1.2;pointer-events:none;";
    lbl.textContent = card?.name || obj.code;
    div.appendChild(lbl);

    div.addEventListener("click", () => {
      if(count === 1) {
        // 1枚選択：即決定
        overlay.remove();
        callback && callback([obj]);
        return;
      }
      // 複数選択
      if(selected.has(i)) {
        selected.delete(i);
        div.classList.remove("selected");
      } else if(selected.size < count) {
        selected.add(i);
        div.classList.add("selected");
      }
      const cnt = document.getElementById("pick-count");
      if(cnt) cnt.textContent = selected.size;
      document.getElementById("pick-info").textContent =
        selected.size > 0 ? `${selected.size}枚選択中` : "";
    });

    div.addEventListener("touchend", (e) => {
      e.preventDefault();
      div.click();
    }, {passive: false});

    list.appendChild(div);
  });

  document.getElementById("pick-confirm").onclick = () => {
    if(count > 1 && selected.size === 0) {
      document.getElementById("pick-info").textContent = "⚠️ カードを選んでください";
      return;
    }
    const result = count === 1
      ? [] // 1枚は即決定なのでここには来ない
      : candidates.filter((_, i) => selected.has(i)).map(c => c.obj);
    overlay.remove();
    callback && callback(result);
  };

  if(canCancel) {
    document.getElementById("pick-cancel").onclick = () => overlay.remove();
  }
}

// ------------------------------------------------------------
// moveCard(obj, fromZone, toZone)
// カードをゾーン間で移動する汎用関数
// fromZone/toZone: "field"|"hand"|"grave"|"exile"|"pile"|"deck-top"|"deck-bottom"
// ------------------------------------------------------------
function moveCard(obj, fromZone, toZone) {
  const zoneMap = {
    field: G.field, hand: G.hand, grave: G.grave,
    exile: G.exile, pile: G.pile, deck: G.mainDeck,
  };
  const src = zoneMap[fromZone];
  if(src) {
    const idx = src.indexOf(obj);
    if(idx >= 0) src.splice(idx, 1);
  }
  if(toZone === "deck-top")    { G.mainDeck.unshift(obj); }
  else if(toZone === "deck-bottom") { G.mainDeck.push(obj); }
  else {
    const dst = zoneMap[toZone];
    if(dst) dst.push(obj);
  }
}

// ------------------------------------------------------------
// drawCards(count)
// デッキからcount枚ドローする
// ------------------------------------------------------------
function drawCards(count) {
  for(let i = 0; i < count; i++) {
    if(G.mainDeck.length === 0) { setMsg("⚠️ デッキが空です！"); break; }
    G.hand.push(G.mainDeck.shift());
  }
}

// ------------------------------------------------------------
// dealDamageToCard(obj, amount)
// カードにダメージを与え、DEF超えで自動墓地送り
// ------------------------------------------------------------
function dealDamageToCard(obj, amount) {
  const card = cards.find(c => c.code === obj.code);
  const def = getDEF(card);
  obj.damage = (obj.damage || 0) + amount;
  if(obj.damage >= def) {
    const idx = G.field.indexOf(obj);
    if(idx >= 0) {
      G.field.splice(idx, 1);
      obj.damage = 0;
      G.grave.push(obj);
      setMsg(`💀「${card?.name || obj.code}」が墓地へ送られました。`);
      setTimeout(() => checkTriggers("to_grave", obj), 300);
    }
  }
  renderGame();
}

// ------------------------------------------------------------
// searchDeck(filter, count, toZone, options)
// デッキから条件に合うカードを探して指定ゾーンへ
// filter: fn(card) → bool
// toZone: "hand"|"field"|"grave"など
// options.reveal: 公開するか（デフォルトfalse）
// ------------------------------------------------------------
function searchDeck(filter, count, toZone, options = {}) {
  const hits = G.mainDeck.filter(obj => {
    const card = cards.find(c => c.code === obj.code);
    return card && filter(card);
  });

  if(hits.length === 0) {
    setMsg("デッキに該当するカードがありませんでした。");
    shuffleDeck();
    return;
  }

  const message = options.message || `デッキから${count}枚選んで${toZone === "hand" ? "手札へ" : toZone + "へ"}加えます`;

  pickFromZone("deck", {
    message,
    count,
    filter: (obj, card) => card && filter(card),
  }, (selected) => {
    selected.forEach(obj => {
      moveCard(obj, "deck", toZone);
      const card = cards.find(c => c.code === obj.code);
      setMsg(`「${card?.name || obj.code}」を${toZone === "hand" ? "手札へ" : toZone + "へ"}加えました。`);
    });
    shuffleDeck();
    renderGame();
  });
}
