// ============================================================
// effects/cards.js
// 各カードの効果実装
// ui.jsの汎用関数を使って記述する
// ============================================================

// ------------------------------------------------------------
// 効果実装の登録
// CARD_EFFECTS[code] = { play, landingField, activateField, activateGrave, ... }
// ------------------------------------------------------------
const CARD_EFFECTS = {};

// ------------------------------------------------------------
// 効果発動のエントリーポイント
// simulator.htmlから呼ばれる想定
// triggerType: "play"|"field_enter"|"activate_field"|"activate_grave"|"activate_hand"
// ------------------------------------------------------------
function triggerCardEffect(obj, triggerType) {
  const effect = CARD_EFFECTS[obj.code];
  if(!effect || !effect[triggerType]) return false;
  effect[triggerType](obj);
  // 兵隊蜂の固有チェック（誘発発動後に再発動を促す）
  if(triggerType === "field_enter" || triggerType === "phase_prep") {
    setTimeout(() => checkSoldierBeeDouble(obj, triggerType), 800);
  }
  return true;
}

// ============================================================
// 効果実装
// ============================================================

// ハチ判定ユーティリティ
function isHachi(card) {
  if(!card) return false;
  return (card.tribe || "").includes("ハチ") ||
         (card.tribe || "").includes("はち") ||
         (card.tribe || "").includes("蜂");
}

// =============== BP1-001 女王蜂 ===============
CARD_EFFECTS["BP1-001"] = {

  // 【固有】戦場に出る時、墓地の全ハチ動物を除外
  field_enter(obj) {
    const hachiInGrave = G.grave.filter(o => {
      const c = cards.find(c => c.code === o.code);
      return c && c.type === "動物" && isHachi(c);
    });
    if(hachiInGrave.length === 0) return;

    askYesNo(
      `【固有】墓地のハチ動物カード${hachiInGrave.length}枚を除外しますか？`,
      () => {
        hachiInGrave.forEach(o => moveCard(o, "grave", "exile"));
        setMsg(`🐝 女王蜂：墓地のハチ動物${hachiInGrave.length}枚を除外しました。`);
        renderGame();
      }
    );
  },

  // 【常時（戦場）】戦場の他ハチ動物に《有毒》とATK+1/DEF+1を付与
  // ※renderGame時に毎回チェックして付与する（applyConstantEffectsから呼ぶ）
  constant_field(obj) {
    G.field.forEach(target => {
      if(target === obj) return;
      const c = cards.find(c => c.code === target.code);
      if(!c || c.type !== "動物" || !isHachi(c)) return;
      // 既に付与済みでなければ付与
      if(!(target.keywords || []).includes("有毒")) gainAbility(target, "《有毒》");
      if(!target.queenBuff) {
        target.queenBuff = true;
        target.atkMod = (target.atkMod || 0) + 1;
        target.defMod = (target.defMod || 0) + 1;
      }
    });
  },

  // 【誘発（戦場）】準備フェイズ開始時
  phase_prep(obj) {
    const exileHachi = G.exile.filter(o => {
      const c = cards.find(c => c.code === o.code);
      return c && c.type === "動物" && isHachi(c);
    });

    if(exileHachi.length === 0) {
      setMsg("🐝 女王蜂：除外領域にハチ動物がいないため誘発できません。");
      return;
    }

    askYesNo(
      `【誘発】除外領域のハチ動物カード1枚をデッキの下に置いて発動しますか？（除外ハチ：${exileHachi.length}枚）`,
      () => {
        // 除外からハチ1枚を選んでデッキ下へ
        pickFromZone("exile", {
          message: "デッキの下に置くハチ動物を1枚選んでください",
          count: 1,
          filter: (o, c) => c && c.type === "動物" && isHachi(c),
        }, (selected) => {
          if(selected.length === 0) return;
          moveCard(selected[0], "exile", "deck-bottom");

          // 発動後の除外ハチ数を数える（送った後）
          const remaining = G.exile.filter(o => {
            const c = cards.find(c => c.code === o.code);
            return c && c.type === "動物" && isHachi(c);
          }).length;

          if(remaining === 0) {
            setMsg("🐝 女王蜂：除外領域にハチ動物がいないためトークンは生成されません。");
            renderGame();
            return;
          }

          // Xの枚数を確認（残り除外ハチ数）して入力
          askNumber(
            `除外領域のハチ動物カード：${remaining}枚\nトークン生成数（X）を入力してください`,
            0, remaining,
            (x) => {
              if(x <= 0) { renderGame(); return; }
              // トークン生成
              for(let i = 0; i < x; i++) {
                const token = {
                  id: "token_" + Date.now() + "_" + i,
                  code: "TOKEN_HACHI",
                  isToken: true,
                  tokenName: "森林ハチ動物トークン",
                  tokenStats: "ATK 1／DEF 1",
                  tokenType: "動物",
                  tokenTribe: "ハチ",
                  keywords: ["駿足", "有翼"],
                  gainedEffects: ["日没フェイズ開始時にこれを生贄に捧げる"],
                  hasShunsoku: true,
                  damage: 0,
                  rested: false,
                  night: false,
                  summonedThisTurn: false, // 駿足持ちなので待機なし
                };
                G.field.push(token);
              }
              setMsg(`🐝 女王蜂：森林ハチ動物トークンを${x}体生成しました。`);
              renderGame();
            }
          );
        });
      }
    );
  },
};

// ------------------------------------------------------------
// 書き方テンプレート：
//
// CARD_EFFECTS["カードコード"] = {
//
//   // プレイ時効果
//   play(obj) {
//     askYesNo("〜してもよいですか？", () => {
//       // 処理
//       renderGame();
//     });
//   },
//
//   // 戦場着地時効果
//   field_enter(obj) {
//     pickFromZone("hand", { message: "手札から1枚選んでください", count: 1 }, (selected) => {
//       selected.forEach(target => moveCard(target, "hand", "grave"));
//       renderGame();
//     });
//   },
//
//   // 起動効果（戦場）
//   activate_field(obj) {
//     drawCards(1);
//     renderGame();
//   },
// };
// ------------------------------------------------------------

// =============== BP1-002 先鋒蜂 ===============
CARD_EFFECTS["BP1-002"] = {

  // 【誘発（戦場）】着地時、デッキから先鋒蜂以外のハチ動物1枚を手札へ
  field_enter(obj) {
    searchDeck(
      card => card.type === "動物" && isHachi(card) && card.code !== "BP1-002",
      1,
      "hand",
      { message: "デッキから先鋒蜂以外のハチ動物カード1枚を選んでください" }
    );
  },
};

// =============== BP1-003 兵隊蜂 ===============
CARD_EFFECTS["BP1-003"] = {

  // 【常時（戦場）】戦場の全ハチ動物（トークン含む）に《駿足》を付与
  constant_field(obj) {
    G.field.forEach(target => {
      const c = cards.find(c => c.code === target.code);
      const isTargetHachi = (target.isToken && (target.tokenTribe||"").includes("ハチ")) ||
                            (!target.isToken && c && c.type === "動物" && isHachi(c));
      if(!isTargetHachi) return;
      if(!(target.keywords||[]).includes("駿足")) {
        target.keywords = target.keywords || [];
        target.keywords.push("駿足");
        target.hasShunsoku = true;
        target.summonedThisTurn = false;
        if(!target.soldierBuff) target.soldierBuff = true;
      }
    });
  },
};

// 兵隊蜂の固有：ハチの誘発発動後に再発動を促す
// triggerCardEffectの後に呼ぶ
function checkSoldierBeeDouble(triggerObj, triggerType) {
  // 兵隊蜂が戦場にいるか確認
  const soldier = G.field.find(o => o.code === "BP1-003");
  if(!soldier) return;
  // 発動したのがハチ動物か確認（兵隊蜂自身は除く）
  if(triggerObj === soldier) return;
  const c = cards.find(c => c.code === triggerObj.code);
  const isTargetHachi = (triggerObj.isToken && (triggerObj.tokenTribe||"").includes("ハチ")) ||
                        (!triggerObj.isToken && c && c.type === "動物" && isHachi(c));
  if(!isTargetHachi) return;

  // 墓地のハチ動物が2枚以上いるか確認
  const graveHachi = G.grave.filter(o => {
    const gc = cards.find(c => c.code === o.code);
    return gc && gc.type === "動物" && isHachi(gc);
  });
  if(graveHachi.length < 2) return;

  const cardName = c?.name || triggerObj.tokenName || triggerObj.code;
  askYesNo(
    `【兵隊蜂・固有】墓地のハチ動物カード2枚をデッキの下に置いて「${cardName}」の誘発能力を再発動しますか？（墓地ハチ：${graveHachi.length}枚）`,
    () => {
      // 墓地からハチ2枚を選んでデッキ下へ（任意の順）
      pickFromZone("grave", {
        message: "デッキの下に置くハチ動物を2枚選んでください（下に置く順：選択した順）",
        count: 2,
        filter: (o, gc) => gc && gc.type === "動物" && isHachi(gc),
      }, (selected) => {
        if(selected.length < 2) return;
        selected.forEach(o => moveCard(o, "grave", "deck-bottom"));
        setMsg(`🐝 兵隊蜂：ハチ動物2枚をデッキ下へ。「${cardName}」の誘発を再発動します。`);
        renderGame();
        // 同じ誘発を再発動
        const effect = CARD_EFFECTS[triggerObj.code];
        if(effect && effect[triggerType]) {
          setTimeout(() => effect[triggerType](triggerObj), 300);
        }
      });
    }
  );
}

// =============== BP1-004 働き蜂 ===============
CARD_EFFECTS["BP1-004"] = {

  // 【誘発（戦場）】着地時、手札1枚捨てて動物以外のハチカード1枚を手札へ
  field_enter(obj) {
    if(G.hand.length === 0) {
      setMsg("🐝 働き蜂：手札がないため発動できません。");
      return;
    }
    askYesNo(
      "【誘発】手札のカード1枚を捨てて、デッキから動物以外のハチカード1枚を手札に加えますか？",
      () => {
        pickFromZone("hand", {
          message: "捨てるカードを1枚選んでください",
          count: 1,
        }, (selected) => {
          if(selected.length === 0) return;
          moveCard(selected[0], "hand", "grave");
          const discarded = cards.find(c => c.code === selected[0].code);
          setMsg(`🐝 働き蜂：「${discarded?.name || selected[0].code}」を捨てました。デッキを検索します。`);
          searchDeck(
            card => card.type !== "動物" && isHachi(card),
            1,
            "hand",
            { message: "デッキから動物以外のハチカード1枚を選んでください" }
          );
        });
      }
    );
  },
};

// =============== BP1-005 門番蜂 ===============
CARD_EFFECTS["BP1-005"] = {

  // 【常時（戦場）】戦場の「蜂の巣」道具に《鉄壁》を付与
  constant_field(obj) {
    G.field.forEach(target => {
      const c = cards.find(c => c.code === target.code);
      if(!c || c.name !== "蜂の巣") return;
      if(!(target.keywords||[]).includes("鉄壁")) {
        if(!target.keywords) target.keywords = [];
        target.keywords.push("鉄壁");
        if(!target.gateBuff) target.gateBuff = true;
      }
    });
  },

  // 【誘発（戦場）】着地時、戦場のハチ動物1体にATK+1/DEF+1×門番蜂の数
  field_enter(obj) {
    const gateCount = G.field.filter(o => o.code === "BP1-005").length;
    if(gateCount === 0) return;
    const hachiOnField = G.field.filter(o => {
      const c = cards.find(c => c.code === o.code);
      const isT = o.isToken && (o.tokenTribe||"").includes("ハチ");
      return isT || (c && c.type === "動物" && isHachi(c));
    });
    if(hachiOnField.length === 0) return;

    askYesNo(
      `【誘発】戦場のハチ動物1体にATK+${gateCount}/DEF+${gateCount}カウンターを置きますか？`,
      () => {
        pickFromZone("field", {
          message: "カウンターを置くハチ動物を1体選んでください",
          count: 1,
          filter: (o, c) => {
            const isT = o.isToken && (o.tokenTribe||"").includes("ハチ");
            return isT || (c && c.type === "動物" && isHachi(c));
          },
        }, (selected) => {
          if(selected.length === 0) return;
          const target = selected[0];
          target.atkMod = (target.atkMod||0) + gateCount;
          target.defMod = (target.defMod||0) + gateCount;
          const name = cards.find(c=>c.code===target.code)?.name || target.tokenName || target.code;
          setMsg(`🐝 門番蜂：「${name}」にATK+${gateCount}/DEF+${gateCount}を置きました。`);
          renderGame();
        });
      }
    );
  },
};

// =============== BP1-006 子育蜂 ===============
CARD_EFFECTS["BP1-006"] = {

  // 【誘発（戦場）】着地時、手札のコスト2以下のハチ動物をムーブ状態で展開
  field_enter(obj) {
    const targets = G.hand.filter(o => {
      const c = cards.find(c => c.code === o.code);
      return c && c.type === "動物" && isHachi(c) && (parseInt(c.cost)||0) <= 2;
    });
    if(targets.length === 0) return;

    askYesNo(
      "【誘発】手札のコスト2以下のハチ動物カード1枚をムーブ状態で戦場に出しますか？",
      () => {
        pickFromZone("hand", {
          message: "戦場に出すコスト2以下のハチ動物を選んでください",
          count: 1,
          filter: (o, c) => c && c.type === "動物" && isHachi(c) && (parseInt(c.cost)||0) <= 2,
        }, (selected) => {
          if(selected.length === 0) return;
          const target = selected[0];
          moveCard(target, "hand", "field");
          target.rested = true; // ムーブ状態
          target.summonedThisTurn = true;
          // 駿足チェック
          const c = cards.find(c => c.code === target.code);
          if((c?.effect||"").includes("《駿足》")) target.hasShunsoku = true;
          const name = c?.name || target.code;
          setMsg(`🐝 子育蜂：「${name}」をムーブ状態で戦場に出しました。`);
          setTimeout(() => triggerCardEffect(target, "field_enter"), 300);
          renderGame();
        });
      }
    );
  },
};

