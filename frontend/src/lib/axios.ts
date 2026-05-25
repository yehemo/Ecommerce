import Axios from "axios";

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

export default axios;