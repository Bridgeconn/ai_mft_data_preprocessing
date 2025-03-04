export declare const useUserPermissions: () => {
    hasPermission: (key: keyof import("@/stores/Permissions").PermissionsObject) => boolean;
    loadings: boolean;
    error: string | null;
};
