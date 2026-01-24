import React, { useState } from 'react';
import { StyleSheet, View, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Title, useTheme, Text } from 'react-native-paper';
import { supabase } from '../utils/supabase';

export default function LoginScreen() {
  const theme = useTheme();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // <--- New State
  const [loading, setLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);

  async function handleAuth() {
    // 1. Basic Validation
    if (!email || !password) {
        Alert.alert("Error", "Please fill in all fields.");
        return;
    }

    // 2. Sign Up Validation
    if (!isLoginMode && password !== confirmPassword) {
        Alert.alert("Error", "Passwords do not match!");
        return;
    }

    setLoading(true);
    
    // 3. Supabase Logic
    const { error } = isLoginMode 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (error) Alert.alert("Error", error.message);
    setLoading(false);
  }

  return (
    // FIX 1: KeyboardAvoidingView pushes content up when keyboard opens
    <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
    >
      <ScrollView 
        contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]} 
        keyboardShouldPersistTaps="handled"
      >
        <Title style={[styles.title, { color: theme.colors.primary }]}>
            DishDeck
        </Title>
        
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          mode="outlined"
          activeOutlineColor={theme.colors.primary}
        />
        
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          mode="outlined"
          activeOutlineColor={theme.colors.primary}
        />

        {/* FIX 2: Confirm Password Field (Only for Sign Up) */}
        {!isLoginMode && (
             <TextInput
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                style={styles.input}
                mode="outlined"
                activeOutlineColor={theme.colors.primary}
             />
        )}

        <View style={styles.buttonContainer}>
          <Button 
            mode="contained" 
            onPress={handleAuth} 
            loading={loading} 
            disabled={loading}
            style={styles.button}
            buttonColor={theme.colors.primary}
          >
            {isLoginMode ? "Login" : "Sign Up"}
          </Button>
          
          <Button 
            mode="text" 
            onPress={() => {
                setIsLoginMode(!isLoginMode);
                setConfirmPassword(''); // Clear field on switch
            }}
            textColor={theme.colors.primary}
            style={{ marginTop: 10 }}
          >
            {isLoginMode ? "New here? Create Account" : "Already have an account? Log In"}
          </Button>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flexGrow: 1, 
    padding: 20, 
    justifyContent: 'center' 
  },
  title: { 
    fontSize: 32, 
    fontWeight: '800', 
    textAlign: 'center', 
    marginBottom: 40 
  },
  input: { 
    marginBottom: 12,
    backgroundColor: 'white' 
  },
  buttonContainer: { 
    marginTop: 20 
  },
  button: { 
    paddingVertical: 6,
    borderRadius: 8
  }
});