import { Stack, router } from "expo-router";
import { PaperProvider } from 'react-native-paper';
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { Session } from '@supabase/supabase-js';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Listen for changes (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      
      // Manual redirect helper (just in case)
      if (session) router.replace('/(tabs)');
      else if (!session && !loading) router.replace('/login');
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <PaperProvider>
      <Stack screenOptions={{ headerShown: false }}>
        {/* We use the logic: "If we have a session, show Tabs. If not, show Login."
           This effectively "protects" the tabs.
        */}
        {session ? (
          <Stack.Screen name="(tabs)" />
        ) : (
          <Stack.Screen name="login" />
        )}
      </Stack>
    </PaperProvider>
  );
}