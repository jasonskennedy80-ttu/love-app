import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import client from '../api/client';

export default function ContactDetailScreen({ route, navigation }) {
  const { contact: initial } = route.params;
  const [contact, setContact] = useState(initial);
  const [messages, setMessages] = useState([]);
  const [previewMsg, setPreviewMsg] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, []);

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
      fetchMessages(); // refresh history
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to generate message.');
    } finally {
      setGenerating(false);
    }
  }

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

      <ScrollView contentContainerStyle={styles.body}>

        {/* AI Message Preview */}
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

        {/* Message History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Message History</Text>
          {messages.length === 0 ? (
            <Text style={styles.emptyText}>No messages yet. Generate one above.</Text>
          ) : (
            messages.map((msg) => (
              <View key={msg.id} style={styles.historyItem}>
                <View style={styles.historyMeta}>
                  <Text style={styles.historyStatus(msg.status)}>{msg.status}</Text>
                  <Text style={styles.historyDate}>
                    {new Date(msg.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.historyBody}>{msg.body}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const STATUS_COLORS = { sent: '#22c55e', preview: '#E75480', pending: '#f59e0b', failed: '#ef4444' };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F7' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#FFE8EE',
  },
  backBtn: { marginRight: 8 },
  backText: { fontSize: 28, color: '#E75480', lineHeight: 32 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#FFD6E0', justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#E75480' },
  headerInfo: { flex: 1 },
  name: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  relationship: { fontSize: 13, color: '#888', marginTop: 2, textTransform: 'capitalize' },

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
  historyStatus: (status) => ({
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
    color: STATUS_COLORS[status] || '#888',
  }),
  historyDate: { fontSize: 12, color: '#aaa' },
  historyBody: { fontSize: 14, color: '#444', lineHeight: 20 },
});
