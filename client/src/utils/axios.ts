import * as axios_lib from 'axios';
// import { toastError } from './SweetAlert';
// import { Logout } from '../Components/General/Header';
// import { EntityState } from '../signals/entity';
// import { isLoading } from '../signals/loading';
// import { sessionExpired } from '../signals/session';

export const baseURL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5007';

export const axios = axios_lib.default.create({
  baseURL,
  timeout: 100000,
});

export var globalEntity : number | undefined | null ;
export const setGlobalEntity = (value : number | undefined | null) =>{
  globalEntity = value;
}

export var globalBranch : number | undefined | null ;
export const setglobalBranch = (value : number | undefined | null) =>{
    globalBranch = value;
}

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (globalEntity != null) config.headers.entity_id = String(globalEntity);
  if (globalBranch != null) config.headers.branch_id = String(globalBranch);
  config.params = {...config.params, entity_id: globalEntity, branch_id: globalBranch};
  return config;
});

export const createOfflineRequestConfig = (method: string, url: string, data?: any) => {
  if (globalEntity !== null && globalBranch !== null) {
      const config: any = { // Use 'any' for flexibility with Axios config properties
          url,
          method: method.toUpperCase(),
          data: data ? JSON.stringify(data) : undefined,
          headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          params: {
              entity_id: globalEntity,
              branch_id: globalBranch,
          },
      };
      // Axios adds baseURL during the request, we add it back for the DB
      config.url = `${baseURL}${config.url}`;
      return config;
  } else {
      throw new Error('globalEntity or globalBranch is null');
  }
};



