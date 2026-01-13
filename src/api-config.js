// For production, the frontend and backend are served from the same domain
// For local dev, they're on different ports
const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = process.env.REACT_APP_API_BASE || 
  (isDev ? 'http://localhost:8080' : `https://${window.location.hostname}`);

export { API_BASE };