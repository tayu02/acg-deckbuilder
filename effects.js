// ============================================================
// effects/effects.js
// 各カードの効果実装
// CARD_EFFECTS・triggerCardEffectはsimulator.htmlで定義済み
// ============================================================

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


// ============================================================
// BP2 特殊カード実装
// ============================================================

// =============== BP2-002 漂う海月 ===============
CARD_EFFECTS["BP2-002"] = {
  // 【誘発（戦場）】プレイ効果で出た時→放浪者カードをサーチ
  field_enter(obj) {
    if(!obj.playedThisTurn) return;
    askYesNo("【誘発】デッキから漂う海月以外の《放浪者》カード1枚を手札に加えますか？",
      () => searchDeck(
        card => (card.effect||"").includes("《放浪者》") && card.code !== "BP2-002",
        1, "hand", { message: "デッキから《放浪者》カードを選んでください" }
      )
    );
  },
  // 【誘発（墓地）】日没フェイズ開始時、領土なし+墓地の放浪者2枚除外→戦場へ
  phase_sunset(obj) {
    if(G.territory.length > 0) return;
    const hasOnField = G.field.some(o => o.code === "BP2-002");
    if(hasOnField) return;
    const wanderers = G.grave.filter(o => {
      const c = cards.find(c => c.code === o.code);
      return c && (c.effect||"").includes("《放浪者》") && o !== obj;
    });
    if(wanderers.length < 2) return;
    askYesNo(`【誘発（墓地）】墓地の《放浪者》2枚を除外して漂う海月を戦場に出しますか？（放浪者：${wanderers.length}枚）`,
      () => {
        pickFromZone("grave", {
          message: "除外する《放浪者》カードを2枚選んでください",
          count: 2,
          filter: (o, c) => c && (c.effect||"").includes("《放浪者》") && o !== obj,
        }, (selected) => {
          if(selected.length < 2) return;
          selected.forEach(o => moveCard(o, "grave", "exile"));
          const graveIdx = G.grave.indexOf(obj);
          if(graveIdx >= 0) { G.grave.splice(graveIdx, 1); G.field.push(obj); obj.summonedThisTurn = true; }
          setMsg("🪼 漂う海月：墓地から戦場に出ました。");
          renderGame();
        });
      }
    );
  },
};

// =============== BP2-007 無国籍国家 ===============
CARD_EFFECTS["BP2-007"] = {
  can_play() {
    if(G.territory.length < 4) return { ok: false, reason: `領土が${G.territory.length}枚です（4枚以上必要）` };
    return { ok: true };
  },
  play(obj) {
    // 領土を4枚以上生贄に捧げてプレイ
    pickFromZone("field", {
      message: "生贄にする領土を4枚以上選んでください（全部でもOK）",
      count: G.territory.length,
      filter: (o) => G.territory.includes(o),
    }, (selected) => {
      if(selected.length < 4) { setMsg("無国籍国家：4枚以上選んでください。"); return; }
      selected.forEach(o => {
        G.territory.splice(G.territory.indexOf(o), 1);
        G.grave.push(o);
      });
      G.field.push(obj);
      setMsg("🌐 無国籍国家：戦場に出ました。");
      renderGame();
    });
  },
  // 固有（戦場）：プレイ時に墓地の領土を除外してコスト軽減→checkPlayableから参照
  // 常時（戦場）：補充フェイズの領土補充変更→nextPhase内で処理済み
};

// =============== BP2-024 海洋の楽園 ===============
CARD_EFFECTS["BP2-024"] = {
  play(obj) {
    // デッキからコスト1イルカ動物を戦場に、これを戦場に
    searchDeck(
      card => card.type === "動物" && (card.tribe||"").includes("イルカ") && (parseInt(card.cost)||0) === 1,
      1, "field", { message: "デッキからコスト1のイルカ動物を選んでください" }
    );
    G.field.push(obj);
    setMsg("🌊 海洋の楽園：戦場に出ました。相手がプレイするたびに成長カウンターが増えます。");
    renderGame();
  },
  // 相手のプレイに反応→on_enemy_play_reactionで呼ぶ
  on_enemy_play(obj) {
    if(!obj.counters) obj.counters = {};
    obj.counters["成長"] = (obj.counters["成長"] || 0) + 1;
    const cnt = obj.counters["成長"];
    setMsg(`🌊 海洋の楽園：成長カウンター${cnt}個。`);
    if(cnt >= 14) {
      setMsg("🌊 海洋の楽園：成長カウンター14個！特殊勝利！");
      alert("🌊 海洋の楽園：特殊勝利！成長カウンターが14個になりました！");
    }
    renderGame();
  },
};

// =============== BP2-028 死の兎 ===============
CARD_EFFECTS["BP2-028"] = {
  field_enter(obj) {
    askYesNo("【誘発】相手の手札を見てカード1枚を除外しますか？（これが戦場にある限り除外）",
      () => {
        // 相手の手札は1人用なので手動確認のみ
        setMsg("🐰 死の兎：相手の手札から除外するカードを確認して、除外領域に移動してください（手動）。");
        // 除外したカードのコードを記録
        obj.exiledFromHand = true;
      }
    );
  },
  to_grave(obj) {
    askYesNo("【誘発（墓地）】墓地のコスト1以下の夜カード1枚をデッキ上に置きますか？",
      () => {
        searchDeck(
          card => (parseInt(card.cost)||0) <= 1 && (card.condition||"").includes("夜"),
          1, "deck-top", { message: "デッキ上に置く夜カードを選んでください" }
        );
        // 除外していたカードを手札に戻す
        if(obj.exiledFromHand) setMsg("🐰 死の兎：除外していたカードが相手の手札に戻りました（手動で戻してください）。");
      }
    );
  },
};

// =============== BP2-032 月の使者 ===============
CARD_EFFECTS["BP2-032"] = {
  field_enter(obj) {
    const animals = G.field.filter(o => { const c = cards.find(c => c.code === o.code); return c && c.type === "動物" && o !== obj; });
    if(animals.length === 0) return;
    askYesNo("【誘発】戦場の動物1体を生贄に捧げて、存在1つを夜にしますか？",
      () => {
        pickFromZone("field", { message: "生贄にする動物を選んでください", count: 1, filter: (o, c) => c && c.type === "動物" && o !== obj },
          (sac) => {
            if(sac.length === 0) return;
            moveCard(sac[0], "field", "grave");
            pickFromZone("field", { message: "夜にする存在を選んでください", count: 1, filter: (o) => o !== obj },
              (targets) => { if(targets.length > 0) { targets[0].night = true; setMsg("🌙 月の使者：存在を夜にしました。"); } renderGame(); }
            );
          }
        );
      }
    );
  },
  // 相手の手札が除外された時→on_enemy_exile_handで呼ぶ
  on_enemy_exile_hand(obj) {
    const exileRabbits = G.exile.filter(o => { const c = cards.find(c => c.code === o.code); return c && (c.tribe||"").includes("ウサギ") && o !== obj; });
    if(exileRabbits.length === 0) return;
    askYesNo("【月の使者・誘発（除外）】除外ウサギカード1枚を墓地に→除外カードを墓地へ→これを戦場に出しますか？",
      () => {
        pickFromZone("exile", { message: "墓地に置く除外ウサギを選んでください", count: 1, filter: (o, c) => c && (c.tribe||"").includes("ウサギ") && o !== obj },
          (selected) => {
            if(selected.length === 0) return;
            moveCard(selected[0], "exile", "grave");
            // 除外カード→墓地へ（手動）
            setMsg("🌙 月の使者：条件達成。除外されたカードを墓地に置き、これを戦場に出しました。");
            const graveIdx = G.grave.indexOf(obj);
            if(graveIdx >= 0) { G.grave.splice(graveIdx, 1); G.field.push(obj); obj.summonedThisTurn = true; }
            renderGame();
          }
        );
      }
    );
  },
};

// =============== BP2-033 月を駆ける兎 ===============
CARD_EFFECTS["BP2-033"] = {
  on_enemy_exile_hand(obj) {
    askYesNo("【月を駆ける兎・誘発】ATK+1/DEF+1カウンターを置きますか？",
      () => { obj.atkMod = (obj.atkMod||0) + 1; obj.defMod = (obj.defMod||0) + 1; setMsg("🐰 月を駆ける兎：ATK+1/DEF+1カウンターを置きました。"); renderGame(); }
    );
  },
};

// =============== BP2-038 運命の帰郷 ===============
CARD_EFFECTS["BP2-038"] = {
  play(obj) {
    const hasAnimal = G.field.some(o => { const c = cards.find(c => c.code === o.code); return c && c.type === "動物"; });
    const hasTool = G.field.some(o => { const c = cards.find(c => c.code === o.code); return c && c.type === "道具"; });
    if(!hasAnimal || !hasTool) { setMsg("運命の帰郷：戦場に動物と道具が両方必要です。"); return; }
    // コスト3縄張りをサーチ→展開
    searchDeck(card => card.type === "縄張り" && (parseInt(card.cost)||0) === 3, 1, "field", { message: "コスト3縄張りを選んで戦場に出してください" });
    setTimeout(() => {
      // 天命・宿命・運命以外のカード1枚を手札へ
      searchDeck(
        card => !["天命の門出","宿命の旅路","運命の帰郷"].includes(card.name),
        1, "hand", { message: "手札に加えるカードを選んでください（天命・宿命・運命以外）" }
      );
      // これをデッキ上へ
      const idx = G.pile.indexOf(obj);
      if(idx >= 0) { G.pile.splice(idx, 1); G.mainDeck.unshift(obj); }
      setMsg("運命の帰郷：縄張りを展開、カードを手札へ、これをデッキ上に戻してシャッフル。");
      shuffleDeck();
      renderGame();
    }, 1000);
  },
  // デッキから公開された時（デッキが1枚でこれが出た時）
  on_deck_reveal(obj) {
    if(G.mainDeck.length !== 0) return; // デッキがこれ1枚の時のみ
    setMsg("🌟 運命の帰郷：特殊勝利！");
    alert("🌟 運命の帰郷：デッキの最後の1枚が公開されました！特殊勝利！");
  },
};

