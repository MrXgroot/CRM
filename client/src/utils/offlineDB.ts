import Dexie from "dexie";
import { globalBranch, globalEntity } from "./axios";

export class OfflineDB extends Dexie {
  offlineRequests: Dexie.Table<IOfflineRequest, number>;
  dataCache: Dexie.Table<IDataCache, string>; // <-- NEW CACHE TABLE

  constructor() {
    super("OfflineDB");
    this.version(1).stores({
      offlineRequests: "++id, url, method, data, timestamp",
      dataCache: "url", // <-- Indexed by the full URL as the cache key
    });
    this.offlineRequests = this.table("offlineRequests");
    this.dataCache = this.table("dataCache"); // <-- NEW
  }
}
export interface IDataCache {
  url: string; // The full URL used for the API call (this will be the primary key)
  data: any; // The successful response data (e.g., APISuccessResponseInterface)
  timestamp: number; // Time of last cache update
}

export interface IOfflineRequest {
  id?: number;
  url: string;
  method: string;
  data: any; // Can be body data for POST/PUT/PATCH, or query params for GET/DELETE
  timestamp: number;
}

export const db = new OfflineDB();
export const SYNC_COMPLETE_EVENT = "syncOfflineComplete";

// Add a global sync lock to prevent concurrent execution on multiple 'online' events
let isSyncing = false;

// Function to sync offline requests when online
export const syncOfflineRequests = async () => {
  // 1. Check Lock and Online Status
  if (!navigator.onLine || isSyncing) {
    console.log('Sync in progress or offline. Skipping sync.');
    return;
  }
  
  isSyncing = true; // Set the lock

  try {
    const requests = await db.offlineRequests.toArray();
    let successfulSync = false;

    // Optimization: If no requests, release lock and exit
    if (requests.length == 0) {
        return; 
    }

    for (const req of requests) {
      try {
        const token = localStorage.getItem("token");
        const entityId = globalEntity; // Get from your global/signal store
        const branchId = globalBranch; // Get from your global/signal store

        if (!token || !entityId || !branchId) {
          console.warn(
            "Cannot sync offline request: Missing token, entityId, or branchId.",
            req
          );
          continue;
        }

        const method = req.method.toUpperCase();
        
        // 1. Initialize URL parameters with mandatory global IDs
        const urlParams = new URLSearchParams({
          entity_id: String(entityId),
          branch_id: String(branchId),
        });

        // 2. NEW LOGIC: Handle data as query parameters for GET and DELETE methods
        if (
          (method === "GET" || method === "DELETE") &&
          req.data &&
          typeof req.data === "object"
        ) {
          for (const [key, value] of Object.entries(req.data)) {
            // Append data from req.data as query parameters
            if (value !== null && value !== undefined) {
              urlParams.append(key, String(value));
            }
          }
        }
        
        // 3. Construct the full URL
        const queryString = urlParams.toString();
        const fullUrl = `${req.url}${
          queryString ? (req.url.includes("?") ? "&" : "?") + queryString : ""
        }`;
        
        // 4. Determine the request body (only for POST, PUT, PATCH)
        const requestBody =
          method === "POST" || method === "PUT" || method === "PATCH"
            ? JSON.stringify(req.data)
            : undefined;


        // 5. Execute the fetch request
        const response = await fetch(fullUrl, {
          method: method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: requestBody,
        });

        if (response.ok) {
          console.log("Successfully synced request:", req.url);
          await db.offlineRequests.delete(req.id!);
          successfulSync = true;
        } else {
          const errorText = await response.text();
          console.error(
            `Failed to sync request ${req.url}. Status: ${response.status}. Response: ${errorText}`,
            req
          );
        }
      } catch (error) {
        console.error("Failed to sync request:", req, error);
      }
    }
    
    // Dispatch Event AFTER the entire loop is complete
    if (successfulSync) {
      window.dispatchEvent(new CustomEvent(SYNC_COMPLETE_EVENT));
    }
  } catch (outerError) {
    console.error("Error during offline sync process:", outerError);
  } finally {
    isSyncing = false;
    console.log('Offline sync completed. Lock released.');
  }
};

// Listen for online event
window.addEventListener("online", syncOfflineRequests);