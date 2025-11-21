const DEFAULT_API_BASE = 'http://localhost:8000';

const sanitizeBaseUrl = (url: string) => url.replace(/\/+$/, '');

const rawBase =
  typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL
    ? process.env.REACT_APP_API_URL
    : DEFAULT_API_BASE;

const API_BASE = sanitizeBaseUrl(rawBase);

export const getApiBase = () => API_BASE;

export const buildApiUrl = (path: string) => {
  const normalizedPath = path.replace(/^\/+/, '');
  return `${API_BASE}/${normalizedPath}`;
};





