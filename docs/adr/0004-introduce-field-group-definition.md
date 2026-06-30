# ADR-0004: Introduce Field Group Definitions

## Status

Accepted

## Date

2026-06-30

---

# Context

申請書には、単一の入力項目だけでなく、同じ入力項目の組を複数回入力したいケースが存在する。

例:

- 交通費精算
- 購入品明細
- 出張日程
- 接待参加者

交通費精算では、1つの申請に対して以下のような複数行の入力が必要になる。

```text
交通費明細

1行目
- 日付
- 交通手段
- 区間
- 金額

2行目
- 日付
- 交通手段
- 区間
- 金額
```

従来のモデルでは、DocumentDefinition が FieldDefinition を直接保持していた。

```text
DocumentDefinition
└ FieldDefinition
```

この構造では、複数行の入力を自然に表現できない。

また、実際の申請データも、

```text
Submission
└ SubmissionFieldValue
```

という構造であり、どの入力値が同じ明細行に属するのかを表現できない。

---

# Decision

入力項目をグループ化するため、FieldGroupDefinition を導入する。

定義側の構造を以下とする。

```text
DocumentDefinition
└ FieldGroupDefinition
   └ FieldDefinition
```

FieldDefinition は必ず FieldGroupDefinition に属する。

実際の申請データは以下の構造とする。

```text
Submission
└ SubmissionFieldGroupRow
   └ SubmissionFieldValue
```

SubmissionFieldValue は必ず SubmissionFieldGroupRow に属する。

FieldGroupDefinition は `repeatable` 属性を持つ。

- `repeatable = false`

  - 通常の入力グループ

- `repeatable = true`

  - 明細行を複数入力できるグループ

`repeatable = false` の場合でも、
SubmissionFieldGroupRow を1件作成する。

これにより、定義側と実データ側の構造を対称にする。

MVP では、FieldGroupDefinition の入れ子構造は扱わない。

---

# Consequences

## Advantages

### 明細入力を自然に表現できる

交通費精算や購入品明細など、複数行入力を必要とする申請書を表現できる。

### 定義と実データの構造が対称になる

```text
DocumentDefinition
└ FieldGroupDefinition
   └ FieldDefinition

Submission
└ SubmissionFieldGroupRow
   └ SubmissionFieldValue
```

構造が対応するため、実装や理解が容易になる。

### UI 実装を統一できる

すべての入力項目をグループ単位で扱える。

通常の入力項目と明細入力を同じ仕組みで実装できる。

### 将来の拡張に対応しやすい

以下の機能を追加しやすくなる。

- 明細行の並び替え
- グループ単位の表示制御
- グループ単位の権限制御
- 集計機能

---

## Disadvantages

### テーブル数が増える

以下のテーブルが追加される。

```text
field_group_definitions
submission_field_group_rows
```

### 単純なフォームでも行データが生成される

`repeatable = false` の場合でも、
SubmissionFieldGroupRow を1件作成する必要がある。

ただし、構造の統一を優先し、このコストは許容する。

---

# Alternatives Considered

## FieldDefinition のみで表現する

### 内容

DocumentDefinition が FieldDefinition を直接保持する。

```text
DocumentDefinition
└ FieldDefinition
```

### 不採用理由

複数行入力を自然に表現できない。

交通費精算などの申請書への対応が困難になる。

---

## repeatable な FieldDefinition を導入する

### 内容

FieldDefinition 自体に `repeatable` 属性を持たせる。

### 不採用理由

複数の FieldDefinition を1つの明細行としてまとめる概念が存在しない。

実データ側でも、どの値が同じ行に属するのかを表現できない。

---

## repeatable なグループのみ SubmissionFieldGroupRow を作成する

### 内容

通常の入力項目は SubmissionFieldValue を直接 Submission に紐付ける。

### 不採用理由

通常入力と明細入力でデータ構造が異なる。

実装が複雑になり、UI やバリデーションの共通化が困難になる。

構造を統一するため、すべての入力値を SubmissionFieldGroupRow 配下で管理する。

---

# Related Documents

- ADR-0002: Store Document Editable Content as JSON
- domain-model.md
- request-lifecycle.md
- schema.md
- er-diagram.md
