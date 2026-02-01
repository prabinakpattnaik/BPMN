import { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type Profile = {
    id: string;
    full_name: string | null;
    username: string | null;
    tenant_id: string | null;
    role: 'admin' | 'tenant' | 'owner' | 'member';
};

type AuthContextType = {
    user: User | null;
    profile: Profile | null;
    session: Session | null;
    loading: boolean;
    isAdmin: boolean;
    isTenant: boolean;
    needsPasswordReset: boolean;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signInWithMicrosoft: () => Promise<void>;
    refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    isAdmin: false,
    isTenant: false,
    needsPasswordReset: false,
    signIn: async () => { },
    signOut: async () => { },
    signInWithGoogle: async () => { },
    signInWithMicrosoft: async () => { },
    refreshProfile: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [needsPasswordReset, setNeedsPasswordReset] = useState(false);

    const isAdmin = profile?.role === 'admin';
    const isTenant = profile?.role === 'tenant';

    const fetchingRef = useRef<string | null>(null);

    const fetchProfile = async (userId: string) => {
        // Don't fetch if already fetching this specific user
        if (fetchingRef.current === userId) return;
        // Don't fetch if we already have the profile for this user
        if (profile?.id === userId && profile.tenant_id) return;

        fetchingRef.current = userId;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
                setProfile(null);
            } else {
                setProfile(data as Profile);
            }
        } catch (err) {
            console.error('Unexpected error fetching profile:', err);
            setProfile(null);
        } finally {
            fetchingRef.current = null;
        }
    };

    useEffect(() => {
        let mounted = true;

        const initializeAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!mounted) return;

            setSession(session);
            setUser(session?.user ?? null);
            setNeedsPasswordReset(session?.user?.user_metadata?.needs_password_reset === true);

            if (session?.user) {
                await fetchProfile(session.user.id);
            }
            setLoading(false);
        };

        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;

            setSession(session);
            setUser(session?.user ?? null);
            setNeedsPasswordReset(session?.user?.user_metadata?.needs_password_reset === true);

            if (session?.user) {
                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                    // Update profile in background without blocking the UI
                    fetchProfile(session.user.id);
                }
            } else {
                setProfile(null);
            }

            setLoading(false);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signIn = async () => {
        console.log("Sign in implementation needed");
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/`,
                queryParams: {
                    prompt: 'select_account',
                    access_type: 'offline',
                }
            },
        });
        if (error) {
            console.error('Error signing in with Google:', error);
        }
    };

    const signInWithMicrosoft = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'azure',
            options: {
                redirectTo: `${window.location.origin}/`,
                scopes: 'email profile openid',
                queryParams: {
                    prompt: 'login',
                }
            },
        });
        if (error) {
            console.error('Error signing in with Microsoft:', error);
        }
    };

    const refreshProfile = async () => {
        if (user) {
            await fetchProfile(user.id);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            profile,
            session,
            loading,
            isAdmin,
            isTenant,
            needsPasswordReset,
            signIn,
            signOut,
            signInWithGoogle,
            signInWithMicrosoft,
            refreshProfile
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
