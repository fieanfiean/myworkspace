import { useRef, useState } from 'react';
import { Download, FileText, LoaderCircle } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/hooks/useT';
import { supabase } from '@/lib/supabase';
import type { AboutMeData } from '@/types/profile';
import type { Profile } from './EditProfileModal';
import { formatDateRange } from '@/lib/profileStats';

type SectionKey = 'experience' | 'education' | 'skills' | 'achievements' | 'publications' | 'certifications';
type ExportKind = 'cv' | 'resume';
type SectionSelection = Record<SectionKey, boolean>;
type ExtraRow = Record<string, unknown>;
interface ExportPayload { profile: Profile; publications: ExtraRow[]; certifications: ExtraRow[] }
interface ExportPanelProps { data: AboutMeData }

const initialSections: SectionSelection = {
  experience: true, education: true, skills: true, achievements: true, publications: false, certifications: false,
};
const value = (row: ExtraRow, ...keys: string[]) => {
  const match = keys.map(key => row[key]).find(item => typeof item === 'string' || typeof item === 'number');
  return match === undefined ? '' : String(match);
};

function ResumeDocument({ data: sourceData, payload, selected, kind }: { data: AboutMeData; payload: ExportPayload; selected: SectionSelection; kind: ExportKind }) {
  const { profile } = payload;
  const compact = kind === 'resume';
  const data = compact ? { ...sourceData, experiences: sourceData.experiences.slice(0, 3), educations: sourceData.educations.slice(0, 2), skillCategories: sourceData.skillCategories.slice(0, 4) } : sourceData;
  const publications = compact ? payload.publications.slice(0, 2) : payload.publications;
  const projects = sourceData.achievements.filter(item => item.category === 'project').slice(0, compact ? 2 : undefined);
  const awards = sourceData.achievements.filter(item => item.category === 'award').slice(0, compact ? 2 : undefined);
  const certifications = sourceData.achievements.filter(item => item.category === 'certificate' || item.category === 'certification').slice(0, compact ? 2 : undefined);
  const certificationRecords = compact ? payload.certifications.slice(0, Math.max(0, 2 - certifications.length)) : payload.certifications;
  const sectionTitle = { margin: compact ? '13px 0 6px' : '26px 0 12px', paddingBottom: compact ? 3 : 6, borderBottom: '2px solid #2563eb', color: '#0f172a', fontSize: compact ? 13 : 17, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em' };
  const itemStyle = { marginBottom: compact ? 6 : 15, breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const };
  return (
    <article style={{ width: 794, minHeight: 1123, height: compact ? 1123 : undefined, overflow: compact ? 'hidden' : 'visible', boxSizing: 'border-box', background: '#fff', color: '#334155', padding: compact ? '35px 45px' : '54px 60px', fontFamily: 'Arial, sans-serif', fontSize: compact ? 10 : 12, lineHeight: compact ? 1.3 : 1.5 }}>
      <header style={{ paddingBottom: compact ? 12 : 22, borderBottom: '3px solid #2563eb' }}>
        <h1 style={{ margin: 0, color: '#0f172a', fontSize: compact ? 25 : 32, lineHeight: 1.15 }}>{profile.full_name}</h1>
        <p style={{ margin: '7px 0 10px', color: '#2563eb', fontSize: 16, fontWeight: 600 }}>{[profile.headline, profile.company].filter(Boolean).join(' · ')}</p>
        <p style={{ margin: 0, color: '#64748b' }}>{[profile.location, profile.email, profile.website].filter(Boolean).join('  •  ')}</p>
      </header>

      {selected.experience && data.experiences.length > 0 && <section><h2 style={sectionTitle}>Work Experience</h2>{data.experiences.map(item => <div key={item.id} style={itemStyle}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}><strong style={{ color: '#0f172a', fontSize: 14 }}>{item.title}</strong><span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{formatDateRange(item)}</span></div><div style={{ color: '#2563eb', fontWeight: 600 }}>{item.organization}{item.location ? ` · ${item.location}` : ''}</div>{item.details && <p style={{ margin: '5px 0' }}>{item.details}</p>}{item.tags.length > 0 && <p style={{ margin: '4px 0', color: '#64748b' }}>{item.tags.join(' · ')}</p>}</div>)}</section>}

      {selected.education && data.educations.length > 0 && <section><h2 style={sectionTitle}>Education</h2>{data.educations.map(item => <div key={item.id} style={itemStyle}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}><strong style={{ color: '#0f172a', fontSize: 14 }}>{item.degree}</strong><span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{item.dateRange}</span></div><div style={{ color: '#2563eb', fontWeight: 600 }}>{item.school}{item.location ? ` · ${item.location}` : ''}</div>{item.description && <p style={{ margin: '5px 0' }}>{item.description}</p>}<p style={{ margin: '4px 0', color: '#64748b' }}>{[item.gpa, ...item.badges].filter(Boolean).join(' · ')}</p></div>)}</section>}

      {selected.skills && data.skillCategories.length > 0 && <section><h2 style={sectionTitle}>Skills &amp; Tools</h2>{data.skillCategories.map(category => <div key={category.id} style={{ ...itemStyle, display: 'flex', gap: 14 }}><strong style={{ minWidth: 130, color: '#0f172a' }}>{category.title}</strong><span>{category.skills.map(skill => `${skill.name} (${skill.level})`).join('  •  ')}</span></div>)}</section>}

      {selected.achievements && projects.length > 0 && <section><h2 style={sectionTitle}>Projects</h2>{projects.map(item => <div key={item.id} style={itemStyle}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}><strong style={{ color: '#0f172a', fontSize: 14 }}>{item.title}</strong><span style={{ color: '#64748b' }}>{item.year}</span></div><span>{[item.rank, item.tag].filter(Boolean).join(' · ')}</span>{item.description && <p style={{ margin: '5px 0' }}>{item.description}</p>}</div>)}</section>}

      {selected.achievements && awards.length > 0 && <section><h2 style={sectionTitle}>Awards &amp; Honors</h2>{awards.map(item => <div key={item.id} style={itemStyle}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}><strong style={{ color: '#0f172a', fontSize: 14 }}>{item.title}</strong><span style={{ color: '#64748b' }}>{item.year}</span></div><span>{[item.rank, item.tag].filter(Boolean).join(' · ')}</span>{item.description && <p style={{ margin: '5px 0' }}>{item.description}</p>}</div>)}</section>}

      {selected.publications && publications.length > 0 && <section><h2 style={sectionTitle}>Publications</h2>{publications.map((item, index) => <div key={value(item, 'id') || index} style={itemStyle}><strong style={{ color: '#0f172a', fontSize: 14 }}>{value(item, 'title', 'name')}</strong><div style={{ color: '#2563eb' }}>{[value(item, 'publisher', 'publication'), value(item, 'year', 'date', 'published_at')].filter(Boolean).join(' · ')}</div>{value(item, 'description', 'summary') && <p style={{ margin: '5px 0' }}>{value(item, 'description', 'summary')}</p>}</div>)}</section>}

      {selected.certifications && (certifications.length > 0 || certificationRecords.length > 0) && <section><h2 style={sectionTitle}>Certifications &amp; Workshops</h2>{certifications.map(item => <div key={item.id} style={itemStyle}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}><strong style={{ color: '#0f172a', fontSize: 14 }}>{item.title}</strong><span style={{ color: '#64748b' }}>{item.year}</span></div><span>{[item.rank, item.tag].filter(Boolean).join(' · ')}</span>{item.description && <p style={{ margin: '5px 0' }}>{item.description}</p>}</div>)}{certificationRecords.map((item, index) => <div key={value(item, 'id') || index} style={itemStyle}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}><strong style={{ color: '#0f172a', fontSize: 14 }}>{value(item, 'name', 'title')}</strong><span style={{ color: '#64748b' }}>{value(item, 'year', 'date', 'issued_at')}</span></div><span style={{ color: '#2563eb' }}>{value(item, 'issuer', 'organization')}</span></div>)}</section>}
    </article>
  );
}

