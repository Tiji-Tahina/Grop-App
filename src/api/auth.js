import axios from 'axios';

const API_BASE = `${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/auth`;

export const authAPI = {
  register: (data) => axios.post(`${API_BASE}/register/`, data),
  login: (data) => axios.post(`${API_BASE}/login/`, data),
  getProfile: (token) =>
    axios.get(`${API_BASE}/profile/`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  updateProfile: (data, token) =>
    axios.patch(`${API_BASE}/update-profile/`, data, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  getUsers: (token) =>
    axios.get(`${API_BASE}/users/`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export const saveTokens = (access, refresh) => {
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
};

export const getAccessToken = () => localStorage.getItem('access_token');

export const clearTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};
