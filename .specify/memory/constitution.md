<!--
Sync Impact Report
====================
Version change: (none / untouched template) → 1.0.0 (initial ratification, MINOR-from-scaffold)
Modified principles: n/a (first ratification)
Added sections:
  - Core Principles I–V (单元测试先行 / Java 后端栈 / TypeScript 前端组件 / 简洁优先 / 文档与可读性)
  - 技术栈约束 (SECTION_2)
  - 开发工作流与质量门禁 (SECTION_3)
  - Governance
Removed sections: n/a
Follow-up TODOs: none — RATIFICATION_DATE adopted as 2026-10-10 (date of first ratification).
Note: 本文件由模板脚手架首次实例化而来，模板占位符已全部替换；同步影响报告为临时评审材料，提交前可删除。
-->

# Todo-List App Constitution

## Core Principles

### I. 单元测试先行（NON-NEGOTIABLE）

所有新功能必须包含单元测试方可合入。新增行为须先有失败测试覆盖（red → green → refactor），
后端 Java 代码使用 JUnit（配合项目构建工具执行），前端逻辑与组件使用对应的 TS 测试框架。
禁止以"后续补测试"为由绕过；无测试覆盖的功能视为未完成。
Rationale：测试先行保证行为可验证、回归可捕获，是质量门禁的最低标准。

### II. Java 后端栈

后端 MUST 使用 Java 实现：业务逻辑、API、持久化均落在 Java 代码中。新增后端模块须遵循项目
统一的包结构与构建配置（Maven/Gradle），并保持编译零告警目标。禁止在未经修宪的情况下引入
其他后端语言实现业务功能。
Rationale：统一后端语言降低维护成本，保证工具链、代码审查与测试设施的一致性。

### III. TypeScript 前端组件

前端组件 MUST 使用 TypeScript 编写（.ts/.tsx）。组件、hooks、状态管理与共享类型不得以纯
JavaScript 提交；避免 `any`，须在类型无法推断时显式声明并注释原因。类型检查（tsc）通过是
合入前提。
Rationale：类型即文档，静态检查在编译期捕获接口错用，减少运行时缺陷。

### IV. 简洁优先（Simplicity / YAGNI）

从最简实现开始，MUST NOT 引入未被当前需求使用的抽象、框架或依赖。每个功能只实现规格要求
的范围；重构须以可度量的收益（复杂度下降、缺陷减少）为依据。
Rationale：过度设计拖慢交付并放大维护面，todo 类应用更需保持小巧可审。

### V. 文档与可读性

公共 API、领域模型与关键设计决策 MUST 配有简明文档（README/代码注释/Javadoc 相应层级）。
命名须表达意图；注释解释"为什么"而非"做了什么"。
Rationale：本项目规模下，可读性与最小文档是新成员与审查者最快的入口。

## 技术栈约束

- 后端：Java（唯一授权的后端实现语言，见原则 II）。
- 前端：组件与逻辑使用 TypeScript（见原则 III）。
- 测试：后端单元测试与前端单元/组件测试均须纳入项目自动化命令（如 `mvn test` / `npm test`），
  并在提交前本地通过。
- 依赖引入：新增第三方库须在计划阶段说明用途与维护成本，优先使用项目已有设施。

## 开发工作流与质量门禁

- 每个功能遵循 Spec Kit 流程：spec → plan → tasks → implement；计划阶段须列出测试策略。
- 合入门禁（全部满足）：单元测试齐备且通过（原则 I）、类型检查通过（原则 III）、构建零失败、
  审查确认无违背本宪法之处。
- 代码审查重点：测试有效性（而非仅覆盖率数字）、类型安全、是否引入不必要复杂度。

## Governance

本宪法优先于其他一切开发实践与口头约定。修订须：(1) 提出变更理由与影响分析；(2) 更新本文件
并按语义化版本递增（MAJOR：删除/重定义原则等不向后兼容的治理变更；MINOR：新增原则或实质性扩
展；PATCH：措辞澄清与非语义修订）；(3) 经项目维护者批准后记录日期并同步至相关模板与命令。
所有 PR/审查须验证合规性；违反不可协商原则的变更不得合入。

**Version**: 1.0.0 | **Ratified**: 2026-10-10 | **Last Amended**: 2026-10-10
