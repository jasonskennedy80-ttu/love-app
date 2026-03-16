import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, Platform, StatusBar,
} from 'react-native';
import client from '../api/client';
import PillInput from '../components/PillInput';

const TABS = ['Messages', 'Interests'];

export default function ContactDetailScreen({ route, navigation }) {
  const { contact: initial } = route.params;
  const [contact] = useState(initial);
  const [activeTab, setActiveTab] = useState('Messages');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{contact.name[0].toUpperCase()}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{contact.name}</Text>
          <Text style={styles.relationship}>{contact.relationship} · {contact.tone}</Text>
        </View>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'Messages'
        ? <MessagesTab contact={contact} />
        : <InterestsTab contact={contact} />}
    </View>
  );
}

// ─── Messages Tab ────────────────────────────────────────────────────────────

function MessagesTab({ contact }) {
  const [messages, setMessages] = useState([]);
  const [previewMsg, setPreviewMsg] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { fetchMessages(); }, []);

  async function fetchMessages() {
    try {
      const res = await client.get(`/messages?contactId=${contact.id}`);
      setMessages(res.data.messages);
    } catch (err) {
      console.error('Failed to load messages:', err.message);
    }
  }

  async function generatePreview(depth = 'medium') {
    setGenerating(true);
    setPreviewMsg(null);
    try {
      const res = await client.post('/messages/preview', {
        contact_id: contact.id,
        occasion_type: 'random',
        depth,
      });
      setPreviewMsg(res.data.message.body);
      fetchMessages();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to generate message.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.body}>
      {/* Generate */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Generate a Message</Text>
        <View style={styles.depthRow}>
          {['light', 'medium', 'deep'].map((d) => (
            <TouchableOpacity
              key={d}
              style={styles.depthBtn}
              onPress={() => generatePreview(d)}
              disabled={generating}
            >
              <Text style={styles.depthBtnText}>{d.charAt(0).toUpperCase() + d.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {generating && (
          <View style={styles.generatingRow}>
            <ActivityIndicator color="#E75480" size="small" />
            <Text style={styles.generatingText}>Crafting something personal...</Text>
          </View>
        )}

        {previewMsg && !generating && (
          <View style={styles.previewBubble}>
            <Text style={styles.previewText}>{previewMsg}</Text>
            <TouchableOpacity onPress={() => generatePreview('medium')} style={styles.regenBtn}>
              <Text style={styles.regenText}>↺ Regenerate</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Message History</Text>
        {messages.length === 0
          ? <Text style={styles.emptyText}>No messages yet. Generate one above.</Text>
          : messages.map((msg) => (
            <View key={msg.id} style={styles.historyItem}>
              <View style={styles.historyMeta}>
                <Text style={[styles.historyStatus, { color: STATUS_COLORS[msg.status] || '#888' }]}>
                  {msg.status}
                </Text>
                <Text style={styles.historyDate}>
                  {new Date(msg.created_at).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.historyBody}>{msg.body}</Text>
            </View>
          ))}
      </View>
    </ScrollView>
  );
}

// ─── Interests Tab ───────────────────────────────────────────────────────────

function InterestsTab({ contact }) {
  const [hobbies, setHobbies] = useState(contact.hobbies || []);
  const [foods, setFoods] = useState(contact.foods || []);
  const [dietary, setDietary] = useState(contact.dietary || '');
  const [memoryNote, setMemoryNote] = useState(contact.memory_note || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef(null);

  function triggerSave(patch) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(patch), 800);
  }

  async function save(patch) {
    setSaving(true);
    setSaved(false);
    try {
      await client.patch(`/contacts/${contact.id}/interests`, patch);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      Alert.alert('Save failed', err.response?.data?.error || 'Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  }

  function addHobby(val) {
    const next = [...hobbies, val];
    setHobbies(next);
    triggerSave({ hobbies: next, foods, dietary, memory_note: memoryNote });
  }

  function removeHobby(i) {
    const next = hobbies.filter((_, idx) => idx !== i);
    setHobbies(next);
    triggerSave({ hobbies: next, foods, dietary, memory_note: memoryNote });
  }

  function addFood(val) {
    const next = [...foods, val];
    setFoods(next);
    triggerSave({ hobbies, foods: next, dietary, memory_note: memoryNote });
  }

  function removeFood(i) {
    const next = foods.filter((_, idx) => idx !== i);
    setFoods(next);
    triggerSave({ hobbies, foods: next, dietary, memory_note: memoryNote });
  }

  return (
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

      {/* Save indicator */}
      <View style={styles.saveIndicator}>
        {saving && <ActivityIndicator size="small" color="#E75480" />}
        {saved && <Text style={styles.savedText}>✓ Saved</Text>}
      </View>

      <PillInput
        label="Hobbies & Interests"
        pills={hobbies}
        onAdd={addHobby}
        onRemove={removeHobby}
        placeholder="e.g. hiking, jazz, photography"
        color="#E75480"
      />

      <PillInput
        label="Favourite Foods & Cuisines"
        pills={foods}
        onAdd={addFood}
        onRemove={removeFood}
        placeholder="e.g. sushi, tacos, Italian"
        color="#0D9488"
      />

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>Dietary Restrictions / Allergies</Text>
        <TextInput
          style={styles.fieldInput}
          placeholder="e.g. vegetarian, no nuts"
          placeholderTextColor="#bbb"
          value={dietary}
          onChangeText={setDietary}
          onBlur={() => save({ hobbies, foods, dietary, memory_note: memoryNote })}
        />
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>Personal Memory or Detail</Text>
        <Text style={styles.fieldHint}>This gets woven into every message — make it specific.</Text>
        <TextInput
          style={[styles.fieldInput, styles.textArea]}
          placeholder={`e.g. We had our first date at a jazz bar in Austin. ${contact.name} always tears up at sunsets.`}
          placeholderTextColor="#bbb"
          value={memoryNote}
          onChangeText={setMemoryNote}
          onBlur={() => save({ hobbies, foods, dietary, memory_note: memoryNote })}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

    </ScrollView>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const STATUS_COLORS = { sent: '#22c55e', preview: '#E75480', pending: '#f59e0b', failed: '#ef4444' };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F7' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 40) + 8 : 52,
    paddingBottom: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#FFE8EE',
  },
  backBtn: { marginRight: 8 },
  backText: { fontSize: 28, color: '#E75480', lineHeight: 32 },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#FFD6E0', justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#E75480' },
  headerInfo: { flex: 1 },
  name: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  relationship: { fontSize: 13, color: '#888', marginTop: 2, textTransform: 'capitalize' },

  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#FFE8EE',
  },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#E75480' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#aaa' },
  tabTextActive: { color: '#E75480' },

  body: { padding: 20, paddingBottom: 60 },

  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 12 },

  depthRow: { flexDirection: 'row', gap: 10 },
  depthBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#FFD6E0', alignItems: 'center',
  },
  depthBtnText: { color: '#E75480', fontWeight: '600', fontSize: 14 },

  generatingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 10 },
  generatingText: { color: '#888', fontSize: 14 },

  previewBubble: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginTop: 14,
    borderWidth: 1.5, borderColor: '#FFD6E0',
  },
  previewText: { fontSize: 16, color: '#1A1A2E', lineHeight: 24 },
  regenBtn: { marginTop: 12, alignSelf: 'flex-end' },
  regenText: { color: '#E75480', fontSize: 13, fontWeight: '600' },

  emptyText: { color: '#aaa', fontSize: 14 },
  historyItem: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#f0f0f0',
  },
  historyMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  historyStatus: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  historyDate: { fontSize: 12, color: '#aaa' },
  historyBody: { fontSize: 14, color: '#444', lineHeight: 20 },

  saveIndicator: { height: 24, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  savedText: { color: '#22c55e', fontSize: 13, fontWeight: '600' },

  fieldBlock: { marginBottom: 24 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  fieldHint: { fontSize: 12, color: '#bbb', marginBottom: 8 },
  fieldInput: {
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 15, borderWidth: 1.5, borderColor: '#FFE0E8', color: '#1A1A2E',
  },
  textArea: { minHeight: 100, paddingTop: 12 },
});
