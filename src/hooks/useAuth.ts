import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  name: string;
  mobile: string;
  email: string;
  dob: string;
  role: 'retailer' | 'distributor' | 'admin';
  wallet_balance: number;
  mpin?: string;
  kyc_status?: 'pending' | 'verified' | 'rejected';
  created_at: string;
  distributor_id?: string;
  created_by?: 'Distributor' | 'Self' | 'Referral';
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const profileChannelRef = useRef<any>(null);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      if (profileChannelRef.current) {
        supabase.removeChannel(profileChannelRef.current);
        profileChannelRef.current = null;
      }
      return;
    }

    const channelName = `profile-${user.id}`;
    
    const setupSubscription = async () => {
      // Clean up any existing channel with this name first
      const existingChannels = supabase.getChannels();
      const existing = existingChannels.find(c => (c as any).name === channelName || (c as any).name === `realtime:${channelName}`);
      
      if (existing) {
        await supabase.removeChannel(existing);
      }

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`
          },
          (payload) => {
            console.log('Profile updated via real-time:', payload.new.id);
            setProfile(payload.new as UserProfile);
          }
        );

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Profile subscription active');
        }
      });

      profileChannelRef.current = channel;
    };

    setupSubscription();

    return () => {
      if (profileChannelRef.current) {
        supabase.removeChannel(profileChannelRef.current);
        profileChannelRef.current = null;
      }
    };
  }, [user?.id]);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setProfile(data as UserProfile);
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
    } finally {
      setLoading(false);
    }
  }

  return { user, profile, loading, fetchProfile };
}