// =============== BP2-039 不屈の旅人 ===============
CARD_EFFECTS["BP2-039"] = {
  constant_field(obj) {
    // 装備数×3のATK/DEF
    const count = getEquippedCount(obj);
    const bonus = count * 3;
    if(obj.travellerEquipBuff !== undefined) {
      obj.atkMod = (obj.atkMod||0) - obj.travellerEquipBuff;
      obj.defMod = (obj.defMod||0) - obj.travellerEquipBuff;
    }
    obj.travellerEquipBuff = bonus;
    obj.atkMod = (obj.atkMod||0) + bonus;
    obj.defMod = (obj.defMod||0) + bonus;
  },
  activate_field(obj) {
    // 場面タイミング中のみ（狩りフェイズ中は場面カードをプレイできないため、起動は手動確認）
    if(G.phase !== 3) { setMsg("🦌 不屈の旅人：場面タイミング中のみ起動できます。"); return; }
    const tools = G.field.filter(o => { const c = cards.find(c => c.code === o.code); return c && c.type === "道具" && !(c.effect||"").includes("《装備》") && !o.isEquipped; });
    if(tools.length === 0) { setMsg("🦌 不屈の旅人：装備可能な道具がありません。"); return; }
    pickFromZone("field", {
      message: "装備する道具を選んでください（《装備》を持たないもの）",
      count: 1,
      filter: (o, c) => c && c.type === "道具" && !(c.effect||"").includes("《装備》") && !o.isEquipped,
    }, (selected) => {
      if(selected.length === 0) return;
      equipCard(selected[0], obj);
    });
  },
};

// =============== BP2-048 炎猿 ===============
CARD_EFFECTS["BP2-048"] = {
  field_enter(obj) {
    // 固有：手札の山岳非存在カードを捨てて道具トークンを装備状態で出す
    const mtnNonExistence = G.hand.filter(o => {
      const c = cards.find(c => c.code === o.code);
      return c && (c.condition||"").includes("山") && c.type !== "動物" && c.type !== "縄張り" && c.type !== "道具" && c.type !== "場面" && c.type !== "特技";
    });
    // 実際は「非存在カード」＝場面・特技・道具など（条件に山がある）
    const mtnCards = G.hand.filter(o => {
      const c = cards.find(c => c.code === o.code);
      return c && (c.condition||"").includes("山");
    });
    if(mtnCards.length === 0) return;
    askYesNo("【固有】手札の山岳カード1枚を捨てて、同名の道具トークンを装備した状態で出しますか？",
      () => {
        pickFromZone("hand", {
          message: "捨てる山岳カードを選んでください",
          count: 1,
          filter: (o, c) => c && (c.condition||"").includes("山"),
        }, (selected) => {
          if(selected.length === 0) return;
          const srcCard = cards.find(c => c.code === selected[0].code);
          moveCard(selected[0], "hand", "grave");
          // 同名の道具トークンを生成して装備
          const token = {
            id: "token_equip_" + Date.now(),
            code: selected[0].code,
            isToken: true,
            isEquipped: true,
            equippedTo: obj.id,
            tokenName: srcCard?.name + "（装備）",
            tokenStats: "",
            tokenType: "道具",
          };
          G.field.push(token);
          setMsg(`🐒 炎猿：「${srcCard?.name}」の道具トークンを装備しました。`);
          renderGame();
        });
      }
    );
  },
  // 相手に戦闘ダメージを与えた時→attack後に呼ぶ
  on_combat_damage(obj) {
    const equipped = G.field.filter(e => e.isEquipped && e.equippedTo === obj.id);
    if(equipped.length === 0) return;
    askYesNo(`【炎猿・誘発】装備トークンを発動しますか？コストが必要です。`,
      () => {
        const eq = equipped[0];
        const eqCard = cards.find(c => c.code === eq.code);
        const cost = parseInt(eqCard?.cost||0);
        if(cost > 0) {
          payCostTerrain(cost, () => {
            setMsg(`🐒 炎猿：「${eqCard?.name}」のプレイ効果を発動します（手動で処理してください）。`);
          });
        } else {
          setMsg(`🐒 炎猿：「${eqCard?.name}」のプレイ効果を発動します（手動で処理してください）。`);
        }
      }
    );
  },
};

// =============== BP2-051 万雷 ===============
CARD_EFFECTS["BP2-051"] = {
  play(obj) {
    const mtnCount = countMountainPlays();
    const x = mtnCount * 2;
    setMsg(`⚡ 万雷：このターンの山岳カードプレイ回数${mtnCount}×2=${x}点ダメージ。${x >= 10 ? "（軽減不可）" : ""}`);
    askNumber(`⚡ 万雷：ダメージ対象を選んでください（${x}点ダメージ）\n1=相手ライフ / その他=戦場の動物（手動選択）`, 0, 1,
      (choice) => {
        if(choice === 1) {
          G.enemyLife = Math.max(0, G.enemyLife - x);
          setMsg(`⚡ 万雷：相手ライフに${x}点ダメージ。`);
        } else {
          pickFromZone("field", { message: `${x}点ダメージを与える対象を選んでください`, count: 1 },
            (selected) => { if(selected.length > 0) dealDamageToCard(selected[0], x); }
          );
        }
        renderGame();
      }
    );
  },
};

// =============== BP2-059 統治する猟犬 ===============
CARD_EFFECTS["BP2-059"] = {
  // 相手ライフが減った時（効果ダメージ）→on_enemy_damage_reactionで呼ぶ
  on_enemy_damage(obj, amount) {
    gainAbility(obj, `ATK+1/DEF+1`, true);
    setMsg(`🐕 統治する猟犬：相手が${amount}点ダメージを受けました！ATK+1/DEF+1を得ます。`);
    renderGame();
  },
  // 自分ライフが減った時→on_self_damage_reactionで呼ぶ
  on_self_damage(obj, amount) {
    G.playerLife = Math.max(0, G.playerLife - amount);
    setMsg(`🐕 統治する猟犬：自分に${amount}点ダメージが入りました（反射）。`);
    renderGame();
  },
};

// =============== BP2-065 ウルフハウル ===============
CARD_EFFECTS["BP2-065"] = {
  can_play() {
    const inPile = G.pile.some(o => o.code === "BP2-065");
    if(inPile) return { ok: false, reason: "パイルにウルフハウルがあるためプレイできません" };
    return { ok: true };
  },
  play(obj) {
    // 相手の補充フェイズ以外でのドロー数を確認
    askNumber("🐺 ウルフハウル：相手がこのターン中に補充フェイズ以外で引いたカードの枚数は？", 0, 3,
      (enemyDraw) => {
        // コスト軽減：enemyDraw分
        setMsg(`🐺 ウルフハウル：コスト${Math.max(0, 3 - enemyDraw)}（${enemyDraw}枚分軽減）でプレイ。`);
        // デッキ上2枚を除外してターン終了時までプレイ可能
        const count = Math.min(2, G.mainDeck.length);
        for(let i = 0; i < count; i++) {
          const top = G.mainDeck.shift();
          top.wolfHowlExile = G.turn;
          G.exile.push(top);
        }
        setMsg(`🐺 ウルフハウル：デッキ上${count}枚を除外。ターン終了時まで除外領域からプレイ可能。このターン、ウルフハウルのコストは③増加。`);
        renderGame();
      }
    );
  },
};

// =============== BP2-076 狸舞 ===============
CARD_EFFECTS["BP2-076"] = {
  play(obj) {
    askNumber("🦝 狸舞：コストXをいくつ支払いますか？", 0, 10, (x) => {
      payCostTerrain(x, () => {
        // このターン中に戦場に出たコストXの動物を破壊
        const targets = G.field.filter(o => {
          const c = cards.find(c => c.code === o.code);
          return c && c.type === "動物" && (parseInt(c.cost)||0) === x && !o.isToken;
          // このターン中に出た判定は簡易：全て対象
        });
        const destroyed = targets.length;
        targets.forEach(o => {
          if(o.indestructible) return;
          moveCard(o, "field", "grave");
          setTimeout(() => { const eff = CARD_EFFECTS[o.code]; if(eff?.to_grave) eff.to_grave(o); }, 300);
        });
        // タヌキトークンを相手戦場に生成（通知のみ）
        setMsg(`🦝 狸舞：コスト${x}の動物${destroyed}体を破壊。相手の戦場に2/2森林タヌキトークン${destroyed}体を出しました（相手盤面に出しました）。`);
        renderGame();
      });
    });
  },
};


// ============================================================
// BP3・BP4 特殊カード実装
// ============================================================

// =============== BP3-004 見猿 ===============
CARD_EFFECTS["BP3-004"] = {
  field_enter(obj) {
    G.noSearchThisTurn = true;
    setMsg("🙈 見猿：このターン中、全プレイヤーはデッキを探すことができません。");
    renderGame();
  },
  activate_hand(obj) {
    payCostTerrain(1, () => {
      moveCard(obj, "hand", "exile");
      obj.counters = obj.counters || {};
      obj.counters["脱出"] = 1;
      G.field.push(obj);
      G.exile.splice(G.exile.indexOf(obj), 1);
      obj.gainedEffects = obj.gainedEffects || [];
      if(!obj.gainedEffects.includes("これが戦場に出た時にこれを生贄に捧げる"))
        obj.gainedEffects.push("これが戦場に出た時にこれを生贄に捧げる");
      obj.summonedThisTurn = true;
      setTimeout(() => {
        moveCard(obj, "field", "grave");
        setMsg("🙈 見猿：効果で生贄に捧げられました。");
        renderGame();
      }, 500);
      renderGame();
    });
  },
};

// =============== BP3-005 聞猿 ===============
CARD_EFFECTS["BP3-005"] = {
  field_enter(obj) {
    G.noTriggerThisTurn = true;
    setMsg("🙉 聞猿：このターン中、全ての動物カード・トークンは誘発能力・起動能力を発動できません（通知のみ）。");
    renderGame();
  },
  activate_hand(obj) { CARD_EFFECTS["BP3-004"].activate_hand(obj); },
};

// =============== BP3-006 言猿 ===============
CARD_EFFECTS["BP3-006"] = {
  field_enter(obj) {
    G.noTargetWarning = true;
    setMsg("🙊 言猿：このターン中、全ての動物カード・トークンは効果の対象になりません（対象選択時に警告表示）。");
    renderGame();
  },
  activate_hand(obj) { CARD_EFFECTS["BP3-004"].activate_hand(obj); },
};

