// Legacy transport endpoints remain available; their UI modules are not part of this CRM.
type LegacyPayload = object;
import { AxiosResponse } from "axios";
import { APISuccessResponseInterface} from ".";
import { axios, createOfflineRequestConfig, globalBranch, globalEntity } from "./axios";
import { entityModel } from "../pages/Masters/Entity";
import { pagesModel } from "../pages/Masters/Pages";
import { branchModel } from "../pages/Masters/Branch";
import { rolesModel } from "../pages/Masters/Roles";
import { dsignationModel } from "../pages/Masters/Designation";
// import { customerTaskManagementmodel } from "../pages/CustomerTaskManagement";
import { db } from "./offlineDB";
import { toastError } from "./SweetAlert";
import * as Actualaxios from 'axios';

type OfflineRequestConfigData = {
    method?: string;
    url?: string;
    data?: any;
    includeGlobalParams?: boolean; 
};



export const requestHandler = async (
 api: () => Promise<AxiosResponse<APISuccessResponseInterface, any>>, 
  onSuccess: (data: APISuccessResponseInterface) => void,               
  onError: (error: string) => void,                                   
  isOfflineEnabled: boolean = false,                                  
  requestConfigData: OfflineRequestConfigData = {},    
) => {

  if (isOfflineEnabled && requestConfigData.method === 'GET') {
      const cacheKey = constructFullUrl(requestConfigData); 
      console.log("CACHE READ KEY:", cacheKey);

      if (!navigator.onLine) {
          const cachedData = await db.dataCache.get(cacheKey);
          console.log("CDATA from dataCache:", cachedData) // Log only for dataCache

          if (cachedData) {
              console.log('Serving data from offline cache (GET success):', cacheKey);
              onSuccess(cachedData.data); // Return the actual cached list data
              return;
          } else {
              // --- NEW FALLBACK LOGIC: SERVE PENDING MUTATIONS ---
              console.warn('GET Cache miss. Falling back to pending offline requests.');
              
              const allMutations = await db.offlineRequests.toArray();
              
              // Filter and process only relevant mutations (e.g., all POSTs/PUTs to /designation)
              const relevantMutations = allMutations
                  .filter(req => req.url.includes(String(requestConfigData.url)) && req.method.toUpperCase() !== 'GET')
                  .map(req => req.data); // Extract the body data
                  
              // Construct a response with the mutations
              const offlineResponse = {
                  success: true,
                  message: "Served pending offline requests.",
                  // IMPORTANT: You need a way to combine `relevantMutations` 
                  // with the pagination/structure your UI expects. 
                  // For a simple list, you can return the mutations directly.
                  data: relevantMutations, 
                  statusCode: 200,
              };

              onSuccess(offlineResponse);
              return; // Return the pending mutations
              // --- END FALLBACK LOGIC ---
          }
      }
  }


  if (isOfflineEnabled && !navigator.onLine && requestConfigData.method !== 'GET') {
    console.log("======= addining to offlinedb")
    // Store request offline
    try {
        const { method, url, data } = requestConfigData;
           if (!method || !url) {
          onError('Cannot store offline: Missing request method or URL in config data.');
          return;
      }

      const config = createOfflineRequestConfig(
          method,
          url,
          data
      );

      // if (config ) {
      //  const key= await db.offlineRequests.add({
      //     url: config.url!,
      //     method: config.method!.toUpperCase(),
      //     data: config.data ? JSON.parse(config.data) : null,
      //     timestamp: Date.now()
      //   });
      //   //  const savedRecord = await db.offlineRequests.get(key);
      //    const cachedData = await db.offlineRequests.get(key);
      //     console.log("CDATA",cachedData)
      //     if (cachedData) {
      //         console.log('Serving data from offline cache:', cachedData);
      //         onSuccess(cachedData.data);
      //         return;
      //     } else {
      //         onError('Offline and no cached data available.');
      //         return;
      //     }
      //   onSuccess({ success: true, message: 'Data stored offline. Will sync when online.', data: savedRecord, statusCode: 200 });
      //   return;
      // }
      if (config) {
  try {
    // Add the request to IndexedDB
    const key = await db.offlineRequests.add({
      url: config.url!,
      method: config.method!.toUpperCase(),
      data: config.data ? JSON.parse(config.data) : null,
      timestamp: Date.now(),
    });

    // Fetch back the cached record using the key
    const cachedData = await db.offlineRequests.get(key);
    console.log("CDATA:", cachedData);

    if (cachedData) {
      console.log("Serving data from offline cache:", cachedData);
      onSuccess({
        success: true,
        message: "Data served from offline cache.",
        data: cachedData.data,
        statusCode: 200,
      });
    } else {
      console.warn("Offline and no cached data available.");
      onError("Offline and no cached data available.");
    }

  } catch (error) {
    console.error("Error while storing or fetching offline data:", error);
    onError("Failed to handle offline request.");
  }
}

    } catch (e) {
      onError('Failed to store offline');
      return;
    }
  }else{
  try {
    const response = await api();

    if (response) {
      const { data } = response;
      if (data?.success) {
        onSuccess(data);
      } else {
        onError(data?.message || "Something went wrong");
      }
    }
  } catch (error: any) {
    // Handle specific known errors
    if (error.message === 'globalEntity or globalBranch is null') {
      // console.log("globalEntity error:", error.message);
    } else if (error.response?.data?.message) {
      onError(error.response.data.message);
    } else {
      onError(error.message || "Network Error or API not found");
    }
  }
}
};