// =============== BP1-007 掃除蜂 ===============
CARD_EFFECTS["BP1-007"] = {

  // 【誘発（戦場）】着地時、手札のハチカード1枚捨てて戦場のコストX以下の動物を破壊
  field_enter(obj) {
    if(G.hand.length === 0) return;
    const hachiOnField = G.field.filter(o => {
      const c = cards.find(c => c.code === o.code);
      const isT = o.isToken && (o.tokenTribe||"").includes("ハチ");
      return isT || (c && c.type === "動物" && isHachi(c));
    }).length;

    askYesNo(
      `【誘発】手札のハチカード1枚を捨てて、戦場のコスト${hachiOnField}以下の動物を破壊しますか？`,
      () => {
        // 手札のハチカードを捨てる
        pickFromZone("hand", {
          message: "捨てるハチカードを選んでください",
          count: 1,
          filter: (o, c) => c && isHachi(c),
        }, (selected) => {
          if(selected.length === 0) return;
          moveCard(selected[0], "hand", "grave");

          // 戦場のコストX以下の動物を選んで破壊
          const validTargets = G.field.filter(o => {
            if(o === obj) return false;
            const c = cards.find(c => c.code === o.code);
            return c && c.type === "動物" && (parseInt(c.cost)||0) <= hachiOnField;
          });
          if(validTargets.length === 0) {
            setMsg(`🐝 掃除蜂：コスト${hachiOnField}以下の対象動物がいません。`);
            renderGame();
            return;
          }

          pickFromZone("field", {
            message: `破壊する動物を選んでください（コスト${hachiOnField}以下）`,
            count: 1,
            filter: (o, c) => o !== obj && c && c.type === "動物" && (parseInt(c.cost)||0) <= hachiOnField,
          }, (targets) => {
            if(targets.length === 0) return;
            const target = targets[0];
            moveCard(target, "field", "grave");
            const name = cards.find(c=>c.code===target.code)?.name || target.code;
            setMsg(`🐝 掃除蜂：「${name}」を破壊しました。`);
            setTimeout(() => checkTriggers("to_grave", target), 300);
            renderGame();
          });
        });
      }
    );
  },
};

// =============== BP1-008 子蜂 ===============
CARD_EFFECTS["BP1-008"] = {

  // 【固有】着地時、墓地のコスト1ハチ動物を除外して誘発能力を得る
  field_enter(obj) {
    const cost1Hachi = G.grave.filter(o => {
      const c = cards.find(c => c.code === o.code);
      return c && c.type === "動物" && isHachi(c) && (parseInt(c.cost)||0) === 1;
    });
    if(cost1Hachi.length === 0) return;

    askYesNo(
      "【固有】墓地のコスト1ハチ動物カード1枚を除外して、その誘発能力をターン終了時まで得ますか？",
      () => {
        pickFromZone("grave", {
          message: "除外するコスト1のハチ動物を選んでください",
          count: 1,
          filter: (o, c) => c && c.type === "動物" && isHachi(c) && (parseInt(c.cost)||0) === 1,
        }, (selected) => {
          if(selected.length === 0) return;
          const source = selected[0];
          const sourceCard = cards.find(c => c.code === source.code);
          moveCard(source, "grave", "exile");

          // 誘発能力テキストを抽出してgainedEffectsに追加（temporary）
          const effect = sourceCard?.effect || "";
          const triggerLines = effect.split('\n').filter(l => l.startsWith('【誘発'));
          if(triggerLines.length > 0) {
            gainAbility(obj, `『${sourceCard.name}の誘発能力』`, true);
            // CARD_EFFECTSに登録があれば紐付け
            if(!obj.gainedTriggers) obj.gainedTriggers = [];
            obj.gainedTriggers.push({ code: source.code, type: "field_enter" });
          }
          setMsg(`🐝 子蜂：「${sourceCard?.name}」の誘発能力を得ました。`);
          renderGame();
        });
      }
    );
  },
};

// =============== BP1-009 蜂の巣 ===============
CARD_EFFECTS["BP1-009"] = {

  // 【誘発（戦場）】トークン以外のハチ動物が戦場に出た時、デッキ上1枚を墓地へ
  field_enter_other(obj, triggerObj) {
    // triggerObjがトークン以外のハチ動物かチェック
    if(triggerObj.isToken) return;
    const c = cards.find(c => c.code === triggerObj.code);
    if(!c || c.type !== "動物" || !isHachi(c)) return;
    if(G.mainDeck.length === 0) { setMsg("🐝 蜂の巣：デッキが空です。"); return; }
    const milled = G.mainDeck.shift();
    G.grave.push(milled);
    const mc = cards.find(c => c.code === milled.code);
    setMsg(`🐝 蜂の巣：デッキ上「${mc?.name || milled.code}」を墓地に置きました。`);
    renderGame();
  },

  // 【起動（戦場）】ムーブ、墓地のハチ4枚をデッキ下→ハチ1体を手札→コスト1ハチを展開
  activate_field(obj) {
    const graveHachi = G.grave.filter(o => {
      const c = cards.find(c => c.code === o.code);
      return c && c.type === "動物" && isHachi(c);
    });
    if(graveHachi.length < 4) {
      setMsg(`🐝 蜂の巣：墓地のハチ動物が${graveHachi.length}枚です。4枚必要です。`);
      return;
    }
    const hachiOnField = G.field.filter(o => {
      if(o === obj) return false;
      const c = cards.find(c => c.code === o.code);
      const isT = o.isToken && (o.tokenTribe||"").includes("ハチ");
      return isT || (c && c.type === "動物" && isHachi(c));
    });
    if(hachiOnField.length === 0) {
      setMsg("🐝 蜂の巣：戦場にハチ動物がいません。");
      return;
    }

    // 墓地のハチ4枚を選んでデッキ下へ
    pickFromZone("grave", {
      message: "デッキの下に置くハチ動物を4枚選んでください",
      count: 4,
      filter: (o, c) => c && c.type === "動物" && isHachi(c),
    }, (selected) => {
      if(selected.length < 4) return;
      selected.forEach(o => moveCard(o, "grave", "deck-bottom"));
      obj.rested = true; // ムーブ

      // 戦場のハチ1体を手札に戻す
      pickFromZone("field", {
        message: "手札に戻すハチ動物を1体選んでください",
        count: 1,
        filter: (o, c) => {
          if(o === obj) return false;
          const isT = o.isToken && (o.tokenTribe||"").includes("ハチ");
          return isT || (c && c.type === "動物" && isHachi(c));
        },
      }, (returned) => {
        if(returned.length === 0) { renderGame(); return; }
        const returnedObj = returned[0];
        const returnedCard = cards.find(c => c.code === returnedObj.code);
        const returnedName = returnedCard?.name || returnedObj.tokenName || returnedObj.code;
        moveCard(returnedObj, "field", "hand");

        // 手札のコスト1ハチで戻したカードと異なる名前のものを展開
        const cost1Hand = G.hand.filter(o => {
          const c = cards.find(c => c.code === o.code);
          return c && c.type === "動物" && isHachi(c) &&
                 (parseInt(c.cost)||0) === 1 &&
                 c.name !== returnedName;
        });

        if(cost1Hand.length === 0) {
          setMsg(`🐝 蜂の巣：「${returnedName}」を手札に戻しました。出せるコスト1ハチがありません。`);
          renderGame();
          return;
        }

        pickFromZone("hand", {
          message: `「${returnedName}」以外のコスト1ハチ動物を1枚選んで戦場に出してください`,
          count: 1,
          filter: (o, c) => c && c.type === "動物" && isHachi(c) &&
                            (parseInt(c.cost)||0) === 1 && c.name !== returnedName,
        }, (deploy) => {
          if(deploy.length === 0) { renderGame(); return; }
          const deployObj = deploy[0];
          moveCard(deployObj, "hand", "field");
          const deployCard = cards.find(c => c.code === deployObj.code);
          if(!(deployCard?.effect||"").includes("《駿足》")) deployObj.summonedThisTurn = true;
          setMsg(`🐝 蜂の巣：「${deployCard?.name}」を戦場に出しました。`);
          setTimeout(() => triggerCardEffect(deployObj, "field_enter"), 300);
          renderGame();
        });
      });
    });
  },
};

// =============== BP1-010 蜂の巣作り ===============
CARD_EFFECTS["BP1-010"] = {

  // 【常時】戦場に「蜂の巣」があればプレイ不可
  // checkPlayableExtから参照される
  can_play() {
    const hasNest = G.field.some(o => {
      const c = cards.find(c => c.code === o.code);
      return c && c.name === "蜂の巣";
    });
    if(hasNest) return { ok: false, reason: "戦場に「蜂の巣」があるためプレイできません" };
    return { ok: true };
  },

  // 【プレイ】デッキから「蜂の巣」を戦場へ→デッキからハチ動物を手札へ
  play(obj) {
    searchDeck(
      card => card.name === "蜂の巣",
      1,
      "field",
      { message: "デッキから「蜂の巣」を選んで戦場に出してください" }
    );
    // 蜂の巣展開後にハチ動物サーチ
    setTimeout(() => {
      searchDeck(
        card => card.type === "動物" && isHachi(card),
        1,
        "hand",
        { message: "デッキからハチ動物カード1枚を手札に加えてください" }
      );
    }, 800);
  },

  // 【起動（手札）】手札のこれを捨て+蜂の巣をムーブ→デッキ上1枚墓地→墓地ハチ1枚手札
  activate_hand(obj) {
    const nest = G.field.find(o => {
      const c = cards.find(c => c.code === o.code);
      return c && c.name === "蜂の巣" && !o.rested;
    });
    if(!nest) {
      setMsg("🐝 蜂の巣作り：ウェイク状態の「蜂の巣」が戦場にありません。");
      return;
    }
    const graveHachi = G.grave.filter(o => {
      const c = cards.find(c => c.code === o.code);
      return c && c.type === "動物" && isHachi(c);
    });
    if(graveHachi.length === 0) {
      setMsg("🐝 蜂の巣作り：墓地にハチ動物がありません。");
      return;
    }

    // このカードを捨てる
    moveCard(obj, "hand", "grave");
    // 蜂の巣をムーブ
    nest.rested = true;

    // デッキ上1枚を墓地へ
    if(G.mainDeck.length > 0) {
      const milled = G.mainDeck.shift();
      G.grave.push(milled);
      const mc = cards.find(c => c.code === milled.code);
      setMsg(`🐝 蜂の巣作り：「${mc?.name || milled.code}」を墓地に置きました。`);
    }

    // 墓地のハチ動物1枚を手札へ
    pickFromZone("grave", {
      message: "手札に加えるハチ動物を1枚選んでください",
      count: 1,
      filter: (o, c) => c && c.type === "動物" && isHachi(c),
    }, (selected) => {
      if(selected.length === 0) { renderGame(); return; }
      moveCard(selected[0], "grave", "hand");
      const name = cards.find(c => c.code === selected[0].code)?.name || selected[0].code;
      setMsg(`🐝 蜂の巣作り：「${name}」を手札に加えました。`);
      renderGame();
    });
  },
};

// =============== BP1-011 蜂蜜溜まり ===============
CARD_EFFECTS["BP1-011"] = {

  // 【プレイ】デッキ上3枚を墓地→ハチ動物の数だけトークン生成
  play(obj) {
    if(G.mainDeck.length === 0) {
      setMsg("🐝 蜂蜜溜まり：デッキが空です。");
      return;
    }
    const count = Math.min(3, G.mainDeck.length);
    const milled = [];
    for(let i = 0; i < count; i++) {
      const card = G.mainDeck.shift();
      G.grave.push(card);
      milled.push(card);
    }

    // ハチ動物の枚数を数える
    const hachiCount = milled.filter(o => {
      const c = cards.find(c => c.code === o.code);
      return c && c.type === "動物" && isHachi(c);
    }).length;

    const names = milled.map(o => cards.find(c=>c.code===o.code)?.name || o.code).join("、");
    setMsg(`🐝 蜂蜜溜まり：「${names}」を墓地へ。ハチ動物${hachiCount}枚 → トークン${hachiCount}体生成。`);

    if(hachiCount === 0) { renderGame(); return; }

    // トークン生成
    for(let i = 0; i < hachiCount; i++) {
      G.field.push({
        id: "token_honey_" + Date.now() + "_" + i,
        code: "TOKEN_HACHI",
        isToken: true,
        tokenName: "森林ハチ動物トークン",
        tokenStats: "ATK 1／DEF 1",
        tokenType: "動物",
        tokenTribe: "ハチ",
        keywords: ["駿足", "有翼"],
        gainedEffects: ["日没フェイズ開始時にこれを生贄に捧げる"],
        hasShunsoku: true,
        damage: 0,
        rested: false,
        night: false,
        summonedThisTurn: false,
      });
    }
    renderGame();
  },
};

// ============================================================
// アリ系ユーティリティ
// ============================================================
function isAriTerrain(obj) {
  const c = cards.find(c => c.code === obj.code);
  return c && c.type === "縄張り" && isAri(c);
}

// =============== BP1-012 女王蟻 ===============
CARD_EFFECTS["BP1-012"] = {

  // 【常時】戦場のアリ縄張りが3枚以上なければプレイ不可
  can_play() {
    const ariTerrCount = G.field.filter(o => isAriTerrain(o)).length;
    if(ariTerrCount < 3) {
      return { ok: false, reason: `アリ縄張りが${ariTerrCount}枚です（3枚以上必要）` };
    }
    return { ok: true };
  },

  // 【常時（戦場）】戦場のアリ動物にATK+1/DEF+1
  constant_field(obj) {
    G.field.forEach(target => {
      if(target === obj) return;
      const c = cards.find(c => c.code === target.code);
      if(!c || c.type !== "動物" || !isAri(c)) return;
      if(!target.queenAntBuff) {
        target.queenAntBuff = true;
        target.atkMod = (target.atkMod||0) + 1;
        target.defMod = (target.defMod||0) + 1;
      }
    });
  },
};

// =============== BP1-013 兵隊蟻 ===============
CARD_EFFECTS["BP1-013"] = {

  // 【起動（墓地）】②払って墓地の兵隊蟻4枚をデッキ下→アリ動物1枚+アリ縄張り1枚を手札へ
  activate_grave(obj) {
    const heiTai = G.grave.filter(o => o.code === "BP1-013");
    if(heiTai.length < 4) {
      setMsg(`🐜 兵隊蟻：墓地の兵隊蟻が${heiTai.length}枚です（4枚必要）`);
      return;
    }
    const ariAnimal = G.grave.filter(o => {
      const c = cards.find(c => c.code === o.code);
      return c && c.type === "動物" && isAri(c);
    });
    const ariTerrain = G.grave.filter(o => isAriTerrain(o));
    if(ariAnimal.length === 0 || ariTerrain.length === 0) {
      setMsg("🐜 兵隊蟻：墓地にアリ動物またはアリ縄張りがありません。");
      return;
    }

    // コスト②支払い
    payCostTerrain(2, () => {
      // 墓地の兵隊蟻4枚を選んでデッキ下へ
      pickFromZone("grave", {
        message: "デッキの下に置く兵隊蟻を4枚選んでください",
        count: 4,
        filter: (o) => o.code === "BP1-013",
      }, (selected) => {
        if(selected.length < 4) return;
        selected.forEach(o => moveCard(o, "grave", "deck-bottom"));

        // アリ動物1枚を手札へ
        pickFromZone("grave", {
          message: "手札に加えるアリ動物カード1枚を選んでください",
          count: 1,
          filter: (o, c) => c && c.type === "動物" && isAri(c),
        }, (animals) => {
          if(animals.length > 0) moveCard(animals[0], "grave", "hand");

          // アリ縄張り1枚を手札へ
          pickFromZone("grave", {
            message: "手札に加えるアリ縄張りカード1枚を選んでください",
            count: 1,
            filter: (o) => isAriTerrain(o),
          }, (terrains) => {
            if(terrains.length > 0) moveCard(terrains[0], "grave", "hand");
            setMsg("🐜 兵隊蟻：アリ動物とアリ縄張りを手札に加えました。");
            renderGame();
          });
        });
      });
    });
  },
};

