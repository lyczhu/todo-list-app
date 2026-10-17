# Phase 1 Data Model: 待办事项管理

**Date**: 2026-10-10 | **Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

## 实体

### Todo（待办事项）

用户记录的一件待完成的事。单用户场景，无归属关系，无与其他实体的关联。

| 字段 | 类型 | 必填 | 约束与说明 |
|------|------|------|------------|
| `id` | Long（自增主键） | 系统生成 | 唯一标识；对外经 API 暴露 |
| `title` | String | ✅ | 去除首尾空白后非空；长度 ≤200（FR-002、假设） |
| `description` | String | ❌ | 长度 ≤2000；默认空串 |
| `dueDate` | LocalDate? | ❌ | 可选；允许早于今天（创建即逾期，按逾期规则展示）；无日期事项排序垫底 |
| `completed` | boolean | ✅ | 完成状态；默认 `false`；驱动分类查看与「全部」分区（FR-004/FR-005） |
| `createdAt` | Instant | ✅ | 系统生成，创建时写入；同截止日期事项的稳定次序键（FR-006） |

**派生属性（不落库）**

| 字段 | 类型 | 规则 |
|------|------|------|
| `overdue` | boolean | `dueDate != null && !completed && dueDate < today`（服务端日期，research R3）（FR-010） |

## 状态转换（生命周期）

```text
        创建 POST              标记完成 PATCH(completed=true)
  (不存在) ────▶ ACTIVE ───────────────────────────────▶ COMPLETED
                 │                                            │
     DELETE ◀────┴────────────────────────────────────────────┘
   (任何状态可直接删除，删除后持久移除，不可在本特性内恢复)
```

- ACTIVE → COMPLETED：单向（本特性不含"重开"与"编辑"，见 spec 假设与 Clarifications）。
- 删除：ACTIVE 与 COMPLETED 均可删除；幂等语义见 quickstart 契约说明。

## 排序规则（服务端实现，FR-006）

对任一集合（整表或分类/区块内）：

1. `dueDate` 非空者按日期升序在前；
2. `dueDate` 为空者整体垫底；
3. 同 `dueDate`（或同为空）按 `createdAt` 升序稳定排序。

「全部」视图在应用上述规则前先按 `completed` 分区：未完成区块在上、已完成区块在下（FR-005）。

## 校验规则汇总

| 规则 | 触发点 | 违反结果 |
|------|--------|----------|
| 标题去空白后非空 | POST 创建 | 400 + `{code:"TITLE_REQUIRED"}`（FR-002） |
| 标题 ≤200 / 描述 ≤2000 | POST 创建 | 400 + 对应校验错误（假设） |
| `dueDate` 为 ISO 日期（`YYYY-MM-DD`） | POST 创建 | 400 反序列化错误 |

## 持久化映射

- 表 `todos`：以上列一一对应；`due_date` 可空；SQLite 存储（xerial 驱动 +
  SQLiteDialect，research R2）。日期以 `YYYY-MM-DD` TEXT 存储（方言默认），`created_at`
  为 ISO-8601 TEXT。
- 无软删除、无历史表（YAGNI，spec 数据保留假设：长期保留直至用户删除）。

## 视图瞬时状态（前端，不持久化）

导航改造（FR-013/014/015，Clarifications 2026-10-17）引入两个纯前端 ephemeral 状态，
不入后端、不入库：

| 状态 | 载体 | 规则 |
|------|------|------|
| `currentCategory` | Pinia store（`active`/`completed`/`all`，默认 `active`） | 首页分类切换；从新增页保存返回首页时 MUST 重置为 `active`（FR-014），确保新事项可见 |
| 新增表单草稿 | `TodoCreateView` 组件本地状态（title/description/dueDate） | 仅存于组件实例；离开（放弃或保存）即丢弃，不跨页面/刷新保留（FR-015）；非空即视为"有未保存输入"，触发返回确认 |