export const constructFullUrl = (configData: OfflineRequestConfigData): string => {
    const { url, data, includeGlobalParams = false } = configData;

    if (!url) {
        return '';
    }

    // 1. Get the base URL without any query string (e.g., '/designation')
    const urlParts = url.split('?');
    const baseUrl = urlParts[0];

    // 2. Initialize URLSearchParams
    const allParams = new URLSearchParams();

    // 3. OPTIONAL: Include global parameters only if the flag is set
    if (includeGlobalParams) {
        allParams.append('entity_id', String(globalEntity));
        allParams.append('branch_id', String(globalBranch));
    }
    
    // 4. Add existing parameters from the original URL (if any)
    if (urlParts.length > 1) {
        const existingParams = new URLSearchParams(urlParts[1]);
        existingParams.forEach((value, key) => {
            allParams.set(key, value); // Use set to allow overwrite by data later
        });
    }

    // 5. Add data from the configData (GET/DELETE body data)
   if (data && typeof data === "object") {
        for (const [key, value] of Object.entries(data)) {
            // Convert to string to check for empty string
            const strValue = String(value); 

            // ONLY INCLUDE PARAMETER IF THE VALUE IS NOT NULL, NOT UNDEFINED, AND NOT AN EMPTY STRING
            if (value !== null && value !== undefined && strValue !== '') { 
                 allParams.set(key, strValue); 
            }
        }
    }

    // 6. Build the final URL
    const queryString = allParams.toString();
    
    return `${baseUrl}${queryString ? `?${queryString}` : ''}`;
};


export const checkServerIndex = () => {
  return axios.get("/");
};
export const logout=(data:{user_name:string,entity_id:number})=>{
  console.log("data",data,"dsdsdsd")
  return axios.post('/user/logout',data);
}

export const login = (data: { user_name: string; password: string }) => {
  return axios.post("/user/login", data);
};
export const checkSession =(data:{user_name:string})=>{
  return axios.post('/user/check-active-session',data)
}
export const forceLogout =(data:{user_name:string})=>{
  return axios.post("/user/force-logout",data)
}

// 2FA (authenticator app) helpers - used after login
export const twofaSetup = () => {
  return axios.post("/user/twofa/setup");
};
export const twofaEnable = (code: string) => {
  return axios.post("/user/twofa/enable", { code });
};
export const twofaDisable = (code: string) => {
  return axios.post("/user/twofa/disable", { code });
};

export const AddEntity = (data: entityModel) => {
  return axios.post("/entity", data);
};

export const GetEntity = () => {
  return axios.get("/entity");
};

export const UpdateEntity = (data: entityModel) => axios.put("/entity", data);

export const GetPages = () => {
  return axios.get("/page");
};

export const SetDefaultHomePage = (page_name: string) => {
  return axios.post("/page/set-default-home", { page_name });
};

