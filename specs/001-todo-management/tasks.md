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

- [x] T001 初始化后端 Maven 项目：`backend/pom.xml` 继承 `spring-boot-starter:3.5.16`，Java 25，依赖 spring-boot-starter-web、spring-boot-starter-data-jpa、spring-boot-starter-validation、`org.xerial:sqlite-jdbc`、`org.hibernate.orm:hibernate-community-dialects`、spring-boot-starter-test；启动类 `backend/src/main/java/com/example/todo/TodoApplication.java`
- [x] T002 [P] 配置后端应用：`backend/src/main/resources/application.properties` — datasource `jdbc:sqlite:backend/data/todo.db`、显式 `spring.jpa.properties.hibernate.dialect=org.hibernate.community.dialect.SQLiteDialect`、`ddl-auto=update`；新增 `backend/.gitignore`（忽略 `data/`、`target/`）；测试 profile `backend/src/test/resources/application-test.properties` 使用临时 SQLite 文件（research R2/R5）
- [x] T003 [P] 初始化前端 Vite 项目：`frontend/package.json` + `vite.config.ts`（dev proxy `/api` → `http://localhost:8080`）+ `tsconfig.json`（strict）；依赖 vue@3、pinia、vue-tsc、vitest、@vue/test-utils；全部源码为 `.ts`/`.vue` 且 `<script setup lang="ts">`（宪法 III）

**Checkpoint**: `mvn -q compile` 与 `npm run build`（vue-tsc）均可通过空骨架

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 实体、持久化、DTO、排序服务、API 外壳与前端类型层——所有故事共用

**⚠️ CRITICAL**: 本阶段完成前不得开始任何用户故事

- [x] T004 实现 `Todo` 实体于 `backend/src/main/java/com/example/todo/domain/Todo.java`：字段约束逐条落实 data-model.md——title 去首尾空白后非空且 ≤200 字符；description ≤2000 字符默认空串；dueDate 可空 LocalDate（允许早于今天）；completed 默认 false；createdAt Instant 创建时写入
- [x] T005 [P] 实现 `TodoRepository`（Spring Data JPA）于 `backend/src/main/java/com/example/todo/repo/TodoRepository.java`
- [x] T006 [P] 实现 DTO 与映射于 `backend/src/main/java/com/example/todo/api/dto/`：`TodoCreateRequest`（Bean Validation 复刻 T004 约束，`additionalProperties:false` 语义即忽略未知字段策略需显式配置）、`TodoResponse`（含派生字段 overdue）、`ErrorResponse`（`code`/`message`，code 取值 TITLE_REQUIRED / VALIDATION_ERROR / NOT_FOUND，见契约）
- [x] T007 实现 `TodoService` 于 `backend/src/main/java/com/example/todo/service/TodoService.java`：注入 Clock（服务端日期，research R3）；排序规则——dueDate 非空升序在前、dueDate 为空整体垫底、同日期（或同为空）按 createdAt 升序稳定排序（FR-006）；逾期规则 `overdue = dueDate != null && !completed && dueDate < today`（FR-010）
- [x] T008 实现 `TodoController` 于 `backend/src/main/java/com/example/todo/api/TodoController.java`：契约端点 list（`GET /api/todos?status=active|completed`，缺省返回全部已排序列表——「全部」分区由前端按 completed 渲染，见 contracts 与 FR-005 口径）与 create（`POST /api/todos`，201/400）；`@ControllerAdvice` 全局异常 → 契约 Error 格式
- [x] T009 [P] 实现前端类型与 API 客户端于 `frontend/src/api/client.ts` + `frontend/src/api/types.ts`：与 contracts/todo-api.yaml 一一对应的 TS 接口（Todo/TodoCreate/ErrorResponse，禁止 `any`）；list/create 方法，错误归一化为 `{code,message}`

**Checkpoint**: 后端 `mvn test` 可跑（暂无行为断言也可），实体+排序+外壳就绪——用户故事可并行开工

---

## Phase 3: User Story 1 - 创建与查看待办事项 (Priority: P1) 🎯 MVP

**Goal**: 创建（标题必填、描述/日期可选）、服务端排序列表、按分类查看（未完成/已完成/全部，默认未完成，全部分区展示）、空状态

**Independent Test**: 空库连续创建不同截止日期事项 → 默认「未完成」视图完整展示且严格日期升序、无日期垫底；切「全部」见两分区；quickstart §4 步骤 1–4、6、9

