
import { toastError } from "./SweetAlert";
import { baseURL } from "./axios";

export function downloadCSV(csvData: string, fileName: string) {
    const blob = new Blob([csvData], { type: 'text/csv' });

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName; 

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, text: string) {
  let element = document.createElement('a');
  element.setAttribute(
    'href',
    'data:text/plain;charset=utf-8,' + encodeURIComponent(text)
  );
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}


export interface APISuccessResponseInterface {
    data: any;
    message: string;
    statusCode: number;
    success: boolean;
}


// A class that provides utility functions for working with local storage
export class LocalStorage {
    // Get a value from local storage by key
    static get(key: string) {
        const value = localStorage.getItem(key);
        if (value) {
            try {
                return JSON.parse(value);
            } catch (err) {
                return null;
            }
        }
        return null;
    }

    // Set a value in local storage by key
    static set(key: string, value: any) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    // Remove a value from local storage by key
    static remove(key: string) {
        localStorage.removeItem(key);
    }

    // Clear all items from local storage
    static clear() {
        localStorage.clear();
    }
}

export const formatDate = (date: string) => (
    date.slice(0,10).split('-').reverse().join('-')
)
export const formatTime=(time:string)=>{
   return time.slice(0,5).split(':').join(':');
}

/**
 * Format a numeric value in the Indian numbering system.
 * Example: 100000 -> 1,00,000
 */
export const formatIndianNumber = (value: string | number) => {
    if (value === null || value === undefined) return "";
    const digits = String(value).replace(/\D/g, "");
    if (!digits) return "";

    const lastThree = digits.slice(-3);
    const rest = digits.slice(0, -3);
    return rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree : lastThree;
};

export const unformatNumber = (value: string) => {
    return String(value).replace(/,/g, "");
};

export const formatVehicleNo = (vehicleNo:string) => {
    const upperVehicleNo = vehicleNo?.toUpperCase()?.replace(/\s+/g, '');
    return upperVehicleNo?.replace(/([A-Z]{2})(\d{1,2})([A-Z]{1,2})(\d{1,4})/, '$1 $2 $3 $4');
  };

export function getCurrentDateInYYYYMMDD() {
    const date = new Date();

    // Extract year, month, and day
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const day = String(date.getDate()).padStart(2, '0');

    // Format as yyyy-mm-dd
    return `${year}-${month}-${day}`;
}
export const formatDateAndTime=(dateTime:string)=>{
  const [date,time]=dateTime.split('T');
  const Time=time.split('.')[0]
  // return dayjs.utc(dateTime).format('YYYY-MM-DD HH:mm');
  return `${date} ${Time}`
}

export function toMysqlDatetime(date : any){
  const dt = new Date(date);
  const utcDate = new Date(dt.getTime() - (dt.getTimezoneOffset() * 60000));
  return utcDate.toISOString().slice(0, 19).replace('T', ' ');
}


// function print the pdf which is generated in server
export const printPDF = async (pdfArrayBuffer : ArrayBuffer) => {
    try {
  
      // Create a blob from the arraybuffer
      const blob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
  
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
  
      // Open the URL in a new window or tab
      const newWindow = window.open(url, '_blank');
  
      if (newWindow) {
        // Ensure that the new window has fully loaded before attempting to print
        newWindow.onload = () => {
          newWindow.print();
        };
  
        // Release the object URL when it's no longer needed
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
          }, 1000); // Adjust the delay as needed
      } else {
        // Handle the case where the new window could not be opened
        console.error('Failed to open a new window.');
      }
    } catch (error) {
      // Handle errors during the fetch or blob creation
      toastError.fire({
        title : 'Failed to Print PDF'
      })
    }
  };


  export const getCurrentMonthRange = (): { startDate: string; endDate: string } => {
    const now = new Date();

    // Ensure correct UTC date calculations
    const startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    const endDate = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0));

    return {
      startDate: startDate.toISOString().split("T")[0], // Format as YYYY-MM-DD
      endDate: endDate.toISOString().split("T")[0], // Format as YYYY-MM-DD
    };
  };

  export function convertMinutesToText(totalMinutes:number) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const parts = [];
    if (hours > 0) {
        parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    }
    if (minutes > 0 || hours === 0) {
        parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    }

    return parts.join(' ');
  }

  export function formatToINR(amount: number | string): string {
    const num = Number(amount);
    if (isNaN(num)) return '0';

    return num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  export function getFinancialYear(date = new Date()): number {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // January = 0
    return month >= 4 ? year : year - 1;
  }

  export function getStartOfCurrentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}-01`;
  }


  export const ExtraActionsButtonAccess =(pageAccess:Array<{
    url: string;
    access_to_add: number;
    access_to_update: number;
    access_to_delete: number;
    extra_actions: Array<{
      action_id: number;
      action_name: string;
      action_desc: string;
    }>;
  }>  ,actionName:string)=>{
    // return pageAccess.filter(p=> p.url == location.pathname)[0]?.extra_actions?.find((e:{action_name:string}) => e.action_name == `${actionName}`)
    return pageAccess
    .find((p) => p.url == location.pathname)
    ?.extra_actions.some((e) => e.action_name === actionName);
  }

  export const getImageUrl = (
    urlOrKey?: string | File | null,
    baseUrlParam?: string | null,
    fallback: string = ""
  ): string => {
    if (!urlOrKey || typeof urlOrKey !== "string") return fallback;
    const str = String(urlOrKey).trim();
    if (!str) return fallback;

    if (str.startsWith("data:") || str.startsWith("blob:")) {
      return str;
    }

    const backendServerUrl = (baseURL || "http://localhost:5007").replace(/\/+$/, "");

    // If stored URL points to private S3/R2 API endpoint (.r2.cloudflarestorage.com)
    if (str.includes(".r2.cloudflarestorage.com")) {
      try {
        const parsed = new URL(str);
        const rawPath = decodeURIComponent(parsed.pathname);
        const key = rawPath.startsWith("/") ? rawPath.slice(1) : rawPath;
        return `${backendServerUrl}/image-proxy?key=${encodeURIComponent(key)}`;
      } catch (e) {
        // Fallback
      }
    }

    if (str.startsWith("http://") || str.startsWith("https://")) {
      return str;
    }

    if (baseUrlParam && baseUrlParam.includes(".r2.cloudflarestorage.com")) {
      return `${backendServerUrl}/image-proxy?key=${encodeURIComponent(str)}`;
    }

    if (baseUrlParam) {
      const cleanBase = String(baseUrlParam).trim().replace(/\/+$/, "");
      const cleanKey = str.replace(/^\/+/, "");
      return `${cleanBase}/${cleanKey}`;
    }

    return `${backendServerUrl}/image-proxy?key=${encodeURIComponent(str)}`;
  };

  