// =============== BP1-014 補給蟻 ===============
CARD_EFFECTS["BP1-014"] = {

  // 【起動（戦場）】ムーブ、アリ縄張り1つ生贄→兵隊蟻を戦場へ+アリ存在をデッキ上へ
  activate_field(obj) {
    const ariTerrains = G.field.filter(o => isAriTerrain(o));
    if(ariTerrains.length === 0) {
      setMsg("🐜 補給蟻：戦場にアリ縄張りがありません。");
      return;
    }
    payMoveCost(obj);

    // アリ縄張り1つを生贄
    sacrificeFromField(1,
      (o) => isAriTerrain(o),
      () => {
        // デッキから兵隊蟻を探して戦場へ
        searchDeck(
          card => card.code === "BP1-013",
          1, "field",
          { message: "デッキから「兵隊蟻」を選んで戦場に出してください" }
        );
        // デッキからアリ存在を探してデッキ上へ
        setTimeout(() => {
          searchDeck(
            card => isAri(card) && card.type !== "領土",
            1, "deck-top",
            { message: "デッキからアリ存在カード1枚を選んでデッキの上に置いてください" }
          );
        }, 800);
      }
    );
  },
};

// =============== BP1-015 働き蟻 ===============
CARD_EFFECTS["BP1-015"] = {

  // 【起動（戦場）】ムーブ、アリ縄張り1つ生贄→蟻の巣を手札へ+アリ存在をデッキ上へ
  activate_field(obj) {
    const ariTerrains = G.field.filter(o => isAriTerrain(o));
    if(ariTerrains.length === 0) {
      setMsg("🐜 働き蟻：戦場にアリ縄張りがありません。");
      return;
    }
    payMoveCost(obj);

    sacrificeFromField(1,
      (o) => isAriTerrain(o),
      () => {
        searchDeck(
          card => card.name === "蟻の巣",
          1, "hand",
          { message: "デッキから「蟻の巣」を手札に加えてください" }
        );
        setTimeout(() => {
          searchDeck(
            card => isAri(card) && card.type !== "領土",
            1, "deck-top",
            { message: "デッキからアリ存在カード1枚を選んでデッキの上に置いてください" }
          );
        }, 800);
      }
    );
  },
};

// =============== BP1-016 軍隊蟻 ===============
CARD_EFFECTS["BP1-016"] = {

  // 【起動（戦場）】ムーブ、アリ縄張り3つ生贄→存在1つを破壊
  activate_field(obj) {
    const ariTerrains = G.field.filter(o => isAriTerrain(o));
    if(ariTerrains.length < 3) {
      setMsg(`🐜 軍隊蟻：アリ縄張りが${ariTerrains.length}枚です（3枚必要）`);
      return;
    }
    payMoveCost(obj);

    sacrificeFromField(3,
      (o) => isAriTerrain(o),
      () => {
        pickFromZone("field", {
          message: "破壊する存在を1つ選んでください",
          count: 1,
          filter: (o) => o !== obj,
        }, (selected) => {
          if(selected.length === 0) return;
          const target = selected[0];
          const name = cards.find(c=>c.code===target.code)?.name || target.tokenName || target.code;
          moveCard(target, "field", "grave");
          setMsg(`🐜 軍隊蟻：「${name}」を破壊しました。`);
          setTimeout(() => checkTriggers("to_grave", target), 300);
          renderGame();
        });
      }
    );
  },

  // 【起動（手札）】手札のこれを捨てて→手札のアリ動物を捨ててもよい→デッキ上2枚公開→アリカードを手札へ
  activate_hand(obj) {
    moveCard(obj, "hand", "grave");

    const ariInHand = G.hand.filter(o => {
      const c = cards.find(c => c.code === o.code);
      return c && isAri(c);
    });

    const doReveal = () => {
      revealDeckTop(2, (revealed) => {
        const ariCards = revealed.filter(o => {
          const c = cards.find(c => c.code === o.code);
          return c && isAri(c);
        });
        const others = revealed.filter(o => !ariCards.includes(o));
        // デッキからアリカードを手札へ
        ariCards.forEach(o => { G.mainDeck.splice(G.mainDeck.indexOf(o), 1); G.hand.push(o); });
        // 残りを除外
        others.forEach(o => { G.mainDeck.splice(G.mainDeck.indexOf(o), 1); G.exile.push(o); });
        const ariNames = ariCards.map(o=>cards.find(c=>c.code===o.code)?.name||o.code).join("、");
        setMsg(`🐜 軍隊蟻：アリカード「${ariNames || "なし"}」を手札へ。残りを除外しました。`);
        renderGame();
      });
    };

    if(ariInHand.length > 0) {
      askYesNo(
        "手札のアリ動物カード1枚を捨てますか？",
        () => {
          pickFromZone("hand", {
            message: "捨てるアリ動物を選んでください",
            count: 1,
            filter: (o, c) => c && isAri(c) && c.type === "動物",
          }, (selected) => {
            if(selected.length > 0) moveCard(selected[0], "hand", "grave");
            doReveal();
          });
        },
        doReveal
      );
    } else {
      doReveal();
    }
  },
};

// =============== BP1-017 刺針蟻 ===============
CARD_EFFECTS["BP1-017"] = {

  // 【起動（戦場）】ムーブ、アリ縄張り2つ生贄→誘発/起動効果を妨害
  activate_field(obj) {
    const ariTerrains = G.field.filter(o => isAriTerrain(o));
    if(ariTerrains.length < 2) {
      setMsg(`🐜 刺針蟻：アリ縄張りが${ariTerrains.length}枚です（2枚必要）`);
      return;
    }
    payMoveCost(obj);
    sacrificeFromField(2,
      (o) => isAriTerrain(o),
      () => {
        setMsg("🐜 刺針蟻：妨害を宣言しました。対象の効果を無効にしてください。");
        renderGame();
      }
    );
  },

  // 【起動（手札）】軍隊蟻と同じ処理
  activate_hand(obj) {
    CARD_EFFECTS["BP1-016"].activate_hand(obj);
  },
};

// =============== BP1-018 蟻の巣 ===============
CARD_EFFECTS["BP1-018"] = {

  // 【誘発（戦場）】着地時、デッキから女王蟻を手札に加えてもよい
  field_enter(obj) {
    askYesNo(
      "【誘発】デッキから「女王蟻」カード1枚を手札に加えますか？",
      () => {
        searchDeck(
          card => card.name === "女王蟻",
          1, "hand",
          { message: "デッキから「女王蟻」を選んでください" }
        );
      }
    );
  },
};

// =============== BP1-019 餌道 ===============
CARD_EFFECTS["BP1-019"] = {

  // 【誘発（戦場）】着地時、デッキ上3枚公開→アリ縄張り1枚を手札+残りをデッキ上→手札コスト1アリ動物を展開してもよい
  field_enter(obj) {
    revealDeckTop(3, (revealed) => {
      const ariTerrains = revealed.filter(o => isAriTerrain(o));
      const others = revealed.filter(o => !ariTerrains.includes(o));

      // アリ縄張りを選んで手札へ
      if(ariTerrains.length === 0) {
        // アリ縄張りなし→全部デッキ上に任意の順で戻す
        setMsg("🐜 餌道：アリ縄張りがありませんでした。カードをデッキ上に戻してください。");
        // 簡易：そのまま戻す（順番は手動）
        renderGame();
        return;
      }

      // アリ縄張りが1枚以上あれば選んで手札へ
      const pickCount = Math.min(1, ariTerrains.length);
      askChoice(
        `公開されたアリ縄張り：${ariTerrains.map(o=>cards.find(c=>c.code===o.code)?.name||o.code).join("、")}\n1枚を手札に加えてください`,
        ariTerrains.map(o => ({
          label: cards.find(c=>c.code===o.code)?.name || o.code,
          value: o
        })),
        (chosen) => {
          // 選んだカードを手札へ
          G.mainDeck.splice(G.mainDeck.indexOf(chosen), 1);
          G.hand.push(chosen);

          // 残りをデッキ上に戻す（任意順→簡易実装：そのまま）
          [...ariTerrains.filter(o=>o!==chosen), ...others].forEach(o => {
            const idx = G.mainDeck.indexOf(o);
            if(idx >= 0) G.mainDeck.splice(idx, 1);
            G.mainDeck.unshift(o);
          });

          setMsg("🐜 餌道：アリ縄張りを手札に加えました。残りをデッキ上に戻しました。");

          // コスト1のアリ動物を展開してもよい
          const cost1Ari = G.hand.filter(o => {
            const c = cards.find(c => c.code === o.code);
            return c && c.type === "動物" && isAri(c) && (parseInt(c.cost)||0) === 1;
          });

          if(cost1Ari.length > 0) {
            askYesNo(
              "手札のコスト1のアリ動物カード1枚を戦場に出しますか？",
              () => deployFromHand(
                (o, c) => c && c.type === "動物" && isAri(c) && (parseInt(c.cost)||0) === 1,
                false,
                null
              )
            );
          } else {
            renderGame();
          }
        }
      );
    });
  },

  // 【誘発（墓地）】戦場から墓地に置かれた時、デッキから兵隊蟻を戦場に出してもよい
  to_grave(obj) {
    askYesNo(
      "【誘発】デッキから「兵隊蟻」カード1枚を戦場に出しますか？",
      () => {
        searchDeck(
          card => card.code === "BP1-013",
          1, "field",
          { message: "デッキから「兵隊蟻」を選んで戦場に出してください" }
        );
      }
    );
  },
};

// ============================================================
// キツネ系ユーティリティ
// ============================================================
function isKitsuneCard(card) {
  return card && (card.tribe || "").includes("キツネ");
}

// =============== BP1-023 見狐 ===============
CARD_EFFECTS["BP1-023"] = {

  // 【起動（戦場）】妖狐カウンター2個を取り除いて、キツネ存在1つをウェイク
  activate_field(obj) {
    const youkoCount = obj.counters?.["妖狐"] || 0;
    if(youkoCount < 2) {
      setMsg(`🦊 見狐：妖狐カウンターが${youkoCount}個です（2個必要）`);
      return;
    }

    // キツネ存在（動物・道具・縄張り）を対象に
    const kitsuneTargets = G.field.filter(o => {
      const c = cards.find(c => c.code === o.code);
      return c && isKitsuneCard(c) && o.rested;
    });
    if(kitsuneTargets.length === 0) {
      setMsg("🦊 見狐：ウェイクできるキツネ存在がいません。");
      return;
    }

    pickFromZone("field", {
      message: "ウェイクするキツネ存在を1つ選んでください",
      count: 1,
      filter: (o) => {
        const c = cards.find(c => c.code === o.code);
        return c && isKitsuneCard(c) && o.rested;
      },
    }, (selected) => {
      if(selected.length === 0) return;
      // 妖狐カウンター2個を消費（見狐自身の効果なのでcaller="BP1-023"）
      removeYouko(obj, 2, "BP1-023");
      selected[0].rested = false;
      const name = cards.find(c => c.code === selected[0].code)?.name || selected[0].code;
      setMsg(`🦊 見狐：「${name}」をウェイクしました。`);
      renderGame();
    });
  },

  // 【起動（手札）】手札のキツネカード1枚とこれを捨てて、「狐の隠里」を手札へ
  activate_hand(obj) {
    const kitsuneInHand = G.hand.filter(o => {
      if(o === obj) return false;
      const c = cards.find(c => c.code === o.code);
      return c && isKitsuneCard(c);
    });
    if(kitsuneInHand.length === 0) {
      setMsg("🦊 見狐：手札にキツネカードがありません。");
      return;
    }

    pickFromZone("hand", {
      message: "捨てるキツネカードを1枚選んでください（見狐以外）",
      count: 1,
      filter: (o) => {
        if(o === obj) return false;
        const c = cards.find(c => c.code === o.code);
        return c && isKitsuneCard(c);
      },
    }, (selected) => {
      if(selected.length === 0) return;
      moveCard(selected[0], "hand", "grave");
      moveCard(obj, "hand", "grave");
      searchDeck(
        card => card.name === "狐の隠里",
        1, "hand",
        { message: "デッキから「狐の隠里」を手札に加えてください" }
      );
    });
  },
};

// =============== BP1-024 双子狐 ===============
CARD_EFFECTS["BP1-024"] = {
  field_enter(obj) {
    // 固有：手札/デッキ/墓地/除外から双子狐を探して戦場に
    askYesNo(
      "【固有】手札・デッキ・墓地・除外から「双子狐」カード1枚を戦場に出しますか？",
      () => {
        // 全ゾーンから双子狐を探す
        const allZones = [
          { zone: G.hand, name: "hand" },
          { zone: G.mainDeck, name: "deck" },
          { zone: G.grave, name: "grave" },
          { zone: G.exile, name: "exile" },
        ];
        const candidates = [];
        allZones.forEach(({zone, name}) => {
          zone.forEach(o => {
            if(o !== obj && o.code === "BP1-024") candidates.push({obj: o, from: name});
          });
        });
        if(candidates.length === 0) {
          setMsg("🦊 双子狐：他ゾーンに双子狐がいません。");
          return;
        }
        const target = candidates[0];
        moveCard(target.obj, target.from, "field");
        target.obj.summonedThisTurn = true;
        setMsg("🦊 双子狐：もう1体の双子狐を戦場に出しました。");
        setTimeout(() => triggerCardEffect(target.obj, "field_enter"), 300);
        renderGame();
      }
    );
  },
  // 誘発（複製）は通知のみ
  trigger_notify(obj) {
    setMsg("🦊 双子狐：効果の対象になりました。他の双子狐が戦場にいれば複製が発動します（手動で処理してください）。");
  },
};

// =============== BP1-027 狐葉 ===============
CARD_EFFECTS["BP1-027"] = {
  // 【誘発（戦場）】準備フェイズ開始時：ATKの値のX枚ドロー
  phase_prep(obj) {
    const card = cards.find(c => c.code === obj.code);
    const baseAtk = parseInt((card?.stats||"").match(/ATK\s*(\d+)/)?.[1]||0);
    const atkMod = obj.atkMod || 0;
    const totalAtk = baseAtk + atkMod;

    askNumber(
      `🦊 狐葉：ドロー枚数を確認してください（ATK: ${totalAtk}）\n修正がある場合は変更できます`,
      0, 20,
      (x) => {
        drawCards(x);
        setMsg(`🦊 狐葉：カード${x}枚ドローしました。`);
        renderGame();
      }
    );
  },
};

