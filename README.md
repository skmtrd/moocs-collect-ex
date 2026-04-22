# Moocs Collect Ex

`moocs-collect-ex` は、[yu7400ki/moocs-collect](https://github.com/yu7400ki/moocs-collect) をベースにした非公式 fork です。  
元プロジェクトの使いやすい収集基盤を活かしつつ、ローカル教材ビューアや本文ページ対応など、個人利用向けの拡張を加えています。

[![License](https://img.shields.io/github/license/skmtrd/moocs-collect-ex.svg)](LICENSE)

## この fork について

- 本リポジトリは [yu7400ki/moocs-collect](https://github.com/yu7400ki/moocs-collect) への敬意を前提にした派生プロジェクトです
- upstream の設計や実装を土台として、ローカル閲覧まわりの機能追加と検証を行っています
- INIAD MOOCs や大学とは無関係の非公式プロジェクトです
- 利用にあたっては、所属機関の利用規約・授業資料の取り扱いルールに従ってください

元プロジェクトの公式配布物や最新情報を確認したい場合は、upstream の README と releases を参照してください。  
upstream: [yu7400ki/moocs-collect](https://github.com/yu7400ki/moocs-collect)

## 機能

- 一括ダウンロード: 授業ページからスライドをまとめて取得
- PDF出力: Google Slides 埋め込み教材を PDF として保存
- 本文保存: スライド下の本文や、スライドのない課題ページ本文も保存
- ローカル教材ビューア: 保存済みの PDF と本文を MOOCs に近い形で閲覧
- 全文検索: 保存済み教材の検索（デスクトップアプリ）
- クロスプラットフォーム: Windows、macOS、Linux 対応

## クイックスタート

### デスクトップアプリ

この fork は現状、ソースからの起動を前提にしています。

```bash
git clone https://github.com/skmtrd/moocs-collect-ex.git
cd moocs-collect-ex
pnpm install
cargo build --workspace
pnpm --filter=desktop tauri dev
```

![Desktop App Main](assets/desktop-main.png)
![Desktop App Search](assets/desktop-search.png)

### CLI版

#### 基本的な使い方

```bash
collect-cli --path ~/Downloads --year 2024
```

| オプション | 説明                     | 例                    |
|------------|--------------------------|----------------------|
| `--path`   | ダウンロード先ディレクトリ | `~/Downloads`        |
| `--year`   | 対象年度                 | `2025`               |

実行後は対話形式で授業・講義・ページを選択できます。

## ユーティリティ

### mcmerge

PDFファイルを結合するユーティリティです。

#### インストール

```bash
cargo install --path apps/merge --bin mcmerge
```

#### 使い方

```bash
mcmerge lecture --path C:\Users\<username>\Documents\moocs-collect\2025\
```

| オプション | 説明                     | 例                    |
|------------|--------------------------|----------------------|
| `--path`   | 対象ディレクトリ           | `C:\Users\<username>\Documents\moocs-collect\2025\` |

## アーキテクチャ

```
moocs-collect/
├── src/                 # コアライブラリ (Rust)
├── apps/
│   ├── cli/            # CLI アプリケーション
│   ├── desktop/        # Tauri デスクトップアプリ
│   ├── merge/          # PDF 結合ユーティリティ
│   └── website/        # Webサイト
└── ...
```

## 開発

### 必要環境

- Rust
- Node.js
- pnpm

### セットアップ

```bash
# リポジトリクローン
git clone https://github.com/skmtrd/moocs-collect-ex.git
cd moocs-collect-ex

# 依存関係インストール
pnpm install

# Rust依存関係
cargo build --workspace
```

### 開発コマンド

```bash
# CLI
cargo run -p collect-cli -- --path ./test --year 2024

# デスクトップアプリ
pnpm --filter=desktop tauri dev

# Webサイト
pnpm --filter=website dev

# lint
pnpm lint
cargo clippy --workspace
cargo fmt --all -- --check
```

### ビルド

```bash
# CLI
cargo build --release -p collect-cli

# デスクトップアプリ
pnpm --filter=desktop tauri build

# Webサイト
pnpm --filter=website build
```

## ライセンス

[MIT License](LICENSE)

---

<p align="center">
  Built with respect for the upstream project and for personal local study workflows
</p>