// =============== BP3-022 芸達者なオウム ===============
CARD_EFFECTS["BP3-022"] = {
  // コスト1以下の非存在プレイが発動した時→on_play_reactionで呼ぶ
  on_play_reaction(obj) {
    const lastPlayed = G.pile[G.pile.length - 1];
    if(!lastPlayed) return;
    const lc = cards.find(c => c.code === lastPlayed.code);
    if(!lc) return;
    const isNonExistence = lc.type !== "動物" && lc.type !== "縄張り" && lc.type !== "道具";
    if(!isNonExistence || (parseInt(lc.cost)||0) > 1) return;
    askYesNo(
      `🦜 芸達者なオウム：「${lc.name}」（コスト${lc.cost}の非存在）がプレイされました。これを生贄に捧げて対象を選び直して複製しますか？`,
      () => {
        moveCard(obj, "field", "grave");
        setMsg(`🦜 芸達者なオウム：「${lc.name}」の効果を複製します。対象を選び直して同じ効果を発動してください（手動で処理）。`);
        // 複製：同じ効果を再発動
        const eff = CARD_EFFECTS[lastPlayed.code];
        if(eff?.play) setTimeout(() => eff.play(lastPlayed), 300);
        renderGame();
      }
    );
  },
};

// =============== BP3-036 飲み込む大クジラ ===============
CARD_EFFECTS["BP3-036"] = {
  field_enter(obj) {
    const targets = G.field.filter(o => {
      if(o === obj) return false;
      const c = cards.find(c => c.code === o.code);
      return c && (c.type === "動物" || c.type === "道具");
    });
    if(targets.length === 0) return;
    targets.forEach(o => {
      G.field.splice(G.field.indexOf(o), 1);
      if(!o.counters) o.counters = {};
      o.counters["脱出"] = 2; // 2ターン後に戻る
      G.exile.push(o);
    });
    setMsg(`🐋 飲み込む大クジラ：${targets.length}体の存在を脱出カウンター2個付きで除外しました。2ターン後に戦場に戻ります。`);
    renderGame();
  },
};

// =============== BP3-047 森の収集者 ===============
CARD_EFFECTS["BP3-047"] = {
  constant_field(obj) {
    // 木の実トークンに起動能力を付与（renderGame毎）
    const acorns = G.field.filter(o => o.isToken && o.tokenName === "木の実");
    acorns.forEach(a => {
      if(!a.gainedEffects) a.gainedEffects = [];
      if(!a.gainedEffects.includes("ムーブ、これを生贄に捧げて発動する。あなたはカード1枚を引く。")) {
        a.gainedEffects.push("ムーブ、これを生贄に捧げて発動する。あなたはカード1枚を引く。");
      }
      // 起動効果をCARD_EFFECTSに動的登録
      if(!CARD_EFFECTS["TOKEN_ACORN"]) {
        CARD_EFFECTS["TOKEN_ACORN"] = {
          activate_field(aObj) {
            payMoveCost(aObj);
            moveCard(aObj, "field", "grave");
            drawCards(1);
            setMsg("🌰 木の実：1枚ドローしました。");
            renderGame();
          },
        };
      }
    });
  },
  // ドロー置き換えはaskYesNoで確認
  on_draw_replace(obj) {
    askYesNo("🐿 森の収集者：ドローの代わりに木の実トークンを出しますか？",
      () => {
        G.field.push({
          id: "token_acorn_" + Date.now(),
          code: "TOKEN_ACORN",
          isToken: true,
          tokenName: "木の実",
          tokenStats: "",
          tokenType: "道具",
          keywords: [], gainedEffects: [], damage: 0, rested: false, night: false, summonedThisTurn: false,
        });
        setMsg("🌰 木の実トークンを生成しました（ドロー代替）。");
        renderGame();
      }
    );
  },
};

// =============== BP3-051 目眩ましの腹狸 ===============
CARD_EFFECTS["BP3-051"] = {
  field_enter(obj) {
    const forestCount = countTerrain()["森"] || 0;
    if(forestCount >= 2) {
      drawCards(1);
      setMsg("🦝 目眩ましの腹狸：森林域2以上のため1枚ドローしました。");
      renderGame();
    }
  },
  // 相手効果で手札から除外された時→on_enemy_exile_handで呼ぶ
  on_enemy_exile_hand(obj) {
    const graveIdx = G.exile.indexOf(obj);
    if(graveIdx < 0) return;
    G.exile.splice(graveIdx, 1);
    G.field.push(obj);
    obj.summonedThisTurn = true;
    setMsg("🦝 目眩ましの腹狸：相手の効果で除外されたため戦場に出ました。");
    setTimeout(() => triggerCardEffect(obj, "field_enter"), 300);
    renderGame();
  },
};

// =============== BP3-069 朱色の達人 ===============
CARD_EFFECTS["BP3-069"] = {
  // ムーブした時→on_move_reaction
  on_move(obj) {
    // 手札の非存在カードを公開してコスト軽減
    setMsg("🦎 朱色の達人：ムーブしました。手札の非存在カードを公開するとプレイコストを①軽減できます（手動で確認）。");
  },
  // 非存在カードをプレイした時→on_play_reactionで呼ぶ
  on_play_reaction(obj) {
    const lastPlayed = G.pile[G.pile.length - 1];
    if(!lastPlayed) return;
    const lc = cards.find(c => c.code === lastPlayed.code);
    if(!lc) return;
    const isNonExistence = lc.type !== "動物" && lc.type !== "縄張り" && lc.type !== "道具";
    if(!isNonExistence) return;
    askYesNo("🦎 朱色の達人：非存在カードがプレイされました。これを脱出カウンター1個付きで除外しますか？",
      () => {
        moveCard(obj, "field", "exile");
        obj.counters = obj.counters || {};
        obj.counters["脱出"] = 1;
        setMsg("🦎 朱色の達人：脱出カウンター1個付きで除外されました。次の準備フェイズに戦場に戻ります。");
        renderGame();
      }
    );
  },
};

// =============== BP3-073 恋狐 ===============
CARD_EFFECTS["BP3-073"] = {
  constant_field(obj) {
    // 恋兎がいなければ生贄
    const hasKoiUsagi = G.field.some(o => o.code === "BP3-074");
    if(!hasKoiUsagi && !obj.koiCheckDone) {
      obj.koiCheckDone = true;
      setTimeout(() => {
        if(!G.field.some(o => o.code === "BP3-074")) {
          const idx = G.field.indexOf(obj);
          if(idx >= 0) { G.field.splice(idx, 1); G.grave.push(obj); setMsg("💔 恋狐：恋兎がいないため生贄に捧げられました。"); renderGame(); }
        }
        obj.koiCheckDone = false;
      }, 100);
    }
  },
  field_enter(obj) {
    const hasKoiUsagi = G.field.some(o => o.code === "BP3-074");
    if(hasKoiUsagi) {
      askYesNo("💔 恋狐：相手の動物1体を生贄に捧げさせますか？",
        () => {
          pickFromZone("field", { message: "生贄にする相手の動物を選んでください", count: 1, filter: (o, c) => c && c.type === "動物" && o !== obj },
            (selected) => { if(selected.length > 0) moveCard(selected[0], "field", "grave"); renderGame(); }
          );
        }
      );
    }
  },
  activate_grave(obj) {
    payCostTerrain(3, () => {
      pickFromZone("hand", { message: "捨てるカードを1枚選んでください", count: 1 },
        (selected) => {
          if(selected.length === 0) return;
          moveCard(selected[0], "hand", "grave");
          // 墓地の恋狐と恋兎を戦場に
          const koiKitsune = G.grave.find(o => o.code === "BP3-073" && o !== obj);
          const koiUsagi = G.grave.find(o => o.code === "BP3-074");
          [obj, koiKitsune, koiUsagi].filter(Boolean).forEach(o => {
            const idx = G.grave.indexOf(o);
            if(idx >= 0) { G.grave.splice(idx, 1); G.field.push(o); o.summonedThisTurn = true; }
          });
          setMsg("💔 恋狐：恋狐と恋兎を墓地から戦場に出しました。");
          renderGame();
        }
      );
    });
  },
};

// =============== BP3-074 恋兎 ===============
CARD_EFFECTS["BP3-074"] = {
  constant_field(obj) {
    const hasKoiKitsune = G.field.some(o => o.code === "BP3-073");
    if(!hasKoiKitsune && !obj.koiCheckDone) {
      obj.koiCheckDone = true;
      setTimeout(() => {
        if(!G.field.some(o => o.code === "BP3-073")) {
          const idx = G.field.indexOf(obj);
          if(idx >= 0) { G.field.splice(idx, 1); G.grave.push(obj); setMsg("💔 恋兎：恋狐がいないため生贄に捧げられました。"); renderGame(); }
        }
        obj.koiCheckDone = false;
      }, 100);
    }
  },
  activate_field(obj) {
    const hasKoiKitsune = G.field.some(o => o.code === "BP3-073");
    if(!hasKoiKitsune) { setMsg("💔 恋兎：恋狐が戦場にいません。"); return; }
    askChoice("💔 恋兎：どちらの起動効果を使いますか？",
      [{ label: "①ムーブ→縄張りか道具を夜にする", value: "a" },
       { label: "②悲恋哀々松崎心中を除外→恋狐と恋兎を生贄", value: "b" }],
      (choice) => {
        if(choice === "a") {
          payMoveCost(obj);
          pickFromZone("field", { message: "夜にする縄張りか道具を選んでください", count: 1, filter: (o, c) => c && (c.type === "縄張り" || c.type === "道具") },
            (selected) => { if(selected.length > 0) { selected[0].night = true; renderGame(); } }
          );
        } else {
          const hiren = G.grave.find(o => o.code === "BP2-042");
          if(!hiren) { setMsg("💔 恋兎：墓地に悲恋哀々松崎心中がありません。"); return; }
          moveCard(hiren, "grave", "exile");
          const kitsune = G.field.find(o => o.code === "BP3-073");
          if(kitsune) moveCard(kitsune, "field", "grave");
          moveCard(obj, "field", "grave");
          setMsg("💔 恋兎：恋狐と恋兎を生贄に捧げました。");
          renderGame();
        }
      }
    );
  },
};

// =============== BP3-078 謀叛の血判状 ===============
CARD_EFFECTS["BP3-078"] = {
  field_enter(obj) {
    setMsg("📜 謀叛の血判状：戦場に出ました。相手のATK最大の動物をこちらの戦場に移す効果があります（相手がいないため手動で処理してください）。");
  },
};

