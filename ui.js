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
        // 赤猫チェック：選ばれたカードが赤猫ならon_targetedを呼ぶ
        if(typeof CARD_EFFECTS !== "undefined") {
          const targetEff = CARD_EFFECTS[obj.code];
          if(targetEff?.on_targeted) targetEff.on_targeted(obj);
        }
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
    const top = G.mainDeck.shift();
    top.fromDeck = true;
    // デッキ最後の1枚だった場合→on_deck_revealチェック
    if(G.mainDeck.length === 0) {
      const eff = typeof CARD_EFFECTS !== "undefined" ? CARD_EFFECTS[top.code] : null;
      if(eff?.on_deck_reveal) setTimeout(()=>eff.on_deck_reveal(top), 300);
    }
    G.hand.push(top);
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

// ------------------------------------------------------------
// gainAbility(obj, abilityText, temporary)
// 「〜を得る」効果の汎用処理
//
// abilityText: 得る能力のテキスト
//   例: "《駿足》" / "ATK+2/DEF+1" / "ATK+X" / "『〜〜』"
// temporary: true=ターン終了時まで / false=永続（デフォルトfalse）
//
// objに以下のフィールドを付与：
//   obj.keywords[]      キーワード効果リスト（《》）
//   obj.atkMod          ATK修正値（累積）
//   obj.defMod          DEF修正値（累積）
//   obj.gainedEffects[] テキスト能力リスト（「」『』）
//   obj.tempAbilities[] ターン終了時リセット対象の記録
// ------------------------------------------------------------
function gainAbility(obj, abilityText, temporary = false) {
  if(!obj) return;
  const text = abilityText.trim();

  // キーワード効果（《》で囲まれたもの）
  const kwMatches = [...text.matchAll(/《([^》]+)》/g)];
  for(const m of kwMatches) {
    const kw = m[1];
    if(!obj.keywords) obj.keywords = [];
    if(!obj.keywords.includes(kw)) {
      obj.keywords.push(kw);
      if(temporary) recordTemp(obj, "keyword", kw);
      // 特殊キーワードの即時反映
      if(kw === "駿足") { obj.hasShunsoku = true; obj.summonedThisTurn = false; }
      if(kw === "早業") obj.hasHayawaza = true;
    }
  }

  // ATK/DEF修正（ATK+X/DEF+X, ATK+X, DEF+X など）
  const statMatch = text.match(/ATK([+\-]\d+)(?:\/DEF([+\-]\d+))?/);
  if(statMatch) {
    const atkDelta = parseInt(statMatch[1]) || 0;
    const defDelta = parseInt(statMatch[2] || 0) || 0;
    if(atkDelta) { obj.atkMod = (obj.atkMod||0) + atkDelta; if(temporary) recordTemp(obj, "atkMod", atkDelta); }
    if(defDelta) { obj.defMod = (obj.defMod||0) + defDelta; if(temporary) recordTemp(obj, "defMod", defDelta); }
  }
  const defOnlyMatch = !statMatch && text.match(/DEF([+\-]\d+)/);
  if(defOnlyMatch) {
    const defDelta = parseInt(defOnlyMatch[1]);
    obj.defMod = (obj.defMod||0) + defDelta;
    if(temporary) recordTemp(obj, "defMod", defDelta);
  }

  // テキスト能力（「」または『』で囲まれたもの）
  const textMatches = [...text.matchAll(/[「『]([^」』]+)[」』]/g)];
  for(const m of textMatches) {
    const ability = m[1];
    if(!obj.gainedEffects) obj.gainedEffects = [];
    obj.gainedEffects.push(ability);
    if(temporary) recordTemp(obj, "gainedEffect", ability);
  }

  renderGame();
  const cardName = cards.find(c=>c.code===obj.code)?.name || obj.code;
  setMsg(`⚡「${cardName}」が能力を得ました：${text}`);
}

// ターン終了時リセット用の記録
function recordTemp(obj, type, value) {
  if(!obj.tempAbilities) obj.tempAbilities = [];
  obj.tempAbilities.push({ type, value });
}

