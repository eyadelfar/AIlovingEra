import { apiJson } from '../lib/api';

export async function fetchReferralCode() {
  return apiJson('/api/referral/code');
}

export async function fetchReferralStats() {
  return apiJson('/api/referral/stats');
}

export async function processReferral(code) {
  return apiJson('/api/referral/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ referral_code: code }),
  });
}