// =============== BP4-003 崩落 ===============
CARD_EFFECTS["BP4-003"] = {
  constant_field(obj) {
    const cnt = obj.counters?.["高度"] || 0;
    if(cnt >= 6) {
      // 動物タイプを得て不壊・突破・ATK+12/DEF+12
      if(!obj.崩落Buffed) {
        obj.崩落Buffed = true;
        if(!obj.keywords) obj.keywords = [];
        ["不壊","突破"].forEach(kw => { if(!obj.keywords.includes(kw)) obj.keywords.push(kw); });
        obj.atkMod = (obj.atkMod||0) + 12;
        obj.defMod = (obj.defMod||0) + 12;
        setMsg("🏔️ 崩落：高度カウンター6個！動物タイプを得て《不壊》《突破》ATK+12/DEF+12を得ました。");
      }
      // 攻撃可能にする
      obj.isAnimal = true;
    } else {
      // まだ動物ではない
      obj.isAnimal = false;
      if(obj.崩落Buffed) {
        obj.崩落Buffed = false;
        obj.keywords = (obj.keywords||[]).filter(k => k !== "不壊" && k !== "突破");
        obj.atkMod = Math.max(0, (obj.atkMod||0) - 12);
        obj.defMod = Math.max(0, (obj.defMod||0) - 12);
      }
    }
  },
  // 縄張りが出た時にカウンター+1（field_enter_otherで）
  field_enter_other(obj, triggerObj) {
    const c = cards.find(c => c.code === triggerObj.code);
    if(!c || c.type !== "縄張り") return;
    if(!obj.counters) obj.counters = {};
    obj.counters["高度"] = (obj.counters["高度"]||0) + 1;
    setMsg(`🏔️ 崩落：高度カウンター${obj.counters["高度"]}個。`);
    renderGame();
  },
  // 相手に戦闘ダメージを与えた時→特殊勝利
  on_combat_damage(obj) {
    const cnt = obj.counters?.["高度"] || 0;
    if(cnt >= 6) {
      setMsg("🏔️ 崩落：相手に戦闘ダメージを与えました！特殊勝利！");
      alert("🏔️ 崩落：特殊勝利！高度カウンター6以上で相手に戦闘ダメージを与えました！");
    }
  },
};

// =============== BP4-006 神鳥ガルダ ===============
CARD_EFFECTS["BP4-006"] = {
  field_enter(obj) {
    // 誘発効果を先に発動
    const terrain = countTerrain();
    askChoice("🦅 神鳥ガルダ：着地時効果を選んでください",
      [{ label: "なし", value: "none" },
       { label: "●山岳域2以上：全動物と相手に2点ダメージ", value: "a" },
       { label: "●森林域2以上：カード2枚ドロー", value: "b" }],
      (choice) => {
        if(choice === "a") {
          if((terrain["山"]||0) < 2) { setMsg("🦅 神鳥ガルダ：山岳域が2未満です。"); return; }
          G.field.forEach(o => { if(o !== obj) dealDamageToCard(o, 2); });
          G.enemyLife = Math.max(0, G.enemyLife - 2);
          setMsg("🦅 神鳥ガルダ：全動物と相手に2点ダメージ。");
        } else if(choice === "b") {
          if((terrain["森"]||0) < 2) { setMsg("🦅 神鳥ガルダ：森林域が2未満です。"); return; }
          drawCards(2);
          setMsg("🦅 神鳥ガルダ：カード2枚ドロー。");
        }
        // 固有能力で出た場合は生贄フラグチェック
        if(obj.gardaSacrificePending) {
          obj.gardaSacrificePending = false;
          setTimeout(() => {
            askYesNo("🦅 神鳥ガルダ：固有能力でプレイしました。これを生贄に捧げますか？",
              () => { moveCard(obj, "field", "grave"); setMsg("🦅 神鳥ガルダ：生贄に捧げられました。"); renderGame(); }
            );
          }, 500);
        }
        renderGame();
      }
    );
  },
};

// =============== BP4-021 ヘビ華族 ===============
CARD_EFFECTS["BP4-021"] = {
  constant_field(obj) {
    // 手札から墓地に置かれる場合は代わりに除外→moveCard内でチェック
    obj.snakeNobilityActive = true;
  },
};

// =============== BP4-047 森の貪食者 ===============
CARD_EFFECTS["BP4-047"] = {
  constant_field(obj) {
    // 木の実トークン生贄カウントに基づくバフ
    const cnt = G.acornSacrificeCount || 0;
    // 前回のバフをリセット
    if(obj.贪食バフ !== undefined) {
      obj.atkMod = (obj.atkMod||0) - obj.贪食バフ;
      obj.defMod = (obj.defMod||0) - obj.贪食バフ;
    }
    // リスATK+1/DEF+1（常時）
    G.field.forEach(o => {
      const c = cards.find(c => c.code === o.code);
      const isRisu = (c?.tribe||"").includes("リス") || (o.isToken && (o.tokenTribe||"").includes("リス"));
      if(!isRisu || o === obj) return;
      if(!o.squirrelBuff1) { o.squirrelBuff1 = true; o.atkMod=(o.atkMod||0)+1; o.defMod=(o.defMod||0)+1; }
      if(cnt >= 3 && !o.squirrelBuff2) { o.squirrelBuff2 = true; o.atkMod=(o.atkMod||0)+2; o.defMod=(o.defMod||0)+2; }
      if(cnt >= 5) {
        if(!o.keywords) o.keywords = [];
        if(!o.keywords.includes("突破")) o.keywords.push("突破");
      }
    });
    obj.贪食バフ = 0;
  },
  activate_field(obj) {
    payCostTerrain(2, () => {
      const acorns = G.field.filter(o => o.isToken && o.tokenName === "木の実");
      if(acorns.length === 0) { setMsg("🐿 森の貪食者：木の実トークンがありません。"); return; }
      pickFromZone("field", {
        message: "生贄にする木の実トークンを選んでください（コストX以下の動物を破壊）",
        count: acorns.length,
        filter: (o) => o.isToken && o.tokenName === "木の実",
      }, (selected) => {
        if(selected.length === 0) return;
        const x = selected.length;
        G.acornSacrificeCount = (G.acornSacrificeCount||0) + x;
        selected.forEach(o => moveCard(o, "field", "grave"));
        pickFromZone("field", {
          message: `コスト${x}以下の動物を破壊してください`,
          count: 1,
          filter: (o, c) => c && c.type === "動物" && (parseInt(c.cost)||0) <= x,
        }, (targets) => {
          if(targets.length > 0) { moveCard(targets[0], "field", "grave"); setMsg(`🐿 森の貪食者：木の実${x}個生贄→コスト${x}以下の動物を破壊。今ターンの木の実生贄合計:${G.acornSacrificeCount}`); }
          renderGame();
        });
      });
    });
  },
};

// =============== BP4-059 時間の圧縮 ===============
CARD_EFFECTS["BP4-059"] = {
  can_play() {
    if(G.phase !== 3) return { ok: false, reason: "戦闘中でないあなたのターンの狩りフェイズ中のみプレイできます" };
    return { ok: true };
  },
  play(obj) {
    // 狩りフェイズを終了して日没スキップ→夜警フェイズへ
    G.phase = 5; // 夜警フェイズ
    setMsg("⏱ 時間の圧縮：狩りフェイズを終了し、日没フェイズをスキップして夜警フェイズになりました。");
    updatePhase();
    resetAllDamage();
    resetTempAbilities();
    if(G.hand.length >= 7) {
      setTimeout(() => openDiscardModal(), 300);
    }
    renderGame();
  },
};

// =============== BP4-060 二つ顔の長老 ===============
CARD_EFFECTS["BP4-060"] = {
  // 攻撃・防御不可は常時
  constant_field(obj) {
    // 夜になった時《夜》を得て動物タイプ・突破・対空・ATK+1/DEF+1を得る処理はnight状態で管理
    if(obj.night && !obj.futatsuBuffed) {
      obj.futatsuBuffed = true;
      if(!obj.keywords) obj.keywords = [];
      ["突破","対空"].forEach(kw => { if(!obj.keywords.includes(kw)) obj.keywords.push(kw); });
      obj.atkMod = (obj.atkMod||0) + 1;
      obj.defMod = (obj.defMod||0) + 1;
    } else if(!obj.night && obj.futatsuBuffed) {
      obj.futatsuBuffed = false;
      obj.keywords = (obj.keywords||[]).filter(k => k !== "突破" && k !== "対空");
      obj.atkMod = (obj.atkMod||0) - 1;
      obj.defMod = (obj.defMod||0) - 1;
    }
  },
  phase_sunset(obj) {
    // 日没フェイズ開始時：全動物破壊→墓地の動物全員戦場に→ATK+1/DEF+1×破壊数→夜にする
    const animals = G.field.filter(o => {
      if(o === obj) return false;
      const c = cards.find(c => c.code === o.code);
      return c && c.type === "動物";
    });
    if(animals.length === 0) return;
    askYesNo(`【二つ顔の長老】日没フェイズ：全動物（${animals.length}体）を破壊して墓地から全員戻し、ATK+1/DEF+1×${animals.length}を得て夜になりますか？`,
      () => {
        const destroyed = [...animals];
        destroyed.forEach(o => { moveCard(o, "field", "grave"); });
        const x = destroyed.length;
        // 墓地から全員戦場に戻す
        destroyed.forEach(o => {
          const idx = G.grave.indexOf(o);
          if(idx >= 0) { G.grave.splice(idx, 1); G.field.push(o); o.summonedThisTurn = true; }
        });
        // ATK+1/DEF+1×破壊数
        if(!obj.counters) obj.counters = {};
        obj.counters["ATK+1/DEF+1"] = (obj.counters["ATK+1/DEF+1"]||0) + x;
        obj.atkMod = (obj.atkMod||0) + x;
        obj.defMod = (obj.defMod||0) + x;
        obj.night = true;
        setMsg(`🦌 二つ顔の長老：${x}体を破壊して戦場に戻しました。ATK+${x}/DEF+${x}を得て夜になりました。`);
        renderGame();
      }
    );
  },
};

