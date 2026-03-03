import { create } from 'zustand';
import * as api from '../api/adminApi';

const useAdminStore = create((set, get) => ({
  // Dashboard
  stats: null,
  statsLoading: false,
  revenueChart: [],
  userGrowthChart: [],
  generationChart: [],
  templatePopularity: [],

  fetchStats: async () => {
    set({ statsLoading: true });
    try {
      const data = await api.fetchDashboardStats();
      set({ stats: data, statsLoading: false });
    } catch { set({ statsLoading: false }); }
  },
  fetchRevenueChart: async (days) => {
    const data = await api.fetchRevenueChart(days);
    set({ revenueChart: data || [] });
  },
  fetchUserGrowthChart: async (days) => {
    const data = await api.fetchUserGrowthChart(days);
    set({ userGrowthChart: data || [] });
  },
  fetchGenerationChart: async (days) => {
    const data = await api.fetchGenerationChart(days);
    set({ generationChart: data || [] });
  },
  fetchTemplatePopularity: async (limit) => {
    const data = await api.fetchTemplatePopularity(limit);
    set({ templatePopularity: data || [] });
  },

  // Users
  users: [],
  usersTotal: 0,
  usersPage: 1,
  usersLoading: false,
  userDetail: null,

  fetchUsers: async (params = {}) => {
    set({ usersLoading: true });
    try {
      const data = await api.fetchUsers({ page: get().usersPage, ...params });
      set({ users: data.users, usersTotal: data.total, usersPage: data.page || 1, usersLoading: false });
    } catch { set({ usersLoading: false }); }
  },
  fetchUserDetail: async (id) => {
    const data = await api.fetchUserDetail(id);
    set({ userDetail: data });
  },
  setUsersPage: (p) => set({ usersPage: p }),

  // Purchases
  purchases: [],
  purchasesTotal: 0,
  purchasesPage: 1,
  purchasesLoading: false,

  fetchPurchases: async (params = {}) => {
    set({ purchasesLoading: true });
    try {
      const data = await api.fetchPurchases({ page: get().purchasesPage, ...params });
      set({ purchases: data.purchases, purchasesTotal: data.total, purchasesLoading: false });
    } catch { set({ purchasesLoading: false }); }
  },
  setPurchasesPage: (p) => set({ purchasesPage: p }),

  // Design Submissions
  submissions: [],
  submissionsTotal: 0,
  submissionsPage: 1,
  submissionsLoading: false,

  fetchSubmissions: async (params = {}) => {
    set({ submissionsLoading: true });
    try {
      const data = await api.fetchDesignSubmissions({ page: get().submissionsPage, ...params });
      set({ submissions: data.submissions, submissionsTotal: data.total, submissionsLoading: false });
    } catch { set({ submissionsLoading: false }); }
  },
  setSubmissionsPage: (p) => set({ submissionsPage: p }),

  // Contacts
  contacts: [],
  contactsTotal: 0,
  contactsPage: 1,
  contactsLoading: false,

  fetchContacts: async (params = {}) => {
    set({ contactsLoading: true });
    try {
      const data = await api.fetchContacts({ page: get().contactsPage, ...params });
      set({ contacts: data.contacts, contactsTotal: data.total, contactsLoading: false });
    } catch { set({ contactsLoading: false }); }
  },
  setContactsPage: (p) => set({ contactsPage: p }),

  // System
  health: null,
  errors: [],
  auditLog: [],
  auditLogTotal: 0,
  auditLogPage: 1,

  fetchHealth: async () => {
    const data = await api.fetchSystemHealth();
    set({ health: data });
  },
  fetchErrors: async (limit) => {
    const data = await api.fetchRecentErrors(limit);
    set({ errors: data || [] });
  },
  fetchAuditLog: async (params = {}) => {
    const data = await api.fetchAuditLog({ page: get().auditLogPage, ...params });
    set({ auditLog: data.entries, auditLogTotal: data.total });
  },
  setAuditLogPage: (p) => set({ auditLogPage: p }),
}));

export default useAdminStore;
