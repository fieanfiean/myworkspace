import type { AboutMeData, ProfileInfo } from '../types/profile';

export const mockProfile: ProfileInfo = { name: 'Alex Kim', title: 'Senior Product Engineer', organization: 'Stripe', location: 'San Francisco, CA', email: 'alex@stripe.com', website: 'alexkim.dev', stats: [{ label: '5 yrs', value: 'Experience' }, { label: '12+', value: 'Projects' }, { label: '6', value: 'Awards' }] };
export const initialAboutMeData: AboutMeData = {
  experiences: [
    { id: 'w1', type: 'work', title: 'Senior Product Engineer', organization: 'Stripe', location: 'San Francisco, CA', dateRange: 'Jan 2022 - Present', details: 'Leading infrastructure for developer-facing APIs and SDK tooling.', tags: ['TypeScript', 'Go'], isCurrent: true },
    { id: 'w2', type: 'work', title: 'Software Engineer II', organization: 'Notion', location: 'Remote', dateRange: 'Jun 2019 - Jul 2021', details: 'Built collaborative editing and offline sync.', tags: ['React', 'Rust'] },
  ],
  educations: [
    { id: 'e1', degree: 'M.Sc. Computer Science', school: 'Carnegie Mellon University', location: 'Pittsburgh, PA', dateRange: 'Aug 2020 - Dec 2022', gpa: 'GPA 3.9 / 4.0', description: 'Thesis: Fault Tolerance in Distributed Systems.', badges: ["Dean's List", 'Graduate Fellowship'] },
    { id: 'e2', degree: 'B.Eng. Software Engineering', school: 'University of Waterloo', location: 'Waterloo, ON', dateRange: 'Sep 2015 - Apr 2019', gpa: 'GPA 3.8 / 4.0', description: 'Graduated with Distinction.', badges: ['Distinction Honours'] },
  ],
  skillCategories: [
    { id: 'languages', title: 'LANGUAGES', color: 'bg-blue-600', skills: [{ id: 's1', name: 'TypeScript', level: 'Expert' }, { id: 's2', name: 'Go', level: 'Advanced' }] },
    { id: 'frontend', title: 'FRONTEND', color: 'bg-purple-600', skills: [{ id: 's3', name: 'React', level: 'Expert' }, { id: 's4', name: 'Tailwind CSS', level: 'Expert' }] },
    { id: 'backend', title: 'BACKEND & INFRA', color: 'bg-emerald-500', skills: [{ id: 's5', name: 'Node.js', level: 'Advanced' }, { id: 's6', name: 'Kubernetes', level: 'Intermediate' }] },
    { id: 'tools', title: 'TOOLS & PLATFORMS', color: 'bg-amber-500', skills: [{ id: 's7', name: 'AWS', level: 'Advanced' }, { id: 's8', name: 'Docker', level: 'Expert' }] },
  ],
  achievements: [
    { id: 'a1', title: 'MIT Hackathon', year: '2023', tag: 'Hackathon', rank: '1st Place', imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80' },
    { id: 'a2', title: 'Google Code Jam', year: '2022', tag: 'Competition', rank: 'Top 500 Global', imageUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&auto=format&fit=crop&q=80' },
  ],
};