// =============== BP4-072 獄炎 ===============
CARD_EFFECTS["BP4-072"] = {
  can_play() {
    const cnt = (G.nightClearCount||0) * 2;
    if(cnt >= 10) return { ok: true, note: "妨害不可" };
    return { ok: true };
  },
  play(obj) {
    const cnt = G.nightClearCount || 0;
    const x = cnt * 2;
    setMsg(`🔥 獄炎：このターンの領土夜明け回数${cnt}×2=${x}点ダメージ。${x >= 10 ? "（妨害不可）" : ""}`);
    pickFromZone("field", { message: `${x}点ダメージを与える対象を選んでください（または相手ライフへ）`, count: 1 },
      (selected) => {
        if(selected.length > 0) {
          dealDamageToCard(selected[0], x);
        } else {
          G.enemyLife = Math.max(0, G.enemyLife - x);
          setMsg(`🔥 獄炎：相手ライフに${x}点ダメージ。`);
        }
        renderGame();
      }
    );
  },
};


// ============================================================
// ACG カード効果実装
// ============================================================

// =============== うさカス-ACG-004 夜の使者 ===============
CARD_EFFECTS["うさカス-ACG-004"] = {
  field_enter(obj) {
    pickFromZone("field", { message: "夜にする存在を選んでください", count: 1, filter: (o) => o !== obj },
      (selected) => { if(selected.length > 0) { selected[0].night = true; setMsg("🌙 夜の使者：存在を夜にしました。"); renderGame(); } }
    );
  },
  // 夜牢カウンター：起床フェイズで夜を明ける代わりにカウンターを取り除く
  constant_field(obj) {
    const cnt = obj.counters?.["夜牢"] || 0;
    if(cnt > 0 && obj.night) {
      // 夜を明けようとした時にカウンターを消費（フェイズ処理でチェック）
      obj.nightJailActive = true;
    } else {
      obj.nightJailActive = false;
    }
  },
  activate_hand(obj) {
    const idx = G.hand.indexOf(obj);
    if(idx >= 0) G.hand.splice(idx, 1);
    G.exile.push(obj);
    // 除外→夜牢カウンター1個付き夜状態で戦場に出す
    setTimeout(() => {
      G.exile.splice(G.exile.indexOf(obj), 1);
      obj.night = true;
      if(!obj.counters) obj.counters = {};
      obj.counters["夜牢"] = 1;
      G.field.push(obj);
      obj.summonedThisTurn = true;
      setMsg("🌙 夜の使者：夜牢カウンター1個付き夜状態で戦場に出ました。");
      renderGame();
    }, 300);
  },
};

// =============== うさカス-ACG-011 黄昏の神隠し ===============
CARD_EFFECTS["うさカス-ACG-011"] = {
  play(obj) {
    pickFromZone("field", { message: "対象のコスト1以下の動物を選んでください", count: 1, filter: (o, c) => c && c.type === "動物" && (parseInt(c.cost)||0) <= 1 },
      (selected) => {
        if(selected.length === 0) return;
        const target = selected[0];
        // 除外→戦場に戻す→黄昏を除外
        moveCard(target, "field", "exile");
        setTimeout(() => {
          G.exile.splice(G.exile.indexOf(target), 1);
          G.field.push(target);
          target.summonedThisTurn = true;
          setMsg(`🌅 黄昏の神隠し：「${cards.find(c=>c.code===target.code)?.name}」を除外して戦場に戻しました。`);
          setTimeout(() => triggerCardEffect(target, "field_enter"), 300);
          // 黄昏を除外
          const pileIdx = G.pile.indexOf(obj);
          if(pileIdx >= 0) { G.pile.splice(pileIdx, 1); G.exile.push(obj); }
          renderGame();
        }, 500);
      }
    );
  },
  activate_grave(obj) {
    payCostTerrain(4, () => {
      const graveIdx = G.grave.indexOf(obj);
      if(graveIdx >= 0) {
        G.grave.splice(graveIdx, 1);
        // コストと条件を無視してプレイ
        G.pile.push(obj);
        setMsg("🌅 黄昏の神隠し：墓地からコスト・条件無視でプレイします。効果を発動してください。");
        setTimeout(() => { const eff = CARD_EFFECTS[obj.code]; if(eff?.play) eff.play(obj); }, 300);
        renderGame();
      }
    });
  },
};

// =============== うさカス-ACG-015 ペンギンフォース ===============
CARD_EFFECTS["うさカス-ACG-015"] = {
  can_play() {
    const played = (G.turnPlayLog||[]).filter(p => p.code === "うさカス-ACG-015");
    if(played.length >= 1) return { ok: false, reason: "1ターンに1度しかプレイできません" };
    return { ok: true };
  },
  play(obj) {
    // 全領土をムーブ
    G.territory.forEach(o => { o.rested = true; });
    setMsg("🐧 ペンギンフォース：全領土をムーブ。動物プレイ以外のプレイを妨害します。");
    // 妨害対象を選ぶ
    askYesNo("対象のプレイを妨害しますか？（動物プレイ以外）", () => {
      setMsg("🐧 ペンギンフォース：妨害しました（手動で対象プレイを無効にしてください）。");
    });
    renderGame();
  },
};

// =============== うさクズ-ACG-019 象教皇 ===============
CARD_EFFECTS["うさクズ-ACG-019"] = {
  // 常時（戦場）：防御できない
  constant_field(obj) { obj.cannotDefend = true; },
  activate_grave(obj) {
    // 墓地のこれを除外して手札のATK7動物を公開→コスト②軽減
    const graveIdx = G.grave.indexOf(obj);
    if(graveIdx < 0) return;
    const atk7 = G.hand.filter(o => { const c = cards.find(c=>c.code===o.code); return c && getATK(c) === 7; });
    if(atk7.length === 0) { setMsg("🐘 象教皇：手札にATK7の動物がありません。"); return; }
    pickFromZone("hand", { message: "公開するATK7の動物を選んでください", count: 1, filter: (o, c) => c && getATK(c) === 7 },
      (selected) => {
        if(selected.length === 0) return;
        G.grave.splice(graveIdx, 1); G.exile.push(obj);
        selected[0].publicDisplay = true;
        window.koyuuReduction = (window.koyuuReduction||0) + 2;
        setMsg(`🐘 象教皇：「${cards.find(c=>c.code===selected[0].code)?.name}」を公開。ターン終了時までコスト②軽減。`);
        renderGame();
      }
    );
  },
  activate_exile(obj) {
    payCostTerrain(3, () => {
      const atk7Grave = G.grave.filter(o => { const c=cards.find(c=>c.code===o.code); return c && getATK(c) === 7; });
      if(atk7Grave.length < 3) { setMsg(`🐘 象教皇：墓地のATK7動物が${atk7Grave.length}枚です（3枚必要）。`); return; }
      pickFromZone("grave", { message: "除外するATK7の動物を3枚選んでください", count: 3, filter: (o, c) => c && getATK(c) === 7 },
        (selected) => {
          if(selected.length < 3) return;
          selected.forEach(o => moveCard(o, "grave", "exile"));
          if(!obj.counters) obj.counters = {};
          obj.counters["脱出"] = 1;
          setMsg("🐘 象教皇：除外の象教皇に脱出カウンター1個を置きました。");
          renderGame();
        }
      );
    });
  },
};

// =============== ユキ-ACG-032 冬 ===============
CARD_EFFECTS["ユキ-ACG-032"] = {
  field_enter(obj) {
    // 全存在を生贄→冬毛カードをサーチ
    const targets = G.field.filter(o => o !== obj);
    targets.forEach(o => moveCard(o, "field", "grave"));
    setMsg(`❄️ 冬：戦場の${targets.length}体を生贄に捧げました。デッキから《冬毛》持ちカードをサーチします。`);
    searchDeck(card => (card.effect||"").includes("《冬毛》"), 1, "hand", { message: "デッキから《冬毛》を持つカードを手札に加えてください" });
    renderGame();
  },
};

// =============== ユキ-ACG-033 貯め瓶 ===============
CARD_EFFECTS["ユキ-ACG-033"] = {
  // プレイ時に治癒カウンター+1
  on_play_reaction(obj) {
    if(!obj.counters) obj.counters = {};
    obj.counters["治癒"] = (obj.counters["治癒"]||0) + 1;
    setMsg(`🫙 貯め瓶：治癒カウンター${obj.counters["治癒"]}個。`);
    // 4個で自動発動
    if(obj.counters["治癒"] >= 4) {
      obj.counters["治癒"] = 0;
      moveCard(obj, "field", "grave");
      G.playerLife += 4;
      drawCards(1);
      setMsg("🫙 貯め瓶：治癒カウンター4個！4点回復して1枚ドロー。");
    }
    renderGame();
  },
};

// =============== ユキ-ACG-034 鉄檻 ===============
CARD_EFFECTS["ユキ-ACG-034"] = {
  // 全動物攻撃不可→constant_field
  constant_field(obj) { obj.tetsuOriActive = true; },
  phase_prep(obj) {
    if(!obj.counters) obj.counters = {};
    obj.counters["補修"] = (obj.counters["補修"]||0) + 2;
    const cnt = obj.counters["補修"];
    setMsg(`⛓ 鉄檻：補修カウンター${cnt}個。コスト${cnt}を支払わなければ破壊されます。`);
    payCostTerrain(cnt, () => {
      setMsg(`⛓ 鉄檻：コスト${cnt}を支払いました。維持します。`);
      renderGame();
    });
    // 支払えない場合は自動破壊
    const terrain = countTerrain();
    if((terrain["合計"]||0) < cnt) {
      moveCard(obj, "field", "grave");
      setMsg("⛓ 鉄檻：コストを支払えないため破壊されました。");
    }
    renderGame();
  },
};

// =============== ユキ-ACG-043 イルカミネーション ===============
CARD_EFFECTS["ユキ-ACG-043"] = {
  can_play() {
    const playedCount = (G.turnPlayLog||[]).filter(p => p.code === "ユキ-ACG-043").length;
    if(playedCount > 0) return { ok: false, reason: `イルカミネーションのコストが3×${playedCount+1}増加しています` };
    return { ok: true };
  },
  play(obj) {
    askNumber("🐬 イルカミネーション：相手のプレイ枚数分コスト軽減します。相手の今ターンのプレイ枚数は？", 0, 10, (x) => {
      setMsg(`🐬 イルカミネーション：${x}コスト軽減でプレイ。コスト2以下のプレイを妨害します。`);
      askYesNo("対象のコスト2以下のプレイを妨害しますか？", () => {
        setMsg("🐬 イルカミネーション：妨害しました。このターン中、イルカミネーションのコストは3増加します。");
      });
      renderGame();
    });
  },
};

