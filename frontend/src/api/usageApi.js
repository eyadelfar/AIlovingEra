import { apiJson } from '../lib/api';

export async function fetchUsage() {
  return apiJson('/api/usage');
}
