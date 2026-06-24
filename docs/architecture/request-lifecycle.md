# Request Lifecycle

## 概要

本ドキュメントは、申請書定義の作成から申請完了までのライフサイクルを定義する。

公開済みの `DocumentDefinition` は不変とし、申請は作成時点の定義を参照する。

---

# 1. 申請書定義の作成

ユーザーは新しい申請書を作成する。

例:

- 経費精算書
- 出張申請書
- 備品購入申請書
- 稟議書

作成時に以下を生成する。

```text
Document
DocumentDraft
```

---

# 2. 申請書定義の編集

ユーザーは DocumentDraft を編集する。

編集可能な内容:

- 項目追加
- 項目削除
- 項目順変更
- 承認ポリシー追加
- 承認要件追加

MVP では DocumentDraft は JSON として保持する。

---

# 3. 申請書定義の公開

ユーザーは DocumentDraft を公開する。

公開時に Draft の内容を検証し、
公開済み定義を生成する。

```text
DocumentDraft
 ↓
DocumentDefinition
```

生成されるデータ:

```text
DocumentDefinition
FieldDefinition
ApprovalPolicy
ApprovalRequirement
```

公開済みの DocumentDefinition は更新しない。

定義変更が必要な場合は、

```text
DocumentDraft を編集
 ↓
新しい DocumentDefinition を生成
```

する。

## 例

```text
Document
 ├ Definition v1
 ├ Definition v2
 └ Definition v3
```

---

# 4. 申請作成

ユーザーは公開済みの DocumentDefinition を選択し、
申請を作成する。

作成時に以下を生成する。

```text
Submission(status = draft)
```

入力内容は SubmissionFieldValue として保持する。

生成されるデータ:

```text
Submission
SubmissionFieldValue
```

---

# 5. 申請提出

ユーザーは申請を提出する。

```text
Submission.status

draft
 ↓
submitted
```

提出時に承認ルートを確定する。

---

## 5-1. ApprovalPolicy の評価

DocumentDefinition に定義された ApprovalPolicy を評価する。

例:

```text
Policy A
条件なし

Policy B
申請額 >= 300,000

Policy C
申請額 >= 1,000,000
```

申請額 350,000 円の場合

```text
Policy A
Policy B
```

が適用される。

```text
Policy C
```

は適用されない。

---

## 5-2. AppliedApprovalPolicy の生成

適用された ApprovalPolicy を
AppliedApprovalPolicy として生成する。

初期状態:

```text
pending
```

### position の採番

AppliedApprovalPolicy.position は
適用されたポリシーのみを対象とした実行順序を表す。

例:

定義

```text
Policy 1
Policy 2
Policy 3
```

適用結果

```text
Policy 1 → position = 1
Policy 3 → position = 2
```

ApprovalPolicy.position のコピーではない。

---

## 5-3. AppliedApprovalRequirement の生成

AppliedApprovalPolicy に含まれる ApprovalRequirement をもとに、
AppliedApprovalRequirement を生成する。

AppliedApprovalRequirement は、
この申請で必要になった承認要件の達成状況を管理する。

例:

```text
ApprovalRequirement

同一部門の係長以上 3名
```

生成結果:

```text
AppliedApprovalRequirement
required_count = 3
approved_count = 0
status = pending
```

---

## 5-4. 承認者の解決

ApprovalRequirement をもとに、
承認可能な User を解決する。

ApprovalRequirement の評価および承認者解決は、
申請時点で有効な DepartmentMembership を対象に行う。

未来の所属情報は利用しない。

DepartmentMembership は未来の所属予定を保持できるが、
承認者解決には申請時点で有効な所属だけを利用する。

ある時点で有効な所属は以下の条件で判定する。

```text
joined_at <= target_time
AND
(left_at IS NULL OR left_at > target_time)
```

ApprovalRequirement は以下の条件を持つ。

### 部門範囲

```text
same_tree
same_department
entire_company
```

### 役職条件

```text
=
以上
以上以下
```

### 必要承認数

```text
required_count
```

例:

```text
同一部門の係長以上 3名
```

```text
department_scope = same_department
position_operator = gte
position = chief
required_count = 3
```

---

## 5-5. Approver の生成

解決した User ごとに Approver を生成する。

例:

```text
ApprovalRequirement

同一部門の係長以上 3名
```

解決結果:

```text
田中
鈴木
佐藤
高橋
```

生成結果:

```text
Approver(田中)
Approver(鈴木)
Approver(佐藤)
Approver(高橋)
```

初期状態:

```text
pending
```

---

## 5-6. 現在承認中ポリシーの設定

最初の AppliedApprovalPolicy を

```text
Submission.current_applied_approval_policy_id
```

へ設定する。

---

# 6. 承認

承認者は申請を承認または却下する。

---

## 6-1. 承認

承認者が承認を実行する。

```text
Approver.status

pending
 ↓
approved
```

承認履歴を記録する。

```text
ApprovalDecision
```

を生成する。

AppliedApprovalRequirement の approved_count を更新する。

---

## 6-2. 却下

承認者が却下を実行する。

```text
Approver.status

pending
 ↓
rejected
```

承認履歴を記録する。

```text
ApprovalDecision
```

を生成する。

MVP では、いずれかの承認者が却下した時点で
申請全体を却下する。

---

## 6-3. AppliedApprovalRequirement の状態更新

Approver の状態変化に応じて
AppliedApprovalRequirement を更新する。

required_count を満たした場合:

```text
pending
 ↓
approved
```

却下された場合:

```text
pending
 ↓
rejected
```

---

## 6-4. AppliedApprovalPolicy の状態更新

AppliedApprovalRequirement の状態変化に応じて
AppliedApprovalPolicy を更新する。

### all

すべての AppliedApprovalRequirement が approved になった場合:

```text
pending
 ↓
approved
```

### any

いずれかの AppliedApprovalRequirement が approved になった場合:

```text
pending
 ↓
approved
```

### rejected

いずれかの Approver が却下した場合:

```text
pending
 ↓
rejected
```

ApprovalPolicy.operator は承認成立条件を表す。

却下判定には利用しない。

---

## 6-5. 次の承認ポリシーへ進む

現在の AppliedApprovalPolicy が approved になった場合

```text
Submission.current_applied_approval_policy_id
```

を次の AppliedApprovalPolicy へ更新する。

例:

```text
Policy 1
 ↓
Policy 2
 ↓
Policy 3
```

---

# 7. 承認完了

最後の AppliedApprovalPolicy が approved になった場合

```text
Submission.status

submitted
 ↓
approved
```

とする。

```text
Submission.current_applied_approval_policy_id = null
```

とする。

---

# 8. 却下

いずれかの AppliedApprovalPolicy が rejected になった場合

```text
Submission.status

submitted
 ↓
rejected
```

とする。

```text
Submission.current_applied_approval_policy_id = null
```

とする。

---

# 9. 申請取り下げ

申請者は承認中の申請を取り下げできる。

```text
Submission.status

submitted
 ↓
withdrawn
```

とする。

```text
Submission.current_applied_approval_policy_id = null
```

とする。

未処理の Approver は

```text
skipped
```

とする。

---

# 状態遷移

## Submission

```text
draft
 ↓
submitted
 ├→ approved
 ├→ rejected
 └→ withdrawn
```

## AppliedApprovalPolicy

```text
pending
 ├→ approved
 └→ rejected
```

## AppliedApprovalRequirement

```text
pending
 ├→ approved
 └→ rejected
```

## Approver

```text
pending
 ├→ approved
 ├→ rejected
 └→ skipped
```