// =============== ユキ-ACG-045 森の中へ ===============
CARD_EFFECTS["ユキ-ACG-045"] = {
  play(obj) {
    G.noDamageToPlayer = true;
    setMsg("🌲 森の中へ：このターン中、プレイヤーへのダメージは0になります。");
    renderGame();
  },
};

// =============== 野良-ACG-047 猟犬 ===============
CARD_EFFECTS["野良-ACG-047"] = {
  can_play() {
    const played = (G.turnPlayLog||[]).filter(p => p.code === "野良-ACG-047");
    if(played.length >= 1) return { ok: false, reason: "1ターンに1度しかプレイできません" };
    return { ok: true };
  },
  constant_field(obj) { obj.cannotDefend = true; },
  // プレイヤーがダメージを受けた時（自分・相手問わず）
  on_self_damage(obj, amount) {
    if(amount > 0) {
      obj.atkMod = (obj.atkMod||0) + 1;
      obj.defMod = (obj.defMod||0) + 1;
      setMsg(`🐕 猟犬：プレイヤーがダメージを受けました！ATK+1/DEF+1を得ます。`);
      renderGame();
    }
  },
  on_enemy_damage(obj, amount) {
    if(amount > 0) {
      obj.atkMod = (obj.atkMod||0) + 1;
      obj.defMod = (obj.defMod||0) + 1;
      setMsg(`🐕 猟犬：プレイヤーがダメージを受けました！ATK+1/DEF+1を得ます。`);
      renderGame();
    }
  },
};

// =============== 野良-ACG-056 貰い火 ===============
CARD_EFFECTS["野良-ACG-056"] = {
  can_play() {
    const played = (G.turnPlayLog||[]).filter(p => p.code === "野良-ACG-056");
    if(played.length >= 1) return { ok: false, reason: "1ターンに1度しかプレイできません" };
    return { ok: true };
  },
  play(obj) {
    G.damageBonus = (G.damageBonus||0) + 1;
    // 回復不可フラグも
    G.noHealThisTurn = true;
    pickFromZone("field", { message: "対象を選んでください（ターン終了時まで回復不可＋ダメージ+1）", count: 1 },
      (selected) => {
        if(selected.length > 0) {
          selected[0].noHeal = true;
          const name = cards.find(c=>c.code===selected[0].code)?.name||selected[0].code;
          setMsg(`🔥 貰い火：「${name}」はターン終了時まで回復不可、受けるダメージ+1。全体ダメージも+1。`);
        }
        renderGame();
      }
    );
  },
};

// =============== ライ太-ACG-067 今生の獅子 ===============
CARD_EFFECTS["ライ太-ACG-067"] = {
  field_enter(obj) {
    pickFromZone("field", { message: "破壊する存在を選んでください", count: 1, filter: (o) => o !== obj },
      (selected) => {
        if(selected.length === 0) return;
        const target = selected[0];
        if(target.indestructible) { setMsg("💀 今生の獅子：対象は効果で破壊されません。"); return; }
        moveCard(target, "field", "grave");
        setMsg(`🦁 今生の獅子：「${cards.find(c=>c.code===target.code)?.name||target.code}」を破壊しました。`);
        renderGame();
      }
    );
  },
  to_grave(obj) {
    revealAndPick(1, { message: "デッキ上1枚を公開。動物なら手札へ、それ以外はデッキ下へ。",
      pickCount: 1, filter: (o, c) => c && c.type === "動物", pickTo: "hand", remainTo: "deck-bottom", canPickNone: true },
      null
    );
  },
};

// =============== ライ太-ACG-068 獅子王 ===============
CARD_EFFECTS["ライ太-ACG-068"] = {
  // デッキからライオンが墓地に置かれた時→field_enter_otherで対応
  field_enter_other(obj, triggerObj) {
    if(!triggerObj.fromDeck) return;
    const c = cards.find(c=>c.code===triggerObj.code);
    if(!c || c.type !== "動物" || !(c.tribe||"").includes("ライオン")) return;
    askYesNo(`🦁 獅子王：ライオン動物がデッキから墓地へ。②払って存在1つを破壊しますか？`,
      () => payCostTerrain(2, () => {
        pickFromZone("field", { message: "破壊する存在を選んでください", count: 1 },
          (sel) => { if(sel.length > 0 && !sel[0].indestructible) { moveCard(sel[0], "field", "grave"); setMsg("🦁 獅子王：破壊しました。"); renderGame(); } }
        );
      })
    );
  },
  activate_grave(obj) {
    const atk7Grave = G.grave.filter(o => { const c=cards.find(c=>c.code===o.code); return c && getATK(c) === 7 && o !== obj; });
    if(atk7Grave.length === 0) { setMsg("🦁 獅子王：墓地にATK7動物がいません。"); return; }
    payCostTerrain(4, () => {
      pickFromZone("field", { message: "破壊する存在を選んでください", count: 1 },
        (sel) => { if(sel.length > 0 && !sel[0].indestructible) { moveCard(sel[0], "field", "grave"); setMsg("🦁 獅子王：墓地から発動、破壊しました。"); renderGame(); } }
      );
    });
  },
};

// =============== ライ太-ACG-071 ライオンの嵐 ===============
CARD_EFFECTS["ライ太-ACG-071"] = {
  play(obj) {
    const lionCount = (G.turnGraveyardLog||[]).filter(o => {
      const c = cards.find(c=>c.code===o.code);
      return c && c.type === "動物" && (c.tribe||"").includes("ライオン");
    }).length;
    const x = lionCount;
    if(x === 0) { setMsg("🦁 ライオンの嵐：このターン中にライオン動物が墓地に置かれていません。"); return; }
    for(let i=0; i<x; i++) {
      G.field.push({
        id: "token_lion_"+Date.now()+"_"+i, code: "TOKEN_LION", isToken: true,
        tokenName: `${x}/1 平野ライオン動物トークン`, tokenStats: `ATK ${x}／DEF 1`,
        tokenType: "動物", tokenTribe: "ライオン",
        keywords: ["駿足"], gainedEffects: [], damage: 0, rested: false, night: false, summonedThisTurn: false,
      });
    }
    setMsg(`🦁 ライオンの嵐：${x}/1の平野ライオン動物トークン${x}体を生成しました。`);
    renderGame();
  },
};

// =============== パン田-ACG-092 隻腕の大将バッファロー ===============
CARD_EFFECTS["パン田-ACG-092"] = {
  constant_field(obj) { obj.cannotTakeBattleDamage = true; },
  // 攻撃時に集団防御されるか確認
  group_attack(obj, count) {
    askYesNo("🦬 隻腕の大将バッファロー：集団防御されましたか？",
      () => {
        askNumber("防御している動物の数を入力してください", 1, 10, (x) => {
          obj.atkMod = (obj.atkMod||0) + (obj.baseATK||0) * (x - 1);
          setMsg(`🦬 隻腕の大将バッファロー：集団防御${x}体！ATKが${x}倍になります。`);
          renderGame();
        });
      }
    );
  },
  activate_field(obj) {
    const graveHonor = G.grave.filter(o => (cards.find(c=>c.code===o.code)?.name||"").includes("勲章"));
    if(graveHonor.length === 0) { setMsg("🦬 隻腕の大将バッファロー：墓地に勲章カードがありません。"); return; }
    pickFromZone("grave", { message: "除外する勲章カードを選んでください", count: 1, filter: (o, c) => (c?.name||"").includes("勲章") },
      (selected) => {
        if(selected.length === 0) return;
        moveCard(selected[0], "grave", "exile");
        pickFromZone("field", { message: "必ず防御する常時を与える動物を選んでください", count: 1, filter: (o, c) => c && c.type === "動物" },
          (targets) => {
            if(targets.length === 0) return;
            gainAbility(targets[0], "『これは必ず防御する』", true);
            setMsg(`🦬 隻腕の大将バッファロー：「${cards.find(c=>c.code===targets[0].code)?.name}」は必ず防御します。`);
            renderGame();
          }
        );
      }
    );
  },
};

// =============== パン田-ACG-099 襲撃 ===============
CARD_EFFECTS["パン田-ACG-099"] = {
  play(obj) {
    const terrain = countTerrain();
    const x = terrain["山"] || 0;
    if(x === 0) { setMsg("⚔️ 襲撃：山岳域がありません。"); return; }
    const candidates = G.hand.filter(o => {
      const c = cards.find(c=>c.code===o.code);
      if(!c || c.type !== "動物") return false;
      const cost = parseInt(c.cost)||0;
      const condCount = (c.condition||"").replace(/[^山水森平夜無]/g,"").length;
      return cost <= x && condCount <= x;
    });
    if(candidates.length === 0) { setMsg(`⚔️ 襲撃：山岳域${x}以下のコスト・条件の動物が手札にありません。`); return; }
    pickFromZone("hand", { message: `手札のコスト${x}以下・条件数${x}以下の山岳動物を選んでください（コスト・条件無視で展開）`,
      count: 1, filter: (o, c) => c && c.type === "動物" && (parseInt(c.cost)||0) <= x && ((c.condition||"").replace(/[^山水森平夜無]/g,"").length) <= x },
      (selected) => {
        if(selected.length === 0) return;
        moveCard(selected[0], "hand", "field");
        gainAbility(selected[0], "《駿足》", true);
        selected[0].summonedThisTurn = false;
        setMsg(`⚔️ 襲撃：「${cards.find(c=>c.code===selected[0].code)?.name}」をコスト・条件無視で展開し《駿足》を付与。`);
        setTimeout(() => triggerCardEffect(selected[0], "field_enter"), 300);
        renderGame();
      }
    );
  },
};

// =============== 蔵馬-ACG-124 悪夢 ===============
CARD_EFFECTS["蔵馬-ACG-124"] = {
  // コストチェックはcheckPlayableに統合済み
  // 3枚以上プレイで自動生贄
  on_play_reaction(obj) {
    const cnt = (G.turnPlayLog||[]).length;
    if(cnt >= 3) {
      moveCard(obj, "field", "grave");
      setMsg("😱 悪夢：このターン3枚目以上のプレイが発生したため生贄に捧げられました。");
      renderGame();
    }
  },
};

// =============== 蔵馬-ACG-126 足枷 ===============
CARD_EFFECTS["蔵馬-ACG-126"] = {
  constant_field(obj) {
    // 誘発・起動発動前にコスト①支払い（checkTriggers内で通知）
    obj.ashikagiActive = true;
  },
};