// =============== BP1-028 化狐 ===============
CARD_EFFECTS["BP1-028"] = {

  // 【誘発（戦場）】着地時：デッキからキツネカードを墓地に+妖狐カウンター2個
  field_enter(obj) {
    askYesNo(
      "【誘発】デッキからキツネカード1枚を墓地に置いて、妖狐カウンター2個を得ますか？",
      () => {
        searchDeck(
          card => isKitsuneCard(card),
          1, "grave",
          { message: "デッキから墓地に置くキツネカードを選んでください" }
        );
        addYouko(obj, 2, "BP1-028");
        setMsg("🦊 化狐：妖狐カウンター2個を置きました。");
        renderGame();
      }
    );
  },

  activate_field(obj) {
    // 2つの起動効果をどちらか選ぶ
    askChoice(
      "🦊 化狐：どちらの起動効果を使いますか？",
      [
        { label: "①妖狐カウンター1個→墓地コスト1キツネをデッキ上へ", value: "a" },
        { label: "②ムーブ→デッキ上1枚確認→キツネなら除外して能力コピー", value: "b" },
      ],
      (choice) => {
        if(choice === "a") {
          // 妖狐カウンター1個消費
          const count = obj.counters?.["妖狐"] || 0;
          if(count < 1) { setMsg("🦊 化狐：妖狐カウンターがありません。"); return; }
          const cost1Kitsune = G.grave.filter(o => {
            const c = cards.find(c => c.code === o.code);
            return c && isKitsuneCard(c) && (parseInt(c.cost)||0) === 1;
          });
          if(cost1Kitsune.length === 0) { setMsg("🦊 化狐：墓地にコスト1のキツネカードがありません。"); return; }
          removeYouko(obj, 1, "BP1-028");
          pickFromZone("grave", {
            message: "デッキの上に置くコスト1キツネカードを選んでください",
            count: 1,
            filter: (o, c) => c && isKitsuneCard(c) && (parseInt(c.cost)||0) === 1,
          }, (selected) => {
            if(selected.length === 0) return;
            moveCard(selected[0], "grave", "deck-top");
            setMsg("🦊 化狐：コスト1キツネカードをデッキ上に置きました。");
            renderGame();
          });

        } else {
          // ムーブ→デッキ上1枚確認→コスト1キツネなら除外して能力コピー
          if(obj.rested) { setMsg("🦊 化狐：既にムーブ状態です。"); return; }
          payMoveCost(obj);
          if(G.mainDeck.length === 0) { setMsg("🦊 化狐：デッキが空です。"); return; }

          const top = G.mainDeck[0];
          const topCard = cards.find(c => c.code === top.code);
          const isKitsune1 = topCard && isKitsuneCard(topCard);

          if(!isKitsune1) {
            setMsg(`🦊 化狐：デッキ上「${topCard?.name || top.code}」はキツネカードではありません。`);
            return;
          }

          askYesNo(
            `デッキ上「${topCard.name}」（コスト${topCard.cost}）を除外して能力をコピーしますか？`,
            () => {
              G.mainDeck.shift();
              G.exile.push(top);
              // コピー能力を付与
              if(!obj.copyFromList) obj.copyFromList = [];
              obj.copyFromList.push(top.code);
              // 除外領域にある限り有効→obj.exileCopyCodeで管理
              obj.exileCopyCode = top.code;
              setMsg(`🦊 化狐：「${topCard.name}」を除外し能力をコピーしました。`);
              renderGame();
            }
          );
        }
      }
    );
  },
};

// =============== BP1-035 狂乱モグラ ===============
CARD_EFFECTS["BP1-035"] = {

  // 【誘発（戦場）】着地時：デッキ上3枚を墓地
  field_enter(obj) {
    const count = Math.min(3, G.mainDeck.length);
    for(let i = 0; i < count; i++) {
      const card = G.mainDeck.shift();
      G.grave.push(card);
    }
    setMsg(`🦊 狂乱モグラ：デッキ上${count}枚を墓地に置きました。`);
    renderGame();
  },

  // 【誘発（戦場）】プレイ時：デッキ上1枚を墓地（confirmPlay後にフック）
  on_play_reaction(obj) {
    if(G.mainDeck.length === 0) return;
    askYesNo(
      "🐭 狂乱モグラ：プレイされました。デッキ上1枚を墓地に置きますか？",
      () => {
        const top = G.mainDeck.shift();
        G.grave.push(top);
        const name = cards.find(c => c.code === top.code)?.name || top.code;
        setMsg(`🐭 狂乱モグラ：「${name}」を墓地に置きました。`);
        renderGame();
      }
    );
  },
};

// =============== BP1-040 不法侵入禁止区 ===============
CARD_EFFECTS["BP1-040"] = {
  // 誘発はexecMoveの非プレイ着地時にフックする（simulator.htmlのG.lastPlayedFlagで管理）
  field_enter_other(obj, triggerObj) {
    // トークンは対象外
    if(triggerObj.isToken) return;
    const c = cards.find(c => c.code === triggerObj.code);
    if(!c || c.type !== "動物") return;
    // プレイで出た場合は対象外
    if(triggerObj.playedThisTurn) return;

    // このターンプレイ以外で出た動物を全て手札に戻す
    const nonPlayed = G.field.filter(o => {
      if(o === obj) return false;
      const oc = cards.find(c => c.code === o.code);
      return oc && oc.type === "動物" && !o.isToken && !o.playedThisTurn;
    });
    if(nonPlayed.length === 0) return;

    nonPlayed.forEach(o => moveCard(o, "field", "hand"));
    setMsg(`🚫 不法侵入禁止区：プレイ以外で出た動物${nonPlayed.length}体を手札に戻しました。`);
    renderGame();
  },

  // 【起動（手札）】①払ってこれを捨てて→次のプレイ以外着地1体を手札に戻すフラグ
  activate_hand(obj) {
    payCostTerrain(1, () => {
      moveCard(obj, "hand", "grave");
      G.hinshinFlag = true;
      setMsg("🚫 不法侵入禁止区：次にプレイ以外で出る動物1体を手札に戻します。");
      renderGame();
    });
  },
};

// ============================================================
// BP1-020〜BP1-080 効果実装
// ============================================================

// =============== BP1-020 蟻道 ===============
// ※餌道（BP1-019）と同じ構造
CARD_EFFECTS["BP1-020"] = {
  field_enter(obj) { CARD_EFFECTS["BP1-019"].field_enter(obj); },
  to_grave(obj) { CARD_EFFECTS["BP1-019"].to_grave(obj); },
};

// =============== BP1-021 蟻塚 ===============
CARD_EFFECTS["BP1-021"] = {
  field_enter(obj) {
    revealDeckTop(1, (revealed) => {
      const top = revealed[0];
      const c = cards.find(c => c.code === top.code);
      const isAriAnimal = c && c.type === "動物" && isAri(c);
      if(isAriAnimal) {
        G.mainDeck.shift(); G.hand.push(top);
        setMsg(`🐜 蟻塚：「${c.name}」を公開→手札に加えました。`);
      } else {
        setMsg(`🐜 蟻塚：「${c?.name||top.code}」を公開→アリ動物でないため戻します。`);
      }
      // コスト合計2以下のアリ存在を任意の数展開
      const cost1AriHand = G.hand.filter(o => {
        const oc = cards.find(c => c.code === o.code);
        return oc && isAri(oc) && oc.type !== "領土" && (parseInt(oc.cost)||0) >= 1;
      });
      if(cost1AriHand.length > 0) {
        askYesNo("手札のコスト合計2以下のアリ存在を任意の数展開しますか？",
          () => {
            askNumber("展開するカードの合計コストを入力（2以下）", 0, 2, (maxCost) => {
              pickFromZone("hand", {
                message: `コスト合計${maxCost}以下のアリ存在を選んでください（複数可）`,
                count: cost1AriHand.length,
                filter: (o, oc) => oc && isAri(oc) && oc.type !== "領土" && (parseInt(oc.cost)||0) >= 1,
              }, (selected) => {
                const total = selected.reduce((s,o)=>{const oc=cards.find(c=>c.code===o.code);return s+(parseInt(oc?.cost)||0);},0);
                if(total > maxCost) { setMsg("コスト合計が超えています。"); return; }
                selected.forEach(o => { moveCard(o,"hand","field"); const oc=cards.find(c=>c.code===o.code); if(!(oc?.effect||"").includes("《駿足》"))o.summonedThisTurn=true; setTimeout(()=>triggerCardEffect(o,"field_enter"),300); });
                renderGame();
              });
            });
          }
        );
      } else { renderGame(); }
    });
  },
  to_grave(obj) { CARD_EFFECTS["BP1-019"].to_grave(obj); },
};

// =============== BP1-022 蟻壁 ===============
CARD_EFFECTS["BP1-022"] = {
  field_enter(obj) {
    revealDeckTop(1, (revealed) => {
      const top = revealed[0];
      const c = cards.find(c => c.code === top.code);
      const isAriTerr = c && c.type === "縄張り" && isAri(c);
      if(isAriTerr) {
        G.mainDeck.shift(); G.hand.push(top);
        setMsg(`🐜 蟻壁：「${c.name}」を公開→手札に加えました。`);
      } else {
        setMsg(`🐜 蟻壁：「${c?.name||top.code}」を公開→アリ縄張りでないため戻します。`);
      }
      // 蟻塚と同じ展開処理
      CARD_EFFECTS["BP1-021"].field_enter(obj);
    });
  },
  to_grave(obj) { CARD_EFFECTS["BP1-019"].to_grave(obj); },
};

// =============== BP1-025 置狐 ===============
CARD_EFFECTS["BP1-025"] = {
  field_enter(obj) {
    const kitsuneField = G.field.filter(o => { const c=cards.find(c=>c.code===o.code); return c&&isKitsuneCard(c); });
    if(kitsuneField.length===0) return;
    askYesNo("【誘発】戦場のキツネ存在1つに妖狐カウンター2個を置きますか？",
      () => {
        pickFromZone("field",{message:"妖狐カウンターを置くキツネ存在を選んでください",count:1,filter:(o,c)=>c&&isKitsuneCard(c)},
          (selected)=>{ if(selected.length>0){ addYouko(selected[0],2,"BP1-025"); setMsg("🦊 置狐：妖狐カウンター2個を置きました。"); renderGame(); } });
      }
    );
  },
  to_grave(obj) {
    const kitsuneField = G.field.filter(o => { const c=cards.find(c=>c.code===o.code); return c&&isKitsuneCard(c); });
    if(kitsuneField.length===0) return;
    askYesNo("【誘発（墓地）】戦場のキツネ存在1つに妖狐カウンター2個を置きますか？",
      () => {
        pickFromZone("field",{message:"妖狐カウンターを置くキツネ存在を選んでください",count:1,filter:(o,c)=>c&&isKitsuneCard(c)},
          (selected)=>{ if(selected.length>0){ addYouko(selected[0],2,"BP1-025"); renderGame(); } });
      }
    );
  },
};

// =============== BP1-026 組狐 ===============
CARD_EFFECTS["BP1-026"] = {
  activate_field(obj) {
    askChoice("🦊 組狐：どちらの起動効果を使いますか？",
      [{label:"①ムーブ→キツネ存在1つに妖狐カウンター2個",value:"a"},
       {label:"②ムーブ→妖狐カウンター2個消費→カウンター名変換",value:"b"}],
      (choice) => {
        payMoveCost(obj);
        if(choice==="a") {
          pickFromZone("field",{message:"妖狐カウンターを置くキツネ存在を選んでください",count:1,filter:(o,c)=>c&&isKitsuneCard(c)},
            (selected)=>{ if(selected.length>0){ addYouko(selected[0],2,"BP1-026"); setMsg("🦊 組狐：妖狐カウンター2個を置きました。"); renderGame(); } });
        } else {
          const cnt = obj.counters?.["妖狐"]||0;
          if(cnt<2){ setMsg("🦊 組狐：妖狐カウンターが2個未満です。"); return; }
          removeYouko(obj,2,"BP1-026");
          // カウンター名を入力させて変換宣言
          const overlay = document.createElement("div");
          overlay.className="modal-overlay trigger-notice"; overlay.style.cssText="display:flex;z-index:500;";
          overlay.innerHTML=`<div class="modal-box" style="max-width:300px;" onclick="event.stopPropagation()">
            <p style="font-size:13px;color:#e0e8d0;margin-bottom:10px;">変換先のカウンター名を入力してください（このターン中有効）</p>
            <input id="counter-rename-input" type="text" value="" style="width:100%;padding:8px;background:#1a2a3a;border:1px solid #4a8a4a;border-radius:8px;color:#e0e8d0;font-size:14px;margin-bottom:10px;">
            <div class="modal-btn-row">
              <button class="modal-btn confirm" id="counter-rename-ok">決定</button>
              <button class="modal-btn cancel" onclick="this.closest('.trigger-notice').remove()">キャンセル</button>
            </div></div>`;
          document.body.appendChild(overlay);
          document.getElementById("counter-rename-ok").onclick = () => {
            const newName = document.getElementById("counter-rename-input").value.trim();
            if(!newName){ return; }
            // 戦場の妖狐カウンターを全て新名称に変換（一時）
            G.field.forEach(o => {
              if(o.counters?.["妖狐"]) {
                o.counters[newName] = (o.counters[newName]||0) + o.counters["妖狐"];
                delete o.counters["妖狐"];
              }
            });
            overlay.remove();
            setMsg(`🦊 組狐：このターン中、妖狐カウンターは「${newName}」になりました。`);
            renderGame();
          };
        }
      }
    );
  },
};

// =============== BP1-029 九尾 ===============
CARD_EFFECTS["BP1-029"] = {
  field_enter(obj) {
    // 固有：デッキ上9枚を裏向きで除外、妖狐カウンター9個
    const count = Math.min(9, G.mainDeck.length);
    for(let i=0;i<count;i++){
      const card=G.mainDeck.shift();
      card.faceDown=true;
      G.exile.push(card);
    }
    addYouko(obj,9,"BP1-029");
    setMsg(`🦊 九尾：デッキ上${count}枚を裏向きで除外し、妖狐カウンター9個を置きました。`);
    renderGame();
  },
  activate_hand(obj) {
    // 手札のこれを公開、動物1体生贄、妖狐の巻物から妖狐カウンター9個消費
    const makimono = G.field.find(o=>{ const c=cards.find(c=>c.code===o.code); return c&&c.name==="妖狐の巻物"; });
    if(!makimono){ setMsg("🦊 九尾：戦場に「妖狐の巻物」がありません。"); return; }
    const makinoCnt = makimono.counters?.["妖狐"]||0;
    if(makinoCnt<9){ setMsg(`🦊 九尾：妖狐の巻物の妖狐カウンターが${makinoCnt}個です（9個必要）。`); return; }
    const animals = G.field.filter(o=>{ const c=cards.find(c=>c.code===o.code); return c&&c.type==="動物"; });
    if(animals.length===0){ setMsg("🦊 九尾：戦場に生贄にする動物がいません。"); return; }
    pickFromZone("field",{message:"生贄にする動物1体を選んでください",count:1,filter:(o,c)=>c&&c.type==="動物"},
      (selected)=>{
        if(selected.length===0) return;
        moveCard(selected[0],"field","grave");
        removeYouko(makimono,9,"BP1-029");
        moveCard(obj,"hand","field");
        obj.summonedThisTurn=false;
        setMsg("🦊 九尾：戦場に出ました！");
        setTimeout(()=>triggerCardEffect(obj,"field_enter"),300);
        renderGame();
      });
  },
  activate_field(obj) {
    // 妖狐カウンター1個消費、除外の裏向きカードか妖狐含むカードを表向きにして能力コピー
    const cnt = obj.counters?.["妖狐"]||0;
    if(cnt<1){ setMsg("🦊 九尾：妖狐カウンターがありません。"); return; }
    const candidates = G.exile.filter(o=>o.faceDown || (cards.find(c=>c.code===o.code)?.name||"").includes("妖狐"));
    if(candidates.length===0){ setMsg("🦊 九尾：対象となる除外カードがありません。"); return; }
    pickFromZone("exile",{message:"表向きにして能力をコピーするカードを選んでください",count:1,
      filter:(o)=>o.faceDown||(cards.find(c=>c.code===o.code)?.name||"").includes("妖狐")},
      (selected)=>{
        if(selected.length===0) return;
        removeYouko(obj,1,"BP1-029");
        const target=selected[0]; target.faceDown=false;
        if(!obj.copyFromList) obj.copyFromList=[];
        obj.copyFromList.push(target.code);
        const name=cards.find(c=>c.code===target.code)?.name||target.code;
        setMsg(`🦊 九尾：「${name}」の能力をコピーしました。`);
        renderGame();
      });
  },
};

