import { useState } from 'react';
import { ArrowRight, Calculator, FileText, Loader2, Lock, ShieldCheck } from 'lucide-react';

interface SignInPageProps {
  onSignInWithGoogle: () => Promise<void>;
  onOpenPublicPortal: () => void;
  onContinueAsGuest?: () => void;
  authError: string | null;
}

export function SignInPage({
  onSignInWithGoogle,
  onOpenPublicPortal,
  onContinueAsGuest,
  authError,
}: SignInPageProps) {
  const [logoError, setLogoError] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleClick = async () => {
    setIsSigningIn(true);
    try {
      await onSignInWithGoogle();
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-6">
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-7 sm:p-8 shadow-xs space-y-6">
          {/* Brand Header */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-[#21252b] border border-[#d4a373] p-1 flex items-center justify-center shrink-0 overflow-hidden">
              {!logoError ? (
                <img
                  src="/assets/aistudio/image_97dc7301.png"
                  alt="Babi Interior Design Logo"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="font-display text-xl font-bold text-[#d4a373]">B</span>
              )}
            </div>
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight text-slate-900">
                Sign in to Babi Pro Forma
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Interior Design &amp; Custom Joinery Workspace
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            Authenticate with your Google account to securely store, manage, and export your personal pro forma invoices in the cloud.
          </p>

          {/* Key Security & Workspace Guarantees */}
          <ul className="space-y-3 border-y border-slate-100 py-4 text-xs text-slate-700">
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-900">Private Cloud Vault:</strong> Each account&apos;s pro formas, line items, and studio catalog are isolated and protected by Firebase security rules.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Calculator className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-900">Real-Time Cost Engine:</strong> Compute dimension-based (<span className="font-mono">m²</span>) and unit pricing with VAT and prepayment schedules.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <FileText className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-900">Instant PDF &amp; AI Scope:</strong> Extract scopes from client messages and export standardized A4 PDFs.
              </span>
            </li>
          </ul>

          {authError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800"
            >
              {authError}
            </div>
          )}

          {/* Primary Google Sign-In CTA */}
          <div className="space-y-3">
            <button
              type="button"
              disabled={isSigningIn}
              onClick={handleGoogleClick}
              className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-2.5 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
            >
              {isSigningIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in securely...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Sign in with Google</span>
                </>
              )}
            </button>

            <p className="text-[11px] text-center text-slate-500">
              Select any personal or work Google/Gmail account
            </p>

            {onContinueAsGuest && (
              <button
                type="button"
                onClick={onContinueAsGuest}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <span>Continue as Guest (Work Offline)</span>
              </button>
            )}
          </div>

          {/* Public Client Portal Escape Link */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
            <span className="text-slate-500">Requesting a client quote?</span>
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
