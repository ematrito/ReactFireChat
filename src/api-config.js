const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = isDev 
  ? 'http://localhost:8080' 
  : (process.env.REACT_APP_API_BASE || 'http://localhost:8080');

export { API_BASE };