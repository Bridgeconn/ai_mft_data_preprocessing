export declare const API: import("axios").AxiosInstance;
export declare const setHeader: (access_token: string | null) => void;
/**
 * Axios instance for making authenticated requests.
 */
export declare const API_Callback: import("axios").AxiosInstance;
export declare const apiService: {
    get: (url: string) => Promise<any>;
    put: (data: any, url: string) => Promise<import("axios").AxiosResponse<any, any>>;
    post: (data: any, url: string) => Promise<import("axios").AxiosResponse<any, any>>;
    delete: (data: any, url: string) => Promise<import("axios").AxiosResponse<any, any>>;
};
