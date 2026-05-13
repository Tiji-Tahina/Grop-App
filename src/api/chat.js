import axios from 'axios';
import { getAccessToken } from './auth';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const chatAPI = axios.create({ baseURL: `${API_BASE}/api/chat` });

chatAPI.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Envoie un message et reçoit la réponse du pipeline IA.
 * @param {string} message
 * @param {number|null} conversationId
 * @returns {Promise<{conversation_id, reply, sources, meta}>}
 */
export async function sendMessage(message, conversationId = null) {
  const response = await chatAPI.post('/', { message, conversation_id: conversationId });
  return response.data;
}

/**
 * Récupère la liste des conversations de l'utilisateur.
 */
export async function getConversations() {
  const response = await chatAPI.get('/conversations/');
  return response.data;
}

/**
 * Récupère une conversation avec ses messages.
 * @param {number} conversationId
 */
export async function getConversation(conversationId) {
  const response = await chatAPI.get(`/conversations/${conversationId}/`);
  return response.data;
}
