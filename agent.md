# My Workspace Agent Context & Project Memory

> **IMPORTANT FOR AI AGENTS**：每次完成功能、数据库 Schema、API 接口、架构重构或新增页面后，都必须同步更新本文件。项目只维护这一份 Agent 上下文文件。

---

## 1. 项目概览与技术栈

- **项目名称**：My Workspace（个人职业资料、简历生成与个人预算工作空间）。
- **前端**：React 19、TypeScript 6、Vite 8。
- **样式**：Tailwind CSS v4，通过 `@tailwindcss/vite` 集成；入口使用 `@import "tailwindcss"`。
- **后端**：Supabase（PostgreSQL、Auth、Realtime、Storage）。
- **认证**：邮箱登录/注册及 Google OAuth；`AuthProvider` 负责 Session 初始化、认证状态监听与退出登录。
- **国际化**：`i18next` / `react-i18next`，当前提供中文和英文。
- **主要依赖**：Recharts、`html2pdf.js`、`browser-image-compression`、Lucide React。
- **PWA / 托管**：`vite-plugin-pwa` + Netlify。
- **路径别名**：`@` 指向 `src`。

## 2. 环境与分支策略

- `staging`：预发布和日常开发分支，Agent 修改默认以该分支为目标。
- `main`：生产分支，只在 `staging` 验证通过后合并。
- **Staging Supabase**：`ltkqxhlhxkmxoixigcja.supabase.co`。
- **Production Supabase**：`cqxjioppgcxbjzrfifds.supabase.co`。
- 环境变量参考 `.env.example`，禁止把 `.env.local` 或密钥提交到 Git。

### 数据库迁移规则

- 所有 Schema / RLS 变更都放在 `supabase/migrations/`，尽量保持幂等（如 `IF NOT EXISTS`、先 `DROP POLICY IF EXISTS`）。
- Schema 字段变更后加入 `NOTIFY pgrst, 'reload schema';`。
- 用户私有数据表使用 `profile_id UUID REFERENCES public.profiles(id)`，查询和 Mutation 必须同时按当前用户隔离。

## 3. 构建与部署

- 本地验证：`npm run lint` 和 `npm run build`。
- Staging 无云端构建分钟部署：先运行 `npm run build`，再运行 `npx netlify deploy --alias staging --dir dist --no-build`。
- Staging 地址：`https://staging--fieanfieanworkspace.netlify.app`。
- 必须保留 `--no-build`，避免 Netlify 再次构建并消耗构建分钟。
- **强制交付规则**：以后每次修改代码，都必须在本地验证和构建成功后执行 `npx netlify deploy --alias staging --dir dist --no-build`，不能只运行 `git push` 代替部署。
- 每次完成代码修改后的回复必须明确报告 Netlify Staging 部署是否成功，并提供部署命令返回的 Preview URL / Logs URL（如有）和固定 Staging 地址，方便用户立即验收。
- 如果部署因认证、网络、Netlify CLI 或外部服务问题失败，必须如实报告错误和阻塞原因，不能把仅本地构建或 Git 推送描述为已部署。

## 4. 当前应用架构

- `App.tsx` 在认证后维护 `profile | budget` 活动页签、桌面侧栏折叠状态及左右移动抽屉状态。
- `Sidebar`：桌面端固定且可折叠；移动端为左侧 Overlay 导航抽屉。
- `Header`：移动端始终提供可见的汉堡菜单和工具按钮，同时提供主题及语言切换。
- Profile 页右侧为 CV / Resume 工具抽屉；Budget 页右侧为 Quick Add 交易工具抽屉。
- 抽屉打开时锁定 `body` 滚动，支持遮罩点击、关闭按钮与 `Escape` 关闭。

### 移动端抽屉手势（必须保持）

- 只在屏宽 `< 768px` 时启用；水平位移必须大于 `50px` 且大于垂直位移。
- 所有抽屉关闭时：从左侧 **16–80px** 检测带向右滑打开导航，从右侧 **16–80px** 检测带向左滑打开工具。
- 任一抽屉已打开时，合格的水平滑动优先关闭当前抽屉并立即结束，绝不能在同一次手势中打开另一侧抽屉。
- 标记为 `data-horizontal-scroll` 的图表/表格区域不参与抽屉手势判断。
- 抽屉容器必须保留 `touch-action: pan-y`（`touch-pan-y`）和 `overscroll-behavior-x: contain`（`overscroll-x-contain`）。
- 手势只是增强功能；可见按钮、关闭按钮和遮罩点击是必需的无手势 fallback。

## 5. 已实现功能

### A. Portfolio / Profile Manager

- 读取并维护 `profiles`、`experiences`、`educations`、`skill_categories`、`skills`、`achievements` 数据。
- 支持个人资料编辑、头像上传，以及工作经历、教育、技能和成就的新增、编辑与删除。
- 工作和教育经历按最新时间排序；在职经历优先展示。
- 成就支持 project、award、certificate、certification 分类，支持图片/PDF 附件、详情查看和删除确认。
- 文件上传使用 Supabase Storage 的 `certificates` bucket；图片先经 `browser-image-compression` 压缩。头像限制 3MB，并写回 `profiles.avatar_url`。
- CV / Resume 导出可选择 Experience、Education、Skills、Achievements、Publications 和 Certifications 模块；Resume 使用更紧凑内容，最终由 `html2pdf.js` 生成 PDF。
- Profile 更新会通过 `profile-updated` 浏览器事件同步 Sidebar 用户信息。

### B. Budget Tracker

