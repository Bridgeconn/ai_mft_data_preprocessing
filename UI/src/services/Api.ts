// import { useStore } from "@/stores/Store";
import axios from "axios";

const baseurl = import.meta.env.VITE_GITEA_BASE_URL as string;

export const API = axios.create({
  baseURL: baseurl,
});

export const setHeader = (access_token: string | null) => {
  API.defaults.headers.common["Authorization"] = `token ${access_token}`;
};

/**
 * Axios instance for making authenticated requests.
 */

export const API_Callback = axios.create({
  baseURL: import.meta.env.VITE_GITEA_BASE_URL,
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
});

export const apiService = {
  // to fetch user data
  get: async (url: string) => {
    try {
      const response = await API.get(url);
      return response.data;
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
  },

  put: async (data: any, url: string) => {
    if (!data) {
      throw new Error("Invalid data provided");
    }

    try {
      const response = await API.put(url, data);
      return response;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error in put call:", error?.message || error);
      throw new Error("Put call Failed");
    }
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  post: async (data: any, url: string) => {
    if (!data) {
      throw new Error("Invalid data provided");
    }

    try {
      const response = await API.post(url, data);
      
      if (!response || !response.data) {
        throw new Error("Invalid response from server");
      }
      return response;
    } catch (error: any) {
      // Log the full error for debugging
      console.error("Error in post call:", error);
  
      // Check if it's an API error response (axios typically puts this in error.response)
      if (error.response) {
        const customError: any = new Error(
          error.response.data?.message || "Request failed"
        );
        customError.status = error.response.status;
        customError.data = error.response.data;
        throw customError;
      }
  
      // If it's a network error or other type of error
      throw new Error(error.message || "Network error occurred");
    }
  },
  delete: async (data: any, url: string) => {
    if (!data) {
      throw new Error("Invalid data provided");
    }

    try {
      const response = await API.delete(url, data);
      return response;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error in delete call:", error?.message || error);
      throw new Error("delete call Failed");
    }
  },
};
