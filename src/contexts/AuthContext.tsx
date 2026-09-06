import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  getRedirectResult,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  formatAuthError: (error: any) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if returning from a redirect sign-in
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setUser(result.user);
        }
      })
      .catch((err) => {
        console.warn('Redirect sign-in check:', err);
      });

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signup = async (email: string, pass: string) => {
    await createUserWithEmailAndPassword(auth, email, pass);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const formatAuthError = (error: any): string => {
    const code = error?.code || '';
    const currentDomain =
      typeof window !== 'undefined' ? window.location.hostname : 'this domain';

    switch (code) {
      case 'auth/unauthorized-domain':
        return `Domain Not Authorized: "${currentDomain}" is not in your Firebase Authorized Domains. In Firebase Console > Authentication > Settings > Authorized domains, click "Add domain" and add "${currentDomain}".`;
      case 'auth/operation-not-allowed':
      case 'auth/configuration-not-found':
        return 'Google Sign-In is not enabled in your Firebase Console. Go to Firebase Console > Authentication > Sign-in method > Google and toggle Enable.';
      case 'auth/popup-blocked':
        return 'Google Sign-In popup was blocked by your browser. Please allow popups for this site, or open the app in a new tab.';
      case 'auth/popup-closed-by-user': {
        const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
        if (isInIframe) {
          return 'Google Sign-In popup was closed or blocked by iframe cross-origin restrictions. Please click "Open in New Tab" below to sign in.';
        }
        return 'Google Sign-In was closed before completing. Please try again.';
      }
      case 'auth/cancelled-popup-request':
        return 'Sign-in popup was cancelled or replaced by another request. Please try again.';
      case 'auth/internal-error': {
        const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
        if (isInIframe) {
          return 'Google Sign-In encountered an error inside the iframe (browsers block third-party cookies in iframes). Please click "Open in New Tab" below.';
        }
        return 'An internal Firebase authentication error occurred. Please try again or sign in with Email & Password.';
      }
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-disabled':
        return 'This account has been disabled. Please contact support.';
      case 'auth/user-not-found':
        return 'No account found with this email address. Please check your email or sign up.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again or click "Forgot Password?" below.';
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please verify your credentials.';
      case 'auth/email-already-in-use':
        return 'An account already exists with this email address. Please sign in instead.';
      case 'auth/weak-password':
        return 'Password does not meet security requirements. Must be at least 8 characters with uppercase, lowercase, number, and special character.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Access has been temporarily restricted for security. Please reset your password or try again later.';
      case 'auth/network-request-failed':
        return 'Network connection failed. Please check your internet connection and try again.';
      case 'auth/account-exists-with-different-credential':
        return 'An account already exists with this email using a different sign-in method. Please sign in with email/password.';
      default:
        return error?.message || 'An error occurred during authentication. Please try again.';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        signInWithGoogle,
        resetPassword,
        logout,
        formatAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
