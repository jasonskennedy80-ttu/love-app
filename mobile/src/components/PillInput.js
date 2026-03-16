import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';

/**
 * Pill-based tag input.
 * Props:
 *   label       - section label
 *   pills       - string[] current tags
 *   onAdd       - (value: string) => void
 *   onRemove    - (index: number) => void
 *   placeholder - input placeholder
 *   color       - pill accent color (default rose)
 */
export default function PillInput({ label, pills = [], onAdd, onRemove, placeholder, color = '#E75480' }) {
  const [text, setText] = useState('');

  function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setText('');
  }

  const bgColor = color + '22'; // 13% opacity background

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      {/* Existing pills */}
      {pills.length > 0 && (
        <View style={styles.pillRow}>
          {pills.map((pill, i) => (
            <View key={i} style={[styles.pill, { backgroundColor: bgColor, borderColor: color }]}>
              <Text style={[styles.pillText, { color }]}>{pill}</Text>
              <TouchableOpacity onPress={() => onRemove(i)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
                <Text style={[styles.pillX, { color }]}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Input */}
      <View style={[styles.inputRow, { borderColor: color + '55' }]}>
        <TextInput
          style={styles.input}
          placeholder={placeholder || 'Type and press Enter'}
          placeholderTextColor="#bbb"
          value={text}
          onChangeText={setText}
          onSubmitEditing={submit}
          blurOnSubmit={false}
          returnKeyType="done"
        />
        <TouchableOpacity onPress={submit} style={[styles.addBtn, { backgroundColor: color }]}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  pill: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  pillText: { fontSize: 14, fontWeight: '500', marginRight: 4 },
  pillX: { fontSize: 18, lineHeight: 20, fontWeight: '400' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 1.5, borderRadius: 12, overflow: 'hidden',
  },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A1A2E' },
  addBtn: { paddingHorizontal: 16, paddingVertical: 12 },
  addBtnText: { color: '#fff', fontSize: 20, lineHeight: 22, fontWeight: '600' },
});
