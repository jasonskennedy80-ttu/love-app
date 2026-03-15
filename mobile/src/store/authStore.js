import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAuthStore = create((set, get) => ({
  token: null,
  user: null,

  setAuth: (token, user) => {
    set({ token, user });
    AsyncStorage.setItem('auth_token', token);
    AsyncStorage.setItem('auth_user', JSON.stringify(user));
  },

  logout: () => {
    set({ token: null, user: null });
    AsyncStorage.removeItem('auth_token');
    AsyncStorage.removeItem('auth_user');
  },

  hydrate: async () => {
    const token = await AsyncStorage.getItem('auth_token');
    const userJson = await AsyncStorage.getItem('auth_user');
    if (token && userJson) {
      set({ token, user: JSON.parse(userJson) });
    }
  },
}));
