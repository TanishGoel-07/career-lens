'use client';

import { useState } from 'react';
import { X, Check, Loader2, UserRound, Clock, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient, User } from '@/lib/api-client';

interface ProfileDialogProps {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onUpdated: (user: User) => void;
}

export function ProfileDialog({ isOpen, user, onClose, onUpdated }: ProfileDialogProps) {
  const [fullName, setFullName] = useState(user?.profile?.fullName || '');
  const [headline, setHeadline] = useState(user?.profile?.headline || '');
  const [experienceYears, setExperienceYears] = useState(user?.profile?.experienceYears?.toString() || '4');
  const [learningHours, setLearningHours] = useState(user?.profile?.learningPaceHoursPerWeek?.toString() || '8');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(false);

    try {
      await apiClient.updateProfile({
        fullName,
        headline,
        experienceYears: parseInt(experienceYears, 10) || 0,
        learningPaceHoursPerWeek: parseInt(learningHours, 10) || 5,
      });

      const updated = await apiClient.getMe();
      onUpdated(updated);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 2000);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <UserRound size={18} className="text-[#2866c7]" />
            <h3 className="text-base font-semibold text-slate-800">User Profile & Settings</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 rounded-lg p-1">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Account Email</label>
            <input
              type="text"
              disabled
              value={user?.email || ''}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Alex Morgan"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#4f8cff] focus:ring-2 focus:ring-blue-50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Professional Headline</label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Software Engineer"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#4f8cff] focus:ring-2 focus:ring-blue-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Years of Experience</label>
              <input
                type="number"
                min={0}
                max={50}
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#4f8cff] focus:ring-2 focus:ring-blue-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Study Hours / Week</label>
              <input
                type="number"
                min={1}
                max={60}
                value={learningHours}
                onChange={(e) => setLearningHours(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#4f8cff] focus:ring-2 focus:ring-blue-50"
              />
            </div>
          </div>

          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-2.5 text-xs text-emerald-700">
              <Check size={16} /> Profile settings saved successfully!
            </div>
          )}

          <div className="mt-2 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-[#1e3a5f] hover:bg-[#274b76] text-white">
              {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