// ターン終了時に一時的な能力をリセット（夜警フェイズで呼ぶ）
function resetTempAbilities() {
  [...G.field, ...G.pile, ...G.hand, ...G.grave].forEach(obj => {
    if(!obj.tempAbilities || obj.tempAbilities.length === 0) return;
    for(const temp of obj.tempAbilities) {
      if(temp.type === "keyword") {
        obj.keywords = (obj.keywords||[]).filter(k => k !== temp.value);
        if(temp.value === "駿足") obj.hasShunsoku = false;
        if(temp.value === "早業") obj.hasHayawaza = false;
      }
      if(temp.type === "atkMod") obj.atkMod = (obj.atkMod||0) - temp.value;
      if(temp.type === "defMod") obj.defMod = (obj.defMod||0) - temp.value;
      if(temp.type === "gainedEffect") {
        obj.gainedEffects = (obj.gainedEffects||[]).filter(e => e !== temp.value);
      }
    }
    obj.tempAbilities = [];
  });
}

// ------------------------------------------------------------
// isAri(card) - アリ判定
// ------------------------------------------------------------
function isAri(card) {
  if(!card) return false;
  return (card.tribe || "").includes("アリ");
}

// ------------------------------------------------------------
// payTerrainCost(count, filter, callback)
// 戦場のカードをcoast枚生贄に捧げる
// filter: 生贄対象の絞り込み（省略で全て）
// callback(): 支払い完了後の処理
// ------------------------------------------------------------
function sacrificeFromField(count, filter, callback) {
  const label = count === 1 ? "1つ" : `${count}つ`;
  pickFromZone("field", {
    message: `生贄に捧げるカードを${label}選んでください`,
    count,
    filter: filter || (() => true),
    canCancel: false,
  }, (selected) => {
    if(selected.length < count) return;
    selected.forEach(o => moveCard(o, "field", "grave"));
    renderGame();
    callback && callback(selected);
  });
}

// ------------------------------------------------------------
// payMoveCost(obj)
// 「ムーブ、〜して発動する」のムーブコスト処理
// objをムーブ状態にして返す
// ------------------------------------------------------------
function payMoveCost(obj) {
  obj.rested = true;
  renderGame();
}

// ------------------------------------------------------------
// payCostTerrain(amount, callback)
// ②などのコスト支払い（領土をamt枚ムーブ）
// ------------------------------------------------------------
function payCostTerrain(amount, callback) {
  const available = G.territory.filter(o => !o.rested);
  if(available.length < amount) {
    setMsg(`⚠️ コスト${amount}を支払えません（ウェイク領土：${available.length}枚）`);
    return;
  }
  pickFromZone("field", {
    message: `コスト②：領土を${amount}枚選んでムーブしてください`,
    count: amount,
    filter: (o) => G.territory.includes(o) && !o.rested,
    canCancel: false,
  }, (selected) => {
    selected.forEach(o => { o.rested = true; });
    renderGame();
    callback && callback();
  });
}

// ------------------------------------------------------------
// revealDeckTop(count, callback)
// デッキ上count枚を公開してcallback(revealedObjs[])に渡す
// ------------------------------------------------------------
function revealDeckTop(count, callback) {
  const actual = Math.min(count, G.mainDeck.length);
  if(actual === 0) { setMsg("デッキが空です。"); return; }
  const revealed = G.mainDeck.slice(0, actual);
  const names = revealed.map(o => cards.find(c=>c.code===o.code)?.name || o.code).join("、");
  setMsg(`公開：${names}`);
  callback && callback(revealed);
}

// ------------------------------------------------------------
// deployFromHand(filter, rested, callback)
// 手札のカードを戦場に出す（rested=true でムーブ状態）
// ------------------------------------------------------------
function deployFromHand(filter, rested, callback) {
  pickFromZone("hand", {
    message: "戦場に出すカードを選んでください",
    count: 1,
    filter: filter || (() => true),
  }, (selected) => {
    if(selected.length === 0) return;
    const obj = selected[0];
    moveCard(obj, "hand", "field");
    if(rested) obj.rested = true;
    const c = cards.find(c => c.code === obj.code);
    if(!(c?.effect||"").includes("《駿足》")) obj.summonedThisTurn = true;
    renderGame();
    setTimeout(() => triggerCardEffect(obj, "field_enter"), 300);
    callback && callback(obj);
  });
}

