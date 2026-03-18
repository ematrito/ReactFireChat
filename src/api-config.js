const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const API_BASE = isDev 
  ? 'http://localhost:8080' 
  : (window.APP_CONFIG?.API_BASE || '');

export { API_BASE };