import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// attach token
api.interceptors.request.use(config => {
  const access = localStorage.getItem('access');
  if (access) config.headers['Authorization'] = 'Bearer ' + access;
  return config;
});

export default api;
