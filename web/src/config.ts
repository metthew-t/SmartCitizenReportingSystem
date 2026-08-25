/// <reference types="vite/client" />

// This allows the frontend to read the VITE_API_URL environment variable provided by Netlify
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
