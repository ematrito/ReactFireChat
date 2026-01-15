const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// In production, REACT_APP_API_BASE MUST be set during build time
const API_BASE = isDev 
  ? 'http://localhost:8080' 
  : (process.env.REACT_APP_API_BASE || '');

// Debug and validation
if (!isDev) {
  console.log('API_BASE configured as:', API_BASE);
  console.log('REACT_APP_API_BASE env var:', process.env.REACT_APP_API_BASE);
  
  if (!API_BASE) {
    console.error('CRITICAL ERROR: REACT_APP_API_BASE is not set! Backend requests will fail.');
  } else if (API_BASE.includes('localhost')) {
    console.warn('WARNING: API_BASE points to localhost in production!');
  }
}

export { API_BASE };