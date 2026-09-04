# My Workspace 项目开发指南与上下文

## 1. 项目简介 (Project Overview)

My Workspace 是一个个人职业资料管理与简历生成器，集成个人履历管理、多语言支持以及简历 PDF 导出功能，后续计划拓展预算管理等辅助模块。

## 2. 技术栈规格 (Tech Stack & Versions)

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4（注意使用 v4 的 `@import "tailwindcss";` 语法，避免写入 v3 配置）
- **Backend & BaaS**: Supabase
  - Auth: 邮箱登录/注册 + Google OAuth
  - Database: 存储个人 Profile、Experience、Education、Skills、Achievements
  - Storage: 保存证书/成就相关图片
- **Libraries**:
  - `html2pdf.js`: 简历 PDF 导出引擎
  - `browser-image-compression`: 客户端图片压缩
  - `i18next` / `react-i18next`: 国际化（中/英双语）
- **Hosting & CI/CD**: Netlify（仅构建并托管 `main` 生产分支）

## 3. 分支管理与发布流程 (Branching & Deployment Rules)

- **`main` 分支（Production）**：生产环境代码，已与 Netlify 连动实现自动构建与发布。
  - **规则**：严禁直接在 `main` 分支上开发实验性功能或推送未经测试的代码。
- **`staging` 分支（Staging）**：预发布与功能集成分支。
  - **规则**：日常功能开发或改动应先合并至 `staging` 分支进行本地/预发布验证，确认无误后再发起 PR 或 Merge 到 `main`。
- **数据库架构变更风险控制**：
  - 由于 Supabase 目前直接支撑生产数据，所有涉及数据库 Schema（表结构、RLS 策略、存储桶配置）的变动必须保持向前兼容，严禁直接执行破坏性 SQL 操作（如删除已有字段或破坏性的结构改动）。

## 4. 核心数据流 (Data Flow & Architecture)

1. 认证流程：`Supabase Auth` -> 获得 `user.id` -> 触发读取个人全部关联数据。
2. 数据同步：页面进行 CRUD 操作 -> 即时更新本地 React State -> 增量同步至 Supabase DB。
3. 图片处理：用户上传证书 -> `browser-image-compression` 压缩 -> 提交至 Supabase Storage -> 保存 URL 至数据库。
4. PDF 生成：读取对应模块配置 -> 渲染目标 DOM -> 调用 `html2pdf.js` 生成下载。

## 5. 当前功能状态与路线图 (Status & Roadmap)

### ✅ 已实现 (Stable)

- 用户认证（Supabase Auth）
- 个人信息、履历（工作/教育）、技能（分等级/类别）、成就/证书管理
- 证书图片上传（Storage 流程）
- 中英文多语言切换
- 定制模块选择并导出 CV / Resume PDF

### 待实现 / 进行中 (In Progress / TODO)

- **Budget Tracker**：侧边栏已有路由入口，目前为占位页面，后端数据库表及 CRUD 尚未建立。
- **简历拖拽导入**：解析外部简历文件并填入对应表单。
- **独立认证与论文管理**：进一步拆分成就模块。
- **README.md 更新**：项目根目录 README 仍为默认 Vite 模版，需要重写。

## 6. 编码规范与约束 (Coding Guidelines)

- **组件规范**：使用 TypeScript 强类型定义，禁止使用 `any`。所有与 Supabase 交互的数据必须定义清晰的 Type/Interface。
- **样式规范**：严格遵守 Tailwind CSS v4 语法规则。保持 UI 主题一致性，优先使用现有的 Tailwind 设计 Token。
- **国际化规范**：新增任何 UI 文本时，必须同步在 `i18n` 语言包（中文/英文）中追加对应键值，禁止直接硬编码中文/英文字符串。
- **副作用控制**：调用 Supabase API 时务必包含错误处理（`try/catch` 或检查 `error` 返回），并向用户展示清晰的 Alert 或 Toast 提示。
- **Git 提交流程约束**：AI Agent 生成分支命令或建议提交代码时，必须优先以 `staging` 分支为工作目标。

## 7. 开发者命令 (Developer Commands)

- 本地启动：`npm run dev`
- 类型检查：`npx tsc --noEmit`
- 项目构建：`npm run build`
