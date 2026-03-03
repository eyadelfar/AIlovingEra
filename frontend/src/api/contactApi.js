import { apiJson } from '../lib/api';

export async function submitContactForm(data) {
  return apiJson('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}
