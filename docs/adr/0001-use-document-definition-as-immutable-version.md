# ADR-0001: Use Immutable Document Definitions

## Status

Accepted

## Date

2026-06-24

---

# Context

本システムでは申請書を定義し、その定義を利用して申請を作成する。

申請書は運用中に変更される可能性がある。

例:

- 項目追加
- 項目削除
- 承認フロー変更
- 承認条件変更

しかし、過去に提出された申請は申請時点の定義を保持する必要がある。

例えば、

```text
2026-01-01
経費申請書 v1

承認者:
- 部長
```

で申請されたデータが存在する状態で、

```text
2026-02-01
経費申請書

承認者:
- 部長
- 本部長
```

へ変更された場合、

過去の申請に新しい承認フローが適用されてはならない。

また、承認履歴や監査ログから申請時点の定義を再現できる必要がある。

---

# Decision

公開済みの申請書定義は不変とする。

公開後の DocumentDefinition は更新しない。

定義変更が必要な場合は新しい DocumentDefinition を作成する。

```text
Document
 ├ DocumentDefinition v1
 ├ DocumentDefinition v2
 └ DocumentDefinition v3
```

申請は作成時点の DocumentDefinition を参照する。

```text
Submission
 └ document_definition_id
```

Document は論理的な親エンティティとして扱う。

現在利用中の定義は

```text
documents.current_document_definition_id
```

で管理する。

---

# Consequences

## Advantages

### 申請時点の定義を保証できる

過去の申請が後から変更されない。

監査や履歴確認時に申請時点の状態を再現できる。

### 承認フローの変更が安全

新しい定義を公開しても既存申請へ影響しない。

### 履歴が自然に残る

申請書の変更履歴を DocumentDefinition の版として保持できる。

### 実装が単純

公開済み定義の更新を考慮する必要がない。

---

## Disadvantages

### データ量が増える

定義変更のたびに新しい DocumentDefinition が作成される。

ただし、定義データは申請データと比較して小さいため許容する。

### 同じ定義が重複する

小さな変更でも新しい版が作成される。

ただし、履歴の完全性を優先する。

---

# Alternatives Considered

## 公開済み定義を更新する

### 内容

DocumentDefinition を更新し続ける。

### 不採用理由

過去申請の定義が失われる。

申請時点の状態を再現できなくなる。

監査要件と相性が悪い。

---

## 有効期間を持たせる

### 内容

DocumentDefinition を更新しつつ、

```text
valid_from
valid_to
```

を持たせる。

### 不採用理由

どの版が有効だったかを毎回時刻で判定する必要がある。

実装が複雑になる。

申請時点の定義を直接参照する方が単純である。

---

# Related Documents

- domain-model.md
- request-lifecycle.md
- schema.md
- er-diagram.md
