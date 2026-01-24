import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { View, ActivityIndicator, Text, Platform } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { useNetInfo } from '@react-native-community/netinfo';
import { PlanProvider } from '../context/PlanContext';
import { ThemeProvider, useAppTheme } from '../utils/ThemeContext'; // Ensure path is correct

// --- 1. INNER COMPONENT (Where your logic lives) ---
function RootContent() {
  // Now this hook works because it is INSIDE the ThemeProvider wrapper below
  const { currentTheme } = useAppTheme(); 
  
  const [session, setSession] = useState<any>(null);
  const [initialized, setInitialized] = useState(false);
  const segments = useSegments();
  const router = useRouter();
  const netInfo = useNetInfo();

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

    const inAuthGroup = segments[0] === 'login';
    const atRoot = segments.length === 0 || segments[0] === 'index';

    if (!session) {
      if (!inAuthGroup) {
        router.replace('/login');
      }
    } else {
      if (inAuthGroup || atRoot) {
        router.replace('/(tabs)');
      }
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
    <PaperProvider theme={currentTheme}>
      <PlanProvider>
        <View style={{ flex: 1 }}>
          
          {/* OFFLINE BANNER */}
          {netInfo.isConnected === false && (
            <View style={{ backgroundColor: '#b00020', padding: 5, alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 50 : 30 }}>
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>
                    ⚠️ You are offline. Changes may not save.
                </Text>
            </View>
          )}

          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="add-dish" options={{ presentation: 'modal', title: 'Add Dish' }} />
            <Stack.Screen name="pick-dish" options={{ presentation: 'modal', title: 'Pick Dish' }} />
            <Stack.Screen name="dish/[id]" options={{ title: 'Dish Details' }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
          </Stack>
        </View>
      </PlanProvider>
    </PaperProvider>
  );
}

// --- 2. OUTER COMPONENT (The Provider Wrapper) ---
export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootContent />
    </ThemeProvider>
  );
}