// =============== BP1-030 狐の隠里 ===============
CARD_EFFECTS["BP1-030"] = {
  constant_field(obj) {
    const hasKitsune = G.field.some(o=>{ const c=cards.find(c=>c.code===o.code); return c&&c.type==="動物"&&isKitsuneCard(c); });
    if(hasKitsune && !obj.hiderikiBuff) {
      if(!obj.keywords) obj.keywords=[];
      if(!obj.keywords.includes("山岳")) obj.keywords.push("山岳");
      if(!obj.keywords.includes("森林")) obj.keywords.push("森林");
      obj.hiderikiBuff=true;
    } else if(!hasKitsune && obj.hiderikiBuff) {
      obj.keywords=(obj.keywords||[]).filter(k=>k!=="山岳"&&k!=="森林");
      obj.hiderikiBuff=false;
    }
  },
  field_enter(obj) {
    searchDeck(
      card=>isKitsuneCard(card)||(card.name||"").includes("妖狐"),
      1,"hand",{message:"デッキからキツネ動物カードか妖狐含むカード1枚を手札に加えてください"}
    );
  },
  activate_field(obj) {
    const cnt=obj.counters?.["妖狐"]||0;
    if(cnt<2){ setMsg("🦊 狐の隠里：妖狐カウンターが2個未満です。"); return; }
    const youkoField=G.field.filter(o=>{ const c=cards.find(c=>c.code===o.code); return (c?.name||"").includes("妖狐"); });
    if(youkoField.length===0){ setMsg("🦊 狐の隠里：戦場に妖狐含む存在がありません。"); return; }
    pickFromZone("field",{message:"ウェイクする妖狐含む存在を選んでください",count:1,filter:(o)=>{ const c=cards.find(c=>c.code===o.code);return(c?.name||"").includes("妖狐");}},
      (selected)=>{ if(selected.length===0)return; removeYouko(obj,2,"BP1-030"); selected[0].rested=false; setMsg("🦊 狐の隠里：ウェイクしました。"); renderGame(); });
  },
};

// =============== BP1-031 妖狐の変化 ===============
CARD_EFFECTS["BP1-031"] = {
  can_play() {
    const kitsuneCount=G.field.filter(o=>{const c=cards.find(c=>c.code===o.code);return c&&c.type==="動物"&&isKitsuneCard(c);}).length;
    return { ok: true, koyuuX: kitsuneCount };
  },
  activate_field(obj) {
    askChoice("🦊 妖狐の変化：どちらの起動効果を使いますか？",
      [{label:"①ムーブ→キツネ動物生贄→そのコスト以下のキツネ動物展開+ドロー",value:"a"},
       {label:"②これを生贄→カウンター名変換",value:"b"}],
      (choice) => {
        if(choice==="a") {
          payMoveCost(obj);
          const kitsuneAnimals=G.field.filter(o=>{const c=cards.find(c=>c.code===o.code);return c&&c.type==="動物"&&isKitsuneCard(c)&&o!==obj;});
          if(kitsuneAnimals.length===0){setMsg("🦊 妖狐の変化：生贄にするキツネ動物がいません。");return;}
          pickFromZone("field",{message:"生贄にするキツネ動物を選んでください",count:1,filter:(o,c)=>c&&c.type==="動物"&&isKitsuneCard(c)&&o!==obj},
            (selected)=>{
              if(selected.length===0)return;
              const sacrificed=selected[0];
              const sacrificedCard=cards.find(c=>c.code===sacrificed.code);
              const maxCost=parseInt(sacrificedCard?.cost)||0;
              moveCard(sacrificed,"field","grave");
              deployFromHand((o,c)=>c&&c.type==="動物"&&isKitsuneCard(c)&&(parseInt(c.cost)||0)<=maxCost,false,()=>{
                drawCards(1); renderGame();
              });
            });
        } else {
          moveCard(obj,"field","grave");
          const overlay=document.createElement("div");
          overlay.className="modal-overlay trigger-notice"; overlay.style.cssText="display:flex;z-index:500;";
          overlay.innerHTML=`<div class="modal-box" style="max-width:300px;" onclick="event.stopPropagation()">
            <p style="font-size:13px;color:#e0e8d0;margin-bottom:10px;">変換先のカウンター名を入力してください</p>
            <input id="youko-rename2" type="text" style="width:100%;padding:8px;background:#1a2a3a;border:1px solid #4a8a4a;border-radius:8px;color:#e0e8d0;font-size:14px;margin-bottom:10px;">
            <div class="modal-btn-row"><button class="modal-btn confirm" id="youko-rename2-ok">決定</button><button class="modal-btn cancel" onclick="this.closest('.trigger-notice').remove()">キャンセル</button></div></div>`;
          document.body.appendChild(overlay);
          document.getElementById("youko-rename2-ok").onclick=()=>{
            const newName=document.getElementById("youko-rename2").value.trim();
            if(!newName)return;
            G.field.forEach(o=>{ if(o.counters?.["妖狐"]){o.counters[newName]=(o.counters[newName]||0)+o.counters["妖狐"];delete o.counters["妖狐"];} });
            overlay.remove(); setMsg(`🦊 妖狐の変化：妖狐カウンターが「${newName}」になりました。`); renderGame();
          };
        }
      }
    );
  },
};

// =============== BP1-032 妖狐の祭壇 ===============
CARD_EFFECTS["BP1-032"] = {
  activate_field(obj) {
    askChoice("🦊 妖狐の祭壇：どちらの起動効果を使いますか？",
      [{label:"①ムーブ→存在1つの妖狐カウンター全取→別の存在に全部置く",value:"a"},
       {label:"②これを生贄→カウンター名変換",value:"b"}],
      (choice)=>{
        if(choice==="a") {
          payMoveCost(obj);
          pickFromZone("field",{message:"妖狐カウンターを全て取り除く存在を選んでください",count:1},
            (src)=>{
              if(src.length===0)return;
              const srcObj=src[0]; const cnt=srcObj.counters?.["妖狐"]||0;
              if(cnt===0){setMsg("🦊 妖狐の祭壇：妖狐カウンターがありません。");return;}
              removeYouko(srcObj,cnt,"BP1-032");
              pickFromZone("field",{message:`${cnt}個の妖狐カウンターを置く存在を選んでください`,count:1,filter:(o)=>o!==srcObj},
                (dst)=>{ if(dst.length===0)return; addYouko(dst[0],cnt,"BP1-032"); setMsg(`🦊 妖狐の祭壇：妖狐カウンター${cnt}個を移しました。`); renderGame(); });
            });
        } else {
          moveCard(obj,"field","grave");
          CARD_EFFECTS["BP1-031"].activate_field({counters:{}}); // カウンター変換を再利用（簡易）
        }
      }
    );
  },
};

// =============== BP1-033 子モグラ ===============
CARD_EFFECTS["BP1-033"] = {
  field_enter(obj) {
    askChoice("🐭 子モグラ：どのプレイヤーのデッキ上1枚を墓地に置きますか？",
      [{label:"自分",value:"self"},{label:"相手",value:"enemy"}],
      (choice)=>{
        if(choice==="self"){
          if(G.mainDeck.length===0){setMsg("デッキが空です。");return;}
          const top=G.mainDeck.shift(); G.grave.push(top);
          setMsg(`🐭 子モグラ：自分のデッキ上「${cards.find(c=>c.code===top.code)?.name||top.code}」を墓地へ。`);
          renderGame();
        } else {
          G.enemyMillCount=(G.enemyMillCount||0)+1;
          setMsg(`🐭 子モグラ：相手のデッキ上1枚を墓地に（手動で処理してください）。`);
        }
      }
    );
  },
};

// =============== BP1-034 墓地モグラ ===============
CARD_EFFECTS["BP1-034"] = {
  // デッキから墓地に置かれた時→自動で戦場に出る（triggerCardEffectで呼ぶ）
  to_grave(obj) {
    // デッキから直接来た場合のみ（簡易判定：フラグ管理）
    if(obj.fromDeck) {
      obj.fromDeck=false;
      const idx=G.grave.indexOf(obj);
      if(idx>=0) G.grave.splice(idx,1);
      G.field.push(obj);
      obj.summonedThisTurn=true;
      setMsg(`🐭 墓地モグラ：デッキから墓地に置かれたため戦場に出ました。`);
      setTimeout(()=>triggerCardEffect(obj,"field_enter"),300);
      renderGame();
    }
  },
  activate_field(obj) {
    askChoice("🐭 墓地モグラ：どのプレイヤーのデッキ上1枚を墓地に置きますか？",
      [{label:"自分",value:"self"},{label:"相手",value:"enemy"}],
      (choice)=>{
        moveCard(obj,"field","grave");
        if(choice==="self"){
          if(G.mainDeck.length>0){const top=G.mainDeck.shift();G.grave.push(top);setMsg(`🐭 墓地モグラ：「${cards.find(c=>c.code===top.code)?.name||top.code}」を墓地へ。`);}
        } else { setMsg("🐭 墓地モグラ：相手のデッキ上1枚を墓地に（手動で処理してください）。"); }
        renderGame();
      }
    );
  },
};

// =============== BP1-036 追従モグラ ===============
CARD_EFFECTS["BP1-036"] = {
  to_grave(obj) {
    // デッキから墓地に置かれた時
    if(obj.fromDeck) {
      obj.fromDeck=false;
      askChoice("🐭 追従モグラ：どのプレイヤーのデッキ上1枚を墓地に置きますか？",
        [{label:"自分",value:"self"},{label:"相手",value:"enemy"}],
        (choice)=>{
          if(choice==="self"&&G.mainDeck.length>0){const top=G.mainDeck.shift();G.grave.push(top);setMsg(`🐭 追従モグラ：「${cards.find(c=>c.code===top.code)?.name||top.code}」を墓地へ。`);}
          else setMsg("🐭 追従モグラ：相手のデッキ上1枚を墓地に（手動で処理してください）。");
          renderGame();
        }
      );
    }
  },
  activate_hand(obj) {
    const moles=G.hand.filter(o=>{ const c=cards.find(c=>c.code===o.code); return c&&(c.tribe||"").includes("モグラ")&&o!==obj; });
    if(moles.length<2){setMsg(`🐭 追従モグラ：手札のモグラカードが${moles.length}枚です（2枚必要）。`);return;}
    payCostTerrain(1,()=>{
      pickFromZone("hand",{message:"捨てるモグラカードを2枚選んでください",count:2,filter:(o,c)=>c&&(c.tribe||"").includes("モグラ")&&o!==obj},
        (selected)=>{
          if(selected.length<2)return;
          selected.forEach(o=>moveCard(o,"hand","grave"));
          moveCard(obj,"hand","grave");
          // デッキ上3枚を墓地へ
          const count=Math.min(3,G.mainDeck.length);
          const milled=[];
          for(let i=0;i<count;i++){const top=G.mainDeck.shift();top.fromDeck=true;G.grave.push(top);milled.push(top);}
          // モグラカードを手札へ
          const molesMilled=milled.filter(o=>{const c=cards.find(c=>c.code===o.code);return c&&(c.tribe||"").includes("モグラ");});
          molesMilled.forEach(o=>{G.grave.splice(G.grave.indexOf(o),1);G.hand.push(o);});
          setMsg(`🐭 追従モグラ：デッキ上${count}枚を墓地へ。モグラ${molesMilled.length}枚を手札に加えました。`);
          renderGame();
        });
    });
  },
};

// =============== BP1-037 総代モグラ ===============
CARD_EFFECTS["BP1-037"] = {
  field_enter(obj) {
    const count=Math.min(3,G.mainDeck.length);
    for(let i=0;i<count;i++){const top=G.mainDeck.shift();top.fromDeck=true;G.grave.push(top);}
    setMsg(`🐭 総代モグラ：デッキ上${count}枚を墓地に置きました。`);
    renderGame();
  },
  activate_grave(obj) {
    const hasOnField=G.field.some(o=>o.code==="BP1-037");
    if(hasOnField){setMsg("🐭 総代モグラ：すでに戦場にいます。");return;}
    const moleAnimals=G.field.filter(o=>{const c=cards.find(c=>c.code===o.code);return c&&c.type==="動物"&&(c.tribe||"").includes("モグラ");});
    if(moleAnimals.length<2){setMsg(`🐭 総代モグラ：戦場のモグラ動物が${moleAnimals.length}体です（2体必要）。`);return;}
    pickFromZone("field",{message:"生贄にするモグラ動物を2体選んでください",count:2,filter:(o,c)=>c&&c.type==="動物"&&(c.tribe||"").includes("モグラ")},
      (selected)=>{
        if(selected.length<2)return;
        selected.forEach(o=>moveCard(o,"field","grave"));
        const idx=G.grave.indexOf(obj);
        if(idx>=0)G.grave.splice(idx,1);
        G.field.push(obj); obj.summonedThisTurn=true;
        setMsg("🐭 総代モグラ：墓地から戦場に出ました！");
        setTimeout(()=>triggerCardEffect(obj,"field_enter"),300);
        renderGame();
      });
  },
};

