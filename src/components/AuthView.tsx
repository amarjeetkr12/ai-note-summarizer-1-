import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Sparkles,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  KeyRound,
  ArrowLeft,
  Check,
  ExternalLink,
  Copy,
  Info,
} from 'lucide-react';

export const AuthView: React.FC = () => {
  const { login, signup, signInWithGoogle, resetPassword, formatAuthError } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawErrorCode, setRawErrorCode] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  // Email format validation
  const isEmailValid = useMemo(() => {
    const trimmed = email.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  }, [email]);

  // Password requirements calculation
  const passwordChecks = useMemo(() => {
    return {
      minLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password),
      matchesConfirm: password.length > 0 && password === confirmPassword,
    };
  }, [password, confirmPassword]);

  const isPasswordStrong =
    passwordChecks.minLength &&
    passwordChecks.hasUpper &&
    passwordChecks.hasLower &&
    passwordChecks.hasNumber &&
    passwordChecks.hasSpecial;

  const canSubmitSignUp = isEmailValid && isPasswordStrong && passwordChecks.matchesConfirm;
  const canSubmitSignIn = isEmailValid && password.length > 0;
  const canSubmitForgot = isEmailValid;

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setError(null);
    setRawErrorCode(null);
    setSuccessMessage(null);
    setGoogleLoading(true);

    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      const code = err?.code || 'unknown';
      setRawErrorCode(code);
      setError(formatAuthError(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2500);
  };

  // Handle Email/Password form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRawErrorCode(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!isEmailValid) {
      setError('Please enter a valid email address (e.g. name@example.com).');
      return;
    }

    if (mode === 'forgot') {
      setSubmitting(true);
      try {
        await resetPassword(trimmedEmail);
        setSuccessMessage(
          `Password reset link sent to ${trimmedEmail}! Check your inbox and follow the instructions.`
        );
      } catch (err: any) {
        setRawErrorCode(err?.code || 'unknown');
        setError(formatAuthError(err));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    if (mode === 'signup') {
      if (!isPasswordStrong) {
        setError(
          'Password does not meet all requirements (at least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character).'
        );
        return;
      }
      if (!passwordChecks.matchesConfirm) {
        setError('Passwords do not match. Please re-enter.');
        return;
      }

      setSubmitting(true);
      try {
        await signup(trimmedEmail, password);
      } catch (err: any) {
        setRawErrorCode(err?.code || 'unknown');
        setError(formatAuthError(err));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Sign In
    setSubmitting(true);
    try {
      await login(trimmedEmail, password);
    } catch (err: any) {
      setRawErrorCode(err?.code || 'unknown');
      setError(formatAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const isBusy = submitting || googleLoading;

  return (
    <div className="min-h-screen flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
        <h1 className="mt-3 text-center text-2xl font-bold tracking-tight text-slate-900">
          AI Note Summarizer
        </h1>
        <p className="mt-1 text-center text-xs text-slate-500">
          {mode === 'signup'
            ? 'Create an account to save and access your summaries'
            : mode === 'forgot'
            ? 'Reset your account password'
            : 'Sign in to access your note summaries and history'}
        </p>

        {/* Tab switch between Sign In and Create Account (when not in Forgot Password mode) */}
        {mode !== 'forgot' && (
          <div className="mt-5 flex rounded-lg p-1 bg-slate-200/70 max-w-xs mx-auto text-xs font-semibold">
            <button
              type="button"
              id="tab-signin"
              onClick={() => {
                setMode('signin');
                setError(null);
                setRawErrorCode(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              id="tab-signup"
              onClick={() => {
                setMode('signup');
                setError(null);
                setRawErrorCode(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>
        )}
      </div>

      <div className="mt-5 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-7 px-6 shadow-xs border border-slate-200 rounded-2xl sm:px-8">
          {/* Error Message & Guided Solutions */}
          {error && (
            <div
              id="auth-error-alert"
              className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium space-y-2.5"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <div className="leading-relaxed flex-1">{error}</div>
              </div>

              {/* Solution 1: Unauthorized Domain Helper */}
              {rawErrorCode === 'auth/unauthorized-domain' && currentHostname && (
                <div className="p-3 bg-white border border-rose-200 rounded-lg space-y-2 text-slate-800">
                  <p className="font-semibold text-rose-900 text-xs">
                    Quick Fix in Firebase Console:
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Add this domain to <strong>Authentication &gt; Settings &gt; Authorized domains</strong>:
                  </p>
                  <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200 font-mono text-[11px]">
                    <span className="truncate flex-1 font-semibold text-slate-800">
                      {currentHostname}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(currentHostname)}
                      className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold shrink-0 cursor-pointer"
                    >
                      {copiedDomain ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Solution 2: Provider Not Enabled Helper */}
              {(rawErrorCode === 'auth/operation-not-allowed' ||
                rawErrorCode === 'auth/configuration-not-found') && (
                <div className="p-3 bg-white border border-rose-200 rounded-lg space-y-1.5 text-slate-800 text-[11px]">
                  <p className="font-semibold text-rose-900 text-xs">
                    Enable Google Provider in Firebase:
                  </p>
                  <ol className="list-decimal pl-4 space-y-1 text-slate-600">
                    <li>Go to Firebase Console &gt; <strong>Authentication</strong></li>
                    <li>Open the <strong>Sign-in method</strong> tab</li>
                    <li>Click <strong>Google</strong>, toggle <strong>Enable</strong>, and select your support email</li>
                    <li>Click <strong>Save</strong></li>
                  </ol>
                </div>
              )}

              {/* Solution 3: Iframe / Popup Blocker / Closed Helper */}
              {(rawErrorCode === 'auth/popup-blocked' ||
                rawErrorCode === 'auth/popup-closed-by-user' ||
                rawErrorCode === 'auth/internal-error' ||
                isInIframe) && (
                <div className="pt-1">
                  <a
                    href={currentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 bg-white hover:bg-slate-50 border border-slate-300 text-indigo-600 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open App in New Tab to Sign In with Google</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div
              id="auth-success-alert"
              className="mb-4 flex items-start gap-2.5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <div className="leading-relaxed flex-1">{successMessage}</div>
            </div>
          )}

          {/* GOOGLE SIGN IN (Visible in Sign In and Sign Up modes) */}
          {mode !== 'forgot' && (
            <div className="mb-5">
              <button
                type="button"
                id="google-signin-btn"
                onClick={handleGoogleSignIn}
                disabled={isBusy}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {googleLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                    <span>Connecting with Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              {/* In iframe notice */}
              {isInIframe && (
                <div className="mt-2 text-center">
                  <a
                    href={currentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600 transition-colors"
                  >
                    <Info className="w-3 h-3 text-slate-400" />
                    <span>Running in preview? Click to open in a new tab</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              )}

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-slate-400 font-medium tracking-wider">
                    or continue with email
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* FORGOT PASSWORD VIEW */}
          {mode === 'forgot' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="forgot-email"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Your Registered Email
                </label>
                <div className="relative rounded-lg shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="block w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-colors"
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  Enter your email address and Firebase will send you a link to reset your password.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={isBusy || !canSubmitForgot}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sending reset link...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Send Password Reset Email</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setError(null);
                    setRawErrorCode(null);
                    setSuccessMessage(null);
                  }}
                  className="w-full flex justify-center items-center gap-1.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            </form>
          ) : (
            /* EMAIL / PASSWORD FORM */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div>
                <label
                  htmlFor="email-input"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Email Address
                </label>
                <div className="relative rounded-lg shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="email-input"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={`block w-full pl-9 pr-8 py-2 bg-white border rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 transition-colors ${
                      email && !isEmailValid
                        ? 'border-rose-300 focus:ring-rose-500'
                        : 'border-slate-300'
                    }`}
                  />
                  {email && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      {isEmailValid ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <span className="text-xs text-rose-500 font-medium">invalid</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="password-input"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      id="forgot-password-btn"
                      onClick={() => {
                        setMode('forgot');
                        setError(null);
                        setRawErrorCode(null);
                        setSuccessMessage(null);
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                <div className="relative rounded-lg shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="password-input"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'}
                    className="block w-full pl-9 pr-10 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field (Sign Up mode only) */}
              {mode === 'signup' && (
                <div>
                  <label
                    htmlFor="confirm-password-input"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Confirm Password
                  </label>
                  <div className="relative rounded-lg shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="confirm-password-input"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className={`block w-full pl-9 pr-10 py-2 bg-white border rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 transition-colors ${
                        confirmPassword && !passwordChecks.matchesConfirm
                          ? 'border-rose-300'
                          : 'border-slate-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Password Requirements Checklist (Sign Up mode) */}
              {mode === 'signup' && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
                  <p className="font-semibold text-slate-700 mb-1">Password Requirements:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      {passwordChecks.minLength ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      )}
                      <span className={passwordChecks.minLength ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                        8+ characters
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {passwordChecks.hasUpper ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      )}
                      <span className={passwordChecks.hasUpper ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                        1 uppercase letter (A-Z)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {passwordChecks.hasLower ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      )}
                      <span className={passwordChecks.hasLower ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                        1 lowercase letter (a-z)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {passwordChecks.hasNumber ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      )}
                      <span className={passwordChecks.hasNumber ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                        1 number (0-9)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {passwordChecks.hasSpecial ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      )}
                      <span className={passwordChecks.hasSpecial ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                        1 special character (!@#$...)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {passwordChecks.matchesConfirm ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      )}
                      <span className={passwordChecks.matchesConfirm ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                        Passwords match
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  id="auth-submit-btn"
                  type="submit"
                  disabled={
                    isBusy ||
                    (mode === 'signup' ? !canSubmitSignUp : !canSubmitSignIn)
                  }
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>
                        {mode === 'signup'
                          ? 'Creating account...'
                          : 'Signing in...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        {mode === 'signup' ? 'Create Account' : 'Sign In'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Toggle between Sign In and Create Account at bottom */}
          {mode !== 'forgot' && (
            <div className="mt-5 pt-4 border-t border-slate-100 text-center">
              <button
                type="button"
                id="toggle-auth-mode-btn"
                onClick={() => {
                  setMode(mode === 'signup' ? 'signin' : 'signup');
                  setError(null);
                  setRawErrorCode(null);
                  setSuccessMessage(null);
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
              >
                {mode === 'signup'
                  ? 'Already have an account? Sign In'
                  : "Don't have an account? Create Account"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