// =============== 蔵馬-ACG-130 城砦 ===============
CARD_EFFECTS["蔵馬-ACG-130"] = {
  // ダメージ置き換えはdealDamageToPlayer内で処理済み
  phase_prep(obj) {
    // 準備フェイズ：手札1枚捨てなければ生贄
    askYesNo("🏰 城砦：手札1枚を捨てますか？捨てないとこれを生贄に捧げます。",
      () => {
        pickFromZone("hand", { message: "捨てるカードを選んでください", count: 1 },
          (selected) => { if(selected.length > 0) { moveCard(selected[0], "hand", "grave"); setMsg("🏰 城砦：維持しました。"); renderGame(); } }
        );
      },
      () => { moveCard(obj, "field", "grave"); setMsg("🏰 城砦：生贄に捧げられました。"); renderGame(); }
    );
  },
};

// =============== キメサイ-ACG-138 亜音速カジキ ===============
CARD_EFFECTS["キメサイ-ACG-138"] = {
  can_play() { return { ok: true }; },
  play(obj) {
    const gunjyo = G.field.filter(o => o.code === "キメサイ-ACG-136");
    if(gunjyo.length >= 4) {
      askYesNo(`🐟 亜音速カジキ：戦場の群泳カジキ4つを除外してコスト⑧軽減しますか？（現在${gunjyo.length}体）`,
        () => {
          pickFromZone("field", { message: "除外する群泳カジキを4体選んでください", count: 4, filter: (o) => o.code === "キメサイ-ACG-136" },
            (selected) => {
              if(selected.length < 4) return;
              selected.forEach(o => moveCard(o, "field", "exile"));
              const x = selected.length;
              // 除外したX体分の対象を選んで除外
              pickFromZone("field", { message: `戦場・墓地・領地から最大${x}つを選んで除外してください`, count: x },
                (targets) => {
                  targets.forEach(o => {
                    if(G.field.includes(o)) moveCard(o, "field", "exile");
                    else if(G.grave.includes(o)) moveCard(o, "grave", "exile");
                    else if(G.territory.includes(o)) { G.territory.splice(G.territory.indexOf(o),1); G.exile.push(o); }
                  });
                  G.field.push(obj); obj.summonedThisTurn = true;
                  setMsg(`🐟 亜音速カジキ：群泳カジキ4体を除外、${targets.length}つを除外して戦場に出ました。`);
                  renderGame();
                }
              );
            }
          );
        }
      );
    } else {
      G.field.push(obj); obj.summonedThisTurn = true;
      setMsg("🐟 亜音速カジキ：戦場に出ました。");
      renderGame();
    }
  },
  constant_field(obj) {
    const hasGunjyo = G.exile.some(o => o.code === "キメサイ-ACG-136");
    if(hasGunjyo) {
      if(!(obj.keywords||[]).includes("駿足")) { if(!obj.keywords) obj.keywords=[]; obj.keywords.push("駿足"); obj.hasShunsoku=true; }
      if(!(obj.keywords||[]).includes("突破")) obj.keywords.push("突破");
    }
  },
};

// =============== キメサイ-ACG-139 命削りの運び屋 ===============
CARD_EFFECTS["キメサイ-ACG-139"] = {
  activate_field(obj) {
    payMoveCost(obj);
    askNumber("🦫 命削りの運び屋：支払うライフを入力してください（最大ライフ-1まで）", 1, G.playerLife - 1, (x) => {
      G.playerLife = Math.max(1, G.playerLife - x);
      revealAndPick(x, { message: `デッキ上${x}枚を確認。任意の順でデッキ上に戻してください`, pickCount: 0, canPickNone: true, pickTo: "deck-top", remainTo: "deck-top" });
      setMsg(`🦫 命削りの運び屋：ライフ${x}点を消費してデッキ上${x}枚を確認しました。`);
      renderGame();
    });
  },
  activate_hand(obj) {
    moveCard(obj, "hand", "grave");
    const overlay = document.createElement("div");
    overlay.className="modal-overlay trigger-notice"; overlay.style.cssText="display:flex;z-index:500;";
    overlay.innerHTML=`<div class="modal-box" style="max-width:300px;" onclick="event.stopPropagation()">
      <p style="font-size:13px;color:#e0e8d0;margin-bottom:10px;">🦫 命削りの運び屋：カード名を宣言してください</p>
      <input id="beaver-name" type="text" style="width:100%;padding:8px;background:#1a2a3a;border:1px solid #4a8a4a;border-radius:8px;color:#e0e8d0;font-size:14px;margin-bottom:10px;">
      <div class="modal-btn-row"><button class="modal-btn confirm" id="beaver-ok">宣言</button><button class="modal-btn cancel" onclick="this.closest('.trigger-notice').remove()">キャンセル</button></div></div>`;
    document.body.appendChild(overlay);
    document.getElementById("beaver-ok").onclick = () => {
      const name = document.getElementById("beaver-name").value.trim();
      if(!name) return;
      overlay.remove();
      if(G.mainDeck.length === 0) { setMsg("🦫 命削りの運び屋：デッキが空です。"); return; }
      const top = G.mainDeck[0];
      const topCard = cards.find(c=>c.code===top.code);
      if((topCard?.name||top.code) === name) {
        drawCards(1);
        setMsg(`🦫 命削りの運び屋：「${name}」を宣言→デッキ上が「${topCard?.name}」！1枚ドロー。`);
      } else {
        setMsg(`🦫 命削りの運び屋：「${name}」を宣言→デッキ上は「${topCard?.name||top.code}」でした。`);
      }
      renderGame();
    };
  },
};

// =============== キメサイ-ACG-141 希望漁り ===============
CARD_EFFECTS["キメサイ-ACG-141"] = {
  field_enter(obj) {
    // 宣言する場面カード名を記録
    const overlay = document.createElement("div");
    overlay.className="modal-overlay trigger-notice"; overlay.style.cssText="display:flex;z-index:500;";
    overlay.innerHTML=`<div class="modal-box" style="max-width:300px;" onclick="event.stopPropagation()">
      <p style="font-size:13px;color:#e0e8d0;margin-bottom:10px;">🦎 希望漁り：場面カードのカード名を宣言してください</p>
      <input id="hope-name" type="text" style="width:100%;padding:8px;background:#1a2a3a;border:1px solid #4a8a4a;border-radius:8px;color:#e0e8d0;font-size:14px;margin-bottom:10px;">
      <div class="modal-btn-row"><button class="modal-btn confirm" id="hope-ok">宣言</button></div></div>`;
    document.body.appendChild(overlay);
    document.getElementById("hope-ok").onclick = () => {
      obj.hopeDeclared = document.getElementById("hope-name").value.trim();
      overlay.remove();
      setMsg(`🦎 希望漁り：「${obj.hopeDeclared}」を宣言しました。ライフ1点の時コスト無視でプレイ可能。`);
      renderGame();
    };
  },
  on_life_one(obj) {
    setMsg(`🦎 希望漁り：ライフが1点になりました！「${obj.hopeDeclared||"宣言カード"}」をコスト無視でプレイできます。`);
  },
  phase_sunset(obj) {
    if(G.playerLife !== 1) return;
    askYesNo(`🦎 希望漁り：ライフ1点。「${obj.hopeDeclared||"宣言カード"}」をデッキ・墓地・除外から手札に加えますか？`,
      () => {
        const name = obj.hopeDeclared;
        const allZones = [...G.mainDeck, ...G.grave, ...G.exile];
        const found = allZones.find(o => (cards.find(c=>c.code===o.code)?.name||o.code) === name);
        if(!found) { setMsg("🦎 希望漁り：宣言カードが見つかりません。"); return; }
        if(G.mainDeck.includes(found)) { G.mainDeck.splice(G.mainDeck.indexOf(found),1); }
        else if(G.grave.includes(found)) { G.grave.splice(G.grave.indexOf(found),1); }
        else if(G.exile.includes(found)) { G.exile.splice(G.exile.indexOf(found),1); }
        G.hand.push(found);
        setMsg(`🦎 希望漁り：「${name}」を手札に加えました。`);
        renderGame();
      }
    );
  },
};

// =============== キメサイ-ACG-142 断崖を背に ===============
CARD_EFFECTS["キメサイ-ACG-142"] = {
  play(obj) {
    pickFromZone("grave", { message: "手札に加えるカードを選んでください", count: 1 },
      (selected) => {
        if(selected.length > 0) { moveCard(selected[0], "grave", "hand"); }
        G.extraTurn = true;
        // このカードを除外
        const pileIdx = G.pile.indexOf(obj);
        if(pileIdx >= 0) { G.pile.splice(pileIdx,1); G.exile.push(obj); }
        setMsg("⛰ 断崖を背に：カードを手札に加えました。このターン終了後、追加ターンが発生します。");
        renderGame();
      }
    );
  },
};

// =============== キメサイ-ACG-146 道標 ===============
CARD_EFFECTS["キメサイ-ACG-146"] = {
  play(obj) {
    const michi = obj;
    const revealed = [];
    let found = false;
    // 道標が出るまでデッキを捲る
    while(G.mainDeck.length > 0 && !found) {
      const top = G.mainDeck.shift();
      const topCard = cards.find(c=>c.code===top.code);
      // 運命の帰郷チェック（デッキ最後の1枚）
      if(G.mainDeck.length === 0 && topCard?.name === "運命の帰郷") {
        setMsg("🌟 運命の帰郷：デッキの最後の1枚！特殊勝利！");
        alert("🌟 運命の帰郷：特殊勝利！");
        G.exile.push(top);
        break;
      }
      if((topCard?.name||top.code) === "道標") {
        found = true;
        // 最後に除外したカードをコスト・条件無視でプレイ
        const lastExiled = revealed[revealed.length - 1];
        if(lastExiled) {
          setMsg(`🗺 道標：「道標」が出ました！最後に除外した「${cards.find(c=>c.code===lastExiled.code)?.name||lastExiled.code}」をコスト無視でプレイします。`);
          setTimeout(() => {
            const eff = CARD_EFFECTS[lastExiled.code];
            if(eff?.play) eff.play(lastExiled);
            else setMsg(`🗺 道標：「${cards.find(c=>c.code===lastExiled.code)?.name||lastExiled.code}」をプレイしました（手動で効果を処理してください）。`);
          }, 500);
        }
        G.exile.push(top);
      } else {
        top.fromDeck = true;
        G.exile.push(top);
        revealed.push(top);
      }
    }
    // 除外したカードをデッキ上に戻してシャッフル
    if(!found) setMsg("🗺 道標：デッキが尽きました。「道標」は見つかりませんでした。");
    revealed.forEach(o => { G.exile.splice(G.exile.indexOf(o),1); G.mainDeck.unshift(o); });
    shuffleDeck();
    // この道標を除外
    const pileIdx = G.pile.indexOf(michi);
    if(pileIdx >= 0) { G.pile.splice(pileIdx,1); G.exile.push(michi); }
    renderGame();
  },
};

