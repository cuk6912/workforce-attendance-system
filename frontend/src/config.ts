// This tells Vite to use your Vercel Environment Variable, or fallback to localhost if you are testing on your PC.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';