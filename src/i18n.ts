import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: { translation: {
    sidebar: { workspace: 'My Workspace', navigation: 'Main navigation', profile: 'My Profile', budget: 'Budget Tracker', expand: 'Expand sidebar', collapse: 'Collapse sidebar', switchLanguage: 'Switch language' },
    profile: { stats: { experience: 'Years experience', projects: 'Projects', awards: 'Awards', certificates: 'Certificates' }, avatar: { alt: '{{name}} profile photo', change: 'Upload or change profile photo', uploadError: 'Unable to upload profile photo.' } },
    account: { user: 'User', manage: 'Manage account', logout: 'Logout', signingOut: 'Signing out…', signOutError: 'Unable to sign out.' },
    achievements: { downloadPdf: 'Download PDF', downloadImage: 'Download image', viewDetails: 'View Details', noTag: 'No tag', noDescription: 'No description provided.', categories: { project: 'Project', award: 'Award', certificate: 'Certificate', certification: 'Certification' } },
    upload: { fileTooLarge: 'File size exceeds 3MB limit. Please upload a smaller file.' },
    sections: { academic: 'Academic', education: 'Education', expertise: 'Expertise', skills: 'Skills & Tools', recognition: 'Recognition', achievements: 'Achievements', experience: 'Work Experience' },
    common: { cancel: 'Cancel', close: 'Close', add: 'Add', edit: 'Edit' },
    form: { required: 'This field is required', levelRange: 'Level must be between 0 and 100', titles: { experience: 'Add experience', education: 'Add education', skill: 'Add skill', achievement: 'Add achievement' }, title: 'Title', organization: 'Organization', location: 'Location', dateRange: 'Date range', startDate: 'Start date', endDate: 'End date', tags: 'Tags (comma separated)', details: 'Details', isCurrent: 'Current role', degree: 'Degree', school: 'School', gpa: 'GPA', badges: 'Badges (comma separated)', description: 'Description', category: 'Category', name: 'Name', level: 'Level (%)', year: 'Year', tag: 'Tag', tagPlaceholder: 'e.g. React Native, AI, Hackathon', rank: 'Rank / award', customRank: 'Custom rank or award', rankPlaceholder: 'e.g. Top 1% Global or Best Design Award', rankOptions: { first: '1st Place (Champion)', second: '2nd Place (Runner-Up)', third: '3rd Place', finalist: 'Top 10 / Finalist', distinction: 'Passed with Distinction', certified: 'Certified', contributor: 'Main Contributor', custom: 'Other (Custom)' }, imageUrl: 'Image URL' },
    exportPanel: { title: 'Resume Generator', selectSections: 'SELECT SECTIONS', sections: { experience: 'Include Work Experience', education: 'Include Education', skills: 'Include Skills & Tools', achievements: 'Include Achievements', publications: 'Include Publications', certifications: 'Include Certifications' }, btnExportCv: 'Export as CV', btnExportResume: 'Export as Resume' },
  } },
  zh: { translation: {
    sidebar: { workspace: '我的工作空间', navigation: '主导航', profile: '个人主页', budget: '预算管理', expand: '展开侧边栏', collapse: '收起侧边栏', switchLanguage: '切换语言' },
    profile: { stats: { experience: '工作年限', projects: '项目', awards: '奖项', certificates: '证书数量' }, avatar: { alt: '{{name}} 的个人头像', change: '上传或更换个人头像', uploadError: '无法上传个人头像。' } },
    account: { user: '用户', manage: '管理账号', logout: '退出登录', signingOut: '正在退出…', signOutError: '无法退出登录。' },
    achievements: { downloadPdf: '下载 PDF', downloadImage: '下载图片', viewDetails: '查看详情', noTag: '无标签', noDescription: '暂无描述。', categories: { project: '项目', award: '奖项', certificate: '证书', certification: '认证' } },
    upload: { fileTooLarge: '文件大小超过 3MB 限制，请上传较小的文件。' },
    sections: { academic: '学术背景', education: '教育经历', expertise: '专业技能', skills: '技能与工具', recognition: '荣誉认可', achievements: '成就与奖项', experience: '工作经历' },
    common: { add: '新增', cancel: '取消', close: '关闭', edit: '编辑' },
    form: { required: '此项为必填项', levelRange: '熟练度必须在 0 到 100 之间', titles: { experience: '新增工作经历', education: '新增教育经历', skill: '新增技能', achievement: '新增成就' }, title: '标题', organization: '公司 / 组织', location: '地点', dateRange: '日期范围', startDate: '开始日期', endDate: '结束日期', tags: '标签（逗号分隔）', details: '详情', isCurrent: '目前任职', degree: '学位', school: '学校', gpa: 'GPA', badges: '荣誉（逗号分隔）', description: '描述', category: '分类', name: '名称', level: '熟练度 (%)', year: '年份', tag: '标签', tagPlaceholder: '例如 React Native、AI、Hackathon', rank: '名次 / 奖项', customRank: '自定义排名或奖项', rankPlaceholder: '例如全球前 1% 或最佳设计奖', rankOptions: { first: '第一名（冠军）', second: '第二名（亚军）', third: '第三名', finalist: '前十名 / 决赛入围', distinction: '优异成绩通过', certified: '已认证', contributor: '主要贡献者', custom: '其他（自定义）' }, imageUrl: '图片 URL' },
    exportPanel: { title: '简历生成器', selectSections: '选择模块', sections: { experience: '包含工作经历', education: '包含教育经历', skills: '包含技能', achievements: '包含成就', publications: '包含论文', certifications: '包含认证' }, btnExportCv: '导出 CV', btnExportResume: '导出 Resume' },
  } },
};

i18n.use(LanguageDetector).use(initReactI18next).init({ resources, fallbackLng: 'en', interpolation: { escapeValue: false } });
export default i18n;
