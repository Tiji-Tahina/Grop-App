import axios from 'axios';
import { getAccessToken } from './auth';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const cropsAPI = axios.create({ baseURL: `${API_BASE}/api/crops` });

cropsAPI.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Farms ───────────────────────────────────────────────────────

export async function getFarms() {
  const response = await cropsAPI.get('/farms/');
  return response.data;
}

export async function getFarm(id) {
  const response = await cropsAPI.get(`/farms/${id}/`);
  return response.data;
}

export async function createFarm(data) {
  const response = await cropsAPI.post('/farms/', data);
  return response.data;
}

export async function updateFarm(id, data) {
  const response = await cropsAPI.patch(`/farms/${id}/`, data);
  return response.data;
}

export async function deleteFarm(id) {
  await cropsAPI.delete(`/farms/${id}/`);
}

// ─── Crops ───────────────────────────────────────────────────────

export async function getCrops() {
  const response = await cropsAPI.get('/crops/');
  return response.data;
}

export async function createCrop(data) {
  const response = await cropsAPI.post('/crops/', data);
  return response.data;
}

export async function updateCrop(id, data) {
  const response = await cropsAPI.patch(`/crops/${id}/`, data);
  return response.data;
}

// ─── Soil Data ────────────────────────────────────────────────────

export async function getSoilData(farmId) {
  const response = await cropsAPI.get('/soil/', { params: { farm: farmId } });
  return response.data;
}

export async function createSoilData(data) {
  const response = await cropsAPI.post('/soil/', data);
  return response.data;
}
