import { useState } from 'react';
import {
  ArrowRight,
  Calculator,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';

interface SignInPageProps {
  onSignInWithGoogle: () => Promise<void>;
  onSignInWithEmail: (email: string, pass: string) => Promise<void>;
  onSignUpWithEmail: (email: string, pass: string) => Promise<void>;
  onOpenPublicPortal: () => void;
  onContinueAsGuest?: () => void;
  authError: string | null;
}

export function SignInPage({
  onSignInWithGoogle,
  onSignInWithEmail,
  onSignUpWithEmail,
  onOpenPublicPortal,
  onContinueAsGuest,
  authError,
}: SignInPageProps) {
  const [logoError, setLogoError] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localValidation, setLocalValidation] = useState<string | null>(null);

  const handleGoogleClick = async () => {
    setIsGoogleLoading(true);
    setLocalValidation(null);
    try {
      await onSignInWithGoogle();
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalValidation(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setLocalValidation('Please enter your email address.');
      return;
    }
    if (!password) {
      setLocalValidation('Please enter your password.');
      return;
    }
    if (authMode === 'signup' && password.length < 6) {
      setLocalValidation('Password must be at least 6 characters.');
      return;
    }

    setIsEmailLoading(true);
    try {
      if (authMode === 'signin') {
        await onSignInWithEmail(trimmedEmail, password);
      } else {
        await onSignUpWithEmail(trimmedEmail, password);
      }
    } finally {
      setIsEmailLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-6">
      <div className="flex-1 flex items-center justify-center py-4">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs space-y-5">
          {/* Brand Header */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-lg bg-[#21252b] border border-[#d4a373] p-1 flex items-center justify-center shrink-0 overflow-hidden">
              {!logoError ? (
                <img
                  src="/assets/aistudio/image_97dc7301.png"
                  alt="Babi Interior Design Logo"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="font-display text-lg font-bold text-[#d4a373]">B</span>
              )}
            </div>
            <div>
              <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                {authMode === 'signin' ? 'Sign in to Babi Pro Forma' : 'Create Studio Account'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Interior Design &amp; Custom Joinery Workspace
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {(authError || localValidation) && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800 leading-relaxed"
            >
              {localValidation || authError}
            </div>
          )}

          {/* Email & Password Authentication Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-3.5">
            <div>
              <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="auth-password" aria-label="Password" className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isEmailLoading || isGoogleLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
            >
              {isEmailLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{authMode === 'signin' ? 'Signing in...' : 'Creating account...'}</span>
                </>
              ) : (
                <span>{authMode === 'signin' ? 'Sign in with Email' : 'Create Account'}</span>
              )}
            </button>

            {/* Toggle Sign In / Sign Up */}
            <div className="text-center text-xs text-slate-500 pt-1">
              {authMode === 'signin' ? (
                <span>
                  Don&apos;t have a password yet?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signup');
                      setLocalValidation(null);
                    }}
                    className="font-medium text-amber-800 hover:underline cursor-pointer"
                  >
                    Create Account
                  </button>
                </span>
              ) : (
                <span>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signin');
                      setLocalValidation(null);
                    }}
                    className="font-medium text-amber-800 hover:underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </span>
              )}
            </div>
          </form>

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              Or continue with
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Google Sign-In */}
          <div className="space-y-2.5">
            <button
              type="button"
              disabled={isGoogleLoading || isEmailLoading}
              onClick={handleGoogleClick}
              className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-900" />
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </>
              )}
            </button>

            {onContinueAsGuest && (
              <button
                type="button"
                onClick={onContinueAsGuest}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <span>Continue as Guest (Work Offline)</span>
              </button>
            )}
          </div>

          {/* Public Client Portal Escape Link */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
            <span className="text-slate-500">Need a quote as a client?</span>
            <button
              type="button"
              onClick={onOpenPublicPortal}
              className="inline-flex items-center gap-1 font-medium text-amber-800 hover:text-amber-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Open Client Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <footer className="text-center text-[11px] text-slate-400 py-2">
        Babi Interior Design · Cloud Pro Forma Studio
      </footer>
    </div>
  );
}
