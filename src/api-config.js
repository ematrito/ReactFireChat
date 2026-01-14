const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = isDev 
  ? 'http://localhost:8080' 
  : (process.env.REACT_APP_API_BASE || 'http://localhost:8080');

// Debug: Show what API_BASE is set to
if (!isDev) {
  console.log('API_BASE configured as:', API_BASE);
  console.log('REACT_APP_API_BASE env var:', process.env.REACT_APP_API_BASE);
}

export { API_BASE };