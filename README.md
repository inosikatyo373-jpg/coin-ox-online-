# BID GRID v3.1

三目並べ × オークション × ブラフのオンライン1対1ゲームです。

## v3.1

- Supabase Authを使った任意のメール/パスワード登録・ログイン
- ログインしなくてもゲストとして対戦可能
- 初期RATE 1500
- 最高レート / 勝利 / 敗北 / 引き分けを保存
- 2本先取のマッチ全体が終了した時だけ戦績を記録
- 切断による不戦勝・不戦敗も戦績へ反映
- 同一アカウントで同じルームの両側には参加不可
- フレンド対戦ではRATEはまだ変動しません。レート変動はランクマッチ実装時に追加予定です。

## Renderで必要な環境変数

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

`SUPABASE_SERVICE_ROLE_KEY` は秘密情報です。`public/index.html` やGitHubへ直接書き込まないでください。

## ローカル起動

1. Node.js 18+ を用意
2. `npm install`
3. `npm start`
4. `http://localhost:3000` を開く

公開時はNode.js Web Serviceとしてデプロイし、Start Commandは `npm start` を使用します。
