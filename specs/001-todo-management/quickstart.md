# Quickstart: 待办事项管理（001-todo-management）

**Date**: 2026-10-10 | 契约：[contracts/todo-api.yaml](./contracts/todo-api.yaml) | 数据模型：[data-model.md](./data-model.md)

端到端验证本特性的运行与测试指南。实体与接口细节以契约和数据模型为准，此处不重复。

## 前置要求（使用本地已有版本）

- JDK 25（本机实测 25.0.2）
- Maven 3.9.x（本机实测 3.9.11）
- Spring Boot **3.5.16**（backend/pom.xml 父 POM 固定版本）
- Node.js + npm（本机实测 Node 26.5.0 / npm 10.8.3）
- 无需外部数据库服务（SQLite 单文件，首次启动自动创建于 `backend/data/todo.db`）

## 1. 单元测试（宪法原则 I 门禁）

```bash
# 后端：JUnit 5（Service 单测 + WebMvcTest 切片 + DataJpaTest）
cd backend && mvn test

# 前端：Vitest（store、纯函数、组件挂载测试）+ 类型检查
cd frontend && npm install && npm test && npx vue-tsc --noEmit
```

**预期**：两条 `test` 命令全部通过、`vue-tsc` 零错误。任一失败即门禁未过，不得合入。

## 2. 本地运行

```bash
# 终端 A：后端（Spring Boot 3.5.16，http://localhost:8080）
cd backend && mvn spring-boot:run

# 终端 B：前端（http://localhost:5173，/api 经 Vite proxy 转发至 8080）
cd frontend && npm run dev
```

## 3. API 冒烟验证（可选，curl）

```bash
# 创建（含截止日期）
curl -s -X POST localhost:8080/api/todos -H 'Content-Type: application/json' \
  -d '{"title":"写周报","description":"Q4 总结","dueDate":"2026-10-12"}'

# 空标题被拒 → 400 {"code":"TITLE_REQUIRED",...}
curl -s -X POST localhost:8080/api/todos -H 'Content-Type: application/json' -d '{"title":"   "}'

# 列表（服务端已排序）；分类过滤
curl -s localhost:8080/api/todos
curl -s 'localhost:8080/api/todos?status=completed'

# 标记完成 → 200；删除 → 204；再删同一 id → 404
curl -s -X PATCH localhost:8080/api/todos/1/complete
curl -s -X DELETE localhost:8080/api/todos/1
```

## 4. 界面验收走查（对照 spec 验收场景）

打开 http://localhost:5173（首页，默认展示「未完成」待办列表）依次验证：

| # | 操作 | 预期（对应需求） |
|---|------|------------------|
| 0 | 打开应用 | 落地首页、加载并展示待办列表，"+"入口可见（FR-013, US1-AC5） |
| 1 | 点击"+"进入新增页，空列表创建"买牛奶"（仅标题）并保存 | 自动返回首页、切到「未完成」，"买牛奶"出现（US1-AC1, FR-001/013/014） |
| 2 | 新增页填写标题+描述+截止日期后保存 | 自动返回首页，三字段完整展示（US1-AC2, FR-014） |
| 3 | 在「已完成」分类下点"+"并保存 | 返回首页后自动切换到「未完成」，新事项可见（US1-AC7, Clarification 3） |
| 4 | 新增页已输入内容后点返回/浏览器返回 | 弹出未保存确认；继续编辑则停留，确认放弃则返回首页且不创建（Edge Cases, FR-015） |
| 5 | 创建多条不同日期事项 | 严格按截止日期升序；无日期者垫底（US1-AC3/AC4, SC-002） |
| 6 | 空/空白标题提交 | 拒绝并提示"标题不能为空"（Edge Cases, FR-002） |
| 7 | 标记"写周报"完成 | 1s 内从「未完成」消失；「已完成」及「全部」已完成区块可见（US2-AC1, SC-003/005） |
| 8 | 切换「全部」 | 未完成/已完成两个分区，各区块内保持日期排序（US1-AC6, FR-005） |
| 9 | 删除（确认取消→再删除确认） | 取消则保留；确认后所有分类中消失，刷新不复活（US2-AC2/AC3, FR-008/009） |
| 10 | 昨天截止的未完成事项 | 显示逾期标识；昨天的已完成事项无标识（US3, FR-010） |
| 11 | 清空全部事项 | 首页空状态引导文案（含"+"创建指引）而非空白页（FR-011） |
| 12 | 重启后端后刷新页面 | 数据完整恢复（SC-004） |
| 13 | 停止后端进程后操作页面（刷新/创建） | 显示错误提示、不白屏，提交入口禁用；重启后端后可重试成功（FR-012） |

## 5. 故障与限制提示

- 后端未启动时前端展示错误提示（store 的 error 状态），不白屏（已升格为需求 FR-012，走查步骤 13）。
- 新增页未保存离开需确认（FR-015，走查步骤 4）：由 vue-router `onBeforeRouteLeave` 守卫实现，
  含浏览器/系统返回键路径。
- SQLite `ALTER TABLE` 限制见 research R2：schema 变更需重建库或走迁移脚本。
