const API_PORT = 4444;
const host = window.location.hostname || 'localhost';

export const API_BASE = `http://${host}:${API_PORT}`;
export const WS_URL = `ws://${host}:${API_PORT}`;
