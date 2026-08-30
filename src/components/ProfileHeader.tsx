import React from 'react';
import { MapPin, Mail, Link2 } from 'lucide-react';

const profile = {
  name: 'Alex Kim',
  title: 'Senior Product Engineer',
  organization: 'Stripe',
  location: 'San Francisco, CA',
  email: 'alex@stripe.com',
  website: 'alexkim.dev',
  stats: [
    { label: '5 yrs', value: 'Experience' },
    { label: '12+', value: 'Projects' },
    { label: '6', value: 'Awards' },
  ],
};

export const ProfileHeader: React.FC = () => {
  return (
    <div className="profile-header-card">
      <div className="w-24 h-24 bg-blue-600 rounded-2xl flex items-center justify-center text-4xl font-bold text-white">
        AK
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-4xl font-bold text-white">{profile.name}</h2>
            <p className="text-slate-400 text-lg mt-1">
              {profile.title} · <span className="text-slate-200">{profile.organization}</span>
            </p>
          </div>
          <div className="flex gap-4">
            {profile.stats.map((stat, index) => (
              <div key={index} className="stat-box">
                <div className="text-3xl font-extrabold text-blue-400">{stat.label}</div>
                <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-6 mt-6 text-slate-400 text-sm">
          <span className="flex items-center gap-2"><MapPin size={16} />{profile.location}</span>
          <span className="flex items-center gap-2"><Mail size={16} />{profile.email}</span>
          <span className="flex items-center gap-2"><Link2 size={16} />{profile.website}</span>
        </div>
      </div>
    </div>
  );
};