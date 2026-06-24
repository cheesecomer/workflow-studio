# Database Schema

## 概要

本ドキュメントは MVP 時点のデータベース設計を定義する。

本システムでは、申請書定義と実際の申請データを分離する。

公開済みの `document_definitions` は不変とする。
定義変更時は既存レコードを更新せず、新しい `document_definitions` を作成する。

---

# documents

申請書の論理的な親。

## columns

| column                         | type     |  null | note             |
| ------------------------------ | -------- | ----: | ---------------- |
| id                             | bigint   | false | PK               |
| name                           | string   | false | 申請書名         |
| current_document_definition_id | bigint   |  true | 現在公開中の定義 |
| created_at                     | datetime | false |                  |
| updated_at                     | datetime | false |                  |
| deleted_at                     | datetime |  true | 論理削除         |

---

# document_drafts

編集中の申請書定義。

MVP では JSON として保持する。

## columns

| column      | type     |  null | note         |
| ----------- | -------- | ----: | ------------ |
| id          | bigint   | false | PK           |
| document_id | bigint   | false | FK           |
| content     | json     | false | 編集中の定義 |
| created_at  | datetime | false |              |
| updated_at  | datetime | false |              |
| deleted_at  | datetime |  true | 論理削除     |

---

# document_definitions

公開済みの申請書定義。

公開後は更新しない。

## columns

| column          | type     |  null | note               |
| --------------- | -------- | ----: | ------------------ |
| id              | bigint   | false | PK                 |
| document_id     | bigint   | false | FK                 |
| version         | integer  | false | 版番号             |
| name            | string   | false | 公開時点の申請書名 |
| published_by_id | bigint   | false | FK users           |
| published_at    | datetime | false | 公開日時           |
| created_at      | datetime | false |                    |
| updated_at      | datetime | false |                    |
| deleted_at      | datetime |  true | 論理削除           |

## constraints

- `document_id, version` は一意

---

# field_definitions

申請書に含まれる入力項目の定義。

## columns

| column                 | type     |  null | note                               |
| ---------------------- | -------- | ----: | ---------------------------------- |
| id                     | bigint   | false | PK                                 |
| document_definition_id | bigint   | false | FK                                 |
| key                    | string   | false | 項目キー                           |
| label                  | string   | false | 表示名                             |
| field_type             | string   | false | text / number / date / select など |
| required               | boolean  | false | 必須                               |
| position               | integer  | false | 表示順                             |
| settings               | json     | false | 選択肢・制約など                   |
| created_at             | datetime | false |                                    |
| updated_at             | datetime | false |                                    |
| deleted_at             | datetime |  true | 論理削除                           |

## constraints

- `document_definition_id, key` は一意
- `document_definition_id, position` は一意

---

# approval_policies

承認ポリシー。

条件を満たした場合に適用される承認要件の集合。

## columns

| column                 | type     |  null | note         |
| ---------------------- | -------- | ----: | ------------ |
| id                     | bigint   | false | PK           |
| document_definition_id | bigint   | false | FK           |
| name                   | string   | false | ポリシー名   |
| condition              | json     |  true | 適用条件     |
| operator               | string   | false | all / any    |
| position               | integer  | false | 定義上の順序 |
| created_at             | datetime | false |              |
| updated_at             | datetime | false |              |
| deleted_at             | datetime |  true | 論理削除     |

## constraints

- `document_definition_id, position` は一意

---

# approval_requirements

承認要件。

誰の承認が必要かを表す。

## columns

| column             | type     |  null | note                                         |
| ------------------ | -------- | ----: | -------------------------------------------- |
| id                 | bigint   | false | PK                                           |
| approval_policy_id | bigint   | false | FK                                           |
| name               | string   | false | 要件名                                       |
| department_scope   | string   | false | same_tree / same_department / entire_company |
| position_operator  | string   | false | eq / gte / between                           |
| position_id        | bigint   | false | 基準役職                                     |
| upper_position_id  | bigint   |  true | between の上限役職                           |
| required_count     | integer  | false | 必要承認数                                   |
| created_at         | datetime | false |                                              |
| updated_at         | datetime | false |                                              |
| deleted_at         | datetime |  true | 論理削除                                     |

---

