import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Animated,
} from 'react-native';
import client from '../api/client';

const STEPS = [
  { key: 'name',         title: "What's their name?",            subtitle: 'First name or nickname is fine.',           keyboard: 'default',       placeholder: 'e.g. Mom, Sarah, Jake' },
  { key: 'phone',        title: 'What\'s their phone number?',   subtitle: 'We\'ll text them on your behalf.',          keyboard: 'phone-pad',     placeholder: 'e.g. +1 555 123 4567' },
  { key: 'relationship', title: 'How do you know them?',         subtitle: 'This shapes the message tone.',             keyboard: 'default',       placeholder: 'e.g. Partner, Mom, Best friend' },
  { key: 'tone',         title: 'What tone fits best?',          subtitle: 'Pick the vibe for their messages.',         keyboard: null,            placeholder: null },
  { key: 'city',         title: 'What city are they in?',        subtitle: 'Used to find local restaurants for them.',  keyboard: 'default',       placeholder: 'e.g. Austin, New York' },
];

const TONES = [
  { value: 'warm',      label: 'Warm',      emoji: '🤗', desc: 'Caring & heartfelt' },
  { value: 'playful',   label: 'Playful',   emoji: '😄', desc: 'Fun & lighthearted' },
  { value: 'romantic',  label: 'Romantic',  emoji: '💕', desc: 'Loving & tender' },
  { value: 'formal',    label: 'Formal',    emoji: '🤝', desc: 'Respectful & polished' },
  { value: 'casual',    label: 'Casual',    emoji: '✌️', desc: 'Laid-back & natural' },
];

export default function AddContactScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({ name: '', phone: '', relationship: '', tone: 'warm', city: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const progress = useRef(new Animated.Value(0)).current;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  function animateProgress(toStep) {
    Animated.timing(progress, {
      toValue: (toStep + 1) / STEPS.length,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }

  function handleNext() {
    setError('');
    const val = values[current.key];

    if (current.key === 'name' && !val.trim()) {
      setError('Please enter a name.'); return;
    }
    if (current.key === 'phone' && !val.trim()) {
      setError('Please enter a phone number.'); return;
    }
    if (current.key === 'relationship' && !val.trim()) {
      setError('Please describe the relationship.'); return;
    }

    if (isLast) {
      handleSubmit();
    } else {
      const next = step + 1;
      setStep(next);
      animateProgress(next);
    }
  }

  function handleBack() {
    if (step === 0) { navigation.goBack(); return; }
    const prev = step - 1;
    setStep(prev);
    animateProgress(prev);
    setError('');
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      await client.post('/contacts', values);
      navigation.replace('Home');
    } catch (err) {
      const msg = err.response?.data?.error || 'Something went wrong. Please try again.';
      setError(msg);
      if (msg.includes('plan')) setStep(0); // plan limit — go back to start
    } finally {
      setLoading(false);
    }
  }

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#FFF5F7' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.stepCount}>{step + 1} of {STEPS.length}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.subtitle}>{current.subtitle}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Tone picker (step 4) */}
        {current.key === 'tone' ? (
          <View style={styles.toneGrid}>
            {TONES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[styles.toneCard, values.tone === t.value && styles.toneCardSelected]}
                onPress={() => setValues((v) => ({ ...v, tone: t.value }))}
              >
                <Text style={styles.toneEmoji}>{t.emoji}</Text>
                <Text style={[styles.toneLabel, values.tone === t.value && styles.toneLabelSelected]}>
                  {t.label}
                </Text>
                <Text style={styles.toneDesc}>{t.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <TextInput
            style={styles.input}
            placeholder={current.placeholder}
            placeholderTextColor="#bbb"
            keyboardType={current.keyboard}
            autoFocus
            value={values[current.key]}
            onChangeText={(v) => setValues((prev) => ({ ...prev, [current.key]: v }))}
            onSubmitEditing={handleNext}
            returnKeyType={isLast ? 'done' : 'next'}
          />
        )}

        {/* City optional hint */}
        {current.key === 'city' && (
          <TouchableOpacity onPress={handleSubmit} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Next / Save button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextBtn, loading && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.nextBtnText}>{isLast ? 'Save Contact' : 'Continue →'}</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  progressTrack: { height: 4, backgroundColor: '#FFD6E0' },
  progressFill: { height: 4, backgroundColor: '#E75480' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backText: { fontSize: 28, color: '#E75480', lineHeight: 32 },
  stepCount: { fontSize: 13, color: '#aaa', fontWeight: '500' },

  body: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 32, paddingBottom: 120 },
  title: { fontSize: 26, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#888', marginBottom: 32, lineHeight: 22 },

  input: {
    backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 18,
    paddingVertical: 16, fontSize: 18, borderWidth: 1.5, borderColor: '#FFD6E0',
    color: '#1A1A2E',
  },

  toneGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  toneCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 14,
    padding: 16, borderWidth: 1.5, borderColor: '#eee', alignItems: 'center',
  },
  toneCardSelected: { borderColor: '#E75480', backgroundColor: '#FFF0F4' },
  toneEmoji: { fontSize: 28, marginBottom: 6 },
  toneLabel: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 2 },
  toneLabelSelected: { color: '#E75480' },
  toneDesc: { fontSize: 12, color: '#aaa', textAlign: 'center' },

  skipBtn: { marginTop: 16, alignSelf: 'center' },
  skipText: { color: '#aaa', fontSize: 14, textDecorationLine: 'underline' },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, backgroundColor: '#FFF5F7',
    borderTopWidth: 1, borderTopColor: '#FFE8EE',
  },
  nextBtn: {
    backgroundColor: '#E75480', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  nextBtnDisabled: { opacity: 0.6 },
  nextBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  error: { color: '#c00', fontSize: 14, marginBottom: 16 },
});