### Tests for User Story 1 ⚠️（先写测试，确认 RED 再实现）

- [x] T010 [P] [US1] 后端排序/校验单测：`backend/src/test/java/com/example/todo/service/TodoServiceTest.java` — dueDate 升序、NULL 垫底、同日按 createdAt 稳定（stub repository）；标题空白拒绝（TITLE_REQUIRED）、title>200/description>2000 拒绝（FR-002/006）
- [x] T011 [P] [US1] 后端控制器契约测试：`backend/src/test/java/com/example/todo/api/TodoControllerTest.java`（`@WebMvcTest`）— GET 返回列表 JSON 字段齐全；POST 201 返回实体、空白标题 400 `{code:"TITLE_REQUIRED"}`、坏日期格式 400；`status=active/completed` 过滤正确（FR-004）
- [x] T012 [P] [US1] 前端 store 单测：`frontend/src/__tests__/todoStore.spec.ts`（Vitest）— fetchTodos 后 `grouped` getter：all 视图含 activeGroup/completedGroup 两区块、组内保持服务端次序；当前分类默认 `active`（FR-004/005）
- [x] T013 [P] [US1] 前端组件挂载测试：`frontend/src/__tests__/TodoForm.spec.ts` — 空/纯空白标题提交时组件不调用 API 且显示"标题不能为空"；有效提交触发 create 一次（防重复提交，FR-002、Edge 并发双击）
- [x] T014 [US1] 运行 T010–T013 确认全部失败（RED），记录失败输出

### Implementation for User Story 1

- [x] T015 [US1] 完善 `frontend/src/stores/todoStore.ts`：state `{todos, filter: 'active'|'completed'|'all'（默认 'active'）, loading, error}`（loading/error 语义即 FR-012）；actions `fetchTodos(status?)`、`createTodo`；getters `visibleTodos`（active/completed 直接用后端过滤结果；all 用本地 completed 字段切两区块）、`isEmpty`
- [x] T016 [P] [US1] 实现 `frontend/src/components/TodoForm.vue`：标题（必填）+ 描述 + 截止日期输入；本地校验镜像约束（≤200/≤2000）；提交调 store.createTodo，成功后刷新列表
- [x] T017 [P] [US1] 实现 `frontend/src/components/StatusTabs.vue`：三分类切换按钮，当前分类高亮可视指示；切换仅改 store.filter 不重复请求（all 一次拉全量）
- [x] T018 [US1] 实现 `frontend/src/components/TodoList.vue`：按 visibleTodos 渲染——all 视图两个带标题区块（未完成在上、已完成在下）；列表空时渲染空状态引导（无事项→提示创建第一条；「已完成」为空→提示暂无该类事项，FR-011）
- [x] T019 [US1] 装配 `frontend/src/App.vue`：挂载 Form/Tabs/List，onMounted 首次 fetch；重跑 T010–T013 至 GREEN，`npx vue-tsc --noEmit` 零错误

**Checkpoint**: US1 独立可用（MVP）。按 quickstart §4 步骤 1–4、6、9 走查通过

---

## Phase 4: User Story 2 - 标记完成与删除待办事项 (Priority: P2)

**Goal**: 标记完成（从默认视图消失、可在已完成/全部分区找回）、两段式删除确认、删除持久生效

**Independent Test**: 创建→标记完成→在「已完成」验证→删除（先取消再确认）→刷新不复活；quickstart §4 步骤 5、7

### Tests for User Story 2 ⚠️

- [x] T020 [P] [US2] 后端端点测试（扩展 `backend/src/test/java/com/example/todo/api/TodoControllerTest.java`）：PATCH `/todos/{id}/complete` 返回 200 且 completed=true、重复调用幂等 200；DELETE `/todos/{id}` 返回 204、重复删除同一 id 返回 404 `{code:"NOT_FOUND"}`（契约 §complete/§delete）
- [x] T021 [P] [US2] 前端测试：`frontend/src/__tests__/TodoItem.spec.ts` + store 扩展用例 — 点击完成调 completeTodo 并从 active 视图移除；删除先弹确认，取消不发请求，确认后调 deleteTodo 并更新列表（US2-AC2/AC3）
- [x] T021a [US2] 错误态回补测试（FR-012，先写先红）：扩展 `frontend/src/__tests__/todoStore.spec.ts` + 新增 `frontend/src/__tests__/ErrorBanner.spec.ts`（Vitest，mock fetch reject）— store：请求失败后 `error` 非空且 `loading` 复位、`fetchTodos` 进行中 `loading=true`（重复调用合并请求不触发第二次 fetch）；UI：error 非空时 App 渲染错误提示且禁用 `TodoForm` 提交（`disabled` 属性可查询），error 清空后恢复（依赖 T015/T019 已就绪的 store 骨架与 App 装配；消解 analyze 发现 U1 / full.md CHK001/CHK018）
- [x] T022 [US2] 运行 T020–T021a 确认 RED

