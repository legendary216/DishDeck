import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// TODO: Replace with your actual values from the Supabase Dashboard
const supabaseUrl = "https://jtkexslsefnhptkddaav.supabase.co";
const supabaseAnonKey = "sb_publishable_bVqU5Cifjij-dZNULB4Gaw_FLM0r48Q"; 

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage, // <--- Using the native mobile storage
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});