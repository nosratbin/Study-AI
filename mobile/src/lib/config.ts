/** Backend base URL. Override with EXPO_PUBLIC_API_URL (e.g. http://10.0.2.2:8000/api for a local backend). */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "https://iccheghuri.tech/api").replace(/\/+$/, "");