### Implementation for User Story 2

- [x] T023 [US2] 扩展 `frontend/src/api/client.ts`：`completeTodo(id)`、`deleteTodo(id)`（204 无响应体处理、404 归一化）
- [x] T024 [US2] 扩展 `frontend/src/stores/todoStore.ts`：actions `completeTodo`（成功后按当前 filter 刷新或本地置 completed）、`removeTodo`；错误进入 state.error
- [x] T025 [US2] 实现 `frontend/src/components/TodoItem.vue`：展示标题/描述/截止日期/完成态样式；完成按钮（仅未完成态显示）；删除按钮 + 确认对话框（可取消），挂载进 TodoList

**Checkpoint**: US1+US2 均独立可用。quickstart §4 步骤 5、7 通过

---

## Phase 5: User Story 3 - 逾期未办提醒 (Priority: P3)

**Goal**: 截止日期已过且未完成的事项显示逾期标识；已完成事项不显示

**Independent Test**: 创建昨天截止的未完成事项 → 带逾期标识；昨天截止的已完成事项无标识；quickstart §4 步骤 8

### Tests for User Story 3 ⚠️

- [x] T026 [P] [US3] 后端单测：`backend/src/test/java/com/example/todo/service/TodoOverdueTest.java` — 固定 Clock：昨天+未完成 → overdue=true；昨天+已完成 → false；今天截止 → false；无截止日期 → false（FR-010）
- [x] T026a [P] [US3] 前端组件测试：`frontend/src/__tests__/TodoItemOverdue.spec.ts`（Vitest + @vue/test-utils）— 挂载 TodoItem：`overdue: true` 的事渲染"已逾期"徽标元素且可查询；`overdue: false`（含已完成、无截止日期）不渲染徽标（US3-AC1/AC2, FR-010；消解 analyze 发现 C1）
- [x] T027 [US3] 运行 T026 与 T026a 确认 RED（若 T007 已实现规则则 T026 可直接 GREEN，T026a 须待 T028 实现后 GREEN；跳至实现时记录原因）

### Implementation for User Story 3

- [x] T028 [US3] 在 `frontend/src/components/TodoItem.vue` 渲染逾期标识：`overdue` 为 true 时显示"已逾期"徽标 + 高亮（FR-010；具体样式属于实现细节，验收以"可区分"为准）

**Checkpoint**: 三个故事全部独立可用

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T029 [P] FR-012 实现收尾：`frontend/src/App.vue` 错误横幅与重试入口 + `TodoForm.vue` 提交禁用（error 期间），使 T021a 转 GREEN；T015/T021a 已建立 loading/error 状态与测试基线，本任务为其回补实现
- [x] T030 [P] 运行完整门禁：`cd backend && mvn test`、`cd frontend && npm test && npx vue-tsc --noEmit`（宪法 I/III 合入门禁）
- [x] T031 按 `specs/001-todo-management/quickstart.md` §4 十一步走查全量验收（SC-001~SC-006, FR-012），记录结果
- [x] T032 [P] 更新根 `README.md`：本地版本要求（JDK 25 / Maven 3.9.x / Spring Boot 3.5.16 / Node）、双终端运行与测试命令（宪法 V）
- [x] T033 复核 `specs/001-todo-management/checklists/full.md` 高影响项（CHK006 a11y、CHK014/015 契约口径、CHK018 失败态）：属评审人职责，仅记录不代勾选

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup** → **Phase 2 Foundational**（阻塞全部故事）→ US1 → US2 → US3 → Polish
- 故事间无硬依赖，但共享 Phase 2 外壳；US2 的 TodoItem 挂载、US3 的徽标都落在 US1 建立的列表结构上，按优先级串行最稳妥；人力充足时 US2/US3 测试编写可与 US1 实现并行

### User Story Dependencies

