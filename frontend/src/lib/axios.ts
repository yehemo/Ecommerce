import Axios from "axios";

const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") {
    return null;
  }

  const prefix = `${name}=`;

  for (const entry of document.cookie.split("; ")) {
    if (entry.startsWith(prefix)) {
      return decodeURIComponent(entry.slice(prefix.length));
    }
  }

  return null;
};

const axios = Axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,  // sends cookies cross-origin (required for Sanctum)
  withXSRFToken: true,    // axios v1.x: automatically reads XSRF-TOKEN cookie and sends as X-XSRF-TOKEN header
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "X-Requested-With": "XMLHttpRequest", // tells Laravel this is an AJAX request
  },
});

axios.interceptors.request.use((config) => {
  const token = getCookie("XSRF-TOKEN");

  if (token) {
    config.headers.set("X-XSRF-TOKEN", token);
  }

  return config;
});

export default axios;
