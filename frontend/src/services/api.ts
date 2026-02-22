import axios, { type AxiosError, type AxiosResponse } from "axios";
import { ENV } from "../env";

const isDev = import.meta.env.DEV;

export const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request logging (dev only)
if (isDev) {
  apiClient.interceptors.request.use((config) => {
    console.debug(`[API] ${config.method?.toUpperCase()} ${config.url}`, config.params ?? config.data ?? "");
    return config;
  });

  apiClient.interceptors.response.use(
    (response: AxiosResponse) => {
      console.debug(`[API] ${response.status} ${response.config.url}`);
      return response;
    }
  );
}

// Normalize errors into plain Error with a readable message
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string }>) => {
    const status = error.response?.status;
    const detail = error.response?.data?.detail;

    if (detail) {
      return Promise.reject(new Error(`${status}: ${detail}`));
    }
    if (error.code === "ECONNABORTED") {
      return Promise.reject(new Error("Request timed out. Is the backend running?"));
    }
    if (!error.response) {
      return Promise.reject(new Error("Network error. Is the backend running?"));
    }
    return Promise.reject(new Error(`Unexpected error (${status})`));
  }
);