// =============== BP1-038 深淵の盗掘モグラ ===============
CARD_EFFECTS["BP1-038"] = {
  field_enter(obj) {
    const cost2Less=G.grave.filter(o=>{const c=cards.find(c=>c.code===o.code);return c&&c.type!=="領土"&&(parseInt(c.cost)||0)<=2;});
    if(cost2Less.length===0)return;
    askYesNo("【誘発】墓地のコスト2以下の存在カード1枚を戦場に出しますか？",
      ()=>{
        pickFromZone("grave",{message:"戦場に出す存在を選んでください",count:1,filter:(o,c)=>c&&c.type!=="領土"&&(parseInt(c.cost)||0)<=2},
          (selected)=>{
            if(selected.length===0)return;
            moveCard(selected[0],"grave","field");
            selected[0].summonedThisTurn=true;
            setTimeout(()=>triggerCardEffect(selected[0],"field_enter"),300);
            renderGame();
          });
      });
  },
  activate_grave(obj) {
    const otherMoles=G.grave.filter(o=>o!==obj&&(cards.find(c=>c.code===o.code)?.tribe||"").includes("モグラ"));
    if(otherMoles.length<10){setMsg(`🐭 深淵の盗掘モグラ：墓地のモグラカードが${otherMoles.length}枚です（10枚必要）。`);return;}
    pickFromZone("grave",{message:"除外するモグラカードを10枚選んでください（自身以外）",count:10,filter:(o,c)=>o!==obj&&(c?.tribe||"").includes("モグラ")},
      (selected)=>{
        if(selected.length<10)return;
        selected.forEach(o=>moveCard(o,"grave","exile"));
        const idx=G.grave.indexOf(obj);if(idx>=0)G.grave.splice(idx,1);
        G.field.push(obj); obj.summonedThisTurn=true;
        setMsg("🐭 深淵の盗掘モグラ：墓地から戦場に出ました！");
        setTimeout(()=>triggerCardEffect(obj,"field_enter"),300);
        renderGame();
      });
  },
};

// =============== BP1-039 簡易祭壇 ===============
CARD_EFFECTS["BP1-039"] = {
  phase_sunset(obj) {
    moveCard(obj,"field","grave");
    setMsg("⛩ 簡易祭壇：日没フェイズ開始時に生贄に捧げられました。");
    renderGame();
  },
  activate_field(obj) {
    pickFromZone("field",{message:"生贄にする動物を1体選んでください",count:1,filter:(o,c)=>c&&c.type==="動物"},
      (selected)=>{
        if(selected.length===0)return;
        moveCard(selected[0],"field","grave");
        if(G.grave.length<2){setMsg("⛩ 簡易祭壇：墓地にカードが2枚ありません。");return;}
        pickFromZone("grave",{message:"デッキ上に置くカードを2枚選んでください（選んだ順にデッキ上へ）",count:2},
          (graveCards)=>{
            if(graveCards.length<2)return;
            graveCards.reverse().forEach(o=>{moveCard(o,"grave","deck-top");});
            setMsg("⛩ 簡易祭壇：墓地の2枚をデッキ上に置きました。");
            renderGame();
          });
      });
  },
};

// =============== BP1-041 救助する森狼 ===============
CARD_EFFECTS["BP1-041"] = {
  field_enter(obj) {
    const cost1Less=G.field.filter(o=>{const c=cards.find(c=>c.code===o.code);return c&&c.type==="動物"&&(parseInt(c.cost)||0)<=1&&o!==obj;});
    if(cost1Less.length===0)return;
    askYesNo("【誘発】戦場のコスト1以下の動物1体を手札に戻しますか？",
      ()=>{
        pickFromZone("field",{message:"手札に戻す動物を選んでください",count:1,filter:(o,c)=>c&&c.type==="動物"&&(parseInt(c.cost)||0)<=1&&o!==obj},
          (selected)=>{if(selected.length===0)return;moveCard(selected[0],"field","hand");setMsg(`🐺 救助する森狼：「${cards.find(c=>c.code===selected[0].code)?.name}」を手札に戻しました。`);renderGame();});
      });
  },
  activate_hand(obj) {
    if(G.phase!==3){setMsg("🐺 救助する森狼：狩りフェイズ中のみ起動できます。");return;}
    const forestCount=countTerrain()["森"]||0;
    if(forestCount<3){setMsg(`🐺 救助する森狼：森林域が${forestCount}です（3以上必要）。`);return;}
    moveCard(obj,"hand","exile");
    const exIdx=G.exile.indexOf(obj);
    if(exIdx>=0){G.exile.splice(exIdx,1);G.field.push(obj);}
    obj.rested=true;
    // 「これが戦場に出た時にこれを生贄に捧げる」を得る
    gainAbility(obj,"『これが戦場に出た時にこれを生贄に捧げる』",false);
    setMsg("🐺 救助する森狼：ムーブ状態で戦場に出ました。");
    setTimeout(()=>{ moveCard(obj,"field","grave"); setMsg("🐺 救助する森狼：効果で生贄に捧げられました。"); renderGame(); },500);
    renderGame();
  },
};

// =============== BP1-042 軍医ヘビ ===============
CARD_EFFECTS["BP1-042"] = {
  group_attack(obj, count) {
    G.playerLife+=count;
    setMsg(`🐍 軍医ヘビ：ライフ${count}点を回復しました。`);
    renderGame();
  },
  group_attack_hand(obj, count, attackers) {
    askYesNo(`【軍医ヘビ・手札】手札のこれを捨てて墓地のコスト${count}以下の動物を手札に加えますか？`,
      ()=>{
        moveCard(obj,"hand","grave");
        pickFromZone("grave",{message:`墓地のコスト${count}以下の動物を選んでください`,count:1,filter:(o,c)=>c&&c.type==="動物"&&(parseInt(c.cost)||0)<=count},
          (selected)=>{if(selected.length>0){moveCard(selected[0],"grave","hand");setMsg(`🐍 軍医ヘビ：「${cards.find(c=>c.code===selected[0].code)?.name}」を手札に加えました。`);}renderGame();});
      });
  },
};

// =============== BP1-043 守備隊長タートル ===============
CARD_EFFECTS["BP1-043"] = {
  group_attack(obj, count) {
    const others=groupAttackers.filter(o=>o!==obj);
    if(others.length===0)return;
    pickFromZone("field",{message:"防護カウンターを置く集団攻撃中の動物を選んでください",count:1,filter:(o)=>groupAttackers.includes(o)&&o!==obj},
      (selected)=>{
        if(selected.length===0)return;
        if(!selected[0].counters)selected[0].counters={};
        selected[0].counters["防護"]=(selected[0].counters["防護"]||0)+1;
        setMsg(`🐢 守備隊長タートル：「${cards.find(c=>c.code===selected[0].code)?.name}」に防護カウンターを置きました。`);
        renderGame();
      });
  },
  activate_hand(obj) {
    if(G.phase!==3){setMsg("🐢 守備隊長タートル：狩りフェイズ中のみ起動できます。");return;}
    const rhinoArmy=G.field.filter(o=>{const c=cards.find(c=>c.code===o.code);return c&&(c.effect||"").includes("《ライノ軍》");});
    if(rhinoArmy.length===0){setMsg("🐢 守備隊長タートル：戦場にライノ軍動物がいません。");return;}
    moveCard(obj,"hand","grave");
    pickFromZone("field",{message:"防護カウンターを置くライノ軍動物を選んでください",count:1,filter:(o,c)=>c&&(c.effect||"").includes("《ライノ軍》")},
      (selected)=>{
        if(selected.length===0)return;
        if(!selected[0].counters)selected[0].counters={};
        selected[0].counters["防護"]=(selected[0].counters["防護"]||0)+1;
        setMsg("🐢 守備隊長タートル：防護カウンターを置きました。");
        renderGame();
      });
  },
};

// =============== BP1-044 補給兵ハムスター ===============
CARD_EFFECTS["BP1-044"] = {
  group_attack(obj, count) {
    payCostTerrain(1,()=>{
      revealDeckTop(1,(revealed)=>{
        const top=revealed[0];
        const c=cards.find(c=>c.code===top.code);
        if(c&&c.type==="動物"){
          G.mainDeck.shift(); G.hand.push(top);
          setMsg(`🐹 補給兵ハムスター：「${c.name}」を手札に加えました。`);
        } else {
          G.mainDeck.splice(0,1); G.mainDeck.push(top); // デッキ下へ
          setMsg(`🐹 補給兵ハムスター：「${c?.name||top.code}」は動物でないためデッキ下へ。`);
        }
        renderGame();
      });
    });
  },
};

// =============== BP1-045 斥候ハゲワシ ===============
CARD_EFFECTS["BP1-045"] = {
  group_attack(obj, count) {
    setMsg("🦅 斥候ハゲワシ：このターン中、相手は誘発能力を発動できません（通知）。");
  },
  activate_field(obj) {
    moveCard(obj,"field","grave");
    setMsg("🦅 斥候ハゲワシ：動物カードの誘発効果を妨害しました（手動で処理してください）。");
    renderGame();
  },
};

// =============== BP1-046 攻撃隊長ラーテル ===============
CARD_EFFECTS["BP1-046"] = {
  field_enter(obj) {
    const rhinoArmy=G.field.filter(o=>{const c=cards.find(c=>c.code===o.code);return c&&(c.effect||"").includes("《ライノ軍》")&&o!==obj;});
    if(rhinoArmy.length===0)return;
    askYesNo("【誘発】戦場のライノ軍動物1体にターン終了時まで《駿足》を与えますか？",
      ()=>{
        pickFromZone("field",{message:"《駿足》を与えるライノ軍動物を選んでください",count:1,filter:(o,c)=>c&&(c.effect||"").includes("《ライノ軍》")&&o!==obj},
          (selected)=>{if(selected.length===0)return;gainAbility(selected[0],"《駿足》",true);renderGame();});
      });
  },
  group_attack(obj, count) {
    groupAttackers.forEach(o=>gainAbility(o,"ATK+1",true));
    setMsg("🦡 攻撃隊長ラーテル：集団攻撃中の全動物にATK+1を付与しました（ターン終了時まで）。");
    renderGame();
  },
};

// =============== BP1-047 工兵カバ ===============
CARD_EFFECTS["BP1-047"] = {
  field_enter(obj) {
    const cost1=G.field.filter(o=>{const c=cards.find(c=>c.code===o.code);return c&&c.type!=="領土"&&(parseInt(c.cost)||0)===1&&o!==obj;});
    if(cost1.length===0)return;
    askYesNo("【誘発】戦場のコスト1の存在1つを破壊しますか？（破壊したならコントローラーはドロー）",
      ()=>{
        pickFromZone("field",{message:"破壊するコスト1の存在を選んでください",count:1,filter:(o,c)=>c&&(parseInt(c.cost)||0)===1&&o!==obj},
          (selected)=>{
            if(selected.length===0)return;
            moveCard(selected[0],"field","grave");
            drawCards(1); // 簡易：自分がドロー
            setMsg(`🦛 工兵カバ：「${cards.find(c=>c.code===selected[0].code)?.name}」を破壊。カード1枚ドロー。`);
            renderGame();
          });
      });
  },
  group_attack(obj, count) {
    const cost0=G.field.filter(o=>{const c=cards.find(c=>c.code===o.code);return c&&c.type!=="領土"&&(parseInt(c.cost)||0)===0&&!groupAttackers.includes(o);});
    if(cost0.length===0)return;
    askYesNo("【集団攻撃誘発】戦場のコスト0の存在1つを破壊しますか？（破壊したならドロー）",
      ()=>{
        pickFromZone("field",{message:"破壊するコスト0の存在を選んでください",count:1,filter:(o,c)=>c&&(parseInt(c.cost)||0)===0&&!groupAttackers.includes(o)},
          (selected)=>{
            if(selected.length===0)return;
            moveCard(selected[0],"field","grave");
            drawCards(1);
            setMsg(`🦛 工兵カバ：コスト0の存在を破壊。ドロー。`);
            renderGame();
          });
      });
  },
};

// =============== BP1-048 師団長ライノ ===============
CARD_EFFECTS["BP1-048"] = {
  // 固有はopenAttackModal→checkRhinoLeaderで処理済み
  group_attack(obj, count) {
    const total=getGroupTotalATK();
    if(total>=8){
      setMsg(`🦏 師団長ライノ：合計ATK${total}→8以上！全攻撃動物が《突破》を得ます。`);
    }
  },
};

// =============== BP1-049 無欠の大将ライノ ===============
CARD_EFFECTS["BP1-049"] = {
  can_play() {
    return { ok: false, reason: "デッキや墓地から戦場に出すことができません（起動（手札）から出してください）" };
  },
  constant_field(obj) {
    // 効果で破壊されない→dealDamageToCardから参照
    obj.indestructible = true;
  },
  activate_hand(obj) {
    if(G.phase!==1){setMsg("🦏 無欠の大将ライノ：準備フェイズ中のみ起動できます。");return;}
    const rhinoArmy=G.field.filter(o=>{const c=cards.find(c=>c.code===o.code);return c&&(c.effect||"").includes("《ライノ軍》");});
    if(rhinoArmy.length===0){setMsg("🦏 無欠の大将ライノ：戦場にライノ軍動物がいません。");return;}

    // コスト合計9以上になるように選択
    pickFromZone("field",{message:"生贄にするライノ軍動物を選んでください（コスト合計9以上）",count:rhinoArmy.length,filter:(o,c)=>c&&(c.effect||"").includes("《ライノ軍》")},
      (selected)=>{
        const total=selected.reduce((s,o)=>{const c=cards.find(c=>c.code===o.code);return s+(parseInt(c?.cost)||0);},0);
        if(total<9){setMsg(`🦏 無欠の大将ライノ：選んだコスト合計が${total}です（9以上必要）。`);return;}
        selected.forEach(o=>moveCard(o,"field","grave"));
        moveCard(obj,"hand","field");
        obj.summonedThisTurn=false; // 駿足持ち
        setMsg("🦏 無欠の大将ライノ：戦場に出ました！");
        setTimeout(()=>triggerCardEffect(obj,"field_enter"),300);
        renderGame();
      });
  },
  field_enter(obj) {
    // 攻撃した時は攻撃確定後に呼ぶ（通知のみ）
    setMsg("🦏 無欠の大将ライノ：攻撃時に存在3つまでを破壊できます（攻撃後に起動）。");
  },
  activate_field(obj) {
    // 攻撃後の追加効果：存在3つまでを破壊
    pickFromZone("field",{message:"破壊する存在を最大3つ選んでください",count:3,filter:(o)=>o!==obj},
      (selected)=>{
        selected.forEach(o=>{
          if(o.indestructible){setMsg(`💀 無欠の大将ライノ：「${cards.find(c=>c.code===o.code)?.name}」は効果で破壊されません。`);return;}
          moveCard(o,"field","grave");
          setTimeout(()=>{ const eff=CARD_EFFECTS[o.code]; if(eff?.to_grave)eff.to_grave(o); },300);
        });
        setMsg(`🦏 無欠の大将ライノ：${selected.length}体を破壊しました。`);
        renderGame();
      });
  },
};

// =============== BP1-050 英雄の参戦 ===============
CARD_EFFECTS["BP1-050"] = {
  play(obj) {
    const count=Math.min(15,G.mainDeck.length);
    for(let i=0;i<count;i++){const top=G.mainDeck.shift();top.faceDown=true;G.exile.push(top);}
    if(count<15){setMsg(`⚔️ 英雄の参戦：デッキが${count}枚しかありませんでした。効果は不発です。`);renderGame();return;}
    deployFromHand((o,c)=>c&&c.type==="動物",false,null);
    setMsg("⚔️ 英雄の参戦：デッキ15枚を除外。手札の動物を戦場に出しました。");
    renderGame();
  },
};