export const GetPagesForGivingAccess = () => {
  return axios.get("/page/toGiveAccess");
};

export const UpdatePage = ({
  page_id,
  page_name,
  name,
  description,
  superadmin_only,
  access_for_all,
  offline_enabled,
  extra_actions
}: pagesModel) => {
  return axios.put("/page", {
    page_id,
    page_name,
    name,
    description,
    superadmin_only,
    access_for_all,
    offline_enabled,
    extra_actions
  });
};

export const AddPage = ({ page_name, name, description, superadmin_only, access_for_all, offline_enabled, extra_actions }: pagesModel) => {

  return axios.post("/page", {
    page_name,
    name,
    description,
    superadmin_only,
    access_for_all,
    offline_enabled,
    extra_actions
  });
};


// Add roles 
export const GetRoles = (filter?:{limit:number ,page:number ,role_name:string}) => {
  return axios.get("/role",{
    params:filter
  });
};

export const addRoles = ({ role_name, page_access ,extra_actions, is_admin , is_superadmin , is_staff, branch_access}: rolesModel) => {
  return axios.post("/role", {role_name,page_access,extra_actions,is_admin , is_superadmin , is_staff, branch_access});
};
export const updateRoleAccess=({entity_id,role_id,role_name,page_access ,extra_actions, is_admin,is_superadmin,is_staff,is_active,branch_access,cr_by,cr_on}:rolesModel)=>{
  return axios.put('/role',{
    entity_id,
    role_id,
    role_name,
    page_access,
    extra_actions,// new added
    branch_access,
    is_admin,
    is_superadmin, 
    is_staff,
    is_active,
    cr_by,
    cr_on
  })
}

//BRANCH RELATED APIS
export const GetAllBranches = (filter?:{limit:number ,page:number ,name:string}) => {
  return axios.get("/branch",{
    params:filter
  });
};

export const UpdateBranch = ({ entity_id, branch_id, name, branch_incharge_name, address1, address2, pincode, country, state, city, area, allow_yend_entry, is_active }: branchModel) => {
  return axios.put("/branch", {
    entity_id,
    branch_id,
    name,
    branch_incharge_name,
    address1,
    address2,
    pincode,
    country,
    state,
    city,
    area,
    allow_yend_entry,
    is_active
  });
};

export const getBranchByEntity = () => {
  return axios.get("/branch/getBranchByEntity");
};

export const AddBranch = (data: branchModel) => {
  return axios.post("/branch", data
 );
};

export const GetAllUsers = (filters?:{page?:number,limit:number,user_name?:string | null,role_id:number| null}) => {
  return axios.get("/user",{
    params:filters
  });
};


  
// eslint-disable-next-line react-refresh/only-export-components
export const changePassword = ({
user_password
}:{
  user_password : string
}) =>{
  return  axios.put("/user/changePassword",{
    user_password
  }
  )
}

export const UpdateProfileImg = (data: {
  entity_id: number;
  branch_id: number;
  user_name: string;
  oldImgUrl: string;
  imageFile: File | null;
}) => {
  const formData = new FormData();
  if (data.imageFile) {
    formData.append("ProfileImg", data.imageFile);
  }
  if (data) {
    formData.append("data", JSON.stringify(data));
  }
  return axios.post("/user/profileImg", formData);
};

export const addUSer = (data: {
  user_name: string | null;
  full_name: string | null;
  user_password: string | null;
  role_id: number | null;
  desig_id: number | null;
  imageFile: File | null;
  pan_num: string;
  uan: string;
  esi: string;
  shift_code: number | null;
  emp_structure_code: string;
  reporting_to: string;
  joining_date: string;
  bank_name: string;
  bank_acc_type: string;
  bank_acc_num: string;
  bank_branch_name: string;
  bank_ifsc_code: string;
}) => {
  const formData = new FormData();
  if (data.imageFile) {
    formData.append("ProfileImg", data.imageFile);
  }
  if (data) {
    formData.append("data", JSON.stringify(data));
  }
  return axios.post("/user", formData);
};

