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
            theme: 'filled_black',
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
      // In development or when VITE_GOOGLE_CLIENT_ID is not configured in environment,
      // offer instantaneous demo sign-in or prompt for test account
      const demoEmail = window.prompt(
        'Google OAuth2 client ID not set. Enter a Google email to sign in via test OAuth flow:',
        'alex.rivera@gmail.com'
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
              <p className="text-[10px] text-slate-400 font-mono">Google OAuth2 + Argon2id Security</p>
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

        <div className="p-5 space-y-4">
          {/* Google Sign In Button */}
          <div>
            <button
              type="button"
              onClick={handleGoogleSignInClick}
              disabled={isLoading || googleLoading}
              className="w-full flex items-center justify-center gap-2.5 bg-surface hover:bg-surface-hover active:bg-surface border border-surface-border hover:border-slate-500/50 text-white font-medium text-xs py-2.5 px-4 rounded-lg shadow-sm transition-all disabled:opacity-50 group cursor-pointer"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary-400" />
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
              <span>{googleLoading ? 'Signing in with Google...' : 'Continue with Google'}</span>
            </button>
            {/* Optional rendered Google GIS container */}
            <div ref={googleBtnRef} className="hidden" />
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-surface-border w-full"></div>
            <span className="bg-background-secondary px-3 text-[10px] text-slate-400 uppercase tracking-wider font-mono absolute">
              or continue with email
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
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
                disabled={isLoading || googleLoading}
                className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 active:bg-primary-700 disabled:opacity-50 text-white font-medium text-xs py-2.5 px-4 rounded-lg shadow-lg shadow-primary-500/20 transition-all cursor-pointer"
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
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 bg-surface/50 border-t border-surface-border text-[11px] text-slate-400 text-center font-mono">
          Google OAuth2 & Passkey ready • Multi-device session revocation
        </div>
      </div>
    </div>
  );
};