# users

システム利用者。

## columns

| column          | type     |  null | note               |
| --------------- | -------- | ----: | ------------------ |
| id              | bigint   | false | PK                 |
| name            | string   | false | 表示名             |
| email           | string   | false | メールアドレス     |
| password_digest | string   | false | パスワードハッシュ |
| created_at      | datetime | false |                    |
| updated_at      | datetime | false |                    |
| deleted_at      | datetime |  true | 論理削除           |

## constraints

- `email` は一意

---

# departments

部署。

階層構造を持つ。

## columns

| column     | type     |  null | note     |
| ---------- | -------- | ----: | -------- |
| id         | bigint   | false | PK       |
| parent_id  | bigint   |  true | 親部署   |
| name       | string   | false | 部署名   |
| created_at | datetime | false |          |
| updated_at | datetime | false |          |
| deleted_at | datetime |  true | 論理削除 |

---

# positions

役職。

承認要件の役職判定に利用する。

## columns

| column     | type     |  null | note                     |
| ---------- | -------- | ----: | ------------------------ |
| id         | bigint   | false | PK                       |
| name       | string   | false | 役職名                   |
| rank       | integer  | false | 役職順位。大きいほど上位 |
| created_at | datetime | false |                          |
| updated_at | datetime | false |                          |
| deleted_at | datetime |  true | 論理削除                 |

## constraints

- `rank` は一意

---

# department_memberships

ユーザーの所属部署と役職。

異動履歴を保持する。

## columns

| column        | type     |  null | note         |
| ------------- | -------- | ----: | ------------ |
| id            | bigint   | false | PK           |
| user_id       | bigint   | false | FK           |
| department_id | bigint   | false | FK           |
| position_id   | bigint   | false | FK           |
| joined_at     | datetime | false | 所属開始日時 |
| left_at       | datetime |  true | 所属終了日時 |
| created_at    | datetime | false |              |
| updated_at    | datetime | false |              |
| deleted_at    | datetime |  true | 論理削除     |

---

# submissions

実際に提出された申請。

## columns

| column                             | type     |  null | note                                                |
| ---------------------------------- | -------- | ----: | --------------------------------------------------- |
| id                                 | bigint   | false | PK                                                  |
| document_definition_id             | bigint   | false | FK                                                  |
| created_by_id                      | bigint   | false | FK users                                            |
| submitted_by_id                    | bigint   |  true | FK users                                            |
| applicant_department_id            | bigint   |  true | 申請時点の所属部署                                  |
| status                             | string   | false | draft / submitted / approved / rejected / withdrawn |
| current_applied_approval_policy_id | bigint   |  true | 現在承認中の AppliedApprovalPolicy                  |
| submitted_at                       | datetime |  true | 提出日時                                            |
| approved_at                        | datetime |  true | 承認完了日時                                        |
| rejected_at                        | datetime |  true | 却下日時                                            |
| withdrawn_at                       | datetime |  true | 取り下げ日時                                        |
| created_at                         | datetime | false |                                                     |
| updated_at                         | datetime | false |                                                     |

---

# submission_field_values

申請時に入力された値。

## columns

| column              | type     |  null | note   |
| ------------------- | -------- | ----: | ------ |
| id                  | bigint   | false | PK     |
| submission_id       | bigint   | false | FK     |
| field_definition_id | bigint   | false | FK     |
| value               | json     |  true | 入力値 |
| created_at          | datetime | false |        |
| updated_at          | datetime | false |        |

## constraints

- `submission_id, field_definition_id` は一意

---

# applied_approval_policies

申請時に適用された承認ポリシー。

## columns

| column             | type     |  null | note                          |
| ------------------ | -------- | ----: | ----------------------------- |
| id                 | bigint   | false | PK                            |
| submission_id      | bigint   | false | FK                            |
| approval_policy_id | bigint   | false | FK                            |
| position           | integer  | false | 実行順序                      |
| status             | string   | false | pending / approved / rejected |
| approved_at        | datetime |  true | 承認条件を満たした日時        |
| rejected_at        | datetime |  true | 却下された日時                |
| created_at         | datetime | false |                               |
| updated_at         | datetime | false |                               |
| deleted_at         | datetime |  true | 論理削除                      |

