'use client';

import { useState } from 'react';
import { X, LogIn, UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient, User } from '@/lib/api-client';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === 'register') {
        await apiClient.register(email, password);
        // Automatically login after successful registration
        await apiClient.login(email, password);
      } else {
        await apiClient.login(email, password);
      }

      const me = await apiClient.getMe();
      onSuccess(me);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setTab('login');
                setError(null);
              }}
              className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${
                tab === 'login'
                  ? 'border-[#2866c7] text-[#2866c7]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setTab('register');
                setError(null);
              }}
              className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${
                tab === 'register'
                  ? 'border-[#2866c7] text-[#2866c7]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Create Account
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. alex.morgan@careerlens.dev"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#4f8cff] focus:ring-2 focus:ring-blue-50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#4f8cff] focus:ring-2 focus:ring-blue-50"
            />
          </div>

          <div className="mt-2">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1e3a5f] hover:bg-[#274b76] text-white flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : tab === 'login' ? (
                <>
                  <LogIn size={16} /> Sign In
                </>
              ) : (
                <>
                  <UserPlus size={16} /> Register
                </>
              )}
            </Button>
          </div>

          <p className="text-[11px] text-center text-slate-400">
            Demo account: <span className="font-mono text-slate-600">alex.morgan@careerlens.dev</span> / <span className="font-mono text-slate-600">Password123!</span>
          </p>
        </form>
      </div>
    </div>
  );
}