// =============== キメサイ-ACG-148 暗がりの保管庫 ===============
CARD_EFFECTS["キメサイ-ACG-148"] = {
  // デッキから公開されて非公開に戻ろうとした時→除外（revealAndPick内でフック）
  on_deck_return(obj) {
    // デッキに戻る代わりに除外
    const idx = G.mainDeck.indexOf(obj);
    if(idx >= 0) G.mainDeck.splice(idx, 1);
    G.exile.push(obj);
    setMsg("📦 暗がりの保管庫：デッキに戻る代わりに除外されました。");
    askYesNo("📦 暗がりの保管庫：誘発（除外）：手札1枚を捨てて戦場に出しますか？",
      () => {
        pickFromZone("hand", { message: "捨てるカードを選んでください", count: 1 },
          (selected) => {
            if(selected.length === 0) return;
            moveCard(selected[0], "hand", "grave");
            G.exile.splice(G.exile.indexOf(obj),1);
            G.field.push(obj); obj.summonedThisTurn = true;
            setMsg("📦 暗がりの保管庫：戦場に出ました。");
            renderGame();
          }
        );
      }
    );
    renderGame();
  },
  activate_field(obj) {
    payMoveCost(obj);
    payCostTerrain(1, () => {
      const handCards = [...G.hand];
      pickFromZone("hand", { message: "デッキ上に置くカードを選んでください（複数可）", count: G.hand.length, canPickNone: true },
        (selected) => {
          selected.forEach(o => { G.hand.splice(G.hand.indexOf(o),1); G.mainDeck.unshift(o); });
          shuffleDeck();
          drawCards(selected.length);
          setMsg(`📦 暗がりの保管庫：${selected.length}枚をデッキ上に→シャッフル→${selected.length}枚ドロー。`);
          renderGame();
        }
      );
    });
  },
  activate_hand(obj) {
    // 公開してデッキ上に置く
    const idx = G.hand.indexOf(obj);
    if(idx >= 0) G.hand.splice(idx,1);
    obj.publicDisplay = true;
    G.mainDeck.unshift(obj);
    setMsg("📦 暗がりの保管庫：公開してデッキ上に置きました。");
    renderGame();
  },
};

// =============== キメサイ-ACG-149 等価な検索網 ===============
CARD_EFFECTS["キメサイ-ACG-149"] = {
  constant_field(obj) {
    // 戦場から墓地に置かれる代わりに除外
    obj.netExileInstead = true;
  },
  to_grave(obj) {
    // 常時効果で除外
    G.grave.splice(G.grave.indexOf(obj),1);
    G.exile.push(obj);
    setMsg("🕸 等価な検索網：戦場から墓地の代わりに除外されました。");
    renderGame();
  },
  // プレイへの割り込み（confirmPlay後にフック）
  on_play_reaction(obj) {
    if(G.hand.length > 0) return; // 手札が0枚の時のみ
    const lastPlayed = G.pile[G.pile.length-1];
    if(!lastPlayed) return;
    const lc = cards.find(c=>c.code===lastPlayed.code);
    revealAndPick(1, { message: "デッキ上1枚を公開。プレイと同コストなら手札に戻せます", pickCount: 1, canPickNone: true,
      filter: (o, c) => c && (parseInt(c.cost)||0) === (parseInt(lc?.cost)||0), pickTo: "hand", remainTo: "deck-top" },
      (picked) => {
        if(picked.length > 0) {
          // プレイを手札に戻してコントローラーは領土をウェイク
          const pileIdx = G.pile.indexOf(lastPlayed);
          if(pileIdx >= 0) { G.pile.splice(pileIdx,1); G.hand.push(lastPlayed); }
          const x = parseInt(lc?.cost)||0;
          // 領土Xつをウェイク
          const rested = G.territory.filter(o => o.rested).slice(0, x);
          rested.forEach(o => { o.rested = false; });
          setMsg(`🕸 等価な検索網：「${lc?.name}」を手札に戻し、領土${rested.length}つをウェイクしました。`);
          renderGame();
        }
      }
    );
  },
  activate_grave(obj) {
    if(G.hand.length > 0) { setMsg("🕸 等価な検索網：手札が0枚の時のみ起動できます。"); return; }
    payCostTerrain(1, () => {
      G.exile.splice(G.exile.indexOf(obj),1);
      G.field.push(obj); obj.summonedThisTurn = true;
      drawCards(1);
      // このターンカードをプレイできない
      G.noPlayThisTurn = true;
      setMsg("🕸 等価な検索網：戦場に出て1枚ドロー。このターン中カードをプレイできません。");
      renderGame();
    });
  },
};

// =============== キメサイ-ACG-161 鉄鴉 ===============
CARD_EFFECTS["キメサイ-ACG-161"] = {
  field_enter(obj) {
    // このターン中に墓地に置かれた道具カードの数×ATK+1/DEF+1
    const toolCount = (G.turnGraveyardLog||[]).filter(o => {
      const c = cards.find(c=>c.code===o.code);
      return c && c.type === "道具";
    }).length;
    if(toolCount > 0) {
      if(!obj.counters) obj.counters = {};
      obj.counters["ATK+1/DEF+1"] = (obj.counters["ATK+1/DEF+1"]||0) + toolCount;
      obj.atkMod = (obj.atkMod||0) + toolCount;
      obj.defMod = (obj.defMod||0) + toolCount;
      setMsg(`🐦 鉄鴉：このターン${toolCount}枚の道具が墓地へ→ATK+${toolCount}/DEF+${toolCount}カウンターを置きました。`);
    }
    renderGame();
  },
  activate_field(obj) {
    payMoveCost(obj);
    const atk = getATK(cards.find(c=>c.code===obj.code)) + (obj.atkMod||0);
    G.enemyLife = Math.max(0, G.enemyLife - atk);
    setMsg(`🐦 鉄鴉：相手に${atk}点ダメージ。`);
    setTimeout(() => { G.field.forEach(o => { const eff=CARD_EFFECTS[o.code]; if(eff?.on_enemy_damage) eff.on_enemy_damage(o, atk); }); }, 200);
    renderGame();
  },
};

// =============== キメサイ-ACG-163 此岸色のカメレオン ===============
CARD_EFFECTS["キメサイ-ACG-163"] = {
  field_enter(obj) {
    const kameCatGrave = G.grave.filter(o => {
      const c = cards.find(c=>c.code===o.code);
      return c && (c.tribe||"").includes("カメレオン") && c.type === "動物" && o !== obj;
    });
    if(kameCatGrave.length === 0) return;
    askYesNo("🦎 此岸色のカメレオン：墓地のカメレオン動物を除外して複製トークンを相手戦場に出しますか？",
      () => {
        pickFromZone("grave", { message: "除外するカメレオン動物を選んでください", count: 1, filter: (o, c) => c && (c.tribe||"").includes("カメレオン") && c.type === "動物" && o !== obj },
          (selected) => {
            if(selected.length === 0) return;
            const src = selected[0];
            const srcCard = cards.find(c=>c.code===src.code);
            moveCard(src, "grave", "exile");
            // 複製トークンを生成（相手戦場→簡易：自分戦場に出して通知）
            G.field.push({
              id: "token_kame_"+Date.now(), code: src.code, isToken: true,
              tokenName: srcCard?.name+"（複製）", tokenStats: srcCard?.stats||"",
              tokenType: "動物", tokenTribe: srcCard?.tribe||"カメレオン",
              keywords: [], gainedEffects: ["これは相手の戦場にいます"], damage: 0, rested: false, night: false, summonedThisTurn: true,
              isOpponentToken: true,
            });
            setMsg(`🦎 此岸色のカメレオン：「${srcCard?.name}」の複製トークンを相手の戦場に出しました。`);
            renderGame();
          }
        );
      }
    );
  },
  to_grave(obj) {
    // 戦場から離れた時、相手戦場のカメレオントークンをこちらに移す
    const opponentToken = G.field.find(o => o.isToken && o.isOpponentToken && (cards.find(c=>c.code===o.code)?.tribe||o.tokenTribe||"").includes("カメレオン"));
    if(opponentToken) {
      opponentToken.isOpponentToken = false;
      opponentToken.gainedEffects = (opponentToken.gainedEffects||[]).filter(e => e !== "これは相手の戦場にいます");
      setMsg("🦎 此岸色のカメレオン：相手戦場のカメレオントークンをこちらの戦場に移しました。");
      renderGame();
    }
  },
};

// =============== キメサイ-ACG-164 彼岸色のカメレオン ===============
CARD_EFFECTS["キメサイ-ACG-164"] = {
  constant_field(obj) {
    // ATK+X：戦場のトークン以外の存在の条件数の最大値の合計
    let total = 0;
    G.field.forEach(o => {
      if(o === obj || o.isToken) return;
      const c = cards.find(c=>c.code===o.code);
      if(!c) return;
      const condCount = (c.condition||"").replace(/[^山水森平夜無]/g,"").length;
      total += condCount;
    });
    if(obj.higanbuff !== undefined) obj.atkMod = (obj.atkMod||0) - obj.higanbuff;
    obj.higanbuff = total;
    obj.atkMod = (obj.atkMod||0) + total;
  },
  phase_sunset(obj) {
    if(!obj.counters) obj.counters = {};
    const cnt = obj.counters["彼岸"] || 0;
    if(cnt >= 1) {
      // 強制敗北
      setMsg("💀 彼岸色のカメレオン：彼岸カウンターが2個！敗北します。");
      alert("💀 彼岸色のカメレオン：強制敗北！彼岸カウンターが2個になりました。");
    } else {
      obj.counters["彼岸"] = cnt + 1;
      setMsg(`🦎 彼岸色のカメレオン：彼岸カウンター${cnt+1}個。`);
    }
    renderGame();
  },
};

