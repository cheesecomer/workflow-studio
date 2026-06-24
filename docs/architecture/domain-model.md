# Domain Model

## 概要

本システムは、申請書の作成・公開・申請・承認を行うワークフローシステムである。

申請書は編集用の Draft と、公開済みの Definition に分けて管理する。

公開済みの `DocumentDefinition` は不変とする。
定義を変更する場合は既存の `DocumentDefinition` を更新せず、新しい `DocumentDefinition` を作成する。

---

# Document

申請書の論理的な親エンティティ。

例:

- 経費精算書
- 出張申請書
- 備品購入申請書
- 稟議書

Document 自体は申請書の識別子として存在する。

## 関連

- DocumentDraft
- DocumentDefinition

---

# DocumentDraft

編集中の申請書定義。

ユーザーが編集する作業領域。

MVP では JSON として保持する。

公開時に DocumentDefinition を生成する。

## 関連

- Document

---

# DocumentDefinition

公開済みの申請書定義。

申請時に参照される不変の定義。

公開後は更新しない。
変更が必要な場合は新しい DocumentDefinition を作成する。

## 主な属性

- version
- published_at

## 関連

- Document
- FieldDefinition
- ApprovalPolicy
- Submission

---

# FieldDefinition

申請書に含まれる入力項目の定義。

例:

- 件名
- 金額
- 申請理由
- 出張先

## 関連

- DocumentDefinition
- SubmissionFieldValue

---

# ApprovalPolicy

承認ポリシー。

条件を満たした場合に適用される承認要件の集合。

## 主な属性

- condition
- operator
- position

### operator

#### all

すべての ApprovalRequirement を満たす必要がある。

#### any

いずれかの ApprovalRequirement を満たせばよい。

## 例

条件なし

- 直属上長の承認
- 所属部署の係長以上3名の承認

条件: 申請額 >= 300,000

- 部門長の承認
- 社長の承認

## 関連

- DocumentDefinition
- ApprovalRequirement
- AppliedApprovalPolicy

---

# ApprovalRequirement

承認要件。

誰の承認が必要か、またはどの条件を満たす承認者が必要かを定義する。

例:

- 直属上長
- 所属部署の係長以上
- 部門長
- 社長

ApprovalRequirement は承認者そのものではなく承認者の要件を表す。

## 主な属性

- department_scope
- position_operator
- position
- upper_position
- required_count

### department_scope

承認者を探す部門範囲。

- same_tree
  - 同一ツリー
  - 例: 第一営業部配下

- same_department
  - 同一部門
  - 例: 営業本部配下の第一営業部・第二営業部

- entire_company
  - 全体

### position_operator

役職条件。

- eq
  - 指定役職と一致

- gte
  - 指定役職以上

- between
  - 指定役職以上、上限役職以下

### required_count

この要件を満たすために必要な承認数。

MVP では入れ子構造の承認要件は扱わない。

## 関連

- ApprovalPolicy
- AppliedApprovalRequirement

---

# User

システム利用者。

申請者または承認者になる。

email をログインIDとして利用する。

## 関連

- DepartmentMembership
- Submission
- Approver
- ApprovalDecision

---

# Department

部署。

承認者解決や申請者の所属情報に利用する。

Department は階層構造を持つ。

## 関連

- DepartmentMembership
- Submission

---

# DepartmentMembership

ユーザーの所属部署と役職を表す。

例:

- 営業部 / 係長
- 開発部 / 部長
- 管理部 / 一般社員

DepartmentMembership は過去・現在・未来の所属を保持できる。

例:

- 現在所属
- 異動履歴
- 予約済みの異動

ある時点の所属は以下の条件で判定する。

```text
joined_at <= target_time
AND
(left_at IS NULL OR left_at > target_time)
```

承認者解決では、申請時点で有効な DepartmentMembership を利用する。

未来の所属情報は承認者解決には利用しない。

## 関連

- User
- Department
- Position

---

# Position

役職。

承認要件の役職判定に利用する。

役職は rank を持つ。
rank が大きいほど上位の役職とする。

## 関連

- DepartmentMembership
- ApprovalRequirement

