# Tasks: 待办事项管理

**Input**: Design documents from `specs/001-todo-management/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/todo-api.yaml, quickstart.md

**Tests**: INCLUDED（宪法原则 I「单元测试先行（NON-NEGOTIABLE）」要求每个功能先写失败测试再实现，red→green→refactor）

**Organization**: 按用户故事分组，支持独立实现与独立验证。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无未完成依赖）
- **[Story]**: US1/US2/US3 对应 spec.md 用户故事
- 所有路径为仓库根目录下的相对路径

## Path Conventions

- **Web app 双项目**：`backend/`（Spring Boot 3.5.16, Maven, JDK 25）与 `frontend/`（Vite + Vue 3 + TS, Pinia, Vitest），结构见 plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 按 plan.md/research.md 初始化双项目骨架

- [ ] T001 初始化后端 Maven 项目：`backend/pom.xml` 继承 `spring-boot-starter:3.5.16`，Java 25，依赖 spring-boot-starter-web、spring-boot-starter-data-jpa、spring-boot-starter-validation、`org.xerial:sqlite-jdbc`、`org.hibernate.orm:hibernate-community-dialects`、spring-boot-starter-test；启动类 `backend/src/main/java/com/example/todo/TodoApplication.java`
- [ ] T002 [P] 配置后端应用：`backend/src/main/resources/application.properties` — datasource `jdbc:sqlite:backend/data/todo.db`、显式 `spring.jpa.properties.hibernate.dialect=org.hibernate.community.dialect.SQLiteDialect`、`ddl-auto=update`；新增 `backend/.gitignore`（忽略 `data/`、`target/`）；测试 profile `backend/src/test/resources/application-test.properties` 使用临时 SQLite 文件（research R2/R5）
- [ ] T003 [P] 初始化前端 Vite 项目：`frontend/package.json` + `vite.config.ts`（dev proxy `/api` → `http://localhost:8080`）+ `tsconfig.json`（strict）；依赖 vue@3、pinia、vue-tsc、vitest、@vue/test-utils；全部源码为 `.ts`/`.vue` 且 `<script setup lang="ts">`（宪法 III）

**Checkpoint**: `mvn -q compile` 与 `npm run build`（vue-tsc）均可通过空骨架

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 实体、持久化、DTO、排序服务、API 外壳与前端类型层——所有故事共用

**⚠️ CRITICAL**: 本阶段完成前不得开始任何用户故事

- [ ] T004 实现 `Todo` 实体于 `backend/src/main/java/com/example/todo/domain/Todo.java`：字段约束逐条落实 data-model.md——title 去首尾空白后非空且 ≤200 字符；description ≤2000 字符默认空串；dueDate 可空 LocalDate（允许早于今天）；completed 默认 false；createdAt Instant 创建时写入
- [ ] T005 [P] 实现 `TodoRepository`（Spring Data JPA）于 `backend/src/main/java/com/example/todo/repo/TodoRepository.java`
- [ ] T006 [P] 实现 DTO 与映射于 `backend/src/main/java/com/example/todo/api/dto/`：`TodoCreateRequest`（Bean Validation 复刻 T004 约束，`additionalProperties:false` 语义即忽略未知字段策略需显式配置）、`TodoResponse`（含派生字段 overdue）、`ErrorResponse`（`code`/`message`，code 取值 TITLE_REQUIRED / VALIDATION_ERROR / NOT_FOUND，见契约）
- [ ] T007 实现 `TodoService` 于 `backend/src/main/java/com/example/todo/service/TodoService.java`：注入 Clock（服务端日期，research R3）；排序规则——dueDate 非空升序在前、dueDate 为空整体垫底、同日期（或同为空）按 createdAt 升序稳定排序（FR-006）；逾期规则 `overdue = dueDate != null && !completed && dueDate < today`（FR-010）
- [ ] T008 实现 `TodoController` 于 `backend/src/main/java/com/example/todo/api/TodoController.java`：契约端点 list（`GET /api/todos?status=active|completed`，缺省返回全部已排序列表——「全部」分区由前端按 completed 渲染，见 contracts 与 FR-005 口径）与 create（`POST /api/todos`，201/400）；`@ControllerAdvice` 全局异常 → 契约 Error 格式
- [ ] T009 [P] 实现前端类型与 API 客户端于 `frontend/src/api/client.ts` + `frontend/src/api/types.ts`：与 contracts/todo-api.yaml 一一对应的 TS 接口（Todo/TodoCreate/ErrorResponse，禁止 `any`）；list/create 方法，错误归一化为 `{code,message}`

**Checkpoint**: 后端 `mvn test` 可跑（暂无行为断言也可），实体+排序+外壳就绪——用户故事可并行开工

---

## Phase 3: User Story 1 - 创建与查看待办事项 (Priority: P1) 🎯 MVP

