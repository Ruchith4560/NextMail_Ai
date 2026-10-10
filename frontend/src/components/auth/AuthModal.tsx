import React, { useState, useEffect, useRef } from 'react';
import { X, Lock, Mail, User, ShieldCheck, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setAuthModalOpen, login, loginWithGoogle, register, isLoading, error, setError } = useAuthStore();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  useEffect(() => {
    if (!isAuthModalOpen) return;

    if (window.google?.accounts?.id && googleClientId) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: { credential: string }) => {
            if (response.credential) {
              setGoogleLoading(true);
              await loginWithGoogle(response.credential);
              setGoogleLoading(false);
            }
          },
        });

        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            width: 380,
          });
        }
      } catch (err) {
        console.warn('Google Identity Services initialization notice:', err);
      }
    }
  }, [isAuthModalOpen, googleClientId, loginWithGoogle]);

  if (!isAuthModalOpen) return null;

  const handleGoogleSignInClick = async () => {
    setError(null);
    if (window.google?.accounts?.id && googleClientId) {
      window.google.accounts.id.prompt();
    } else {
      const demoEmail = window.prompt(
        'Google OAuth2 client ID not set in env. Enter a Google email to sign in via test OAuth flow:',
        'kathryn.murphy@enterprise.io'
      );
      if (demoEmail && demoEmail.trim()) {
        setGoogleLoading(true);
        await loginWithGoogle(`mock_google_token_${demoEmail.trim().toLowerCase()}`);
        setGoogleLoading(false);
      }
    }
  };

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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-[#EAECF0] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#0E1318] border-b border-[#232B32] flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#00D084]/20 flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-[#00D084]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {mode === 'signin' ? 'Sign in to NextMail AI' : 'Create NextMail Account'}
              </h3>
              <p className="text-[10px] text-[#94A3B8] font-mono">Google OAuth2 + Argon2id Zero-Trust</p>
            </div>
          </div>
          <button
            onClick={() => setAuthModalOpen(false)}
            className="text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#EAECF0] bg-[#F8FAFC]">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError(null);
            }}
            className={`flex-1 py-3 text-xs font-semibold transition-colors border-b-2 cursor-pointer ${
              mode === 'signin'
                ? 'border-[#00D084] text-[#0F172A] bg-white'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
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
            className={`flex-1 py-3 text-xs font-semibold transition-colors border-b-2 cursor-pointer ${
              mode === 'signup'
                ? 'border-[#00D084] text-[#0F172A] bg-white'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            Register
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-6 space-y-4">
          {/* Google Sign In Button */}
          <div>
            <button
              type="button"
              onClick={handleGoogleSignInClick}
              disabled={isLoading || googleLoading}
              className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-[#F8FAFC] active:bg-[#F1F5F9] border border-[#E2E8F0] hover:border-[#CBD5E1] text-[#0F172A] font-semibold text-xs py-2.5 px-4 rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#00D084]" />
              ) : (
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              )}
              <span>
                {googleLoading ? 'Signing in with Google...' : 'Continue with Google'}
              </span>
            </button>
            <div ref={googleBtnRef} className="hidden" />
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-[#EAECF0] w-full"></div>
            <span className="bg-white px-3 text-[10px] text-[#94A3B8] uppercase tracking-wider font-mono absolute">
              or continue with email
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="block text-[11px] font-semibold text-[#475569] mb-1">Full Name</label>
                <div className="relative flex items-center">
                  <User className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Kathryn Murphy"
                    className="w-full bg-[#F8FAFC] text-xs text-[#0F172A] placeholder-[#94A3B8] pl-10 pr-3 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#00D084] focus:bg-white transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-[#475569] mb-1">Email Address</label>
              <div className="relative flex items-center">
                <Mail className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@enterprise.io"
                  className="w-full bg-[#F8FAFC] text-xs text-[#0F172A] placeholder-[#94A3B8] pl-10 pr-3 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#00D084] focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#475569] mb-1">Password</label>
              <div className="relative flex items-center">
                <Lock className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3.5 pointer-events-none" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#F8FAFC] text-xs text-[#0F172A] placeholder-[#94A3B8] pl-10 pr-3 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#00D084] focus:bg-white transition-all"
                />
              </div>
              {mode === 'signup' && (
                <p className="text-[10px] text-[#94A3B8] mt-1 font-mono">Minimum 8 characters</p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || googleLoading}
                className="w-full flex items-center justify-center gap-2 bg-[#00D084] hover:bg-[#00BA76] text-black font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Authenticating...</span>
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
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-[#F8FAFC] border-t border-[#EAECF0] text-[11px] text-[#64748B] text-center font-mono">
          Google OAuth2 & Passkey ready • Multi-device session revocation
        </div>
      </div>
    </div>
  );
};
