import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, ScrollView,
} from 'react-native';
import client from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);

  async function handleRegister() {
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await client.post('/auth/register', { email, password });
      setAuth(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>love.app</Text>
        <Text style={styles.tagline}>Create your account</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Email address"
          placeholderTextColor="#aaa"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password (min 8 characters)"
          placeholderTextColor="#aaa"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm password"
          placeholderTextColor="#aaa"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
        />

        <Text style={styles.consent}>
          By signing up you confirm you have consent to send messages to your recipients.
        </Text>

        <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Create Account</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Already have an account? Sign in</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1, backgroundColor: '#FFF5F7',
    justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40,
  },
  logo: { fontSize: 36, fontWeight: '800', color: '#E75480', textAlign: 'center', marginBottom: 8 },
  tagline: { fontSize: 16, color: '#888', textAlign: 'center', marginBottom: 32 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#eee', color: '#1A1A2E',
  },
  consent: {
    fontSize: 12, color: '#aaa', textAlign: 'center',
    marginBottom: 16, lineHeight: 18, paddingHorizontal: 8,
  },
  btn: {
    backgroundColor: '#E75480', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 4,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  link: { color: '#E75480', textAlign: 'center', marginTop: 20, fontSize: 15 },
  error: { color: '#c00', textAlign: 'center', marginBottom: 12, fontSize: 14 },
});
