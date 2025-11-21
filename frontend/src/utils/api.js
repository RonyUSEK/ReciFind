import axios from 'axios';

// Default base URL logic:
// 1) If REACT_APP_API_URL is provided, use it (recommended for dev/production)
// 2) If not provided and running in the browser, build a base URL using
//    the current window hostname so that devices on the same network can
//    reach the backend via the laptop IP (e.g., http://192.168.1.42:5000)
// 3) Fallback to localhost for other contexts (e.g., tests)
let API_BASE_URL = process.env.REACT_APP_API_URL;
if (!API_BASE_URL) {
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    // When accessing from a mobile device on the same network, window.location.hostname
    // will contain the laptop IP address (e.g. 172.20.0.3). Use that to call the API.
    API_BASE_URL = `http://${window.location.hostname}:5000`;
  } else {
    API_BASE_URL = 'http://localhost:5000';
  }
}

export { API_BASE_URL };

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
