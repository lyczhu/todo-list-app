# 待办事项管理 (Todo List App)

单用户待办清单：创建、查看、按截止日期排序、按状态分类查看（未完成/已完成/全部）、
标记完成、两段式删除确认、逾期提醒。

## 技术栈

- **后端**: Spring Boot 3.5.16 · JDK 25 · Maven 3.9.x · Spring Data JPA · SQLite
- **前端**: Vue 3 (`<script setup lang="ts">`) · Pinia · Vite · TypeScript (strict) · Vitest

## 环境要求

| 工具 | 版本 |
|------|------|
| JDK | 25（实测 25.0.2） |
| Maven | 3.9.x（实测 3.9.11） |
| Node.js | 20+（实测 26.x） |

## 运行（双终端）

```bash
# 终端 1 — 后端（默认 http://localhost:8080，数据库文件 backend/data/todo.db 自动创建）
cd backend
mvn spring-boot:run

# 终端 2 — 前端开发服务器（http://localhost:5173，/api 代理到 8080）
cd frontend
npm install
npm run dev
```

浏览器打开 http://localhost:5173 即可使用。

## 测试与类型检查（合入门禁）

```bash
cd backend && mvn test                       # JUnit 5 单元/契约测试
cd frontend && npm test                      # Vitest store/组件测试
cd frontend && npx vue-tsc --noEmit          # TypeScript 零错误门禁
```

## 项目结构

```text
backend/    Spring Boot REST API（/api/todos）
frontend/   Vue3 + Pinia 单页应用
specs/001-todo-management/  规格、计划、数据模型、API 契约与验收走查（quickstart.md）
```

更多验收场景见 `specs/001-todo-management/quickstart.md`。
