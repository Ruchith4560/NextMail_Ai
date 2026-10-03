import React, { useState } from 'react';
import { X, Lock, Mail, User, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setAuthModalOpen, login, register, isLoading, error, setError } = useAuthStore();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === 'signin') {
      await login(email, password);
    } else {
      if (!fullName.trim()) {
        setError('Please provide your full name');
        return;
      }
      await register(email, password, fullName);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-background-secondary border border-surface-border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-surface border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-primary-600 to-accent-ai flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                {mode === 'signin' ? 'Sign in to NextMail' : 'Create NextMail Account'}
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">Argon2id + JWT Protected</p>
            </div>
          </div>
          <button
            onClick={() => setAuthModalOpen(false)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-surface-border bg-background">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-medium transition-colors border-b-2 ${
              mode === 'signin'
                ? 'border-primary-500 text-white bg-surface/40'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-medium transition-colors border-b-2 ${
              mode === 'signup'
                ? 'border-primary-500 text-white bg-surface/40'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-5 mt-4 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">Full Name</label>
              <div className="relative flex items-center">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="w-full bg-background text-xs text-white placeholder-slate-400 pl-9 pr-3 py-2 rounded-lg border border-surface-border focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">Email Address</label>
            <div className="relative flex items-center">
              <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@nextmail.local"
                className="w-full bg-background text-xs text-white placeholder-slate-400 pl-9 pr-3 py-2 rounded-lg border border-surface-border focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">Password</label>
            <div className="relative flex items-center">
              <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-background text-xs text-white placeholder-slate-400 pl-9 pr-3 py-2 rounded-lg border border-surface-border focus:outline-none focus:border-primary-500"
              />
            </div>
            {mode === 'signup' && (
              <p className="text-[10px] text-slate-400 mt-1 font-mono">Minimum 8 characters with letters & symbols</p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 active:bg-primary-700 disabled:opacity-50 text-white font-medium text-xs py-2.5 px-4 rounded-lg shadow-lg shadow-primary-500/20 transition-all"
            >
              {isLoading ? (
                <span>Authenticating with Argon2id...</span>
              ) : mode === 'signin' ? (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer info */}
        <div className="px-5 py-3 bg-surface/50 border-t border-surface-border text-[11px] text-slate-400 text-center font-mono">
          Single-sign on & MFA ready • Multi-device revocation
        </div>
      </div>
    </div>
  );
};
