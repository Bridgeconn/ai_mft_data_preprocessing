import { API } from "@/services/Api";
import {create} from "zustand";

export interface PermissionsObject {
    is_owner:boolean;
    is_admin: boolean;
    can_write: boolean;
    can_read: boolean;
    can_create_repository: boolean;
}

interface Permissionsstate {
    permissions: PermissionsObject | null;
    loadings:boolean;
    error: string | null;
    fetchPermissions: (username:string,org:string) => Promise<void>;
    hasPermission: (key: keyof PermissionsObject) => boolean;
}

export const usePermissionsStore = create<Permissionsstate>((set) => ({
    permissions:null,
    loadings: false,
    error:null,
    fetchPermissions: async (username:string,org:string) => {
        set({loadings: true, error: null});
        try {
            const response = await API.get(`/api/v1/users/${username}/orgs/${org}/permissions`);
            set({permissions: response.data});
        } catch (error) {
            console.error("Error fetching permissions:", error);
            set({permissions: null, error: "Failed to fetch permissions", loadings: false});
        }
    },
    hasPermission: (key: keyof PermissionsObject):boolean => {
        const permissions = usePermissionsStore.getState().permissions;
        return permissions ? permissions[key] : false;
    },
}))