---

# Submission

実際に提出された申請。

Submission は作成時点の DocumentDefinition を参照する。

## 主な属性

- submitted_by_id
- submitted_at
- applicant_department_id
- current_applied_approval_policy_id

## 主な状態

- draft
- submitted
- approved
- rejected
- withdrawn

### current_applied_approval_policy_id

現在承認中の AppliedApprovalPolicy を指す。

承認処理の進行状況管理や画面表示に利用する。

申請が approved / rejected / withdrawn になった場合は null にする。

## 関連

- DocumentDefinition
- SubmissionFieldValue
- AppliedApprovalPolicy

---

# SubmissionFieldValue

申請時に入力された値。

FieldDefinition に対応する実データ。

## 関連

- Submission
- FieldDefinition

---

# AppliedApprovalPolicy

申請時に適用された ApprovalPolicy。

Submission 作成時に ApprovalPolicy を評価し、
条件を満たしたものだけを生成する。

## 主な属性

- position

### position

実行順序を表す。

ApprovalPolicy.position のコピーではない。

適用された ApprovalPolicy のみを対象とした連番である。

例:

定義

- Policy 1
- Policy 2
- Policy 3

適用結果

- Policy 1 → position = 1
- Policy 3 → position = 2

## 主な状態

- pending
- approved
- rejected

status はこのポリシーが承認条件を満たしたかを表す。

## 関連

- Submission
- ApprovalPolicy
- AppliedApprovalRequirement

---

# AppliedApprovalRequirement

申請時に適用された ApprovalRequirement。

ApprovalRequirement は定義であり、AppliedApprovalRequirement は実行時の達成状況を表す。

例:

ApprovalRequirement:

- 同一部門の係長以上 3名

AppliedApprovalRequirement:

- required_count = 3
- approved_count = 2
- status = pending

## 主な属性

- required_count
- approved_count

required_count は申請時点の ApprovalRequirement.required_count を保持する。

approved_count は承認済みの Approver 数を保持する。

## 主な状態

- pending
- approved
- rejected

## 関連

- AppliedApprovalPolicy
- ApprovalRequirement
- Approver

---

# Approver

申請に対する承認者。

ApprovalRequirement をもとに、
申請時点で条件を満たす User を解決して作成する。

ダッシュボードの
「自分が承認すべき申請」
は Approver をもとに表示する。

## 主な状態

- pending
- approved
- rejected
- skipped

## 関連

- AppliedApprovalRequirement
- User
- ApprovalDecision

---

# ApprovalDecision

承認履歴。

誰が、いつ、どのような判断を行ったかを記録する。

Approver.status は現在状態を表し、
ApprovalDecision は監査ログとして扱う。

## 主な属性

- decision
- comment
- decided_at

### decision

- approved
- rejected

## 関連

- Approver
- User

---

# モデル関係

```text
Document
├─ DocumentDraft
└─ DocumentDefinition
   ├─ FieldDefinition
   └─ ApprovalPolicy
      └─ ApprovalRequirement

User
└─ DepartmentMembership
   ├─ Department
   └─ Position

Submission
├─ SubmissionFieldValue
└─ AppliedApprovalPolicy
   └─ AppliedApprovalRequirement
      └─ Approver
         └─ ApprovalDecision
```

---

# 申請時の流れ

1. DocumentDefinition を選択する
2. 入力内容を SubmissionFieldValue として保存する
3. ApprovalPolicy の条件を評価する
4. 条件を満たした ApprovalPolicy を AppliedApprovalPolicy として作成する
5. AppliedApprovalPolicy.position を採番する
6. ApprovalRequirement を AppliedApprovalRequirement として作成する
7. ApprovalRequirement をもとに承認可能な User を解決する
8. User ごとに Approver を作成する
9. 最初の AppliedApprovalPolicy を current_applied_approval_policy_id に設定する

---

# MVP では扱わないもの

- 入れ子構造の承認要件
- 承認者の再割当
- 代理承認
- 添付ファイル
- 通知
- コメントスレッド
- 差し戻し
- 承認順序制御
- 部署異動・退職時の自動再解決
