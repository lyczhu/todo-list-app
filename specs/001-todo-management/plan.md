# Implementation Plan: 待办事项管理

**Branch**: `001-todo-management` | **Date**: 2026-10-10（2026-10-17 依据 Clarifications 复规划导航模型） | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-todo-management/spec.md`

## Summary

实现单用户待办事项管理：创建（标题必填、描述/截止日期可选）经**独立新增页**完成——首页为
默认落地页并展示待办列表，用户点击"+"进入新增页，保存成功后自动返回首页并切换到「未完成」
分类（FR-013/FR-014）；新增页存在未保存输入时返回须先确认（FR-015）。列表按「未完成/已完成/
全部」分类查看（默认未完成；全部视图分区展示，各区块按截止日期升序、无日期垫底、同日按创建
时间稳定排序）、标记完成、删除（带确认）、逾期标识、空状态、加载/错误反馈（FR-012）与持久化。
采用用户指定技术栈：Vue3 + TypeScript 前端（Pinia 状态管理 + vue-router 双视图导航，见
research R6），Java（JDK 25）后端提供 RESTful API，SQLite 存储。

## Technical Context

**Language/Version**: 后端 Java 25（JDK 25）；前端 TypeScript 5.x（Vue 3 SFC + `<script setup lang="ts">`）

**Primary Dependencies**: 后端 Spring Boot 3.5.16（用户指定版本，见 research.md R1；
spring-boot-starter-web + spring-boot-starter-data-jpa）、Maven 3.9.x（本地 3.9.11）。
xerial sqlite-jdbc、hibernate-community-dialects（SQLiteDialect）；前端 vue、pinia、
vue-router（新增，用于首页/新增页双视图导航与离开守卫，见 research R6）、vite。
测试：后端 JUnit 5（spring-boot-starter-test）；前端 Vitest + @vue/test-utils。

**Storage**: SQLite（单文件 `backend/data/todo.db`，经 Spring Data JPA 访问，启动时自动建表）

**Testing**: JUnit 5（服务单测 + WebMvcTest 控制器切片测试）；Vitest + @vue/test-utils（store、
组件、工具函数单测）——满足宪法原则 I「单元测试先行」

**Target Platform**: 现代浏览器（桌面/移动 Web）；后端本地进程运行（localhost）

**Project Type**: web-app（前后端分离双项目：`backend/` + `frontend/`）

**Performance Goals**: 单用户清单规模（≤500 条事项）；API 响应 p95 < 200ms；前端分类切换与
状态更新 < 1s（对应 SC-003/SC-005）

**Constraints**: 无账号体系、无并发多用户（spec 假设）；开发期前端经 Vite dev proxy 访问后端
API；生产可静态托管前端 + 独立后端

**Scale/Scope**: 1 个实体（Todo）、4 个 REST 端点（本次导航改造**不新增 API**，见
contracts/todo-api.yaml）、2 个路由视图（首页/新增页）+ 约 6 个前端组件 + 1 个 Pinia store

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 宪法条款 | 评估 | 结论 |
|----------|------|------|
| I. 单元测试先行（NON-NEGOTIABLE） | 计划显式列出前后端测试框架；tasks 阶段每个功能须先落失败测试（red→green）；合入门禁含测试通过 | ✅ PASS |
| II. Java 后端栈 | 后端为 Java 25 + Spring Boot，业务逻辑/API/持久化均在 Java | ✅ PASS |
| III. TypeScript 前端组件 | Vue3 SFC 全部使用 `<script setup lang="ts">`；store/工具为 .ts；tsc（vue-tsc）零错误为合入前提；避免 `any` | ✅ PASS |
| IV. 简洁优先（YAGNI） | 依赖清单最小化：不引入认证、WebSocket、缓存、微服务；单实体、首页+新增页两视图；新增依赖仅 vue-router（官方路由，解决"独立页面 + 浏览器返回 + 未保存离开确认"所需的历史栈能力，见 research R6），不建多余分层 | ✅ PASS |
| V. 文档与可读性 | quickstart.md 提供运行验证指南；API 契约以 OpenAPI 文档化；关键决策记录于 research.md | ✅ PASS |
| 技术栈约束（治理章节） | 后端唯一语言 Java ✅；前端 TS ✅；测试纳入自动化命令（`mvn test` / `npm test`）✅ | ✅ PASS |
| 质量门禁 | 类型检查 + 测试 + 构建零失败均写入 quickstart 验证步骤 | ✅ PASS |

**Gate 结论：PASS**（初评与 Phase 1 设计后复核均通过，无违规，Complexity Tracking 不适用）

## Project Structure

### Documentation (this feature)

```text
specs/001-todo-management/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── todo-api.yaml    # RESTful API 契约（OpenAPI 3）
└── tasks.md             # Phase 2 output (/speckit-tasks - NOT created here)
```

### Source Code (repository root)

```text
backend/                              # Spring Boot（Java 25, Maven）
├── pom.xml
├── data/                             # SQLite 文件（gitignored）
└── src/
    ├── main/java/com/example/todo/
    │   ├── TodoApplication.java      # 启动类
    │   ├── api/                      # REST 控制器 + 请求/响应 DTO
    │   ├── domain/                   # Todo 实体与状态逻辑
    │   ├── service/                  # 业务规则（校验、排序、逾期）
    │   └── repo/                     # Spring Data JPA repository
    └── test/java/com/example/todo/   # JUnit 5 单测与切片测试
        ├── service/
        └── api/

frontend/                             # Vite + Vue 3 + TypeScript
├── package.json
├── vite.config.ts                    # dev proxy → localhost:8080
├── tsconfig.json
└── src/
    ├── main.ts                       # app 挂载 router + pinia
    ├── router/                       # vue-router：/ （首页）与 /todos/new （新增页）
    ├── views/                        # HomeView.vue（落地页：列表+分类+“+”入口）
    │   └── TodoCreateView.vue        # 独立新增页（离开守卫处理未保存确认）
    ├── api/                          # fetch 封装与类型化客户端
    ├── stores/                       # Pinia：useTodoStore
    ├── components/                   # TodoItem.vue / TodoForm.vue /
    │                                 # TodoList.vue / StatusTabs.vue / AddButton.vue
    ├── utils/                        # 排序、逾期判定等纯函数
    └── __tests__/                    # Vitest 单测
```

**Structure Decision**: 采用 web-app 双项目结构（`backend/` + `frontend/`）。后端为独立 Maven
项目提供 `/api/todos` REST 资源；前端 Vite 工程通过 dev proxy 调用，契约以 `contracts/todo-api.yaml`
为唯一事实来源，前后端单测各自以 `mvn test` / `npm test` 运行。

## Complexity Tracking

> 无宪法违规，本节不适用。

## Post-design Constitution Re-check

Phase 1 产物（data-model.md、contracts/todo-api.yaml、quickstart.md）未引入新依赖、新端点
之外的复杂度或 JS 组件；4 端点/1 实体、首页+新增页两视图与「全部」分区渲染均在原则 IV 范围内。
新增依赖 vue-router 的用途与维护成本已在 research R6 说明（Vue 官方路由，无额外运行时开销）。
API 契约与数据模型不因导航改造而变化（FR-013/014/015 为纯前端路由行为）。**复核结论：PASS。**