- **US1 (P1)**: 仅依赖 Phase 2 — 独立可交付 MVP
- **US2 (P2)**: 依赖 Phase 2；集成点为 US1 的 TodoList（T025 挂载）
- **US3 (P3)**: 依赖 Phase 2（T007 的 overdue 逻辑）；集成点为 US2 的 TodoItem（T028）；T026a 组件测试须待 T025（TodoItem.vue 存在）后方可运行至 GREEN

### Within Each User Story

- 测试先写并确认 RED（T014/T022/T027）→ 实现 → 重跑至 GREEN → 类型检查
- 后端：模型 → 服务 → 端点；前端：store → 组件 → 装配

### Parallel Opportunities

- Setup：T003 ∥ T002（T001 先行）
- Foundational：T005/T006/T009 ∥（T004→T007→T008 串行）
- US1 测试：T010–T013 四项全并行；US1 实现：T016 ∥ T017
- US2 测试：T020 ∥ T021；US3 测试：T026 ∥ T026a；Polish：T029 ∥ T032

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

---

## Phase 7: Convergence

**Purpose**: /speckit-converge 评估追加项 — 代码现状与 spec/plan/tasks 的剩余差距（ID 延续 T033，不复用不改写既有任务）

- [x] T034 错误态禁用 `frontend/src/components/TodoItem.vue` 的完成/删除入口（App 向列表传递 `store.error` 状态，error 非空时按钮 `disabled`，重试成功后恢复），并在 `frontend/src/__tests__/ErrorBanner.spec.ts` 补充断言 per FR-012 (partial)
- [x] T035 在真实浏览器中按 `specs/001-todo-management/quickstart.md` §4 执行十一步走查（`mvn spring-boot:run` + `npm run dev` 双终端），验证 UI 交互与空态/分区/逾期徽标/错误横幅并记录结果 per T031/SC-001~SC-006 (partial)
- [x] T036 确认未知字段处置策略：契约 `TodoCreate.additionalProperties: false` 与 `backend/src/main/java/com/example/todo/api/dto/TodoCreateRequest.java` 的 `ignoreUnknown=true` 不一致——改为拒绝多余字段（400 Error 格式）或在契约/文档显式记录该决策，同步 `TodoControllerTest` per contracts/todo-api.yaml §TodoCreate (partial)
- [x] T037 处理超出契约的 `status=all`：`backend/src/main/java/com/example/todo/service/TodoService.java` 收紧为契约枚举 `active|completed`（缺省=全部），或将 `all` 显式写入契约 enum，并同步更新 `TodoServiceTest.listFiltersByStatus` per contracts/todo-api.yaml §listTodos (unrequested)

## Phase 8: Convergence

**Purpose**: /speckit-converge 评估追加项 — 代码现状与 spec/plan/tasks 的剩余差距（ID 延续 T037，不复用不改写既有任务）

- [x] T038 统一前端变更类操作的错误态处理：`frontend/src/stores/todoStore.ts` 的 `createTodo` 目前不写 `store.error`（失败仅在 `TodoForm.vue` 落入局部 `formError`），导致后端不可用/5xx 时不触发全局错误横幅与提交入口禁用（quickstart §4 步骤 11「创建」子场景、FR-012）；而 `completeTodo`/`removeTodo` 对任意失败（含 404）一律置 `store.error`，分类不一致。改为：网络/5xx 失败统一进入 `store.error`（横幅+禁用，重试成功后恢复），4xx 校验失败维持内联提示；在 `frontend/src/__tests__/`（todoStore.spec / ErrorBanner.spec）补充 create-失败触发全局错误态 的先红测试，并复跑 `npx vitest run` + `npx vue-tsc --noEmit` per FR-012 (partial)

## Phase 9: Convergence

**Purpose**: /speckit-converge 评估追加项 — 代码现状与 spec/plan/tasks 的剩余差距（ID 延续 T038，不复用不改写既有任务）

- [x] T039 为 `frontend/src/api/client.ts` 补充单元测试 `frontend/src/__tests__/client.spec.ts`：FR-012 的全局/内联错误路由完全依赖 `toApiError` 写入的 `ApiClientError.status`，但 `todoStore.spec.ts` 直接注入 `ApiClientError` 绕过了该映射，此接缝无覆盖。以 mock `fetch` 断言：5xx 响应 → `ApiClientError.status>=500`、404 → `status===404`、`fetch` 网络异常 → 非 `ApiClientError`（或 `status===0`），并校验 `{code,message}` 归一化与 204 无响应体处理；先写确认当前实现通过（若失败则修复 `client.ts`），复跑 `npx vitest run` + `npx vue-tsc --noEmit` per FR-012 / Constitution I (partial)

