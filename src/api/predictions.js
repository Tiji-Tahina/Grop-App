import axios from 'axios';
import { getAccessToken } from './auth';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const predictAPI = axios.create({ baseURL: `${API_BASE}/api/predictions` });

predictAPI.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Launches a yield prediction for a crop.
 * @param {object} params
 * @param {number} params.crop_id
 * @param {boolean} params.irrigation
 * @param {boolean} params.sri_method
 * @param {number} params.rainfall_mm
 * @param {number} params.temp_avg_c
 * @param {number} params.n_fertilizer
 * @param {number} params.p_fertilizer
 * @returns {Promise<Prediction>}
 */
export async function predictYield(params) {
  const response = await predictAPI.post('/predict/', params);
  return response.data;
}

/**
 * Retrieves prediction history.
 */
export async function getPredictions() {
  const response = await predictAPI.get('/history/');
  return response.data;
}

/**
 * Retrieves a specific prediction.
 * @param {number} id
 */
export async function getPrediction(id) {
  const response = await predictAPI.get(`/history/${id}/`);
  return response.data;
}