// ------------------------------------------------------------
// キツネ系ユーティリティ
// ------------------------------------------------------------
function isKitsune(card) {
  if(!card) return false;
  return (card.tribe || "").includes("キツネ");
}

function isKitsuneObj(obj) {
  const c = cards.find(c => c.code === obj.code);
  return c && isKitsune(c);
}

// ------------------------------------------------------------
// addYouko(obj, amount)
// 妖狐カウンターをamount個追加する
// 見狐の常時効果（自身の効果以外では置けない）はcallerで管理
// ------------------------------------------------------------
function addYouko(obj, amount, caller = null) {
  // 見狐が戦場にいて、対象が見狐でない場合、見狐以外からの付与をブロック
  const mikoBan = G.field.find(o => o.code === "BP1-023");
  if(mikoBan && obj !== mikoBan && obj.code !== "BP1-023") {
    // 見狐自身の効果（caller === "BP1-023"）以外は通常通り
  }
  if(!obj.counters) obj.counters = {};
  obj.counters["妖狐"] = (obj.counters["妖狐"] || 0) + amount;
  renderGame();
}

// ------------------------------------------------------------
// removeYouko(obj, amount, caller)
// 妖狐カウンターをamount個取り除く
// 見狐が戦場にいれば連動して妖狐カウンターを付与する
// ------------------------------------------------------------
function removeYouko(obj, amount, caller = null) {
  if(!obj.counters) obj.counters = {};
  const current = obj.counters["妖狐"] || 0;
  const actual = Math.min(amount, current);
  obj.counters["妖狐"] = current - actual;
  renderGame();

  // 見狐の誘発チェック：自分以外のキツネ存在から妖狐カウンターが取り除かれた時
  const miko = G.field.find(o => o.code === "BP1-023" && o !== obj);
  if(miko && actual > 0) {
    const c = cards.find(c => c.code === obj.code);
    const isKitsuneTarget = c && isKitsune(c);
    if(isKitsuneTarget) {
      // 見狐自身の効果で取り除かれた場合は連動しない
      if(caller !== "BP1-023") {
        if(!miko.counters) miko.counters = {};
        miko.counters["妖狐"] = (miko.counters["妖狐"] || 0) + actual;
        setMsg(`🦊 見狐：妖狐カウンター${actual}個を得ました。`);
        renderGame();
      }
    }
  }

  return actual;
}

// ------------------------------------------------------------
// equipCard(equipObj, targetObj)
// 装備カードを動物に装備させる
// ------------------------------------------------------------
function equipCard(equipObj, targetObj) {
  // フィールドから装備カードを特定
  equipObj.isEquipped = true;
  equipObj.equippedTo = targetObj.id;
  // 装備カードのATK/DEF効果を対象に付与
  const eqCard = cards.find(c => c.code === equipObj.code);
  const atkMatch = (eqCard?.effect||"").match(/ATK\+(\d+)/);
  const defMatch = (eqCard?.effect||"").match(/DEF\+(\d+)/);
  if(atkMatch) targetObj.atkMod = (targetObj.atkMod||0) + parseInt(atkMatch[1]);
  if(defMatch) targetObj.defMod = (targetObj.defMod||0) + parseInt(defMatch[1]);
  setMsg(`⚙️「${eqCard?.name||equipObj.code}」を「${cards.find(c=>c.code===targetObj.code)?.name||targetObj.code}」に装備しました。`);
  renderGame();
}

// ------------------------------------------------------------
// getEquippedCount(obj)
// 動物に装備されているカードの数を返す
// ------------------------------------------------------------
function getEquippedCount(obj) {
  return G.field.filter(e => e.isEquipped && e.equippedTo === obj.id).length;
}

