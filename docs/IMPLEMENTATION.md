# V2 実装報告

## Phase 1：既存コード確認・分離

- 元の青系ヘッダー、左入力／右結果、学校・性別・商品選択、カードとモバイル縦配置を継承。
- `src/App.tsx`から旧判定・PDF解析・寸法表管理を分離。
- 空だった`src/main.tsx`にReactの起動処理を追加。
- 元のPDF Canvas表示を`src/components/PdfCanvasViewer.tsx`に移動。
- 次工程：V2の型・ルール定義。

## Phase 2：型・マスタ

- `src/domain/types.ts`に学校、商品、実寸、ルール、身体寸法、部位別評価と推奨結果を定義。
- `src/data/schools.ts`、`products.ts`、`sizes.ts`、`fitRules.ts`、`growthRules.ts`を追加。
- 商品カテゴリ・ルールIDで参照。商品名文字列によるカテゴリ推測を廃止。
- 数値はすべて設定ファイルの暫定ルールとして明示。実在商品のサイズマスタは空。
- 次工程：部位別判定と推奨選定。

## Phase 3：エンジン

- `src/logic/calculateEase.ts`、`evaluateMeasurement.ts`、`evaluateSize.ts`、`calculateFitScore.ts`、`calculateGrowthScore.ts`、`recommendSize.ts`、`validate.ts`を追加。
- HARD違反は候補外、FitScoreは未算出。HARD通過サイズのみ100点満点で評価。
- ウエストはアジャスターの対応範囲、ヒップは最低Easeを評価。
- 現在適応と試着推奨を分離。成長候補も現在の全部位が許容範囲内か再評価。
- 呼称身長だけの増加では成長推奨しない。単純1サイズアップと共通シャツ寸法へのフォールバックを廃止。
- 許容Fit候補がない場合も試着推奨を出さない。データ不足・矛盾時は判定を中止。
- 次工程：指定ケースの自動テスト。

## Phase 4：テスト

- `tests/fixtures.ts`、`tests/engine.test.ts`を追加。
- 指定Case 1〜6、連続境界、肩幅不足、袖出しで現在不足を補わないこと、アジャスター範囲、スカートヒップ、データ不足、ルール変更、CSV取込、マスタ整合性等を検証。
- 最終結果：21件成功、失敗・スキップなし。
- fixtureは運用データに接続しない。
- 次工程：V2結果表示をUIへ接続。

## Phase 5：結果UI

- `src/App.tsx`、`src/components/SizeCard.tsx`、`src/index.css`を変更。
- 初回試着推奨を青いカードに大きく表示し、現在適応、重複しない比較候補、自然文の理由を表示。
- 各部位の実寸・身体寸法・差・Fitを表示。候補外の理由も全サイズ比較に表示。
- 袖出し・裾出しは現在Fitと別表示。カテゴリ別の試着確認ポイントと注意文を表示。
- 体重を含む採寸・判定記録のJSON書出しに対応。
- 次工程：確認済み構造化寸法マスタの管理。

## Phase 6：寸法表管理

- `src/components/MasterManager.tsx`、`src/utils/importTable.ts`、`pdf.ts`、`storage.ts`を追加。
- PDF／CSV読込→仮データ→編集表→原本照合チェック→構造化マスタ保存。
- PDF解析結果を直接判定しない。解析失敗時も手入力と判定本体を利用可能。
- マスタはlocalStorage、PDF原本はIndexedDB。JSONバックアップ・読込とルール／商品マスタのJSON編集を用意。
- 旧版localStorageは保持し、手動確認用の書出しを用意。旧版の無検証自動移行は行わない。
- 次工程：型チェック・ビルド・ブラウザ確認。

## Phase 7：最終検証・環境設定

- `package.json`に`test`を追加。React型定義を追加し、strict型チェックを有効化。
- `package-lock.json`へ統一し、不要なAPI依存を除去。判定にAPIキーは不要。
- `npm ci --ignore-scripts --cache /workspace/.npm-cache`の再導入、`npm test`、`npm run lint`、`npm run build`が成功。
- Chromiumで未登録ブロック、確認保存、160A現在適応／165A試着推奨、170A候補外、全サイズ表示、390px幅の横はみ出しなし、判定記録書出し、マスタ再読込、欠落寸法保存ブロックを確認。
- テスト用PDFの抽出・描画・IndexedDB保存・再読込を確認。ブラウザの未処理例外なし。
- PDF処理を寸法表管理画面の遅延読込に分離。PDFワーカーを同梱。
- 環境設定ドラフトの`install_script`と`start_skill`を保存。環境の公開は未実施。

## 残る運用作業・範囲外

- 学校・実商品の確認済み実寸の登録と、暫定Fit／成長ルールの試着検証が必要。
- シャツ・体操服はカテゴリ経由で動作するが、専用品のルール調整は未検証。
- ブラウザ保存のみ。サーバー保存、複数端末同期、ユーザー認証は未実装。
- 複雑なPDF表、画像PDFのOCRは未実装。手動確認・手入力で対応。
- 試着結果・購入サイズの保存、精度集計、写真採寸APIは将来拡張。
- 初期実装報告の作成時点ではGitHubへのpush・環境のPublishは未実施。その後、ユーザー承認を得てGitHubの`main`へ保存。環境のPublishは未実施。

## 追加：Windows起動ランチャー

- `Start-Kirinji.bat`をダブルクリックすると`scripts/start-app.mjs`を実行します。
- Node.js 24以降を確認し、初回・依存関係変更時のみ`npm ci --ignore-scripts`でインストール。
- ローカルサーバーの応答を確認してから既定ブラウザを開きます。
- 同じフォルダの起動済みアプリは再利用。別アプリがポートを使用していれば起動を停止して案内。
- 当初は`http://localhost:3000`を使用。その後、シフトアプリとの並行起動に対応するため専用ポート3100へ変更。
- Linux上で初回インストール、フォルダ外からの起動、起動済み再利用、ブラウザ表示、別アプリのポート競合を確認。Windowsのバッチ実機動作は未検証。
- V2初期実装はGitHubの`main`に保存済みです。

## 追加：シフトアプリとのポート競合修正

- `scripts/app-config.mjs`でキリンジ専用ポート3100を定義。ランチャーとVite手動起動の双方で共通設定を使用。
- ポート3000で別サーバーが稼働中でも、キリンジは3100で起動・応答することを確認。
- ポート変更に伴うブラウザ保存データのJSON移行方法をREADMEに記載。
