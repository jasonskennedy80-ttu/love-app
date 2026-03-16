import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, Platform, StatusBar,
  Switch, Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import client from '../api/client';
import PillInput from '../components/PillInput';

const TABS = ['Messages', 'Interests', 'Occasions'];

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

      {activeTab === 'Messages' && <MessagesTab contact={contact} />}
      {activeTab === 'Interests' && <InterestsTab contact={contact} />}
      {activeTab === 'Occasions' && <OccasionsTab contact={contact} />}
    </View>
  );
}

// ─── Messages Tab ─────────────────────────────────────────────────────────────

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

  async function generatePreview(depth) {
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
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Generate a Message</Text>
        <View style={styles.depthRow}>
          {['light', 'medium', 'deep'].map((d) => (
            <TouchableOpacity key={d} style={styles.depthBtn} onPress={() => generatePreview(d)} disabled={generating}>
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
                <Text style={styles.historyDate}>{new Date(msg.created_at).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.historyBody}>{msg.body}</Text>
            </View>
          ))}
      </View>
    </ScrollView>
  );
}

// ─── Interests Tab ────────────────────────────────────────────────────────────

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
    setSaving(true); setSaved(false);
    try {
      await client.patch(`/contacts/${contact.id}/interests`, patch);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      Alert.alert('Save failed', err.response?.data?.error || 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  function addHobby(val) { const next = [...hobbies, val]; setHobbies(next); triggerSave({ hobbies: next, foods, dietary, memory_note: memoryNote }); }
  function removeHobby(i) { const next = hobbies.filter((_, idx) => idx !== i); setHobbies(next); triggerSave({ hobbies: next, foods, dietary, memory_note: memoryNote }); }
  function addFood(val) { const next = [...foods, val]; setFoods(next); triggerSave({ hobbies, foods: next, dietary, memory_note: memoryNote }); }
  function removeFood(i) { const next = foods.filter((_, idx) => idx !== i); setFoods(next); triggerSave({ hobbies, foods: next, dietary, memory_note: memoryNote }); }

  return (
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      <View style={styles.saveIndicator}>
        {saving && <ActivityIndicator size="small" color="#E75480" />}
        {saved && <Text style={styles.savedText}>✓ Saved</Text>}
      </View>
      <PillInput label="Hobbies & Interests" pills={hobbies} onAdd={addHobby} onRemove={removeHobby} placeholder="e.g. hiking, jazz, photography" color="#E75480" />
      <PillInput label="Favourite Foods & Cuisines" pills={foods} onAdd={addFood} onRemove={removeFood} placeholder="e.g. sushi, tacos, Italian" color="#0D9488" />
      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>Dietary Restrictions / Allergies</Text>
        <TextInput style={styles.fieldInput} placeholder="e.g. vegetarian, no nuts" placeholderTextColor="#bbb" value={dietary} onChangeText={setDietary} onBlur={() => save({ hobbies, foods, dietary, memory_note: memoryNote })} />
      </View>
      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>Personal Memory or Detail</Text>
        <Text style={styles.fieldHint}>This gets woven into every message — make it specific.</Text>
        <TextInput style={[styles.fieldInput, styles.textArea]} placeholder={`e.g. We had our first date at a jazz bar in Austin.`} placeholderTextColor="#bbb" value={memoryNote} onChangeText={setMemoryNote} onBlur={() => save({ hobbies, foods, dietary, memory_note: memoryNote })} multiline numberOfLines={4} textAlignVertical="top" />
      </View>
    </ScrollView>
  );
}

// ─── Occasions Tab ────────────────────────────────────────────────────────────

const OCCASION_TYPES = [
  { value: 'birthday',    label: 'Birthday',    emoji: '🎂' },
  { value: 'anniversary', label: 'Anniversary', emoji: '💍' },
  { value: 'holiday',     label: 'Holiday',     emoji: '🎉' },
  { value: 'daily',       label: 'Daily',       emoji: '☀️' },
  { value: 'random',      label: 'Random',      emoji: '💌' },
];

const SEND_TIMES = [
  { label: 'Morning',   value: '08:00' },
  { label: 'Midday',    value: '12:00' },
  { label: 'Evening',   value: '18:00' },
];

const DEPTHS = ['light', 'medium', 'deep'];

function OccasionsTab({ contact }) {
  const [occasions, setOccasions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [type, setType] = useState('birthday');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sendTime, setSendTime] = useState('08:00');
  const [depth, setDepth] = useState('medium');
  const [saving, setSaving] = useState(false);

  const needsDate = ['birthday', 'anniversary', 'holiday'].includes(type);

  useEffect(() => { fetchOccasions(); }, []);

  async function fetchOccasions() {
    try {
      const res = await client.get(`/occasions?contactId=${contact.id}`);
      setOccasions(res.data.occasions);
    } catch (err) {
      console.error('Failed to load occasions:', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleOccasion(occ) {
    try {
      const res = await client.patch(`/occasions/${occ.id}`, { active: !occ.active });
      setOccasions((prev) => prev.map((o) => o.id === occ.id ? res.data.occasion : o));
    } catch (err) {
      Alert.alert('Error', 'Could not update occasion.');
    }
  }

  async function deleteOccasion(occ) {
    Alert.alert('Delete occasion?', `Remove the ${occ.type} schedule for ${contact.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await client.delete(`/occasions/${occ.id}`);
            setOccasions((prev) => prev.filter((o) => o.id !== occ.id));
          } catch { Alert.alert('Error', 'Could not delete occasion.'); }
        },
      },
    ]);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        contact_id: contact.id,
        type,
        send_time: sendTime,
        depth,
        active: true,
        ...(needsDate && {
          date: date.toISOString().split('T')[0],
        }),
      };
      const res = await client.post('/occasions', payload);
      setOccasions((prev) => [res.data.occasion, ...prev]);
      setShowForm(false);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Could not save occasion.');
    } finally {
      setSaving(false);
    }
  }

  const typeInfo = (t) => OCCASION_TYPES.find((o) => o.value === t) || {};

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.body}>

        {loading ? (
          <ActivityIndicator color="#E75480" style={{ marginTop: 40 }} />
        ) : occasions.length === 0 ? (
          <View style={styles.emptyOccasions}>
            <Text style={styles.emptyOccasionEmoji}>📅</Text>
            <Text style={styles.emptyOccasionTitle}>No schedules yet</Text>
            <Text style={styles.emptyOccasionSub}>Add a birthday, daily message, or random check-in below.</Text>
          </View>
        ) : (
          occasions.map((occ) => {
            const info = typeInfo(occ.type);
            return (
              <View key={occ.id} style={styles.occasionCard}>
                <View style={styles.occasionLeft}>
                  <Text style={styles.occasionEmoji}>{info.emoji}</Text>
                  <View>
                    <Text style={styles.occasionType}>{info.label}</Text>
                    <Text style={styles.occasionMeta}>
                      {occ.date ? new Date(occ.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' : ''}
                      {occ.send_time?.slice(0, 5)} · {occ.depth}
                    </Text>
                  </View>
                </View>
                <View style={styles.occasionRight}>
                  <Switch
                    value={occ.active}
                    onValueChange={() => toggleOccasion(occ)}
                    trackColor={{ false: '#ddd', true: '#FFB3C6' }}
                    thumbColor={occ.active ? '#E75480' : '#fff'}
                  />
                  <TouchableOpacity onPress={() => deleteOccasion(occ)} style={styles.deleteBtn}>
                    <Text style={styles.deleteText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add button */}
      <TouchableOpacity style={styles.addOccasionBtn} onPress={() => { setType('birthday'); setDate(new Date()); setSendTime('08:00'); setDepth('medium'); setShowForm(true); }}>
        <Text style={styles.addOccasionText}>+ Add Schedule</Text>
      </TouchableOpacity>

      {/* Add Occasion Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Schedule</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Type picker */}
          <Text style={styles.formLabel}>Occasion Type</Text>
          <View style={styles.typeGrid}>
            {OCCASION_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[styles.typeCard, type === t.value && styles.typeCardSelected]}
                onPress={() => setType(t.value)}
              >
                <Text style={styles.typeEmoji}>{t.emoji}</Text>
                <Text style={[styles.typeLabel, type === t.value && styles.typeLabelSelected]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Date picker — only for date-based occasions */}
          {needsDate && (
            <>
              <Text style={styles.formLabel}>Date</Text>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.dateBtnText}>
                  {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  onChange={(e, selected) => {
                    setShowDatePicker(false);
                    if (selected) setDate(selected);
                  }}
                />
              )}
            </>
          )}

          {/* Send time */}
          <Text style={styles.formLabel}>Send Time</Text>
          <View style={styles.optionRow}>
            {SEND_TIMES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[styles.optionBtn, sendTime === t.value && styles.optionBtnSelected]}
                onPress={() => setSendTime(t.value)}
              >
                <Text style={[styles.optionBtnText, sendTime === t.value && styles.optionBtnTextSelected]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Depth */}
          <Text style={styles.formLabel}>Message Depth</Text>
          <View style={styles.optionRow}>
            {DEPTHS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.optionBtn, depth === d && styles.optionBtnSelected]}
                onPress={() => setDepth(d)}
              >
                <Text style={[styles.optionBtnText, depth === d && styles.optionBtnTextSelected]}>
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.saveOccasionBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveOccasionText}>Save Schedule</Text>}
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
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
  tabText: { fontSize: 13, fontWeight: '600', color: '#aaa' },
  tabTextActive: { color: '#E75480' },

  body: { padding: 20, paddingBottom: 80 },

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

  // Occasions
  emptyOccasions: { alignItems: 'center', paddingTop: 40 },
  emptyOccasionEmoji: { fontSize: 40, marginBottom: 12 },
  emptyOccasionTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  emptyOccasionSub: { fontSize: 14, color: '#aaa', textAlign: 'center', lineHeight: 20 },

  occasionCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#FFE8EE',
  },
  occasionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  occasionEmoji: { fontSize: 26 },
  occasionType: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  occasionMeta: { fontSize: 12, color: '#aaa', marginTop: 2, textTransform: 'capitalize' },
  occasionRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deleteBtn: { padding: 6 },
  deleteText: { color: '#ddd', fontSize: 16 },

  addOccasionBtn: {
    position: 'absolute', bottom: 20, left: 20, right: 20,
    backgroundColor: '#E75480', borderRadius: 14, paddingVertical: 15, alignItems: 'center',
  },
  addOccasionText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Modal
  modalBody: { padding: 24, paddingBottom: 60 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 28,
  },
  modalCancel: { color: '#E75480', fontSize: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },

  formLabel: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 20 },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeCard: {
    width: '18%', alignItems: 'center', padding: 10, borderRadius: 12,
    backgroundColor: '#f9f9f9', borderWidth: 1.5, borderColor: '#eee',
  },
  typeCardSelected: { borderColor: '#E75480', backgroundColor: '#FFF0F4' },
  typeEmoji: { fontSize: 22, marginBottom: 4 },
  typeLabel: { fontSize: 10, color: '#888', fontWeight: '600', textAlign: 'center' },
  typeLabelSelected: { color: '#E75480' },

  dateBtn: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderWidth: 1.5, borderColor: '#FFE0E8',
  },
  dateBtnText: { fontSize: 16, color: '#1A1A2E', fontWeight: '500' },

  optionRow: { flexDirection: 'row', gap: 10 },
  optionBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#f9f9f9', borderWidth: 1.5, borderColor: '#eee', alignItems: 'center',
  },
  optionBtnSelected: { borderColor: '#E75480', backgroundColor: '#FFF0F4' },
  optionBtnText: { fontSize: 14, color: '#888', fontWeight: '600' },
  optionBtnTextSelected: { color: '#E75480' },

  saveOccasionBtn: {
    backgroundColor: '#E75480', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginTop: 32,
  },
  saveOccasionText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
