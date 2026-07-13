import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const getProfile = useCallback(async (user) => {
    if (user) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, avatar_url, bio, role, points, rank, current_streak, max_streak, last_login_date, is_founding_member, email_notifications, newsletter_subscribed, systemeio_contact_id, created_at, updated_at')
          .eq('id', user.id)
          .single();

        // PGRST116 means no rows found - user's profile was deleted
        if (error?.code === 'PGRST116') {
          console.warn('Profile not found, signing out user');
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
          setProfile(null);
          return null;
        }

        if (error) {
          throw error;
        }

        if (data) {
          setProfile(data);
        }
        return data;
      } catch (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
    }
    return null;
  }, []);

  const initOAuthProfile = useCallback(async (user, profileData) => {
    if (!profileData || profileData.email_notifications !== null) return;
    try {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const updates = {
        email: user.email,
        email_notifications: true,
        newsletter_subscribed: true,
      };
      if (count !== null && count <= 200) {
        updates.is_founding_member = true;
      }

      await supabase.from('profiles').update(updates).eq('id', user.id);
      await getProfile(user);
    } catch (e) {
      console.warn('Could not initialize OAuth profile:', e.message);
    }
  }, [getProfile]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          const profileData = await getProfile(currentUser);
          if (profileData?.email_notifications === null) {
            await initOAuthProfile(currentUser, profileData);
          }
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    const fetchInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const profileData = await getProfile(currentUser);
        if (profileData?.email_notifications === null) {
          await initOAuthProfile(currentUser, profileData);
        }
      }
      setLoading(false);
    };
    fetchInitialSession();

    return () => subscription.unsubscribe();
  }, [getProfile, initOAuthProfile]);

  const signUp = useCallback(async (email, password, name, emailNotifications = true, newsletterSubscribed = true) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name
        }
      }
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign up Failed",
        description: error.message || "Something went wrong",
      });
      return { user: data?.user, error };
    }

    if (data?.user) {
      try {
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        const updates = {
          email: data.user.email,
          email_notifications: emailNotifications,
          newsletter_subscribed: newsletterSubscribed,
        };
        if (count !== null && count <= 200) {
          updates.is_founding_member = true;
        }

        await supabase
          .from('profiles')
          .update(updates)
          .eq('id', data.user.id);

      } catch (e) {
        console.warn('Could not update profile after signup:', e.message);
      }
    }

    return { user: data?.user, error };
  }, [toast]);

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign in Failed",
        description: error.message || "Something went wrong",
      });
    }

    return { error };
  }, [toast]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    
    // Always clear local state, even if server signOut fails
    // This handles cases where user was deleted but JWT still exists
    setUser(null);
    setSession(null);
    setProfile(null);

    if (error && error.message !== 'User from sub claim in JWT does not exist') {
      toast({
        variant: "destructive",
        title: "Sign out Failed",
        description: error.message || "Something went wrong",
      });
    }

    return { error };
  }, [toast]);
  
  const updateProfile = async (updates) => {
    if (!user) return;
    try {
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id)
            .select('id, name, avatar_url, bio, role, points, rank, current_streak, max_streak, last_login_date, is_founding_member, email_notifications, newsletter_subscribed, systemeio_contact_id, created_at, updated_at')
            .single();

        if(error){
            throw error;
        }
        setProfile(data);
        toast({ title: 'Profile Updated!' });
    } catch(error) {
        toast({ title: 'Error updating profile', description: error.message, variant: 'destructive' });
    }
  }

  const resetPassword = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Password Reset Failed",
        description: error.message || "Something went wrong",
      });
    } else {
      toast({
        title: "Check your email",
        description: "We've sent you a password reset link.",
      });
    }

    return { error };
  }, [toast]);

  const updatePassword = useCallback(async (newPassword) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Password Update Failed",
        description: error.message || "Something went wrong",
      });
    } else {
      toast({
        title: "Password Updated",
        description: "Your password has been successfully changed.",
      });
    }

    return { error };
  }, [toast]);

  const signInWithOAuth = useCallback(async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message || 'Something went wrong',
      });
    }
    return { error };
  }, [toast]);

  const value = useMemo(() => ({
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    updateProfile,
    resetPassword,
    updatePassword,
    isAdmin: profile?.role === 'admin'
  }), [user, profile, session, loading, signUp, signIn, signInWithOAuth, signOut, updateProfile, resetPassword, updatePassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};