---

## Phase 10: 导航模型改造 — 独立新增页 (Priority: P1 · US1 补强) 🎯 未开工

**Purpose**: 落实 Clarifications Session 2026-10-17 与新增需求 **FR-013/FR-014/FR-015**（归入
用户故事 US1 创建流程，对应 AC1/AC2/AC7 与新增 Edge Case）。**纯前端改造**——后端与
`contracts/todo-api.yaml` 不新增端点/字段（见 plan.md、research R6）。决策：引入 **vue-router 4**，
`/`＝首页（列表+分类+“+”入口）、`/todos/new`＝独立新增页；保存成功返回首页并切「未完成」；
未保存离开经 `onBeforeRouteLeave` 守卫确认。遵循宪法原则 I：测试先行、先红后绿。

**Independent Test**: 首页点“+”进入新增页 → 填写保存 → 自动返回首页且切到「未完成」并见新事项；
新增页有未保存输入时返回弹确认（继续→停留、放弃→返回不创建不存草稿）；空列表首页引导指向“+”。
对应 quickstart §4 步骤 0/1/3/4/11。

### Tests for Phase 10 ⚠️（先写测试，确认 RED 再实现）

- [x] T040 [P] [US1] 路由解析测试 `frontend/src/__tests__/router.spec.ts`（Vitest）：`createRouter` 装配 `frontend/src/router/index.ts` 后，`/` 解析出 HomeView（渲染 StatusTabs+TodoList+AddButton 入口，无 TodoForm）、`/todos/new` 解析出 TodoCreateView（渲染 TodoForm）；断言首页加载即展示列表（FR-013, US1-AC5）
- [x] T041 [P] [US1] “+”入口测试 `frontend/src/__tests__/AddButton.spec.ts`：挂载 AddButton，渲染可见“+”触发元素（`data-testid="add-button"`）；点击后调用 `router.push('/todos/new')`（mock router）。**断言「+」在 `store.error` 非空时仍可点击**（“+”为导航入口，FR-012 仅约束提交类入口，见决策 F1）
- [x] T042 [P] [US1] 新增页保存返回测试 `frontend/src/__tests__/TodoCreateView.spec.ts`：有效提交时——`store.createTodo` 恰调用一次、成功后 `store.setFilter('active')` 被调用、`router.push('/')` 被调用；在「已完成」分类下进入并保存后，返回首页分类为 `active` 且新事项可见（FR-014 + Clarification 3；US1-AC1/AC2/AC7）。空/纯空白标题提交仍走 TodoForm 内联校验、不触发导航（复用 FR-002）。**并断言：`store.error` 非空时新增页 `button[type="submit"]` 处于 `disabled`、错误恢复后可用**（承接 FR-012 与决策 E1）
- [x] T043 [P] [US1] 未保存离开守卫测试 `frontend/src/__tests__/TodoCreateViewGuard.spec.ts`：向表单写入未保存内容后触发离开（`onBeforeRouteLeave`）——有未保存输入时弹出确认：模拟“取消”则导航中止（停留、不调 createTodo）；模拟“确认放弃”则放行导航、**不创建事项、不保留草稿**；无未保存输入时离开不弹确认（FR-015 + Edge Case）
- [x] T044 [US1] 运行 T040–T043 确认全部失败（RED，因 vue-router/视图/守卫尚未存在），记录失败输出

### Implementation for Phase 10