export const UpdateUser = (data: {
  user_name: string | null;
  full_name: string | null;
  role_id: number | null;
  entity_id: number | null;
  user_id: number | null;
  desig_id: number | null;
  user_active: 0 | 1;
  user_password: string | null;
  imageFile: File | null;
  pan_num: string;
  uan: string;
  esi: string;
  shift_code: number | null;
  emp_structure_code: string;
  reporting_to: string;
  joining_date: string;
  bank_name: string;
  bank_acc_type: string;
  bank_acc_num: string;
  bank_branch_name: string;
  bank_ifsc_code: string;
}) => {
  const formData = new FormData();
  if (data.imageFile) {
    formData.append("ProfileImg", data.imageFile);
  }
  if (data) {
    formData.append("data", JSON.stringify(data));
  }
  return axios.put("/user", formData);
};

export const getDesignations = (filter?:{limit:number ,page:number ,name:string}) => {
  return axios.get("/designation",{
    params:filter
  });
};

export const addDesignation = (data : dsignationModel) => {
  return axios.post("/designation" , {
    name : data.name
  });
};

export const updateDesignation = (data : dsignationModel) => {
  return axios.put("/designation" , data);
};

export const getAllCountriesAPI = () => {
  return axios.get('/country')
}
export const getAllStatesAPI = (country_code : string) => {
  return axios.get('/state' , {
    params : {
      country_code
    }
  })
}
export const getAllCitiesAPI = (state_code : string) => {
  return axios.get('/city' , {
    params : {
      state_code
    }
  })
}
export interface RazorpayIfscResponse {
  BRANCH: string;
  CONTACT: string;
  RTGS: boolean;
  STATE: string;
  MICR: string;
  CENTRE: string;
  CITY: string;
  IMPS: boolean;
  UPI: boolean;
  NEFT: boolean;
  DISTRICT: string;
  SWIFT: string | null;
  ISO3166: string;
  ADDRESS: string;
  BANK: string;
  BANKCODE: string;
  IFSC: string;
}

// bank master Api
export const getAllBankName = () => {
  return axios.get('/bank')
}
export const getBankAccountType = () => {
  return axios.get('/bank/accounttype')
}
export const getIfscDetails = async (ifsc: string): Promise<RazorpayIfscResponse | null> => {
  if (!ifsc || ifsc.trim().length !== 11) return null;
  const cleanIfsc = ifsc.trim().toUpperCase();
  try {
    const res = await axios.get(`/bank/ifsc/${cleanIfsc}`);
    if (res.data && res.data.data) {
      return res.data.data as RazorpayIfscResponse;
    }
  } catch (err) {
    try {
      const directRes = await fetch(`https://ifsc.razorpay.com/${cleanIfsc}`);
      if (directRes.ok) {
        return (await directRes.json()) as RazorpayIfscResponse;
      }
    } catch (directErr) {
      console.error("Error fetching IFSC details directly:", directErr);
    }
  }
  return null;
};


// Get pincode api for automatic populate with direct Postal API fallback
export const GetDataUsingPincode = async (pincode: number) => {
  try {
    const res = await axios.get('/pincode/getdata', {
      params: { pincode }
    });
    if (res?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
      return res;
    }
  } catch (err) {
    console.error("Backend pincode lookup error, trying direct postal API:", err);
  }

  // Fallback to direct Postal Code API (api.postalpincode.in)
  try {
    const postalRes = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    if (postalRes.ok) {
      const body = await postalRes.json();
      const offices = body?.[0]?.PostOffice;
      if (Array.isArray(offices) && offices.length > 0) {
        const rows = offices.map((off: any) => ({
          country_code: null,
          state_code: null,
          city_code: null,
          district: off.District || null,
          area: off.Name || null,
          pincode: Number(off.Pincode) || pincode,
          is_active: 1,
          state_name: off.State || null,
          city_name: off.District || null,
          country_name: off.Country || null,
        }));
        return { data: { data: rows, success: true } } as any;
      }
    }
  } catch (fallbackErr) {
    console.error("Direct postal API fallback error:", fallbackErr);
  }

  return { data: { data: [], success: false } } as any;
};

// === ADDITIONAL FEATURES API === 
export const GetAllAdditionalFeature = () => {
  return axios.get("/additionalfeature")
}

export const AddAdditonalFeature = (data: LegacyPayload) => {
  return axios.post("/additionalfeature",data)
}

