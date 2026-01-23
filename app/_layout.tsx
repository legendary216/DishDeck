import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { View, ActivityIndicator, Text, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import NetInfo, { useNetInfo } from '@react-native-community/netinfo';

export default function RootLayout() {
  const [session, setSession] = useState<any>(null);
  const [initialized, setInitialized] = useState(false);
  const segments = useSegments();
  const router = useRouter();
  
  // 1. LISTEN TO NETWORK STATUS
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

    // 1. Identify where the user is
    const inAuthGroup = segments[0] === 'login';
    // Check if they are at the absolute root 'index' (outside tabs)
    const atRoot = segments.length === 0 || segments[0] === 'index';

    if (!session) {
      // If not logged in and not already going to login, force it
      if (!inAuthGroup) {
        console.log("Redirecting to login...");
        router.replace('/login');
      }
    } else {
      // If logged in and stuck on login or root, push to the Dashboard
      if (inAuthGroup || atRoot) {
        console.log("Redirecting to dashboard...");
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
    <PaperProvider>
      <View style={{ flex: 1 }}>
        
        {/* 2. THE OFFLINE BANNER */}
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
        </Stack>
      </View>
    </PaperProvider>
  );
}