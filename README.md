# 名刺スキャン送信アプリ — セットアップ手順

## ファイル構成

```
meishi-scan/
├── public/
│   └── index.html       # フロントエンド（スマホ表示）
├── api/
│   ├── ocr.js           # OCR処理（Claude API）
│   └── send.js          # メール送信（SendGrid）
├── package.json
├── vercel.json
└── README.md
```

---

## STEP 1 — APIキーを取得する

### 1-1. Anthropic APIキー（OCR用）

1. https://console.anthropic.com にアクセス
2. アカウント登録（メールアドレスで登録可能）
3. 左メニュー「API Keys」→「Create Key」
4. 表示されたキーをコピーして保存（再表示されません）

> 例: `sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxx`

---

### 1-2. SendGrid APIキー（メール送信用）

1. https://sendgrid.com にアクセス
2. 無料アカウント登録（月100通まで無料）
3. 登録後、左メニュー「Settings」→「API Keys」→「Create API Key」
4. 「Full Access」を選択して作成
5. 表示されたキーをコピーして保存

#### 送信元メールアドレスの認証（必須）

SendGridはなりすまし防止のため、送信元メールアドレスの認証が必要です。

1. 左メニュー「Settings」→「Sender Authentication」
2. 「Verify a Single Sender」をクリック
3. フォームに送信元として使うメールアドレスを入力
4. そのメールアドレス宛に確認メールが届くので、リンクをクリック

> この認証済みメールアドレスが後の環境変数 `FROM_EMAIL` になります

---

## STEP 2 — GitHubにアップロードする

### 2-1. GitHubアカウントを作成

1. https://github.com にアクセスしてアカウント登録

### 2-2. リポジトリを作成

1. GitHubにログイン後、右上「＋」→「New repository」
2. Repository name: `meishi-scan`
3. 「Public」を選択
4. 「Create repository」をクリック

### 2-3. ファイルをアップロード

ターミナル（コマンドプロンプト）が不要な方法：

1. 作成されたリポジトリのページで「uploading an existing file」をクリック
2. このフォルダ内の全ファイルをドラッグ＆ドロップ
3. `api/`フォルダと`public/`フォルダも含めてアップロード
4. 「Commit changes」をクリック

---

## STEP 3 — Vercelにデプロイする

1. https://vercel.com にアクセス
2. 「Sign Up」→「Continue with GitHub」でGitHubアカウントでログイン
3. 「Add New Project」→「Import」で `meishi-scan` リポジトリを選択
4. 「Deploy」をクリック（自動でビルドが始まります）

---

## STEP 3.5 — Vercel KV（データベース）を有効にする

名刺データを保存するためにVercel KVを設定します。

1. Vercelのプロジェクトページ →「Storage」タブ
2. 「Create Database」→「KV（Redis）」を選択
3. データベース名: `meishi-db`（任意）→「Create」
4. 「Connect to Project」でプロジェクトと紐付け

紐付けると `KV_URL` / `KV_REST_API_URL` / `KV_REST_API_TOKEN` が自動で環境変数に追加されます。

## STEP 4 — 環境変数を設定する（重要）

APIキーはコードに直接書かず、Vercelの環境変数として設定します。

1. Vercelのプロジェクトページ →「Settings」→「Environment Variables」
2. 以下の3つを追加：

| Name | Value |
|------|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...`（STEP 1-1で取得） |
| `SENDGRID_API_KEY` | `SG.xxxxxxxxx`（STEP 1-2で取得） |
| `FROM_EMAIL` | 認証済みメールアドレス（STEP 1-2で登録） |

※ KV関連の環境変数（`KV_URL`等）はSTEP 3.5で自動追加されます。

3. 追加後、「Deployments」→「Redeploy」で再デプロイ

---

## STEP 5 — 動作確認

1. VercelがURL（例: `https://meishi-scan.vercel.app`）を発行します
2. スマホのブラウザでそのURLにアクセス
3. 名刺を撮影 → OCR確認 → 送信
4. `info.ozaki@gmail.com` にメールが届けば完了 🎉

---

## トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| OCRが動かない | ANTHROPIC_API_KEY が未設定 | 環境変数を確認 |
| メールが届かない | SENDGRID_API_KEY または FROM_EMAIL が未設定 | 環境変数を確認 |
| メールが届かない | 送信元メール未認証 | SendGridでSender認証を完了 |
| 画像が送れない | ファイルサイズが大きすぎる | 5MB以下の画像を使用 |

---

## お問い合わせ

設定に詰まった際はVercelのログ（Deployments → Functions Logs）をご確認ください。
