import { Stack, Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { View, ActivityIndicator } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';

export default function RootLayout() {
  const [session, setSession] = useState<any>(null);
  const [initialized, setInitialized] = useState(false); // <--- NEW CHECK
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // 1. Check User Session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true); // <--- Mark as ready
    });

    // 2. Listen for changes (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!initialized) return;

    const inTabsGroup = segments[0] === '(tabs)';

    // Redirect Logic
    if (session && !inTabsGroup) {
      router.replace('/(tabs)'); // Go to Home
    } else if (!session && inTabsGroup) {
      router.replace('/'); // Go to Login
    }
  }, [session, initialized, segments]);

  // 3. SHOW NOTHING (or Loader) UNTIL CHECK IS DONE
  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <PaperProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </PaperProvider>
  );
}