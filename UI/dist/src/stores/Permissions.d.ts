export interface PermissionsObject {
    is_owner: boolean;
    is_admin: boolean;
    can_write: boolean;
    can_read: boolean;
    can_create_repository: boolean;
}
interface Permissionsstate {
    permissions: PermissionsObject | null;
    loadings: boolean;
    error: string | null;
    fetchPermissions: (username: string, org: string) => Promise<void>;
    hasPermission: (key: keyof PermissionsObject) => boolean;
}
export declare const usePermissionsStore: import("zustand").UseBoundStore<import("zustand").StoreApi<Permissionsstate>>;
export {};
