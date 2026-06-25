# ADR-0002: Store Document Editable Content as JSON

## Status

Accepted

## Date

2026-06-24

---

# Context

申請書定義は編集途中の状態を保持する必要がある。

編集中の申請書には以下のような変更が発生する。

- 項目追加
- 項目削除
- 項目順変更
- 項目設定変更
- 承認ポリシー追加
- 承認要件追加
- 承認順序変更

編集途中では定義が完成していない場合がある。

例:

```text
項目を追加した

↓
まだ名前を入力していない

↓
保存したい
```

また、項目や承認ポリシーの並び替えも発生する。

---

# Decision

Document は編集中の申請書定義を JSON として保持する。

```text
Document
 └ draft_content(json)
```

編集画面では `draft_content` を更新する。

公開時に `draft_content` を検証し、
公開済み定義へ変換する。

```text
Document.draft_content

↓

DocumentDefinition
FieldDefinition
ApprovalPolicy
ApprovalRequirement
```

同時に、最後に公開した内容を `published_content` として保持する。

```text
Document.published_content = Document.draft_content
```

`published_content` は、公開済み内容との差分確認や編集内容の破棄に利用する。

編集内容を破棄する場合は、

```text
Document.draft_content = Document.published_content
```

とする。

公開済みデータは正規化されたテーブルとして保持する。

編集中データと最後に公開した内容は JSON として保持する。

---

# Consequences

## Advantages

### 実装が単純

編集途中の不完全なデータをそのまま保存できる。

### UI と相性が良い

画面上の状態をそのまま保存できる。

### 並び替えが容易

項目や承認ポリシーの順序変更を簡単に扱える。

### 編集内容の破棄が容易

`published_content` を `draft_content` に戻すだけで、
最後に公開した状態へ戻せる。

### 公開済み内容の再構築が不要

公開後の編集開始時に、正規化済みテーブルから編集用 JSON を組み立て直す必要がない。

---

## Disadvantages

### JSON の整合性が保証されない

Draft 保存時点では不正な状態が存在する。

そのため公開時に検証が必要となる。

### 検索に向かない

JSON 内部の検索や集計は困難である。

ただし、編集用データは検索対象ではないため許容する。

### 型安全性が低い

正規化テーブルと比較すると構造保証が弱い。

ただし、公開済みデータは正規化テーブルとして保持する。

### データが重複する

公開済み定義は、`published_content` と正規化済みテーブルの両方に保持される。

ただし、`published_content` は編集画面用の復元・差分確認・編集破棄を単純にするためのコピーとして許容する。

---

# Alternatives Considered

## Draft 用テーブルを分ける

### 内容

Document とは別に DocumentDraft テーブルを作成する。

```text
DocumentDraft
 └ content(json)
```

### 不採用理由

Document と Draft が常に 1:1 であり、
公開後も Draft を保持するため、別テーブルにする利点が小さい。

Document に編集用 JSON を持たせる方が単純である。

---

## Draft も正規化テーブルで管理する

### 内容

Draft 用に以下のテーブルを作成する。

```text
draft_field_definitions
draft_approval_policies
draft_approval_requirements
```

公開時に本テーブルへコピーする。

### 不採用理由

テーブル数が増える。

編集途中の不完全な状態を扱いづらい。

UI の状態と DB 構造が乖離する。

---

## 公開済み定義を直接編集する

### 内容

DocumentDefinition を直接更新する。

### 不採用理由

公開済み定義を変更できてしまう。

ADR-0001 の方針と矛盾する。

過去申請の再現性が失われる。

---

## JSON をそのまま公開データとして利用する

### 内容

公開後も JSON のみで管理する。

### 不採用理由

検索性が低い。

参照整合性を保証できない。

承認フローや項目定義との関連管理が困難になる。

公開済みデータは正規化テーブルとして保持する方が適している。

---

# Related Documents

- ADR-0001: Use Immutable Document Definitions
- domain-model.md
- request-lifecycle.md
- schema.md
