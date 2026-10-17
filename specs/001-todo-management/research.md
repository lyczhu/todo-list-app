# Phase 0 Research: 待办事项管理

**Date**: 2026-10-10（2026-10-17 增补 R6 导航方案） | **Plan**: [plan.md](./plan.md)

技术栈由用户指定（Vue3 + JDK 25 + RESTful API + Pinia + SQLite）。本研究解决"如何以最小
复杂度落地该栈"的决策点。经用户确认：**后端框架采用 Spring Boot 3.5.16**，构建使用本地
Maven 3.9.x（实测 3.9.11）。

## R1. 后端框架与 JDK 25 兼容性

- **Decision**: Spring Boot 3.5.16，Maven（本地 3.9.11）构建，`spring-boot-starter-web` +
  `spring-boot-starter-data-jpa`，运行于本机 JDK 25.0.2。
- **Rationale**: 用户明确指定 3.5.16；Spring Boot 官方系统要求确认运行时最低 Java 17、
  向上兼容 Java 25+，3.5.x 成熟稳定、资料最全（符合宪法原则 IV）。本机已具备全部工具链
  （JDK 25 / Maven 3.9.x），无需额外安装。
- **Alternatives considered**:
  - Spring Boot 4.0.x（亦支持 Java 25，但用户选择保守版本）；
  - Quarkus / Javalin（更轻或构建更快，但失去 Spring Data JPA 生态标准化收益）。

## R2. SQLite + JPA 方言

- **Decision**: `org.xerial:sqlite-jdbc` 驱动 + `org.hibernate.orm:hibernate-community-dialects`
  中的 `org.hibernate.community.dialect.SQLiteDialect`，显式设置
  `spring.jpa.properties.hibernate.dialect`。
- **Rationale**: Hibernate 官方文档明确社区方言（含 SQLite）不在 hibernate-core 内，需单独
  依赖；且第三方方言建议显式配置（Hibernate 6+ 的自动检测不覆盖社区方言）。
- **Alternatives considered**: JdbcTemplate 手写 SQL（失去实体映射与测试便利）；H2
  （违背用户指定的 SQLite）。
- **Known limitation（已接受）**: SQLite 对 `ALTER TABLE` 支持有限。本特性单实体、字段稳定，
  开发期使用 `ddl-auto=update`，schema 演进时改为重建或迁移脚本——记录为运维注意事项。

## R3. 排序与逾期判定的归属层

- **Decision**: 排序（截止日期升序、无截止日期垫底、同日期按创建时间升序）与逾期标记由
  **后端 Service 层**完成，API 返回已排序列表；逾期以响应字段 `overdue: boolean` 表达
  （服务端日期为准）。
- **Rationale**: 单一事实来源，前端只做展示与按状态分区渲染；避免客户端时钟差异导致逾期
  判定不一致；便于后端单测覆盖 FR-006/FR-010。
- **Alternatives considered**: 前端排序（两处逻辑易漂移）；纯数据库 ORDER BY（NULL 排序在
  SQLite 方言下行为差异增加测试成本；≤500 条规模内存排序足够）。

## R4. 前端工程与状态管理

- **Decision**: Vite + Vue 3 + `vue-tsc`，Pinia 单 store（`useTodoStore`）持有事项列表、
  当前分类（默认 `active`＝未完成）、加载/错误状态；组件全部 `<script setup lang="ts">`；
  API 层为 `src/api/` 下的类型化 fetch 封装。开发期 `vite.config.ts` proxy 将 `/api` 转发至
  `localhost:8080`。
- **Rationale**: 用户指定 Pinia；宪法原则 III 要求 TS 且 vue-tsc 零错误为合入门禁；proxy
  方案避免把 CORS 假设带入生产配置。
- **Alternatives considered**: 组件本地状态 + provide/inject（分类切换重复请求、状态分散）；
  Vuex（Pinia 为其官方继任者）。

## R5. 测试设施

- **Decision**:
  - 后端：JUnit 5——Service 纯单测（校验/排序/逾期，stub repository）+ `@WebMvcTest`
    控制器切片（序列化与状态码）+ `@DataJpaTest`（SQLite 临时文件，保方言一致）。
  - 前端：Vitest + @vue/test-utils——store 动作/getter 单测、排序与逾期纯函数单测、关键
    组件（表单校验、分类切换、分区渲染）挂载测试；HTTP 层 mock。
- **Rationale**: 宪法原则 I 要求每功能先有失败测试（red→green）；切片测试在无完整容器下
  快速验证契约。
- **Alternatives considered**: 全量 `@SpringBootTest`（慢，非必要）；Playwright E2E（超出
  本特性单测门槛，留作后续增强）。

## R6. 新增页导航与未保存离开确认（FR-013/014/015，2026-10-17 澄清引入）

- **Decision**: 引入 **vue-router 4**（Vue 官方路由），首页路由 `/`（HomeView：列表 + 分类 +
  "+"入口），新增页路由 `/todos/new`（TodoCreateView）。保存成功后 `router.push('/')` 返回首页，
  并将 store 当前分类重置为 `active`（「未完成」）以显示最新列表（FR-014 / Clarification 3）。
  离开新增页且表单有未保存输入时，通过 `onBeforeRouteLeave` 守卫弹出确认提示，确认后丢弃输入
  并返回、不保留草稿（FR-015 / Clarification 2）。"+"入口为首页内普通按钮（`AddButton.vue`），
  位置/样式属视觉设计，留待实现阶段决定。
- **Rationale**: 「独立页面」+「返回」语义需要浏览器历史栈支持（含系统/浏览器返回键），
  vue-router 的导航守卫是处理"有未保存输入时拦截返回并确认"的标准做法，避免手写 popstate
  监听带来的正确性风险；保存后切回「未完成」是需求明确行为，由 store 单一状态源承担。
- **Alternatives considered**:
  - 组件内 `v-if` 视图切换 + 不引入路由（更轻，但无法自然处理浏览器返回/历史，FR-015 的
    返回确认需自行实现 history 拦截，复杂度反而上升且易出错）；
  - 弹窗/抽屉承载新增表单（非"独立页面"，违背 Clarification 2026-10-17 的导航模型）；
  - 服务端多页跳转（与 SPA + REST 架构不符，违背原则 IV）。
- **依赖引入说明（宪法「技术栈约束」要求）**: vue-router 为 Vue 官方维护包、体积小、与
  Vite/Vitest 生态无缝，用途仅为支撑新增的两视图导航，无额外运行时成本。

## 结论

Technical Context 无遗留 NEEDS CLARIFICATION；导航改造仅需引入 vue-router（R6），API 契约
与数据模型不变，可进入/保持 Phase 1 设计。
