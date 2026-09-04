export interface Experience { id: string; type: 'work'; title: string; organization: string; location: string; startDate: string; endDate: string; details: string; tags: string[]; isCurrent?: boolean }
export interface EducationItem { id: string; degree: string; school: string; location: string; dateRange: string; gpa: string; description: string; badges: string[] }
export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
export interface Skill { id: string; name: string; level: SkillLevel }
export interface SkillCategory { id: string; title: string; color: string; skills: Skill[] }
export type AchievementCategory = 'project' | 'award' | 'certificate' | 'certification';
export interface Achievement { id: string; category: AchievementCategory; title: string; year: string; tag: string; rank: string; description: string; imageUrl: string }
export interface ProfileInfo { name: string; title: string; organization: string; location: string; email: string; website: string; stats: { label: string; value: string }[] }
export interface AboutMeData { experiences: Experience[]; educations: EducationItem[]; skillCategories: SkillCategory[]; achievements: Achievement[] }
