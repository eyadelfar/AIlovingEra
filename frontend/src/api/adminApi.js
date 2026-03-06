import { apiJson } from '../lib/api';

// Dashboard
export const fetchDashboardStats = () => apiJson('/api/admin/dashboard/stats');
export const fetchRevenueChart = (days = 30) => apiJson(`/api/admin/dashboard/revenue-chart?days=${days}`);
export const fetchUserGrowthChart = (days = 30) => apiJson(`/api/admin/dashboard/user-growth-chart?days=${days}`);
export const fetchGenerationChart = (days = 30) => apiJson(`/api/admin/dashboard/generation-chart?days=${days}`);
export const fetchTemplatePopularity = (limit = 10) => apiJson(`/api/admin/dashboard/template-popularity?limit=${limit}`);

// Users
export const fetchUsers = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiJson(`/api/admin/users?${qs}`);
};
export const fetchUserDetail = (id) => apiJson(`/api/admin/users/${id}`);
export const updateUser = (id, data) => apiJson(`/api/admin/users/${id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
export const adjustCredits = (id, amount, reason) => apiJson(`/api/admin/users/${id}/adjust-credits`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount, reason }),
});
export const banUser = (id, reason) => apiJson(`/api/admin/users/${id}/ban`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ reason }),
});
export const unbanUser = (id) => apiJson(`/api/admin/users/${id}/unban`, {
  method: 'POST',
});
export const changeUserRole = (id, role) => apiJson(`/api/admin/users/${id}/role`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ role }),
});

// Revenue
export const fetchPurchases = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiJson(`/api/admin/revenue/purchases?${qs}`);
};
export const refundPurchase = (id, reason) => apiJson(`/api/admin/revenue/purchases/${id}/refund`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ reason }),
});
export const fetchPaymentAudit = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiJson(`/api/admin/revenue/payment-audit?${qs}`);
};

// Content
export const fetchDesignSubmissions = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiJson(`/api/admin/content/submissions?${qs}`);
};
export const reviewSubmission = (id, action, admin_notes = '') => apiJson(`/api/admin/content/submissions/${id}/review`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action, admin_notes }),
});
export const fetchContacts = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiJson(`/api/admin/content/contacts?${qs}`);
};
export const updateContact = (id, status, admin_response = '') => apiJson(`/api/admin/content/contacts/${id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status, admin_response }),
});

// Funnel & Analytics
export const fetchFunnelStats = (days = 30) =>
  apiJson(`/api/admin/dashboard/funnel?days=${days}`);

export const fetchEventStats = (days = 30) =>
  apiJson(`/api/admin/dashboard/event-stats?days=${days}`);

export const fetchWizardFunnel = (days = 30) =>
  apiJson(`/api/admin/dashboard/wizard-funnel?days=${days}`);

export const fetchPdfStats = (days = 30) =>
  apiJson(`/api/admin/dashboard/pdf-stats?days=${days}`);

// System
export const fetchSystemHealth = () => apiJson('/api/admin/system/health');
export const fetchRecentErrors = (limit = 20) => apiJson(`/api/admin/system/errors?limit=${limit}`);
export const fetchAuditLog = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiJson(`/api/admin/system/audit-log?${qs}`);
};
