'use client';

import { create } from 'zustand';
import { api } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'seller' | 'master_admin' | 'super_admin' | 'staff';
  sellerId?: string;
  businessName?: string;
  walletBalance?: number;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: RegisterPayload) => Promise<User>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  phone: string;
  businessName: string;
  gstin?: string;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('mozopost_access_token', data.accessToken);
    localStorage.setItem('mozopost_refresh_token', data.refreshToken);
    set({ user: data.user, loading: false });
    return data.user;
  },

  register: async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('mozopost_access_token', data.accessToken);
    if (data.refreshToken) localStorage.setItem('mozopost_refresh_token', data.refreshToken);
    set({ user: data.user, loading: false });
    return data.user;
  },

  logout: () => {
    localStorage.removeItem('mozopost_access_token');
    localStorage.removeItem('mozopost_refresh_token');
    set({ user: null, loading: false });
    if (typeof window !== 'undefined') window.location.href = '/login';
  },

  fetchMe: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('mozopost_access_token') : null;
    if (!token) {
      set({ user: null, loading: false });
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      const u = data.user;
      set({
        user: {
          id: u.id,
          email: u.email,
          firstName: u.first_name,
          lastName: u.last_name,
          role: u.role,
          sellerId: u.seller_id,
          businessName: u.business_name,
          walletBalance: u.wallet_balance ? parseFloat(u.wallet_balance) : undefined,
        },
        loading: false,
      });
    } catch {
      set({ user: null, loading: false });
    }
  },
}));
