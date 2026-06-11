import axios from 'axios';

// [CU1·02→03] baseURL + ruta relativa construyen la URL final del request (ej. POST /api/v1/login)
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

console.log('API URL:', API_URL);

const client = axios.create({
  baseURL: API_URL
});

// [CU1·04 / CU2·04] interceptarRequest() — adjunta Authorization: Bearer <token> a cada petición protegida
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default client;
