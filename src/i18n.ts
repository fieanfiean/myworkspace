import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: { translation: {
    theme: { switchToLight: 'Switch to light mode', switchToDark: 'Switch to dark mode' },
    sidebar: { workspace: 'My Workspace', navigation: 'Main navigation', profile: 'My Profile', budget: 'Budget Tracker', expand: 'Expand sidebar', collapse: 'Collapse sidebar', openMenu: 'Open navigation menu', closeMenu: 'Close navigation menu', openTools: 'Open tools panel', closeTools: 'Close tools panel', switchLanguage: 'Switch language' },
    budget: {
      title: 'Budget Tracker', subtitle: 'A clear view of your income, spending, and cash flow.', income: 'Income', expense: 'Expense', loading: 'Loading transactions…',
      stats: { totalBalance: 'Total Balance', monthlyIncome: 'Monthly Income', monthlyExpenses: 'Monthly Expenses', updatedToday: 'Updated today', vsLastMonth: '{{value}} vs last month' },
      chart: { title: 'Income vs Expenses', period: 'Last 6 months', filteredPeriod: 'Updates with transaction filters', weekOf: 'Week of', granularity: { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' } },
      recent: { title: 'Recent Transactions', count_one: '{{count}} transaction', count_other: '{{count}} transactions', date: 'Date', description: 'Description', category: 'Category', amount: 'Amount', actions: 'Actions', empty: 'No transactions yet. Add your first one to get started.', noMatches: 'No transactions match these filters.' },
      filters: { search: 'Search transactions', searchPlaceholder: 'Search description or category', category: 'Category filter', allCategories: 'All categories', type: 'Transaction type', allTypes: 'All types', dateRange: 'Date range', from: 'From', to: 'To', results_one: '{{count}} matching transaction', results_other: '{{count}} matching transactions', ranges: { all: 'All dates', week: 'This week', month: 'This month', threeMonths: 'Last 3 months', custom: 'Custom range' } },
      edit: { action: 'Edit transaction', title: 'Edit Transaction', save: 'Save Changes' },
      delete: { action: 'Delete transaction', title: 'Delete transaction?', message: '“{{description}}” will be permanently deleted.', error: 'Unable to delete the transaction.' },
      exchange: { manualFallback: 'Latest rate could not be loaded. Please enter the exchange rate manually.', attribution: 'Rates by', sourceLabel: 'Exchange-rate data source' },
      form: { title: 'Add Transaction', subtitle: 'Record income or an expense', type: 'Type', amount: 'Amount', currency: 'Currency', exchangeRate: 'Exchange Rate', convertedAmount: 'Amount in MYR', description: 'Description', descriptionPlaceholder: 'e.g. Grocery run', date: 'Date', category: 'Category', save: 'Save Transaction', saving: 'Saving…', validation: 'Enter a description, an amount greater than zero, and a valid exchange rate.', saveError: 'Unable to save the transaction.' },
      categories: { salary: 'Salary', groceries: 'Groceries', food: 'Food', transport: 'Transport', utilities: 'Utilities', entertainment: 'Entertainment', freelance: 'Freelance', healthcare: 'Healthcare', other: 'Other' },
    },
    profile: { stats: { experience: 'Years experience', projects: 'Projects', awards: 'Awards', certificates: 'Certificates' }, avatar: { alt: '{{name}} profile photo', change: 'Upload or change profile photo', uploadError: 'Unable to upload profile photo.' } },
    account: { user: 'User', manage: 'Manage account', logout: 'Logout', signingOut: 'Signing out…', signOutError: 'Unable to sign out.' },
    achievements: { downloadPdf: 'Download PDF', downloadImage: 'Download image', viewDetails: 'View Details', noTag: 'No tag', noDescription: 'No description provided.', categories: { project: 'Project', award: 'Award', certificate: 'Certificate', certification: 'Certification' } },
    upload: { fileTooLarge: 'File size exceeds 3MB limit. Please upload a smaller file.' },
    sections: { academic: 'Academic', education: 'Education', expertise: 'Expertise', skills: 'Skills & Tools', recognition: 'Recognition', achievements: 'Achievements', experience: 'Work Experience' },
    common: { cancel: 'Cancel', close: 'Close', add: 'Add', edit: 'Edit', delete: 'Delete', deleting: 'Deleting…' },
    form: { required: 'This field is required', levelRange: 'Level must be between 0 and 100', titles: { experience: 'Add experience', education: 'Add education', skill: 'Add skill', achievement: 'Add achievement' }, title: 'Title', organization: 'Organization', location: 'Location', dateRange: 'Date range', startDate: 'Start date', endDate: 'End date', tags: 'Tags (comma separated)', details: 'Details', isCurrent: 'Current role', degree: 'Degree', school: 'School', gpa: 'GPA', badges: 'Badges (comma separated)', description: 'Description', category: 'Category', name: 'Name', level: 'Level (%)', year: 'Year', tag: 'Tag', tagPlaceholder: 'e.g. React Native, AI, Hackathon', rank: 'Rank / award', customRank: 'Custom rank or award', rankPlaceholder: 'e.g. Top 1% Global or Best Design Award', rankOptions: { first: '1st Place (Champion)', second: '2nd Place (Runner-Up)', third: '3rd Place', finalist: 'Top 10 / Finalist', distinction: 'Passed with Distinction', certified: 'Certified', contributor: 'Main Contributor', custom: 'Other (Custom)' }, imageUrl: 'Image URL' },
    exportPanel: { title: 'Resume Generator', selectSections: 'SELECT SECTIONS', sections: { experience: 'Include Work Experience', education: 'Include Education', skills: 'Include Skills & Tools', achievements: 'Include Achievements', publications: 'Include Publications', certifications: 'Include Certifications' }, btnExportCv: 'Export as CV', btnExportResume: 'Export as Resume' },
  } },
  zh: { translation: {
    theme: { switchToLight: '切换到浅色模式', switchToDark: '切换到深色模式' },
    budget: {
      title: '预算管理', subtitle: '清晰掌握你的收入、支出与现金流。', income: '收入', expense: '支出', loading: '正在加载交易…',
      stats: { totalBalance: '总余额', monthlyIncome: '本月收入', monthlyExpenses: '本月支出', updatedToday: '今日已更新', vsLastMonth: '较上月 {{value}}' },
      chart: { title: '收入与支出', period: '最近 6 个月', filteredPeriod: '随交易筛选条件实时更新', weekOf: '周始于', granularity: { daily: '每日', weekly: '每周', monthly: '每月' } },
      recent: { title: '最近交易', count: '{{count}} 笔交易', date: '日期', description: '描述', category: '类别', amount: '金额', actions: '操作', empty: '暂无交易，添加第一笔记录即可开始。', noMatches: '没有符合当前筛选条件的交易。' },
      filters: { search: '搜索交易', searchPlaceholder: '搜索描述或类别', category: '类别筛选', allCategories: '全部类别', type: '收支类型', allTypes: '全部类型', dateRange: '日期范围', from: '开始日期', to: '结束日期', results: '{{count}} 笔匹配交易', ranges: { all: '全部日期', week: '本周', month: '本月', threeMonths: '近 3 个月', custom: '自定义范围' } },
      edit: { action: '编辑交易', title: '编辑交易', save: '保存修改' },
      delete: { action: '删除交易', title: '删除这笔交易？', message: '“{{description}}” 将被永久删除。', error: '无法删除这笔交易。' },
      exchange: { manualFallback: '无法获取最新汇率，请手动输入汇率。', attribution: '汇率来源', sourceLabel: '查看汇率数据来源' },
      form: { title: '新增交易', subtitle: '记录一笔收入或支出', type: '类型', amount: '金额', currency: '币种', exchangeRate: '汇率', convertedAmount: '折算 MYR 金额', description: '描述', descriptionPlaceholder: '例如：采购日用品', date: '日期', category: '类别', save: '保存交易', saving: '正在保存…', validation: '请输入描述、大于零的金额及有效汇率。', saveError: '无法保存这笔交易。' },
      categories: { salary: '薪资', groceries: '日用品', food: '餐饮', transport: '交通', utilities: '水电账单', entertainment: '娱乐', freelance: '自由职业', healthcare: '医疗保健', other: '其他' },
    },
    sidebar: { workspace: '我的工作空间', navigation: '主导航', profile: '个人主页', budget: '预算管理', expand: '展开侧边栏', collapse: '收起侧边栏', openMenu: '打开导航菜单', closeMenu: '关闭导航菜单', openTools: '打开工具面板', closeTools: '关闭工具面板', switchLanguage: '切换语言' },
    profile: { stats: { experience: '工作年限', projects: '项目', awards: '奖项', certificates: '证书数量' }, avatar: { alt: '{{name}} 的个人头像', change: '上传或更换个人头像', uploadError: '无法上传个人头像。' } },
    account: { user: '用户', manage: '管理账号', logout: '退出登录', signingOut: '正在退出…', signOutError: '无法退出登录。' },
    achievements: { downloadPdf: '下载 PDF', downloadImage: '下载图片', viewDetails: '查看详情', noTag: '无标签', noDescription: '暂无描述。', categories: { project: '项目', award: '奖项', certificate: '证书', certification: '认证' } },
    upload: { fileTooLarge: '文件大小超过 3MB 限制，请上传较小的文件。' },
    sections: { academic: '学术背景', education: '教育经历', expertise: '专业技能', skills: '技能与工具', recognition: '荣誉认可', achievements: '成就与奖项', experience: '工作经历' },
    common: { add: '新增', cancel: '取消', close: '关闭', edit: '编辑', delete: '删除', deleting: '正在删除…' },
    form: { required: '此项为必填项', levelRange: '熟练度必须在 0 到 100 之间', titles: { experience: '新增工作经历', education: '新增教育经历', skill: '新增技能', achievement: '新增成就' }, title: '标题', organization: '公司 / 组织', location: '地点', dateRange: '日期范围', startDate: '开始日期', endDate: '结束日期', tags: '标签（逗号分隔）', details: '详情', isCurrent: '目前任职', degree: '学位', school: '学校', gpa: 'GPA', badges: '荣誉（逗号分隔）', description: '描述', category: '分类', name: '名称', level: '熟练度 (%)', year: '年份', tag: '标签', tagPlaceholder: '例如 React Native、AI、Hackathon', rank: '名次 / 奖项', customRank: '自定义排名或奖项', rankPlaceholder: '例如全球前 1% 或最佳设计奖', rankOptions: { first: '第一名（冠军）', second: '第二名（亚军）', third: '第三名', finalist: '前十名 / 决赛入围', distinction: '优异成绩通过', certified: '已认证', contributor: '主要贡献者', custom: '其他（自定义）' }, imageUrl: '图片 URL' },
    exportPanel: { title: '简历生成器', selectSections: '选择模块', sections: { experience: '包含工作经历', education: '包含教育经历', skills: '包含技能', achievements: '包含成就', publications: '包含论文', certifications: '包含认证' }, btnExportCv: '导出 CV', btnExportResume: '导出 Resume' },
  } },
};

i18n.use(LanguageDetector).use(initReactI18next).init({ resources, fallbackLng: 'en', interpolation: { escapeValue: false } });
export default i18n;