export const UpadateAdditonalFeature = (data: LegacyPayload) => {
  return axios.put("/additionalfeature",data)
}        

export const giveAdditionalFeaturesAccessToEntity = (data: {
  features : LegacyPayload[],
  entity_id : number,
}) => {
  return axios.post("/additionalfeature/giveAccessToEntity",data)
}     

export const getAdditionalAccessOfEntity = (data: {
  entity_id : number,
}) => {
  return axios.get("/additionalfeature/getEntityAccess", {
    params : {
      entity_id_ : data.entity_id  
    }
  })
}   

export const UpadateAdditonalFeatureTemplate = (data: LegacyPayload) => {
  return axios.put("/additionalfeature/updateFeatureTemplate",data)
}   

export const sendTestEmail = (data: {
  to_email : string,
  entity_id : number
}) => {
  return axios.post("/additionalfeature/sendTestEmail",data)
} 


export const AddPlans = (data: any) => {
  return axios.post("/plan", data);
};
export const getPlans = () => {
  return axios.get("/plan");
};
export const updatePlans = (data: any) => {
  return axios.put("/plan", data);
};


//Balance sheet category API's
export const BalanceSheetApis = {
  GetAllBalanceSheet: (filters?: {limit: number, page: number}) => {
    return axios.get('/balancesheetcategory', {
      params: filters
    });
  },

  AddBalanceSheet: (data: LegacyPayload) => {
    return axios.post('/balancesheetcategory', data);
  },

  UpdateBalanceSheet: (data: LegacyPayload) => {
    return axios.put('/balancesheetcategory', data);
  },

  GetAllBalanceSheetReport: (filters?: {to_date:string}) => {
    return axios.get('/balancesheetcategory/getReport', {
      params: filters
    });
  },
}

//GL master API's
export const GlMasterApis = {
  GetAllGlMaster: (filters?: {limit?: number, page?: number ,_branch_id ?: number,bsc_code ?:string 
  gl_incm_exp ?:string }) => {
    return axios.get('/glmaster', {
      params: filters
    });
  },
  AddGlMaster: (data: LegacyPayload) => {
    return axios.post('/glmaster', data);
  },
  UpdateGlMaster: (data: LegacyPayload) => {
    return axios.put('/glmaster', data);
  },
  AddGlSum: (data:LegacyPayload, glCode:string) => {
    return axios.post('/glmaster/glsum', 
      data,{params: {glCode}}
    )
  },
  GetAllGlsum: (glCode: string) => {
    return axios.get('/glmaster/glsum', {
      params: {glCode}
    });
  },
  getHoGLsForBankBranchGlLink : ()=>{
    return axios.get('/glmaster/getHoGLsForBankBranchGlLink')
  },

  callUpdateGLSumProcedure : ()=>{
    return axios.put('/glmaster/updateglsum')
  },

  checkGlAlreadyExists: (branch_to_check: number) => {
    return axios.get('/glmaster/checkglalreadyexists', {
      params: {branch_to_check}
    });
  },

  updateGlsToBranch: (updateGlsToBranch: number) => {
    return axios.put('/glmaster/updateglstobranch', { branch_to_update: updateGlsToBranch });
  },
}


export const ReciptAndPaymentApi = {
  addReceiptandpaymentAndPayment: (data: LegacyPayload, tableBody: LegacyPayload[], totalDebit: number, totalCredit: number, year_end_entry?: string) => {
    return axios.post('/receiptandpayment', { data, tableBody, totalDebit, totalCredit, year_end_entry })
  },
  updateReceiptandpaymentAndPayment: async (data: LegacyPayload, tableBody: LegacyPayload[], totalDebit: number, totalCredit: number) => {
    // console.log("api call",data)
    return await axios.put('/receiptandpayment', {
      data,
      tableBody,
      totalDebit,
      totalCredit
    })
  },
  getAllReceiptandpayment: (filter?: { tabs?: string, limit?: number, page?: number, trans_date: string, voucher_type: string }) => {
    return axios.get('/receiptandpayment', {
      params: filter
    })
  },
  fetchRecieptAndPayment: (rec_num: number, payment_type: string, gl_code: string, trans_date: string, amt_type: string, fin_year: number) => {
    return axios.get('/receiptandpayment/fetch', {
      params: { rec_num, payment_type, gl_code, trans_date, amt_type, fin_year }
    })
  },
  GetGlbal: (data?: { gl_code: string, trans_date: string }) => {
    return axios.get('/receiptandpayment/getglbal', {
      params: data,
    })
  },
  postYendTran: (data: { trans_date: string }) => {
    return axios.post('/receiptandpayment/post_yend_tran', data);
  },
  deleteReceiptandpayment: (data: { rec_num: number, payment_type: string, fin_year: number }) => {
    return axios.delete('/receiptandpayment', {
      params: data
    })
  }
}