- [x] T045 [US1] 引入依赖：`frontend/package.json` dependencies 增加 `vue-router@^4`，执行 `npm install`（research R6 依赖引入说明：官方路由，无额外运行时成本）
- [x] T046 [US1] 新建 `frontend/src/router/index.ts`：`createRouter` + `createWebHistory`，路由 `/`→`views/HomeView.vue`、`/todos/new`→`views/TodoCreateView.vue`，默认导出 router 实例
- [x] T047 [US1] 装配路由：`frontend/src/main.ts` 中 `app.use(router)`（保留 pinia）
- [x] T048 [US1] 拆分首页壳层：将 `frontend/src/App.vue` 改为「h1 + 全局错误横幅/重试 + `<router-view/>`」；新建 `frontend/src/views/HomeView.vue` 承载原 App 内的 `StatusTabs` + `TodoList`，并挂载 AddButton；`onMounted` 首次 `fetchTodos` 移入 HomeView。新增/拆分 SFC 一律 `<script setup lang="ts">`、禁 `any`、`npx vue-tsc --noEmit` 零错误（宪法 III，决策 D1）。**同步修复** `frontend/src/__tests__/ErrorBanner.spec.ts`：App 现渲染 `<router-view>`，改用带 `createMemoryHistory` 的测试 router 挂载；保留错误横幅与「事项卡片完成/删除入口禁用」断言（HomeView 路由下），并将「`button[type=submit]` 禁用」断言迁至 TodoCreateView（见 T042）——因 App 不再内联 `<TodoForm>`，原第 41/75 行断言若留在 App 层将空断言/失效（E1）
- [x] T049 [P] [US1] 新建 `frontend/src/components/AddButton.vue`：“+”入口按钮（`data-testid="add-button"`），点击 `router.push('/todos/new')`；「+」为导航入口，**不随 `store.error` 禁用**（决策 F1，FR-012 仅约束提交类入口）；组件 `<script setup lang="ts">`（宪法 III，D1）
- [x] T050 [US1] 新建 `frontend/src/views/TodoCreateView.vue`：承载 `TodoForm`（自 App 移入本页）并绑定 `:disabled="!!store.error"` 以保留 FR-012 的 error 态提交禁用（决策 E1）；维护本地 dirty 标记（决策 C1：title/description/dueDate **任一非空**即视为有未保存输入）；保存成功回调中依次 `await store.createTodo(...)` → `store.setFilter('active')` → 清除 dirty → `router.push('/')`（FR-014 + Clarification 3）；组件 `<script setup lang="ts">`（宪法 III，D1）
- [x] T051 [US1] 在 `frontend/src/views/TodoCreateView.vue` 实现 `onBeforeRouteLeave` 守卫：dirty 为真时 `window.confirm('放弃未保存的待办事项？')`；返回 false/取消则中止导航（停留），确认放弃则放行、丢弃本地表单状态且**不创建、不保留草稿**；保存成功路径已清 dirty 故不误触发（FR-015 + Edge Case）
- [x] T052 [P] [US1] 空状态文案对齐“+”：`frontend/src/components/TodoList.vue`/`views/HomeView.vue` 无事项时引导用户点击首页“+”创建第一条（FR-011 文案更新，措辞与 Clarification 一致）
- [x] T053 [US1] 重跑 T040–T043 至 GREEN；`cd frontend && npx vue-tsc --noEmit` 零错误（宪法 III）

**Checkpoint**: 双页导航独立可用；quickstart §4 步骤 0/1/3/4/11 通过；后端与契约零改动

### Polish for Phase 10

- [x] T054 [P] 运行前端全门禁：`cd frontend && npm test && npx vue-tsc --noEmit`；后端未改动，可选复跑 `cd backend && mvn test` 确认无回归（宪法 I 合入门禁）
- [x] T055 真实浏览器按 `specs/001-todo-management/quickstart.md` §4 走查新增步骤 0/1/3/4/11（`mvn spring-boot:run` + `npm run dev` 双终端），验证：落地首页即见列表、“+”进入新增页、保存自动返回首页并切「未完成」、未保存返回确认、系统/浏览器返回键亦触发守卫；记录结果（SC-001 覆盖新流程）（2026-10-17 partial：后端+Vite 冒烟已过——深链 /todos/new 200、POST/DELETE 201/204 且数据还原；交互点击流未做，待真实浏览器人工复验）

### Phase 10 依赖与并行

- **顺序**：T040–T043（写测试）→ T044（确认 RED）→ T045→T046→T047（依赖/路由装配，串行）→ T048（App 拆分+修 ErrorBanner.spec）→ T049/T050/T052 → T051（同 TodoCreateView.vue，须接在 T050 之后）→ T053（GREEN+tsc）→ T054/T055
- **同文件串行**：T050 → T051（均改 `TodoCreateView.vue`）
- **[P] 并行机会**：测试 T040/T041/T042/T043 四项并行；实现期 AddButton（T049）∥ 空状态文案（T052，不同文件）；Polish T054 ∥ T055（T055 待 T053 完成）
- **回归面**：T048 修改 App.vue 与 ErrorBanner.spec.ts 为唯一触及既有测试的改动；TodoForm.spec.ts / TodoItem*.spec.ts / client.spec.ts 不受影响（TodoForm 仍独立可挂载）
- **交付策略**：MVP（T001–T039）已交付；本 Phase 为 2026-10-17 澄清的增量补丁，可独立实现、独立回归，不破坏 US2/US3 行为
