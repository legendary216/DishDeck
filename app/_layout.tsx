import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { View, ActivityIndicator } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';

export default function RootLayout() {
  const [session, setSession] = useState<any>(null);
  const [initialized, setInitialized] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!initialized) return;

    // Check if we are currently on the "login" screen
    // (We check if the first segment is 'login' OR if we are at root and index is missing)
    const inAuthGroup = segments[0] === '(tabs)';
    const atLoginScreen = segments[0] === 'login' || segments.length === 0;

    if (!session && !atLoginScreen) {
      // 1. Logged Out? -> Go to Login
      router.replace('/login'); 
    } else if (session && atLoginScreen) {
      // 2. Logged In? -> Go to Tabs
      router.replace('/(tabs)');
    }
  }, [session, initialized, segments]);

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
        {/* CHANGE 1: Point to 'login' instead of 'index' */}
        <Stack.Screen name="login" />
        
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add-dish" options={{ presentation: 'modal', title: 'Add Dish' }} />
        <Stack.Screen name="pick-dish" options={{ presentation: 'modal', title: 'Pick Dish' }} />
        <Stack.Screen name="dish/[id]" options={{ title: 'Dish Details' }} />
      </Stack>
    </PaperProvider>
  );
}