- 核心表：`public.transactions`，字段包含 `profile_id`、`type`、MYR 基准 `amount`、描述、日期、可选 `transaction_time`、分类及原币信息。
- 类别：Salary、Groceries、Food、Transport、Utilities、Entertainment、Freelance、Healthcare、Other。
- 支持新增、编辑、删除和 Supabase Realtime 多端同步；编辑/删除均按 `id + profile_id` 限定。
- Canonical UPDATE RLS Policy：`Users can update their own transactions`，同时包含 `USING` 与 `WITH CHECK (auth.uid() = profile_id)`。
- Dashboard 展示总余额、本月收入、本月支出及环比变化。
- 支持描述/本地化类别搜索、类别筛选、收支类型筛选，以及本周、本月、近三个月和自定义日期范围。
- 同一份 `filteredTransactions` 同时驱动交易列表、统计图表和匹配数量，避免 UI 数据口径不一致。
- Recharts Area Chart 支持日/周/月聚合；横向视口支持原生触控和鼠标拖动，不使用 Recharts `Brush`。
- 基准币种为 MYR；支持 MYR、USD、SGD、JPY、EUR、GBP、CNY、THB、TWD。
- `amount` 保存折算后的 MYR 金额；`original_currency`、`original_amount`、`exchange_rate` 保存原币信息。
- 外币汇率来自无 Key 的 Open ExchangeRate-API，以 MYR 报价倒数换算成“1 单位外币对应 MYR”；内存缓存请求结果，失败时允许手动输入并显示来源及错误提示。
- `supabase/functions/parse-receipt` 接收 FormData、JSON/data URL base64、纯 base64 或原始图片，通过 `GEMINI_API_KEY` 调用当前 GA 的 `gemini-3.7-flash` 多模态模型，并将收据严格校验为 MYR 交易 JSON；端点必须使用 `/models/${MODEL_NAME}:generateContent` 的冒号语法。Gemini API Key 必须先 `trim()`，仅通过 URL 的 `?key=` query parameter 发送，禁止作为 `Authorization: Bearer` header。函数必须保持全局 try/catch、所有响应的 CORS headers、缺少 Secret 时的明确 500 JSON，以及 Gemini JSON / markdown code fence 清理。Quick Add 顶部通过显式按钮触发标准 `accept="image/*"` 隐藏文件输入（不设置 `capture`，保留手机相机/图库/文件选择及桌面文件选择），图片先以 `browser-image-compression` 压缩至目标 1MB、最长边 1920px，再显示全表单加载遮罩并自动填充金额、日期、时间、商户、收支类型与类别。
- `src/lib/deduplication.ts` 提供纯函数 OCR 交易去重：金额误差 `< 0.01`、同日期、双方有时间时相差不超过 5 分钟，并结合标准化子串与 Dice coefficient 商户名相似度；返回最强匹配及 0–1 分数。
- OCR 填充后立即执行去重；命中时在表单顶部显示现有交易的日期、金额和商户警告，但不锁定字段或阻止用户确认保存。
- 每次 OCR 选择都会重新压缩图片，并在 `finally` 同时清空事件 input 与 `fileInputRef`，保证连续选择同一文件也触发；前端读取 Edge Function 的结构化错误，429/503 显示本地化限流或服务繁忙提示。Edge Function 对 Gemini 429/503 最多额外重试 2 次，每次间隔 1 秒；其他状态立即处理，最终仍失败时透传 Gemini 400–599 状态和安全错误信息，主模型 404 时按兼容要求尝试 `gemini-2.0-flash` fallback。

### C. 主题与国际化

- `ThemeContext` 控制 `<html>` 的 `.dark` 类，使用 `localStorage` 记忆主题，并以系统偏好作为首次默认值。
- 所有新增 UI 文本必须同步加入 `src/i18n.ts` 的 `en` 与 `zh` 资源，禁止只新增单语或散落硬编码。
- 新增组件必须同时验证 Light / Dark 主题；现有 `index.css` 包含旧色板到浅色主题的兼容桥接。

### D. PWA

- `VitePWA` 使用 `registerType: 'autoUpdate'` 和 Workbox `generateSW`。
- 缓存 JS、CSS、HTML、图标、图片和字体，导航 fallback 为 `index.html`，并清理旧缓存。
- Manifest 名称为 `My Workspace & Budget Tracker`，`display: standalone`、竖屏方向，提供 192px 和 512px（含 maskable）图标。

## 6. 响应式与交互规范

- `< md (768px)` 默认单列、全宽；`≥ md` 才展开多列。
- 所有移动端按钮、输入框和 Select 的可点击高度至少为 `44px`。
- 页面外层禁止整体横向滚动；只有明确标记的局部容器允许横向滚动。
- Modal 在移动端必须可滚动，并考虑软键盘遮挡提交区域。
- 顶部控制栏保持 Sticky 毛玻璃视觉；Overlay 抽屉必须包含可访问名称、关闭按钮和遮罩。
- 新交互需支持键盘操作、合理的 `aria-label` / `aria-current` / `role="alert"`。

## 7. 编码约束

1. 开启 TypeScript 严格类型思维，禁止引入 `any`；外部数据先定义 Interface 或用 `unknown` 做收窄。
2. Supabase 调用必须检查返回的 `error` 或使用 `try/catch`，并给用户可理解的错误反馈。
3. Mutation 后应确保页面数据、统计与图表同步；优先复用 Hook / `src/lib` 中的纯函数。
4. 不在组件中复制汇率、筛选、排序、上传等领域逻辑，分别复用 `exchangeRates.ts`、`budgetFilters.ts`、`timelineSort.ts`、`storage.ts`。
5. 修改完成后至少运行与风险相称的 `npm run lint`、`npm run build` 或目标测试。
6. 不创建额外的 `AGENTS.md`；项目上下文统一维护在本 `agent.md`。
