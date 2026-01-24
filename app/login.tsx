import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Alert, KeyboardAvoidingView, Platform, ScrollView, RefreshControl } from 'react-native';
import { TextInput, Button, Title, useTheme, Text, Portal, Modal, Avatar } from 'react-native-paper';
import { supabase } from '../utils/supabase';

export default function LoginScreen() {
  const theme = useTheme();
  
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>(''); 
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isLoginMode, setIsLoginMode] = useState<boolean>(true);
  const [showOtpModal, setShowOtpModal] = useState<boolean>(false);
  const [timer, setTimer] = useState<number>(0);

  useEffect(() => {
    let interval: any; 
    if (timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [timer]);

  const validateEmail = (text: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
  };

  async function handleAuth() {
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    // --- CLIENT SIDE VALIDATIONS ---
    if (!cleanEmail || !cleanPassword) return Alert.alert("Required", "Fill all fields.");
    if (!validateEmail(cleanEmail)) return Alert.alert("Invalid Email", "Please enter a valid email.");
    if (!isLoginMode && cleanPassword !== confirmPassword.trim()) return Alert.alert("Error", "Passwords do not match!");

    setLoading(true);
    
    const { data, error } = isLoginMode 
      ? await supabase.auth.signInWithPassword({ email: cleanEmail, password: cleanPassword })
      : await supabase.auth.signUp({ email: cleanEmail, password: cleanPassword });

    if (error) {
      Alert.alert("Auth Error", error.message);
    } else {
      // --- THE "EXISTING USER" FIX ---
      // data.user exists but identities is empty if the user is already registered
      if (!isLoginMode) {
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          Alert.alert(
            "Account Exists",
            "This email is already registered. Please log in.",
            [{ text: "Switch to Login", onPress: () => setIsLoginMode(true) }]
          );
        } else {
          setShowOtpModal(true);
          setTimer(60); 
        }
      }
    }
    setLoading(false);
  }

  async function handleVerifyOTP() {
    if (otpCode.length !== 8) return Alert.alert("Invalid", "Enter the 8-digit code.");

    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otpCode.trim(),
      type: 'signup',
    });
    
    if (error) {
      Alert.alert("Failed", error.message);
    } else {
      setShowOtpModal(false);
      setIsLoginMode(true); 
      setOtpCode(''); 
      Alert.alert("Verified!", "Please log in now.");
    }
    setLoading(false);
  }

  async function handleResendOTP() {
    setLoading(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
    if (error) Alert.alert("Error", error.message);
    else { setTimer(60); Alert.alert("Sent", "Check your email for a new code."); }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView 
        contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]} 
        keyboardShouldPersistTaps="handled"
      >
        <Title style={[styles.title, { color: theme.colors.primary }]}>DishDeck</Title>
        <Text style={styles.subtitle}>{isLoginMode ? "Welcome back!" : "Join the kitchen."}</Text>
        
        <TextInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.input} mode="outlined" />
        <TextInput label="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} mode="outlined" />

        {!isLoginMode && (
          <TextInput label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry style={styles.input} mode="outlined" />
        )}

        <Button mode="contained" onPress={handleAuth} loading={loading} style={styles.button}>
          {isLoginMode ? "Login" : "Create Account"}
        </Button>
        <Button mode="text" onPress={() => setIsLoginMode(!isLoginMode)} style={{ marginTop: 10 }}>
          {isLoginMode ? "New here? Sign Up" : "Already have an account? Log In"}
        </Button>

        <Portal>
          <Modal 
            visible={showOtpModal} 
            onDismiss={() => setShowOtpModal(false)}
            contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
          >
            {/* KEYBOARD FIX: Added keyboardVerticalOffset specifically for the modal view */}
            <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}>
              <ScrollView bounces={false} contentContainerStyle={{ alignItems: 'center' }}>
                <Avatar.Icon size={60} icon="numeric-8-box-outline" style={{ marginBottom: 15 }} />
                <Text variant="headlineSmall" style={styles.modalTitle}>Verify Email</Text>
                <Text style={styles.modalText}>Enter 8-digit code for {email}</Text>

                <TextInput label="8-Digit Code" value={otpCode} onChangeText={setOtpCode} keyboardType="number-pad" maxLength={8} style={{ width: '100%', marginBottom: 20 }} mode="outlined" />

                <Button mode="contained" onPress={handleVerifyOTP} loading={loading} style={{ width: '100%' }}>Verify & Go to Login</Button>
                <Button mode="text" onPress={handleResendOTP} disabled={timer > 0 || loading}>
                  {timer > 0 ? `Resend in ${timer}s` : "Resend Code"}
                </Button>
                <Button mode="text" onPress={() => setShowOtpModal(false)}>Cancel</Button>
              </ScrollView>
            </KeyboardAvoidingView>
          </Modal>
        </Portal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 40, fontWeight: '900', textAlign: 'center', marginBottom: 5 },
  subtitle: { textAlign: 'center', marginBottom: 35, opacity: 0.6 },
  input: { marginBottom: 16 },
  button: { paddingVertical: 6, borderRadius: 12 },
  modal: { padding: 25, margin: 20, borderRadius: 28, maxHeight: '80%',marginBottom: 200 },
  modalTitle: { fontWeight: '800', marginBottom: 10 },
  modalText: { textAlign: 'center', marginBottom: 20, opacity: 0.7 }
});