**Goal**: 创建（标题必填、描述/日期可选）、服务端排序列表、按分类查看（未完成/已完成/全部，默认未完成，全部分区展示）、空状态

**Independent Test**: 空库连续创建不同截止日期事项 → 默认「未完成」视图完整展示且严格日期升序、无日期垫底；切「全部」见两分区；quickstart §4 步骤 1–4、6、9

### Tests for User Story 1 ⚠️（先写测试，确认 RED 再实现）

- [ ] T010 [P] [US1] 后端排序/校验单测：`backend/src/test/java/com/example/todo/service/TodoServiceTest.java` — dueDate 升序、NULL 垫底、同日按 createdAt 稳定（stub repository）；标题空白拒绝（TITLE_REQUIRED）、title>200/description>2000 拒绝（FR-002/006）
- [ ] T011 [P] [US1] 后端控制器契约测试：`backend/src/test/java/com/example/todo/api/TodoControllerTest.java`（`@WebMvcTest`）— GET 返回列表 JSON 字段齐全；POST 201 返回实体、空白标题 400 `{code:"TITLE_REQUIRED"}`、坏日期格式 400；`status=active/completed` 过滤正确（FR-004）
- [ ] T012 [P] [US1] 前端 store 单测：`frontend/src/__tests__/todoStore.spec.ts`（Vitest）— fetchTodos 后 `grouped` getter：all 视图含 activeGroup/completedGroup 两区块、组内保持服务端次序；当前分类默认 `active`（FR-004/005）
- [ ] T013 [P] [US1] 前端组件挂载测试：`frontend/src/__tests__/TodoForm.spec.ts` — 空/纯空白标题提交时组件不调用 API 且显示"标题不能为空"；有效提交触发 create 一次（防重复提交，FR-002、Edge 并发双击）
- [ ] T014 [US1] 运行 T010–T013 确认全部失败（RED），记录失败输出

### Implementation for User Story 1

- [ ] T015 [US1] 完善 `frontend/src/stores/todoStore.ts`：state `{todos, filter: 'active'|'completed'|'all'（默认 'active'）, loading, error}`；actions `fetchTodos(status?)`、`createTodo`；getters `visibleTodos`（active/completed 直接用后端过滤结果；all 用本地 completed 字段切两区块）、`isEmpty`
- [ ] T016 [P] [US1] 实现 `frontend/src/components/TodoForm.vue`：标题（必填）+ 描述 + 截止日期输入；本地校验镜像约束（≤200/≤2000）；提交调 store.createTodo，成功后刷新列表
- [ ] T017 [P] [US1] 实现 `frontend/src/components/StatusTabs.vue`：三分类切换按钮，当前分类高亮可视指示；切换仅改 store.filter 不重复请求（all 一次拉全量）
- [ ] T018 [US1] 实现 `frontend/src/components/TodoList.vue`：按 visibleTodos 渲染——all 视图两个带标题区块（未完成在上、已完成在下）；列表空时渲染空状态引导（无事项→提示创建第一条；「已完成」为空→提示暂无该类事项，FR-011）
- [ ] T019 [US1] 装配 `frontend/src/App.vue`：挂载 Form/Tabs/List，onMounted 首次 fetch；重跑 T010–T013 至 GREEN，`npx vue-tsc --noEmit` 零错误

**Checkpoint**: US1 独立可用（MVP）。按 quickstart §4 步骤 1–4、6、9 走查通过

---

## Phase 4: User Story 2 - 标记完成与删除待办事项 (Priority: P2)

**Goal**: 标记完成（从默认视图消失、可在已完成/全部分区找回）、两段式删除确认、删除持久生效

**Independent Test**: 创建→标记完成→在「已完成」验证→删除（先取消再确认）→刷新不复活；quickstart §4 步骤 5、7

### Tests for User Story 2 ⚠️

- [ ] T020 [P] [US2] 后端端点测试（扩展 `backend/src/test/java/com/example/todo/api/TodoControllerTest.java`）：PATCH `/todos/{id}/complete` 返回 200 且 completed=true、重复调用幂等 200；DELETE `/todos/{id}` 返回 204、重复删除同一 id 返回 404 `{code:"NOT_FOUND"}`（契约 §complete/§delete）
- [ ] T021 [P] [US2] 前端测试：`frontend/src/__tests__/TodoItem.spec.ts` + store 扩展用例 — 点击完成调 completeTodo 并从 active 视图移除；删除先弹确认，取消不发请求，确认后调 deleteTodo 并更新列表（US2-AC2/AC3）
- [ ] T022 [US2] 运行 T020–T021 确认 RED

### Implementation for User Story 2

