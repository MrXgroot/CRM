import http from "axios";
import { baseURL } from "../../utils/axios";
export const portalApi = http.create({ baseURL });
portalApi.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${sessionStorage.getItem("portal_token") || ""}`;
  return config;
});
portalApi.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem("portal_token");
      window.location.assign("/customer/login");
    }
    return Promise.reject(error);
  },
);