## constraints

- `submission_id, position` は一意
- `submission_id, approval_policy_id` は一意

---

# applied_approval_requirements

申請時に適用された承認要件。

`approval_requirements` は定義であり、`applied_approval_requirements` は実行時の承認要件である。

`required_count` の達成状況を管理する単位。

## columns

| column                     | type     |  null | note                          |
| -------------------------- | -------- | ----: | ----------------------------- |
| id                         | bigint   | false | PK                            |
| applied_approval_policy_id | bigint   | false | FK                            |
| approval_requirement_id    | bigint   | false | FK                            |
| status                     | string   | false | pending / approved / rejected |
| required_count             | integer  | false | 必要承認数                    |
| approved_count             | integer  | false | 承認済み数                    |
| approved_at                | datetime |  true | 要件達成日時                  |
| rejected_at                | datetime |  true | 却下日時                      |
| created_at                 | datetime | false |                               |
| updated_at                 | datetime | false |                               |
| deleted_at                 | datetime |  true | 論理削除                      |

## constraints

- `applied_approval_policy_id, approval_requirement_id` は一意

---

# approvers

申請に対する承認者。

ダッシュボードの「自分が承認すべき申請」はこのテーブルをもとに表示する。

## columns

| column                          | type     |  null | note                                    |
| ------------------------------- | -------- | ----: | --------------------------------------- |
| id                              | bigint   | false | PK                                      |
| applied_approval_requirement_id | bigint   | false | FK                                      |
| user_id                         | bigint   | false | FK                                      |
| status                          | string   | false | pending / approved / rejected / skipped |
| decided_at                      | datetime |  true | 承認または却下した日時                  |
| created_at                      | datetime | false |                                         |
| updated_at                      | datetime | false |                                         |
| deleted_at                      | datetime |  true | 論理削除                                |

## constraints

- `applied_approval_requirement_id, user_id` は一意

---

# approval_decisions

承認履歴。

`approvers.status` は現在状態、`approval_decisions` は監査ログとして扱う。

## columns

| column      | type     |  null | note                |
| ----------- | -------- | ----: | ------------------- |
| id          | bigint   | false | PK                  |
| approver_id | bigint   | false | FK                  |
| actor_id    | bigint   | false | FK users            |
| decision    | string   | false | approved / rejected |
| comment     | text     |  true | コメント            |
| decided_at  | datetime | false | 判断日時            |
| created_at  | datetime | false |                     |
| updated_at  | datetime | false |                     |
| deleted_at  | datetime |  true | 論理削除            |

---

# 主なインデックス

```text
documents.current_document_definition_id

document_drafts.document_id

document_definitions.document_id
document_definitions.published_by_id

field_definitions.document_definition_id

approval_policies.document_definition_id

approval_requirements.approval_policy_id
approval_requirements.position_id
approval_requirements.upper_position_id

users.email

departments.parent_id

positions.rank

department_memberships.user_id
department_memberships.department_id
department_memberships.position_id

submissions.document_definition_id
submissions.created_by_id
submissions.submitted_by_id
submissions.status
submissions.current_applied_approval_policy_id

submission_field_values.submission_id
submission_field_values.field_definition_id

applied_approval_policies.submission_id
applied_approval_policies.approval_policy_id
applied_approval_policies.status

applied_approval_requirements.applied_approval_policy_id
applied_approval_requirements.approval_requirement_id
applied_approval_requirements.status

approvers.applied_approval_requirement_id
approvers.user_id
approvers.status

approval_decisions.approver_id
approval_decisions.actor_id
```

---

# 承認状態の責務

## ApprovalPolicy

定義。

どの条件で、どの承認要件が必要かを表す。

## ApprovalRequirement

定義。

必要な承認者条件と必要承認数を表す。

## AppliedApprovalPolicy

実行時データ。

この申請で適用された承認ポリシーを表す。

## AppliedApprovalRequirement

実行時データ。

この申請で必要になった承認要件を表す。

`required_count` と `approved_count` を持ち、要件達成状況を管理する。

## Approver

実行時データ。

承認候補者ごとの現在状態を表す。

## ApprovalDecision

履歴。

誰が、いつ、承認または却下したかを記録する。

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
