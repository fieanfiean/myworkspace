import { supabase } from '@/lib/supabase';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

export const authService = {
  getSession: () => supabase.auth.getSession(),
  onAuthStateChange: (callback: (event: AuthChangeEvent, session: Session | null) => void) =>
    supabase.auth.onAuthStateChange(async (event, session) => { callback(event, session); }),
  signInWithPassword: (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),
  signUp: (email: string, password: string) =>
    supabase.auth.signUp({ email, password }),
  signInWithGoogle: (redirectTo: string) =>
    supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } }),
  signOut: () => supabase.auth.signOut(),
};
