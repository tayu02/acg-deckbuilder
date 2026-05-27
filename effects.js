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
  return true;
}

// ============================================================
// 実装例（今後ここに追記していく）
// ============================================================

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