export function ExportPanel({ data }: ExportPanelProps) {
  const { t } = useT();
  const { user } = useAuth();
  const [selected, setSelected] = useState(initialSections);
  const [exportingKind, setExportingKind] = useState<ExportKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<ExportPayload | null>(null);
  const [exportKind, setExportKind] = useState<ExportKind>('cv');
  const [exportSelection, setExportSelection] = useState<SectionSelection>(initialSections);
  const documentRef = useRef<HTMLDivElement>(null);

  const toggle = (key: SectionKey) => setSelected(current => ({ ...current, [key]: !current[key] }));
  const exportDocument = async (kind: ExportKind) => {
    if (!user) return;
    const selectedSnapshot = { ...selected };
    setExportingKind(kind); setError(null);
    try {
      const requests = [supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()];
      const [profileResult] = await Promise.all(requests);
      if (profileResult.error) throw profileResult.error;
      const profile = profileResult.data as Profile | null;
      if (!profile) throw new Error('Complete your profile before exporting.');

      const [publicationResult, certificationResult] = await Promise.all([
        selectedSnapshot.publications ? supabase.from('publications').select('*').eq('profile_id', user.id) : Promise.resolve({ data: [] }),
        selectedSnapshot.certifications ? supabase.from('certifications').select('*').eq('profile_id', user.id) : Promise.resolve({ data: [] }),
      ]);
      setPayload({ profile, publications: (publicationResult.data ?? []) as ExtraRow[], certifications: (certificationResult.data ?? []) as ExtraRow[] });
      setExportKind(kind);
      setExportSelection(selectedSnapshot);
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (!documentRef.current) throw new Error('The document could not be prepared.');
      const safeName = (profile.full_name || 'resume').trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
      const pdfOptions = {
        margin: 0, filename: `${safeName || 'resume'}-${kind}.pdf`, image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['section > div'] },
      };
      await html2pdf().set(pdfOptions as never).from(documentRef.current).save();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to generate the document.');
    } finally { setExportingKind(null); }
  };

  const labels: { key: SectionKey; label: string }[] = [
    { key: 'experience', label: t('exportPanel.sections.experience') }, { key: 'education', label: t('exportPanel.sections.education') },
    { key: 'skills', label: t('exportPanel.sections.skills') }, { key: 'achievements', label: t('exportPanel.sections.achievements') },
    { key: 'publications', label: t('exportPanel.sections.publications') }, { key: 'certifications', label: t('exportPanel.sections.certifications') },
  ];

  const exportDisabled = exportingKind !== null || !Object.values(selected).some(Boolean);
  return <>
    <aside className="export-panel-container h-fit p-4">
      <h3 className="mb-4 text-xl font-bold text-white">{t('exportPanel.title')}</h3>
      <div className="space-y-3"><p className="text-xs font-bold tracking-wider text-slate-500">{t('exportPanel.selectSections')}</p>{labels.map(item => <label key={item.key} className="flex cursor-pointer items-center gap-3 text-sm text-slate-300"><input type="checkbox" checked={selected[item.key]} onChange={() => toggle(item.key)} className="h-4 w-4 rounded accent-blue-600" /><span>{item.label}</span></label>)}</div>
      <div className="mt-5 space-y-2">
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <button type="button" onClick={() => void exportDocument('cv')} disabled={exportDisabled} className="btn-primary-lg disabled:cursor-not-allowed disabled:opacity-60">{exportingKind === 'cv' ? <LoaderCircle className="animate-spin" size={18} /> : <Download size={18} />}<span>{exportingKind === 'cv' ? 'Generating CV…' : t('exportPanel.btnExportCv')}</span></button>
        <button type="button" onClick={() => void exportDocument('resume')} disabled={exportDisabled} className="btn-secondary-lg border border-slate-600 disabled:cursor-not-allowed disabled:opacity-60">{exportingKind === 'resume' ? <LoaderCircle className="animate-spin" size={18} /> : <FileText size={18} />}<span>{exportingKind === 'resume' ? 'Generating Resume…' : t('exportPanel.btnExportResume')}</span></button>
      </div>
    </aside>
    {payload && <div aria-hidden="true" style={{ position: 'fixed', left: -10000, top: 0, zIndex: -1 }}><div ref={documentRef}><ResumeDocument data={data} payload={payload} selected={exportSelection} kind={exportKind} /></div></div>}
  </>;
}