// =============== BP1-051 晩成の勇者 ===============
CARD_EFFECTS["BP1-051"] = {
  field_enter(obj) {
    const elephants=G.field.filter(o=>{const c=cards.find(c=>c.code===o.code);return c&&(c.tribe||"").includes("ゾウ")&&o!==obj;}).length;
    const x=Math.max(0,6-elephants);
    if(x>0){
      if(!obj.counters)obj.counters={};
      obj.counters["ATK-1/DEF-1"]=(obj.counters["ATK-1/DEF-1"]||0)+x;
      obj.atkMod=(obj.atkMod||0)-x; obj.defMod=(obj.defMod||0)-x;
      setMsg(`🐘 晩成の勇者：ATK-1/DEF-1カウンター${x}個が置かれました（ゾウ${elephants}体）。`);
      renderGame();
    }
  },
};

// =============== BP1-052 蹂躙の勇者 ===============
// 固有効果なし（《突破》のみ）

// =============== BP1-053 献身の母象 ===============
CARD_EFFECTS["BP1-053"] = {
  // 他のゾウ動物が対象になった時→pickFromZoneのフックで対応（通知のみ実装）
  field_enter(obj) {
    setMsg("🐘 献身の母象：戦場に出ました。他のゾウ動物が単体対象効果の対象になった時、自動的にこれに変更できます（手動で確認してください）。");
  },
};

// =============== BP1-054 象の教育場 ===============
CARD_EFFECTS["BP1-054"] = {
  // 固有（戦場）：ゾウ動物着地時にATK+1/DEF+1カウンター→field_enter_otherで対応
  field_enter_other(obj, triggerObj) {
    const c=cards.find(c=>c.code===triggerObj.code);
    if(!c||c.type!=="動物"||(c.tribe||"").indexOf("ゾウ")<0)return;
    if(!triggerObj.counters)triggerObj.counters={};
    triggerObj.counters["ATK+1/DEF+1"]=(triggerObj.counters["ATK+1/DEF+1"]||0)+1;
    triggerObj.atkMod=(triggerObj.atkMod||0)+1; triggerObj.defMod=(triggerObj.defMod||0)+1;
    setMsg(`🐘 象の教育場：「${c.name}」にATK+1/DEF+1カウンターを置きました。`);
    renderGame();
  },
  activate_hand(obj) {
    const exileZou=G.exile.filter(o=>{const c=cards.find(c=>c.code===o.code);return c&&(c.tribe||"").includes("ゾウ");});
    if(exileZou.length===0){setMsg("🐘 象の教育場：除外領域にゾウカードがありません。");return;}
    payCostTerrain(1,()=>{
      moveCard(obj,"hand","grave");
      pickFromZone("exile",{message:"墓地に置くゾウカードを選んでください",count:1,filter:(o,c)=>c&&(c.tribe||"").includes("ゾウ")},
        (selected)=>{if(selected.length===0)return;moveCard(selected[0],"exile","grave");setMsg("🐘 象の教育場：ゾウカードを墓地に置きました。");renderGame();});
    });
  },
};

// =============== BP1-055 皇后アリゲーター ===============
CARD_EFFECTS["BP1-055"] = {
  activate_hand(obj) {
    payCostTerrain(1,()=>{
      moveCard(obj,"hand","grave");
      searchDeck(card=>card.name==="帝王クロコダイル",1,"grave",{message:"デッキから帝王クロコダイルを墓地に置いてください"});
      setTimeout(()=>{
        const inGrave=G.grave.some(o=>o.code==="BP1-080");
        if(!inGrave){setMsg("🐊 皇后アリゲーター：帝王クロコダイルが墓地にありません。");return;}
        searchDeck(card=>card.name==="帝王の子"||card.name==="帝王クロコダイルⅡ世",1,"hand",{message:"デッキから帝王の子か帝王クロコダイルⅡ世を手札に加えてください"});
      },800);
    });
  },
  activate_grave(obj) {
    // 相手ターン中のみ（簡易：フェイズ確認なし、通知）
    const crocs=G.grave.filter(o=>{const c=cards.find(c=>c.code===o.code);return c&&(c.tribe||"").includes("ワニ")&&o!==obj;});
    if(crocs.length<2){setMsg("🐊 皇后アリゲーター：墓地のワニカードが足りません（2枚必要）。");return;}
    pickFromZone("grave",{message:"除外するワニカードを2枚選んでください（自身以外）",count:2,filter:(o,c)=>c&&(c.tribe||"").includes("ワニ")&&o!==obj},
      (selected)=>{
        if(selected.length<2)return;
        selected.forEach(o=>moveCard(o,"grave","exile"));
        moveCard(obj,"grave","exile");
        const waniField=G.field.filter(o=>{const c=cards.find(c=>c.code===o.code);return c&&(c.tribe||"").includes("ワニ");});
        if(waniField.length===0){setMsg("🐊 皇后アリゲーター：戦場にワニ動物がいません。");return;}
        pickFromZone("field",{message:"ウェイクするワニ動物を選んでください",count:1,filter:(o,c)=>c&&(c.tribe||"").includes("ワニ")},
          (targets)=>{if(targets.length===0)return;targets[0].rested=false;setMsg("🐊 皇后アリゲーター：ワニ動物をウェイクしました。");renderGame();});
      });
  },
};

// =============== BP1-056 帝王の子 ===============
CARD_EFFECTS["BP1-056"] = {
  activate_field(obj) {
    payMoveCost(obj);
    payCostTerrain(2,()=>{
      moveCard(obj,"field","grave");
      const kroII=G.hand.find(o=>{const c=cards.find(c=>c.code===o.code);return c&&c.name==="帝王クロコダイルⅡ世";});
      if(!kroII){setMsg("🐊 帝王の子：手札に帝王クロコダイルⅡ世がありません。");return;}
      searchDeck(card=>card.name==="ワニの沼",1,"field",{message:"デッキからワニの沼を戦場に出してください"});
      setTimeout(()=>{
        moveCard(kroII,"hand","field"); kroII.rested=true;
        setMsg("🐊 帝王の子：ワニの沼を展開し、帝王クロコダイルⅡ世をムーブ状態で戦場に出しました。");
        setTimeout(()=>triggerCardEffect(kroII,"field_enter"),300);
        renderGame();
      },800);
    });
  },
  activate_hand(obj) {
    payCostTerrain(2,()=>{
      moveCard(obj,"hand","grave");
      revealDeckTop(2,(revealed)=>{
        const top2=revealed.slice(0,2);
        const names=top2.map(o=>cards.find(c=>c.code===o.code)?.name||o.code).join("、");
        setMsg(`🐊 帝王の子：「${names}」を公開しました。`);
        askChoice("手札に加えるカードを選んでください",
          top2.map(o=>({label:cards.find(c=>c.code===o.code)?.name||o.code,value:o})),
          (chosen)=>{
            G.mainDeck.splice(G.mainDeck.indexOf(chosen),1);
            G.hand.push(chosen);
            const other=top2.find(o=>o!==chosen);
            if(other){G.mainDeck.splice(G.mainDeck.indexOf(other),1);G.grave.push(other);}
            setMsg(`🐊 帝王の子：「${cards.find(c=>c.code===chosen.code)?.name}」を手札へ。残りを墓地へ。`);
            renderGame();
          });
      });
    });
  },
};

// =============== BP1-057 ヒトコブラクダ ===============
CARD_EFFECTS["BP1-057"] = {
  field_enter(obj) {
    if(!obj.counters)obj.counters={};
    obj.counters["防護"]=(obj.counters["防護"]||0)+1;
    setMsg("🐪 ヒトコブラクダ：防護カウンター1個が置かれました。");
    renderGame();
  },
};

// =============== BP1-058 フタコブラクダ ===============
CARD_EFFECTS["BP1-058"] = {
  field_enter(obj) {
    if(!obj.counters)obj.counters={};
    obj.counters["防護"]=(obj.counters["防護"]||0)+2;
    setMsg("🐪 フタコブラクダ：防護カウンター2個が置かれました。");
    renderGame();
  },
};

// =============== BP1-059 母にゃんこ ===============
CARD_EFFECTS["BP1-059"] = {
  // 常時：攻撃・防御できない（UIで表示のみ）
  phase_sunset(obj) {
    // 日没フェイズ開始時に発動
    // 1/2の山岳ネコトークンを生成
    G.field.push({
      id:"token_cat_"+Date.now(), code:"TOKEN_NEKO", isToken:true,
      tokenName:"山岳ネコ動物トークン", tokenStats:"ATK 1／DEF 2",
      tokenType:"動物", tokenTribe:"ネコ",
      keywords:[], gainedEffects:[], damage:0, rested:false, night:false, summonedThisTurn:true,
    });
    setMsg("🐱 母にゃんこ：山岳ネコ動物トークンを生成しました。");

    // デッキ上2枚を見てコスト2のカードを除外→次の狩りフェイズ終了時まで除外からプレイ可
    revealDeckTop(2,(revealed)=>{
      const cost2=revealed.filter(o=>{const c=cards.find(c=>c.code===o.code);return(parseInt(c?.cost)||0)===2;});
      const others=revealed.filter(o=>!cost2.includes(o));
      if(cost2.length>0){
        askChoice("除外するコスト2のカードを選んでください",
          cost2.map(o=>({label:cards.find(c=>c.code===o.code)?.name||o.code,value:o})),
          (chosen)=>{
            G.mainDeck.splice(G.mainDeck.indexOf(chosen),1);
            chosen.motherNyanExile=G.turn; // ターン数を記録
            G.exile.push(chosen);
            others.forEach(o=>{const idx=G.mainDeck.indexOf(o);if(idx>=0)G.mainDeck.splice(idx,1);G.mainDeck.push(o);});
            setMsg(`🐱 母にゃんこ：「${cards.find(c=>c.code===chosen.code)?.name}」を除外。次の狩りフェイズ終了時まで除外からプレイ可能。`);
            renderGame();
          });
      } else {
        others.forEach(o=>{const idx=G.mainDeck.indexOf(o);if(idx>=0)G.mainDeck.splice(idx,1);G.mainDeck.push(o);});
        renderGame();
      }
    });
  },
};

// =============== BP1-060 子にゃんこ ===============
CARD_EFFECTS["BP1-060"] = {
  field_enter(obj) {
    askYesNo("【誘発】デッキからコスト2・ATK2・DEF2のいずれかのカード1枚をデッキ上に置きますか？",
      ()=>{
        searchDeck(
          card=>(parseInt(card.cost)||0)===2||(card.stats||"").includes("ATK 2")||(card.stats||"").includes("DEF 2"),
          1,"deck-top",{message:"デッキからコスト2・ATK2・DEF2のいずれかのカード1枚を選んでください"}
        );
      });
  },
};

// =============== BP1-061 キリンの背比べ ===============
CARD_EFFECTS["BP1-061"] = {
  play(obj) {
    if(G.mainDeck.length>=250){setMsg("🦒 キリンの背比べ：デッキが250枚以上！あなたの勝利です！");alert("勝利！デッキが250枚以上あります！");}
    else setMsg(`🦒 キリンの背比べ：デッキ枚数が${G.mainDeck.length}枚です（250枚未満のため効果なし）。`);
    renderGame();
  },
};

// =============== BP1-062 治癒亀 ===============
CARD_EFFECTS["BP1-062"] = {
  // 相手効果の対象になった時→pickFromZoneフックで対応（通知のみ）
  field_enter(obj) {
    setMsg("🐢 治癒亀：相手の効果の対象になった時、ライフ1点を回復します（自動通知）。");
  },
};

// =============== BP1-063 危険な突進 ===============
CARD_EFFECTS["BP1-063"] = {
  can_play() { return {ok:true}; },
  play(obj) {
    pickFromZone("field",{message:"破壊するコスト4以下の存在を選んでください",count:1,filter:(o,c)=>c&&(parseInt(c.cost)||0)<=4},
      (selected)=>{
        if(selected.length===0)return;
        if(selected[0].indestructible){setMsg("⚡ 危険な突進：対象が効果で破壊されません。");return;}
        moveCard(selected[0],"field","grave");
        setMsg(`⚡ 危険な突進：「${cards.find(c=>c.code===selected[0].code)?.name}」を破壊しました。`);
        setTimeout(()=>{ const eff=CARD_EFFECTS[selected[0].code]; if(eff?.to_grave)eff.to_grave(selected[0]); },300);
        renderGame();
      });
  },
};

// =============== BP1-064 焦土化 ===============
CARD_EFFECTS["BP1-064"] = {
  play(obj) {
    askNumber("🔥 焦土化：コストXをいくつ支払いますか？",0,20,(x)=>{
      payCostTerrain(x,()=>{
        const targets=G.field.filter(o=>{const c=cards.find(c=>c.code===o.code);return c&&(parseInt(c.cost)||0)===x;});
        targets.forEach(o=>{
          if(o.indestructible)return;
          moveCard(o,"field","grave");
          setTimeout(()=>{ const eff=CARD_EFFECTS[o.code]; if(eff?.to_grave)eff.to_grave(o); },300);
        });
        setMsg(`🔥 焦土化：コスト${x}の存在${targets.length}体を破壊しました。`);
        renderGame();
      });
    });
  },
};

// =============== BP1-065 赤猫 ===============
CARD_EFFECTS["BP1-065"] = {
  // 対象になった時→pickFromZoneのコールバックでチェック（外部フック）
  on_targeted(obj) {
    if(!obj.counters)obj.counters={};
    obj.counters["ATK+1/DEF+1"]=(obj.counters["ATK+1/DEF+1"]||0)+1;
    obj.atkMod=(obj.atkMod||0)+1; obj.defMod=(obj.defMod||0)+1;
    setMsg("🐱 赤猫：対象になりました！ATK+1/DEF+1カウンターを置きました。");
    renderGame();
  },
  // ダメージを受けた時の反射→dealDamageToCardから呼ぶ
  on_damage(obj, amount) {
    G.enemyLife=Math.max(0,G.enemyLife-amount);
    setMsg(`🐱 赤猫：${amount}点ダメージを受けました→相手に${amount}点反射！`);
    renderGame();
  },
  to_grave(obj) {
    const atkCnt=obj.counters?.["ATK+1/DEF+1"]||0;
    G.enemyLife=Math.max(0,G.enemyLife-atkCnt);
    setMsg(`🐱 赤猫：墓地に送られました。相手に${atkCnt}点ダメージ。`);
    if(atkCnt>=4){
      const graveIdx=G.grave.indexOf(obj);
      if(graveIdx>=0){G.grave.splice(graveIdx,1);G.field.push(obj);obj.summonedThisTurn=true;}
      setMsg(`🐱 赤猫：${atkCnt}点（4以上）！戦場に戻りました！`);
    }
    renderGame();
  },
};