// ------------------------------------------------------------
// ターン中のプレイ追跡（山岳カウント用）
// ------------------------------------------------------------
// G.turnPlayLog = [{code, type, condition}] でターン中のプレイを記録
function logPlay(obj) {
  const card = cards.find(c => c.code === obj.code);
  if(!card) return;
  if(!G.turnPlayLog) G.turnPlayLog = [];
  G.turnPlayLog.push({
    code: obj.code,
    name: card.name,
    type: card.type,
    condition: card.condition || "",
    isMountain: (card.condition||"").includes("山"),
  });
}

// ------------------------------------------------------------
// countMountainPlays()
// このターン中に山岳カードをプレイして相手を対象にした回数
// ------------------------------------------------------------
function countMountainPlays() {
  return (G.turnPlayLog||[]).filter(p => p.isMountain).length;
}

// ------------------------------------------------------------
// 脱出カウンターシステム
// 準備フェイズに脱出カウンターを1個減らし、0になったら戦場へ
// ------------------------------------------------------------
function processDasshutsuCounters() {
  const returning = [];
  G.exile.forEach(obj => {
    if(!obj.counters || !obj.counters["脱出"]) return;
    obj.counters["脱出"]--;
    if(obj.counters["脱出"] <= 0) {
      delete obj.counters["脱出"];
      returning.push(obj);
    }
  });
  returning.forEach(obj => {
    G.exile.splice(G.exile.indexOf(obj), 1);
    G.field.push(obj);
    obj.summonedThisTurn = true;
    const c = cards.find(c => c.code === obj.code);
    setMsg(`⚡「${c?.name||obj.code}」が脱出カウンターがなくなり戦場に戻りました。`);
    setTimeout(() => triggerCardEffect(obj, "field_enter"), 300);
  });
  if(returning.length > 0) renderGame();
}

// ------------------------------------------------------------
// 夜を明けた回数カウント（獄炎用）
// G.nightClearCount：このターンの狩りフェイズ中の領土夜明け回数
// ------------------------------------------------------------
function clearNight(obj) {
  obj.night = false;
  // 領土の夜明けカウント
  if(G.territory.includes(obj)) {
    G.nightClearCount = (G.nightClearCount||0) + 1;
  }
  renderGame();
}

