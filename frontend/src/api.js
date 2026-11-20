import axios from 'axios';

export const API_URL = 'http://localhost:8000';
export const WS_URL = 'ws://localhost:8000';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (r) => r,
    (err) => {
        if (err.response?.status === 401) {
            ['token', 'role', 'username'].forEach((k) => sessionStorage.removeItem(k));
        }
        return Promise.reject(err);
    }
);

export const auth = {
    save: (d) => {
        sessionStorage.setItem('token', d.access_token);
        sessionStorage.setItem('role', d.role);
        sessionStorage.setItem('username', d.username);
    },
    clear: () => ['token', 'role', 'username'].forEach((k) => sessionStorage.removeItem(k)),
    get: () => ({
        token: sessionStorage.getItem('token'),
        role: sessionStorage.getItem('role'),
        username: sessionStorage.getItem('username'),
    }),
};

export default api;