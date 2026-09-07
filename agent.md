# My Workspace Agent Context & Project Memory

> **IMPORTANT FOR AI AGENTS**: 
> Whenever you complete a feature, update database schema, modify API interfaces, refactor architecture, or create new pages, **you MUST update this `agent.md` file** in the same commit to keep project context continuously aligned. Only maintain this single `agent.md` file.

---

## 1. Project Overview & Tech Stack
- **Project Name**: My Workspace (个人职业资料管理、简历生成与个人预算工作空间)
- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4（注意：必须遵循 Tailwind v4 的 `@import "tailwindcss";` 语法规则）
- **Backend & BaaS**: Supabase (PostgreSQL, Auth & Storage)
  - Auth: 邮箱登录/注册 + Google OAuth
  - Storage: 证书/成就图片存储 (支持 `browser-image-compression` 客户端压缩)
- **Internationalization**: `i18next` / `react-i18next` (中/英双语，所有 UI 文本严禁硬编码)
- **Libraries**: `html2pdf.js` (PDF 导出引擎), Recharts (图表统计)
- **PWA & Hosting**: `vite-plugin-pwa`, Netlify

---

## 2. Environments & Branch Strategy
- **Branching Rules**:
  - `staging`: 预发布与日常开发分支。所有 AI Agent 生成的代码或修改必须优先以 `staging` 为工作目标。
  - `main`: 生产环境分支。仅在 `staging` 验证完毕后合并，触发 Netlify 自动打包发布。
- **Dual Supabase Setup**:
  - **Staging Database**: `ltkqxhlhxkmxoixigcja.supabase.co`
  - **Production Database**: `cqxjioppgcxbjzrfifds.supabase.co`
- **Database Migrations Policy**:
  - 所有数据库变更必须编写幂等 SQL 脚本（如 `IF NOT EXISTS`）并存放在 `supabase/migrations/`。
  - 更改字段后务必包含 `NOTIFY pgrst, 'reload schema';`。
  - 所有用户关联表必须包含 `profile_id UUID REFERENCES public.profiles(id)`。

---

## 3. Deployment Flow & Netlify Rules
- **No-build-minute Staging Deploy**: 
  - 本地运行 `npm run build` 打包。
  - 使用 `npx netlify deploy --alias staging --dir dist --no-build` 直传静态产物至 Staging (`https://staging--fieanfieanworkspace.netlify.app`)。
  - **必须带有 `--no-build` 标识**，防止 Netlify 云端拉取线上环境变量重新构建并消耗构建分钟数。

---

## 4. Mandatory Responsive UI Guidelines (电脑与手机双端适配规范)

> **核心原则**：所有现有及未来新增的页面/模块，**必须严格实现 PC 电脑端与 Mobile 手机端的双端良好适配**。

1. **移动优先与单列退化（Mobile-first Stack）**：
   - 屏宽 `< md (768px)` 时，任何卡片、表单、网格布局必须自动降级为单列堆叠（`grid-cols-1` 或 `flex-col`），全宽展示（`w-full`）。
   - 屏宽 `≥ md (768px)` 时，才展开为双列或多列布局（如 `md:grid-cols-2`）。
2. **导航与抽屉菜单（Navigation Drawer）**：
   - 窄屏（`< md`）下隐藏固定侧边栏，改为顶部导航栏 + 汉堡包（☰）按钮，点击后滑出 Overlay 抽屉菜单。
   - 宽屏（`≥ md`）保持固定或可折叠侧边栏。
3. **触控与防溢出约束**：
   - 移动端所有交互元素（按钮、输入框、Select）必须保持至少 `44px` 的触控高度。
   - 外层主容器必须包含 `overflow-x-hidden`，严禁出现页面整体横向滚动条。
   - Modal 弹窗在手机上必须支持自适应滚动，防止键盘弹出时遮挡提交按钮。

---

## 5. Active Features & Architecture

### A. Portfolio / Profile Manager
- 包含工作经历、教育背景、技能、成就与项目管理。
- 支持选定模块实时预览与导出 CV / Resume PDF。
- 已全面适配移动端单列堆叠与全宽操作控制。

### B. Budget Tracker (`/budget`)
- **Table**: `public.transactions`
- **UI & Analytics**: 账户余额、本月收支统计（带百分比变化）、Recharts 6 个月 Area Chart。
- **Categories**: Salary, Groceries, Food (餐饮), Transport, Utilities, Entertainment, Freelance, Healthcare, Other.
- 支持 Supabase Realtime 多端同步。

### C. Theme System
- 集中式 `ThemeContext` 控制 `<html>` 的 `.dark` 类，支持 `localStorage` 记忆与系统偏好切换。
- 所有 UI 组件必须显式支持 Light/Dark 双主题样式（如 `bg-white dark:bg-[#161B26] text-gray-900 dark:text-gray-100`）。

### D. PWA Capabilities
- 包含 `manifest.webmanifest`、`sw.js` 及 192/512 图标，支持 iOS/Android 独立模式安装（`display: standalone`）。

---

## 6. Coding & Agent Constraints
1. **TypeScript 严谨性**: 严禁使用 `any` 类型，所有数据模型必须定义清晰的 Interface。
2. **i18n 规范**: 新增 UI 文字必须同步追加中文 (`zh`) 与英文 (`en`) 语言包。
3. **错误处理**: Supabase API 调用必须包含 `try/catch` 或 `error` 返回判断，并给予用户 Toast 提示。
4. **清理旧文件**: 完成后请安全删除根目录下的 `AGENTS.md` 文件。