// ------------------------------------------------------------
// revealAndPick(count, options, callback)
// デッキ上からcount枚を公開して選択・振り分けする
//
// options: {
//   message: string,          表示メッセージ
//   pickCount: number,        選ぶ枚数（デフォルト1）
//   filter: fn(obj, card),    選択可能な絞り込み条件（省略で全て選択可）
//   pickTo: string,           選んだカードの行き先（デフォルト"hand"）
//   remainTo: string,         残りの行き先（デフォルト"deck-bottom"）
//   canPickNone: bool,        1枚も選ばなくてもOKか（デフォルトfalse）
// }
// callback(picked[], remain[]) で結果を返す（省略可）
// ------------------------------------------------------------
function revealAndPick(count, options = {}, callback = null) {
  const actual = Math.min(count, G.mainDeck.length);
  if(actual === 0) { setMsg("デッキが空です。"); return; }

  // デッキ上からcount枚を取り出す
  const revealed = G.mainDeck.splice(0, actual);
  const pickCount = options.pickCount || 1;
  const pickTo = options.pickTo || "hand";
  const remainTo = options.remainTo || "deck-bottom";
  const filter = options.filter || (() => true);
  const message = options.message || `デッキ上${actual}枚を公開。${pickCount}枚選んでください`;
  const canPickNone = options.canPickNone || false;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay trigger-notice";
  overlay.style.cssText = "display:flex;z-index:500;align-items:flex-start;padding-top:20px;";

  const selected = new Set();

  const zoneLabel = { hand:"手札", field:"戦場", grave:"墓地", "deck-top":"デッキ上", "deck-bottom":"デッキ下", exile:"除外" };

  overlay.innerHTML = `
    <div class="modal-box" style="max-width:400px;" onclick="event.stopPropagation()">
      <p style="font-size:13px;color:#e0e8d0;margin-bottom:4px;">${message}</p>
      <p style="font-size:11px;color:#aaa;margin-bottom:10px;">
        残り→${zoneLabel[remainTo]||remainTo}　選択：<span id="rap-count">0</span>/${pickCount}枚
      </p>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;" id="rap-list"></div>
      <div id="rap-info" style="font-size:11px;color:#ffdd88;min-height:16px;text-align:center;margin-bottom:8px;"></div>
      <div class="modal-btn-row">
        <button class="modal-btn confirm" id="rap-ok">決定</button>
        <button class="modal-btn cancel" id="rap-cancel">キャンセル（全部${zoneLabel[remainTo]||remainTo}へ）</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const list = document.getElementById("rap-list");

  revealed.forEach((obj, i) => {
    const card = cards.find(c => c.code === obj.code);
    const selectable = filter(obj, card);
    const div = document.createElement("div");
    div.style.cssText = `position:relative;width:56px;cursor:${selectable?"pointer":"default"};opacity:${selectable?1:0.4};`;
    div.dataset.idx = i;
    const img = document.createElement("img");
    img.src = getImg(obj.code);
    img.style.cssText = "width:56px;height:78px;object-fit:cover;border-radius:6px;border:2px solid #4a8a4a;pointer-events:none;display:block;";
    img.onerror = () => { img.style.display="none"; };
    div.appendChild(img);
    const lbl = document.createElement("div");
    lbl.style.cssText = "font-size:6px;color:#e0e8d0;text-align:center;margin-top:2px;line-height:1.2;pointer-events:none;";
    lbl.textContent = card?.name || obj.code;
    div.appendChild(lbl);

    if(selectable) {
      div.addEventListener("click", () => {
        if(selected.has(i)) {
          selected.delete(i);
          img.style.border = "2px solid #4a8a4a";
        } else {
          if(selected.size >= pickCount) return; // 上限
          selected.add(i);
          img.style.border = "2px solid #ffdd00";
          img.style.boxShadow = "0 0 8px rgba(255,221,0,0.6)";
        }
        if(!selected.has(i)) img.style.boxShadow = "";
        document.getElementById("rap-count").textContent = selected.size;
        const names = [...selected].map(idx => cards.find(c=>c.code===revealed[idx].code)?.name||revealed[idx].code).join("、");
        document.getElementById("rap-info").textContent = selected.size > 0 ? `選択中：${names}` : "";
      });
    }
    list.appendChild(div);
  });

  const sendTo = (zone, obj) => {
    if(zone === "hand") G.hand.push(obj);
    else if(zone === "field") { G.field.push(obj); obj.summonedThisTurn = true; }
    else if(zone === "grave") G.grave.push(obj);
    else if(zone === "deck-top") G.mainDeck.unshift(obj);
    else if(zone === "deck-bottom") G.mainDeck.push(obj);
    else if(zone === "exile") G.exile.push(obj);
  };

  const confirm = () => {
    if(!canPickNone && selected.size === 0) {
      document.getElementById("rap-info").textContent = "⚠️ カードを選んでください";
      return;
    }
    const picked = [];
    const remain = [];
    revealed.forEach((obj, i) => {
      if(selected.has(i)) picked.push(obj);
      else remain.push(obj);
    });
    picked.forEach(obj => sendTo(pickTo, obj));
    remain.forEach(obj => sendTo(remainTo, obj));
    const pickNames = picked.map(o=>cards.find(c=>c.code===o.code)?.name||o.code).join("、");
    setMsg(`${pickNames ? `「${pickNames}」を${zoneLabel[pickTo]||pickTo}へ。` : ""}残り${remain.length}枚を${zoneLabel[remainTo]||remainTo}へ。`);
    overlay.remove();
    renderGame();
    callback && callback(picked, remain);
  };

  document.getElementById("rap-ok").onclick = confirm;
  document.getElementById("rap-cancel").onclick = () => {
    revealed.forEach(obj => sendTo(remainTo, obj));
    setMsg(`全${actual}枚を${zoneLabel[remainTo]||remainTo}へ戻しました。`);
    overlay.remove();
    renderGame();
    callback && callback([], revealed);
  };
}