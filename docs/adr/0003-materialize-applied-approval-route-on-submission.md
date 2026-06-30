# ADR-0003: Materialize Applied Approval Route on Submission

## Status

Accepted

## Date

2026-06-24

---

# Context

承認フローは以下の情報から決定される。

- DocumentDefinition
- ApprovalPolicy
- ApprovalRequirement
- Department
- DepartmentMembership
- Position
- Submission の入力値

例えば、

```text
申請額 >= 300,000
```

の場合のみ

```text
部門長承認
```

が必要になる。

また、

```text
同一部門の係長以上 3名
```

のような承認要件も存在する。

承認者は申請時点の組織情報から解決される。

---

# Problem

承認ルートを毎回動的に計算する場合、
組織変更や人事異動の影響を受ける。

例:

```text
2026-06-01

申請作成

第一営業部
↓
係長以上 3名
↓
田中
鈴木
佐藤
```

承認待ち中に

```text
2026-07-01

佐藤
↓
開発部へ異動
```

した場合、

承認者一覧が変化してしまう。

また、

```text
ApprovalPolicy
ApprovalRequirement
```

が変更された場合も
承認ルートが変化する可能性がある。

これでは、

```text
申請時点で誰の承認が必要だったか
```

を保証できない。

---

# Decision

申請提出時に承認ルートを実体化する。

以下の実行時データを生成する。

```text
AppliedApprovalPolicy
AppliedApprovalRequirement
Approver
```

承認処理は実行時データのみを参照する。

提出後は、

```text
ApprovalPolicy
ApprovalRequirement
DepartmentMembership
```

の変更によって
承認ルートは変化しない。

---

# Generated Data

## AppliedApprovalPolicy

申請時に適用された ApprovalPolicy。

例:

```text
Policy A
Policy B
```

のみ適用された場合

```text
AppliedApprovalPolicy
 ├ Policy A
 └ Policy B
```

を生成する。

---

## AppliedApprovalRequirement

申請時に適用された ApprovalRequirement。

例:

```text
係長以上 3名
```

から

```text
AppliedApprovalRequirement
required_count = 3
approved_count = 0
```

を生成する。

---

## Approver

申請時点で条件を満たした承認者。

例:

```text
田中
鈴木
佐藤
高橋
```

を解決した場合

```text
Approver
 ├ 田中
 ├ 鈴木
 ├ 佐藤
 └ 高橋
```

を生成する。

---

# Consequences

## Advantages

### 承認ルートが固定される

申請後に組織変更が発生しても
承認ルートは変化しない。

### 承認時の計算量が少ない

承認時は実行時データのみを参照する。

毎回承認者を再計算する必要がない。

### ダッシュボードの実装が容易

承認待ち一覧は

```text
Approver
```

を検索するだけで取得できる。

例:

```sql
SELECT *
FROM approvers
WHERE user_id = ?
  AND status = 'pending'
```

### 監査しやすい

申請時点で
誰の承認が必要だったかを保持できる。

---

## Disadvantages

### データ量が増える

申請ごとに

```text
AppliedApprovalPolicy
AppliedApprovalRequirement
Approver
```

が生成される。

ただし、
承認処理の安定性と監査性を優先する。

### 人事異動が反映されない

申請後に異動しても
承認者は変更されない。

MVP では承認者再割当は扱わない。

---

# Alternatives Considered

## 承認時に毎回計算する

### 内容

ApprovalPolicy と ApprovalRequirement を
毎回評価する。

承認者も動的に解決する。

### 不採用理由

組織変更によって承認ルートが変化する。

申請時点の状態を保証できない。

ダッシュボード取得コストも高い。

---

## AppliedApprovalPolicy のみ生成する

### 内容

ApprovalPolicy のみ実体化し、

承認者は毎回動的に解決する。

### 不採用理由

組織変更の影響を受ける。

Approver 一覧取得が複雑になる。

---

## Approver のみ生成する

### 内容

承認者だけを保存し、
ApprovalPolicy や ApprovalRequirement の実行時データを持たない。

### 不採用理由

承認条件の達成状況を管理しづらい。

例えば、

```text
係長以上 3名
```

のような要件の進捗管理が困難になる。

---

# Related Documents

- ADR-0001: Use Immutable Document Definitions
- ADR-0002: Store Document Editable Content as JSON
- domain-model.md
- request-lifecycle.md
- schema.md
- er-diagram.md
