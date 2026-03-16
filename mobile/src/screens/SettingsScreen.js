import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Platform, StatusBar, Alert,
} from 'react-native';
import { useAuthStore } from '../store/authStore';

export default function SettingsScreen({ navigation }) {
  const { user, logout } = useAuthStore();

  function handleLogout() {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Account info */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Email</Text>
          <Text style={styles.rowValue}>{user?.email}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Plan</Text>
          <Text style={[styles.rowValue, styles.planBadge]}>{user?.plan?.toUpperCase()}</Text>
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F7' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 40) + 8 : 52,
    paddingBottom: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#FFE8EE',
  },
  backBtn: { width: 40 },
  backText: { fontSize: 28, color: '#E75480', lineHeight: 32 },
  title: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },

  section: { marginTop: 24, marginHorizontal: 20 },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: '#aaa',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  row: {
    backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 12, marginBottom: 2, borderWidth: 1, borderColor: '#FFE8EE',
  },
  rowLabel: { fontSize: 15, color: '#1A1A2E' },
  rowValue: { fontSize: 15, color: '#888' },
  planBadge: { color: '#E75480', fontWeight: '700', fontSize: 12 },

  logoutBtn: {
    marginHorizontal: 20, marginTop: 32, backgroundColor: '#fff',
    borderRadius: 12, paddingVertical: 15, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#FFE8EE',
  },
  logoutText: { color: '#E75480', fontWeight: '700', fontSize: 16 },
});