- [ ] T023 [US2] 扩展 `frontend/src/api/client.ts`：`completeTodo(id)`、`deleteTodo(id)`（204 无响应体处理、404 归一化）
- [ ] T024 [US2] 扩展 `frontend/src/stores/todoStore.ts`：actions `completeTodo`（成功后按当前 filter 刷新或本地置 completed）、`removeTodo`；错误进入 state.error
- [ ] T025 [US2] 实现 `frontend/src/components/TodoItem.vue`：展示标题/描述/截止日期/完成态样式；完成按钮（仅未完成态显示）；删除按钮 + 确认对话框（可取消），挂载进 TodoList

**Checkpoint**: US1+US2 均独立可用。quickstart §4 步骤 5、7 通过

---

## Phase 5: User Story 3 - 逾期未办提醒 (Priority: P3)

**Goal**: 截止日期已过且未完成的事项显示逾期标识；已完成事项不显示

**Independent Test**: 创建昨天截止的未完成事项 → 带逾期标识；昨天截止的已完成事项无标识；quickstart §4 步骤 8

### Tests for User Story 3 ⚠️

- [ ] T026 [P] [US3] 后端单测：`backend/src/test/java/com/example/todo/service/TodoOverdueTest.java` — 固定 Clock：昨天+未完成 → overdue=true；昨天+已完成 → false；今天截止 → false；无截止日期 → false（FR-010）
- [ ] T027 [US3] 运行 T026 确认 RED（若 T007 已实现规则则直接 GREEN，跳至实现）

### Implementation for User Story 3

- [ ] T028 [US3] 在 `frontend/src/components/TodoItem.vue` 渲染逾期标识：`overdue` 为 true 时显示"已逾期"徽标 + 高亮（FR-010；具体样式属于实现细节，验收以"可区分"为准）

**Checkpoint**: 三个故事全部独立可用

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T029 [P] 错误态全局呈现：`frontend/src/App.vue` 增加 store.error 可见提示（API 失败不白屏，提交入口禁用）——对应 custom checklist CHK018 的需求缺项回补
- [ ] T030 [P] 运行完整门禁：`cd backend && mvn test`、`cd frontend && npm test && npx vue-tsc --noEmit`（宪法 I/III 合入门禁）
- [ ] T031 按 `specs/001-todo-management/quickstart.md` §4 十步走查全量验收（SC-001~SC-006），记录结果
- [ ] T032 [P] 更新根 `README.md`：本地版本要求（JDK 25 / Maven 3.9.x / Spring Boot 3.5.16 / Node）、双终端运行与测试命令（宪法 V）
- [ ] T033 复核 `specs/001-todo-management/checklists/full.md` 高影响项（CHK006 a11y、CHK014/015 契约口径、CHK018 失败态）：属评审人职责，仅记录不代勾选

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup** → **Phase 2 Foundational**（阻塞全部故事）→ US1 → US2 → US3 → Polish
- 故事间无硬依赖，但共享 Phase 2 外壳；US2 的 TodoItem 挂载、US3 的徽标都落在 US1 建立的列表结构上，按优先级串行最稳妥；人力充足时 US2/US3 测试编写可与 US1 实现并行

### User Story Dependencies

- **US1 (P1)**: 仅依赖 Phase 2 — 独立可交付 MVP
- **US2 (P2)**: 依赖 Phase 2；集成点为 US1 的 TodoList（T025 挂载）
- **US3 (P3)**: 依赖 Phase 2（T007 的 overdue 逻辑）；集成点为 US2 的 TodoItem（T028）

### Within Each User Story

- 测试先写并确认 RED（T014/T022/T027）→ 实现 → 重跑至 GREEN → 类型检查
- 后端：模型 → 服务 → 端点；前端：store → 组件 → 装配

### Parallel Opportunities

- Setup：T003 ∥ T002（T001 先行）
- Foundational：T005/T006/T009 ∥（T004→T007→T008 串行）
- US1 测试：T010–T013 四项全并行；US1 实现：T016 ∥ T017
- US2 测试：T020 ∥ T021；Polish：T029 ∥ T032

## Parallel Example: User Story 1

```text
同时编写（不同文件、无相互依赖）：
T010 backend TodoServiceTest（排序/校验）
T011 backend TodoControllerTest（list/create/status 过滤）
T012 frontend todoStore.spec（分组/默认分类）
T013 frontend TodoForm.spec（必填校验/防重复提交）
→ T014 确认 RED → 实现 T015–T019
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 → 2. Phase 2 → 3. Phase 3（含 RED→GREEN）→ 4. 独立验证 US1（quickstart 步骤 1–4/6/9）→ 5. 可演示交付 MVP

### Incremental Delivery

1. MVP（US1：创建+排序+分类查看）→ +US2（完成/删除闭环）→ +US3（逾期提醒）→ Polish（错误态+全量走查+文档）
2. 每个 Checkpoint 都是一次可独立演示、可回归的增量；合入前必须过 T030 门禁