export const vendor = {
  getAllVendor: (filter?: {
    page?: number;
    limit?: number;
    vendor_id?: number;
    type?: string;
    selectedbranchid ?: number | null;
  }) => {
    return axios.get("/vendor", {
      params: filter,
    });
  },
  addVendor: (data: LegacyPayload) => {
    return axios.post("/vendor", data);
  },
  updateVendor: (data: LegacyPayload) => {
    return axios.put("/vendor", data);
  },
};

// Holiday Master API's
export const getAllHoliday = (filter?: {
  limit: number;
  page: number;
  name: string;
}) => {
  return axios.get("/holidaymaster", {
    params: filter,
  });
};

export const addHoliday = (data: LegacyPayload) => {
  return axios.post("/holidaymaster", data);
};

export const updateHoliday = (data: LegacyPayload) => {
  return axios.put("/holidaymaster", data);
};

// Salary Master API's
export const getAllSalary = (filter?: {
  limit?: number;
  page?: number;
  name?: string;
  is_lop?:number;
}) => {
  return axios.get("/salarymaster", {
    params: filter,
  });
};

export const addSalary = (data: LegacyPayload) => {
  return axios.post("/salarymaster", data);
};

export const updateSalary = (data: LegacyPayload) => {
  return axios.put("/salarymaster", data);
};

//Shift master API's
export const ShiftTimeApis = {
  AddTimeShift: (data: LegacyPayload) => {
    return axios.post("/timeshift", data);
  },

  UpdateTimeShift: (data: LegacyPayload) => {
    return axios.put("/timeshift", data);
  },

  GetTimeShift: (filters?: {
    shift_code: string;
    limit: number;
    page: number;
  }) => {
    return axios.get("/timeshift", {
      params: filters,
    });
  },
};


//Salary structure API's
export const getAllSalaryStructure = (filter?: {
  limit: number;
  page: number;
}) => {
  return axios.get("/salarystructure", {
    params: filter,
  });
};

export const addSalaryStructure = (
  fromData: {
    effective_date: string;
    structure_desc: string;
    earning_amount: number | null;
    deduction_amount: number | null;
  },
  data: LegacyPayload[]
) => {
  return axios.post("/salarystructure", { ...fromData, data });
};

export const updateSalaryStructure = (
  fromData: {
    entity_id: number | null;
    structure_code: string;
    effective_date: string;
    structure_desc: string;
    earning_amount: number | null;
    deduction_amount: number | null;
  },
  data: LegacyPayload[]
) => {
  return axios.put("/salarystructure", { ...fromData, data });
};

export const getStructureDtlByCode = (data: {
  entity_id: number;
  structure_code: string;
}) => {
  return axios.get("/salarystructure/getStructureDetailByCode", {
    params: data,
  });
};


//Leave Master API's
export const getLeaveMaster = (filter?: { limit: number; page: number }) => {
  return axios.get("/leavemaster", {
    params: filter,
  });
};

export const addLeaveMaster = (data: LegacyPayload) => {
  return axios.post("/leavemaster", data);
};

export const updateLeaveMaster = (data: LegacyPayload) => {
  return axios.put("/leavemaster", data);
};


//ESSL ATTENDANCE API's post
export const SaveAttendanceLogs = (data: {
  logs: {
    key : string;
    value : string;
  }[];
}) => {
  return axios.post("/esslattendance", data);
};

export const getEsslAttendanceHistory = (data: {
  user_id: number | null;
  from_date: string;
  to_date: string;
}) => {
  return axios.get("/esslattendance/getesslattendancehistory", {
    params: data,
  });
};

