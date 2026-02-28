import { apiJson } from '../lib/api';

export async function fetchTemplates() {
  return apiJson('/api/templates');
}
