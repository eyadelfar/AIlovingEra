import { apiJson } from '../lib/api';

export async function fetchProfile() {
  return apiJson('/api/profile');
}

export async function updateProfile(data) {
  return apiJson('/api/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append('file', file);
  return apiJson('/api/profile/avatar', {
    method: 'POST',
    body: formData,
  });
}

export async function changePassword(data) {
  return apiJson('/api/profile/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteAccount() {
  return apiJson('/api/profile/account', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm: 'DELETE' }),
  });
}