export const callEsslApiEndPoint = async (from_date : string, to_date : string) => {
  try {

    const esslApiUrl = 'http://localhost:7195';

    const response = await Actualaxios.default.get(
      `${esslApiUrl}/v1/attendance`,{params: {from_date,to_date}}
    );

    if (response.data.success) {
      console.log(response, "------");
      return response.data;
    } else {
      toastError.fire({
        title: `Printing failed: ${response.data.message || 'Unknown error'}`,
      });
      return false;
    }
  } catch (error: any) {
    toastError.fire({
      title: `Failed to call ESSL API: ${error.message || error}`,
    });
    return false;
  }
};

// Process Attendance API's
export const getUsersAttendanceStatus = (data: {
  from_date: string;
  to_date: string;
}) => {
  return axios.get("/esslattendance/getUsersAttendanceStatus", {
    params: data,
  });
};

export const processAttendance = (data: {
  from_date: string;
  to_date: string;
}) => {
  return axios.get("/esslattendance/processAttendance", {
    params: data,
  });
};

// Attendence Regularization API's
export const ApplyAttendanceRegularizationApis = {
  ApplyAttendanceRegularizationForUserAttendanceStatusTable : (data : {
    user_id : number,
    attendance_date : string,
    first_half_status : string,
    second_half_status : string,
    reason : string
  })=>{
    return axios.post('esslattendance/attendanceRegularization',data)
  },
  getAttendenceRegulation : (filter?:{
    date?:string,
    user_id?:string
  })=>{
    return axios.get('esslattendance/getAttendanceRegularization',{
      params : {
        ...filter
      }
    })
  }
}

// Salary Process API's
export const salaryProcessApis = {
  processSalary : (data : {
    finYear : number,
    calYear : number,
    month : number,
    user_id : number
  }) => {
    return axios.post('/salaryProcess',data)
  }
}

// Salary Slip API's
export const salarySlipApis = {
  getAllSalarySlipsOfAnUser: (data?:any) => {
    return axios.get('/salaryslip',{
      params: {...data}
    })
  }
}

// Account Ledger API's 
export const AccountLedgerApi = {
  getAllAccountLedger: (data?:{from_date:string,upto_date:string,cust_code:string,cust_type:string,vend_code:string,ord_code?:number;limit:number, page:number}) => {
    return axios.get('/accountledger',{
      params: data
    })
  }
}

// Order Type API's
export const OrderTypeApis = {
  getAllOrderType : (filter?: { limit: number; page: number })=>{
    return axios.get("/ordertype", {
      params: filter,
    });
  },
  addOrderType : (data: LegacyPayload)=>{
    return axios.post("/ordertype", data);
  },
  updateOrderType : (data: LegacyPayload)=>{
  return axios.put("/ordertype", data);
  },
  MapGLtoOrderType : (data:{
    gl_code : string,
    type_id : number
  })=>{
    return axios.post('/ordertype/mapGLtoOrderType',data)
  },
  GetGlMappedToOrderType_id : (type_id : number)=>{
    return axios.get('/ordertype/getGlMappedToOrderType',{
      params :{
        type_id
      }
    })
  },
  UpdateGLtoOrderType :(data:{
    type_id : number,
    gl_code : string,
  })=>{
    return axios.put('/ordertype/UpdateGLCodetoOrderType',data)
  }
}

// Day Book API's
export const DayBookApi = {
  getAllDayBook: (data?:{gl_code:string,from_date:string,upto_date:string,}) => {
    return axios.get('/daybook',{
      params: data
    })
  }
}

// Trail Balance API's
export const TrailBalanceApi = {
  getAllTrailBalance: (data?:{from_date:string,upto_date:string,}) => {
    return axios.get('/trailbalance',{
      params: data
    })
  }
}

//User history API's
export const UpdateUserHistory = (data: LegacyPayload) => {
  return axios.put("/user/updateUserHistory", data);
};

// General Settings APIs
export const GetGeneralSettings = () => {
  return axios.get("/generalsettings");
};

export const UpdateGeneralSettings = (formData: FormData) => {
  return axios.put("/generalsettings", formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