// =============== BP1-066 小さき破壊者 ===============
CARD_EFFECTS["BP1-066"] = {
  field_enter(obj) {
    const card=cards.find(c=>c.code===obj.code);
    const atk=getATK(card)+(obj.atkMod||0);
    const tools=G.field.filter(o=>{const c=cards.find(c=>c.code===o.code);return c&&c.type==="道具"&&(parseInt(c.cost)||0)<=atk&&o!==obj;});
    if(tools.length===0)return;
    askYesNo(`【誘発】戦場のコスト${atk}以下の道具を破壊しますか？`,
      ()=>{
        pickFromZone("field",{message:`破壊するコスト${atk}以下の道具を選んでください`,count:1,filter:(o,c)=>c&&c.type==="道具"&&(parseInt(c.cost)||0)<=atk&&o!==obj},
          (selected)=>{if(selected.length===0)return;moveCard(selected[0],"field","grave");setMsg(`🐗 小さき破壊者：「${cards.find(c=>c.code===selected[0].code)?.name}」を破壊。`);renderGame();});
      });
  },
  activate_field(obj) {
    payCostTerrain(2,()=>{gainAbility(obj,"ATK+1",true);setMsg("🐗 小さき破壊者：ターン終了時まで ATK+1を得ました。");renderGame();});
  },
};

// =============== BP1-067 猫騙し ===============
CARD_EFFECTS["BP1-067"] = {
  play(obj) {
    const animals=G.field.filter(o=>{const c=cards.find(c=>c.code===o.code);return c&&c.type==="動物";});
    if(animals.length===0){setMsg("🐱 猫騙し：対象となる動物がいません。");return;}
    pickFromZone("field",{message:"対象の動物を選んでください",count:1,filter:(o,c)=>c&&c.type==="動物"},
      (selected)=>{
        if(selected.length===0)return;
        const target=selected[0];
        // カウンター2個を取り除く
        if(target.counters){
          const cNames=Object.keys(target.counters).filter(k=>target.counters[k]>0);
          if(cNames.length>0){
            askChoice("取り除くカウンターを選んでください（2個分）",cNames.map(n=>({label:`${n}（${target.counters[n]}個）`,value:n})),
              (chosen)=>{target.counters[chosen]=Math.max(0,target.counters[chosen]-2);}
            );
          }
        }
        // 2点ダメージ
        dealDamageToCard(target,2);
        setMsg(`🐱 猫騙し：「${cards.find(c=>c.code===target.code)?.name}」にカウンター-2と2点ダメージ。`);
      });
  },
};

// =============== BP1-068 熱水噴出孔 ===============
CARD_EFFECTS["BP1-068"] = {
  play(obj) {
    askNumber("🌋 熱水噴出孔：コストXをいくつ支払いますか？",0,20,(x)=>{
      payCostTerrain(x,()=>{
        G.field.forEach(o=>{
          const c=cards.find(c=>c.code===o.code);
          if(c&&c.type==="動物") dealDamageToCard(o,x);
        });
        G.playerLife=Math.max(0,G.playerLife-x);
        setMsg(`🌋 熱水噴出孔：全動物と自分に${x}点ダメージ。`);
        renderGame();
      });
    });
  },
};

// =============== BP1-069 土砂崩れ ===============
CARD_EFFECTS["BP1-069"] = {
  play(obj) {
    pickFromZone("field",{message:"破壊するコスト4以下の縄張りか道具を選んでください",count:1,
      filter:(o,c)=>c&&(c.type==="縄張り"||c.type==="道具")&&(parseInt(c.cost)||0)<=4},
      (selected)=>{
        if(selected.length===0)return;
        moveCard(selected[0],"field","grave");
        setMsg(`🪨 土砂崩れ：「${cards.find(c=>c.code===selected[0].code)?.name}」を破壊。`);
        renderGame();
      });
  },
  activate_grave(obj) {
    const mtnTerr=G.territory.filter(o=>{const c=cards.find(c=>c.code===o.code);return c&&(c.territory_type||[]).includes("山岳");});
    if(mtnTerr.length===0){setMsg("🪨 土砂崩れ：山岳領土がありません。");return;}
    pickFromZone("field",{message:"除外する山岳領土を選んでください",count:1,filter:(o)=>G.territory.includes(o)&&(cards.find(c=>c.code===o.code)?.territory_type||[]).includes("山岳")},
      (selected)=>{
        if(selected.length===0)return;
        moveCard(selected[0],"field","exile");
        moveCard(obj,"grave","exile");
        if(G.mainDeck.length>0){
          const top=G.mainDeck.shift();
          top.dozaCrashExile=G.turn;
          G.exile.push(top);
          setMsg(`🪨 土砂崩れ：デッキ上「${cards.find(c=>c.code===top.code)?.name||top.code}」を除外。このターン中、除外領域からプレイ可能。`);
        }
        renderGame();
      });
  },
};

// =============== BP1-070 水辺の騙し屋 ===============
CARD_EFFECTS["BP1-070"] = {
  // コスト0カードがプレイされた時→confirmPlay後にon_play_reactionで呼ぶ
  on_play_reaction(obj) {
    // 最後にプレイされたカードがコスト0か確認
    const lastPlayed=G.pile[G.pile.length-1];
    if(!lastPlayed)return;
    const lc=cards.find(c=>c.code===lastPlayed.code);
    if(!lc||(parseInt(lc.cost)||0)!==0)return;
    askYesNo(`🐸 水辺の騙し屋：「${lc.name}」（コスト0）がプレイされました。同名カードをデッキからプレイしますか？`,
      ()=>{
        const same=G.mainDeck.find(o=>o.code===lastPlayed.code);
        if(!same){setMsg("🐸 水辺の騙し屋：デッキに同名カードがありません。");return;}
        G.mainDeck.splice(G.mainDeck.indexOf(same),1);
        G.pile.push(same);
        setMsg(`🐸 水辺の騙し屋：デッキから「${lc.name}」をプレイしました。このターン中、同名カードはプレイできません。`);
        renderGame();
      });
  },
};

// =============== BP1-071 水辺の働き屋 ===============
CARD_EFFECTS["BP1-071"] = {
  field_enter(obj) {
    if(G.pile.length===0)return;
    askYesNo("【誘発】パイルのカード1つを手札に戻しますか？",
      ()=>{
        pickFromZone("pile",{message:"手札に戻すカードを選んでください",count:1},
          (selected)=>{if(selected.length===0)return;moveCard(selected[0],"pile","hand");setMsg("🐸 水辺の働き屋：パイルのカードを手札に戻しました。");renderGame();});
      });
  },
  activate_hand(obj) {
    payCostTerrain(1,()=>{
      moveCard(obj,"hand","grave");
      searchDeck(card=>(card.tribe||"").includes("カエル")&&card.type==="動物",1,"hand",{message:"デッキからカエル動物カードを手札に加えてください"});
    });
  },
};

// =============== BP1-072 水辺の王さま ===============
CARD_EFFECTS["BP1-072"] = {
  constant_field(obj) {
    const cost0count=G.grave.filter(o=>{const c=cards.find(c=>c.code===o.code);return c&&(parseInt(c.cost)||0)===0;}).length;
    // 前回の値をリセットしてから再計算
    if(obj.frogsAtkBuff!==undefined) obj.atkMod=(obj.atkMod||0)-obj.frogsAtkBuff;
    obj.frogsAtkBuff=cost0count;
    obj.atkMod=(obj.atkMod||0)+cost0count;
  },
  activate_field(obj) {
    const cost0grave=G.grave.filter(o=>{const c=cards.find(c=>c.code===o.code);return c&&(parseInt(c.cost)||0)===0;});
    if(cost0grave.length<3){setMsg(`🐸 水辺の王さま：墓地のコスト0カードが${cost0grave.length}枚です（3枚必要）。`);return;}
    pickFromZone("grave",{message:"対象にするコスト0のカードを3枚選んでください",count:3,filter:(o,c)=>c&&(parseInt(c.cost)||0)===0},
      (selected)=>{
        if(selected.length<3)return;
        // 相手が2枚選んでデッキ下→残り1枚を手札へ（簡易：プレイヤーが選択）
        askChoice("デッキ下に置くカードを2枚選んでください（残り1枚を手札へ）",
          selected.map(o=>({label:cards.find(c=>c.code===o.code)?.name||o.code,value:o})),
          (first)=>{
            const rest=selected.filter(o=>o!==first);
            askChoice("もう1枚選んでください",rest.map(o=>({label:cards.find(c=>c.code===o.code)?.name||o.code,value:o})),
              (second)=>{
                [first,second].forEach(o=>moveCard(o,"grave","deck-bottom"));
                const toHand=selected.find(o=>o!==first&&o!==second);
                if(toHand)moveCard(toHand,"grave","hand");
                setMsg("🐸 水辺の王さま：2枚をデッキ下へ、1枚を手札へ加えました。");
                renderGame();
              });
          });
      });
  },
};

// =============== BP1-073 上達 ===============
CARD_EFFECTS["BP1-073"] = {
  play(obj) {
    const jodaCount=G.grave.filter(o=>o.code==="BP1-073").length;
    const x=jodaCount;
    if(x===0){setMsg("📖 上達：墓地に上達がないため、カードを見ません。");return;}
    const count=Math.min(x,G.mainDeck.length);
    const revealed=G.mainDeck.slice(0,count);
    const names=revealed.map(o=>cards.find(c=>c.code===o.code)?.name||o.code).join("、");
    setMsg(`📖 上達：「${names}」を公開。1枚を選んでください。`);
    askChoice("手札に加えるカードを選んでください",
      revealed.map(o=>({label:cards.find(c=>c.code===o.code)?.name||o.code,value:o})),
      (chosen)=>{
        G.mainDeck.splice(G.mainDeck.indexOf(chosen),1); G.hand.push(chosen);
        const others=revealed.filter(o=>o!==chosen);
        others.forEach(o=>{G.mainDeck.splice(G.mainDeck.indexOf(o),1);G.grave.push(o);});
        setMsg(`📖 上達：「${cards.find(c=>c.code===chosen.code)?.name}」を手札へ。残りを墓地へ。`);
        renderGame();
      });
  },
};

// =============== BP1-074 波戻し ===============
CARD_EFFECTS["BP1-074"] = {
  can_play() {
    // 常時：相手の存在数が自分より2以上多ければ《敏捷》→コスト軽減（簡易：通知のみ）
    return {ok:true};
  },
  play(obj) {
    pickFromZone("field",{message:"手札に戻すコスト1以下の存在を選んでください",count:1,filter:(o,c)=>c&&(parseInt(c.cost)||0)<=1},
      (selected)=>{if(selected.length===0)return;moveCard(selected[0],"field","hand");setMsg(`🌊 波戻し：「${cards.find(c=>c.code===selected[0].code)?.name}」を手札に戻しました。`);renderGame();});
  },
};

// =============== BP1-075 潮騒 ===============
CARD_EFFECTS["BP1-075"] = {
  play(obj) {
    // このターン中に墓地に置かれた存在を探す（簡易：墓地の最新のものから選択）
    const thisTurnGrave=G.grave.filter(o=>o.diedThisTurn);
    if(thisTurnGrave.length===0){setMsg("🌊 潮騒：このターン中に墓地に置かれた存在がありません。");return;}
    pickFromZone("grave",{message:"戦場に出す存在を選んでください（このターン中に墓地に置かれたもの）",count:1,filter:(o)=>o.diedThisTurn},
      (selected)=>{if(selected.length===0)return;moveCard(selected[0],"grave","field");selected[0].summonedThisTurn=true;setTimeout(()=>triggerCardEffect(selected[0],"field_enter"),300);setMsg("🌊 潮騒：戦場に出しました。");renderGame();});
  },
  activate_grave(obj) {
    payCostTerrain(2,()=>{
      moveCard(obj,"grave","exile");
      if(G.enemyGrave&&G.enemyGrave.length>0){
        setMsg("🌊 潮騒：相手の墓地のカード1枚をデッキ下へ（手動で処理してください）。");
      } else {
        setMsg("🌊 潮騒：相手の墓地のカード1枚をデッキ下へ（手動で処理してください）。");
      }
      renderGame();
    });
  },
};

// =============== BP1-076 境界の選定 ===============
CARD_EFFECTS["BP1-076"] = {
  play(obj) {
    searchDeck(card=>card.type==="縄張り",1,"hand",{message:"デッキから縄張りカード1枚を手札に加えてください"});
  },
};

// =============== BP1-077 倒木投げ ===============
CARD_EFFECTS["BP1-077"] = {
  play(obj) {
    pickFromZone("field",{message:"破壊するコスト3以下の動物を選んでください",count:1,filter:(o,c)=>c&&c.type==="動物"&&(parseInt(c.cost)||0)<=3},
      (selected)=>{
        if(selected.length===0)return;
        moveCard(selected[0],"field","grave");
        const name=cards.find(c=>c.code===selected[0].code)?.name;
        // 2/2森林リストークン2体を相手戦場に
        for(let i=0;i<2;i++){
          G.field.push({id:"token_squirrel_"+Date.now()+"_"+i,code:"TOKEN_RISU",isToken:true,
            tokenName:"森林リス動物トークン",tokenStats:"ATK 2／DEF 2",tokenType:"動物",tokenTribe:"リス",
            keywords:[],gainedEffects:[],damage:0,rested:false,night:false,summonedThisTurn:true});
        }
        setMsg(`🪵 倒木投げ：「${name}」を破壊。森林リストークン2体を相手戦場に出しました（簡易：自分の戦場に生成）。`);
        renderGame();
      });
  },
};

// =============== BP1-078 賄賂ある検閲所 ===============
CARD_EFFECTS["BP1-078"] = {
  // 相手がコスト軽減してプレイした時→通知のみ
  field_enter(obj) {
    setMsg("💰 賄賂ある検閲所：戦場に出ました。相手がコスト軽減してプレイした時、これを生贄にしてカード2枚引けます（手動で確認してください）。");
  },
  activate_field(obj) {
    payMoveCost(obj);
    payCostTerrain(3,()=>{
      pickFromZone("hand",{message:"捨てるカードを1枚選んでください",count:1},
        (selected)=>{
          if(selected.length===0)return;
          moveCard(selected[0],"hand","grave");
          moveCard(obj,"field","grave");
          drawCards(2);
          setMsg("💰 賄賂ある検閲所：起動効果でカード2枚ドロー。");
          renderGame();
        });
    });
  },
};

// =============== BP1-079 牙城 ===============
CARD_EFFECTS["BP1-079"] = {
  // 相手の狩りフェイズ開始時（簡易：準備フェイズに呼ぶ）
  phase_prep(obj) {
    const animals=G.field.filter(o=>{const c=cards.find(c=>c.code===o.code);return c&&c.type==="動物";});
    if(animals.length===0)return;
    askYesNo("【牙城・誘発】戦場の動物1体をウェイクしてターン終了時まで《対空》を与えますか？",
      ()=>{
        pickFromZone("field",{message:"ウェイクする動物を選んでください",count:1,filter:(o,c)=>c&&c.type==="動物"},
          (selected)=>{if(selected.length===0)return;selected[0].rested=false;gainAbility(selected[0],"《対空》",true);setMsg("🏰 牙城：動物をウェイクし《対空》を与えました。");renderGame();});
      });
  },
};

// =============== BP1-080 帝王クロコダイル ===============
// 《鉄壁》のみ（キーワード）→常時で付与