// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'https://snakechatbackend.up.railway.app',
  SOCKET_URL: import.meta.env.VITE_SOCKET_URL || 'https://snakechatbackend.up.railway.app',
  API_URL: (import.meta.env.VITE_API_URL || 'https://snakechatbackend.up.railway.app') + '/api',
  PORT: import.meta.env.VITE_API_PORT || '443' // HTTPS default port
};

// Helper functions
export const getApiUrl = (endpoint: string) => {
  return `${API_CONFIG.API_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
};

export const getSocketUrl = () => {
  return API_CONFIG.SOCKET_URL;
};

// Debug logging
console.log('🔧 API Configuration:', {
  BASE_URL: API_CONFIG.BASE_URL,
  SOCKET_URL: API_CONFIG.SOCKET_URL,
  API_URL: API_CONFIG.API_URL
}); 