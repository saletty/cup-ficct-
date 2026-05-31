import axios from 'axios';

// Cliente axios centralizado — agrega el token automáticamente a cada petición
const client = axios.create({ baseURL: 'http://127.0.0.1:8000/api/v1' });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default client;
