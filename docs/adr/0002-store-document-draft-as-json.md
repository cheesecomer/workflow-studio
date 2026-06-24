# ADR-0002: Store Document Draft as JSON

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

また、

```text
項目A
項目B
項目C
```

を

```text
項目C
項目A
項目B
```

へ並び替えるような操作も発生する。

---

# Decision

DocumentDraft は JSON として保持する。

```text
DocumentDraft
 └ content(json)
```

編集画面では JSON を更新する。

公開時に JSON を検証し、
公開済み定義へ変換する。

```text
DocumentDraft(JSON)

↓

DocumentDefinition
FieldDefinition
ApprovalPolicy
ApprovalRequirement
```

公開済みデータは正規化されたテーブルとして保持する。

編集中データのみ JSON を利用する。

---

# Consequences

## Advantages

### 実装が単純

編集途中の不完全なデータをそのまま保存できる。

### UI と相性が良い

画面上の状態をそのまま保存できる。

### 並び替えが容易

項目や承認ポリシーの順序変更を簡単に扱える。

### スキーマ変更に強い

Draft 用テーブルのマイグレーションを頻繁に行う必要がない。

---

## Disadvantages

### JSON の整合性が保証されない

Draft 保存時点では不正な状態が存在する。

そのため公開時に検証が必要となる。

### 検索に向かない

JSON 内部の検索や集計は困難である。

ただし Draft は編集作業領域であり、
検索要件はないため許容する。

### 型安全性が低い

正規化テーブルと比較すると構造保証が弱い。

ただし Draft は一時データとして扱う。

---

# Alternatives Considered

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
