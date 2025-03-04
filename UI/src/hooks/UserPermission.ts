import { useEffect } from "react";
import { usePermissionsStore } from "@/stores/Permissions";
import { useStore } from "@/stores/Store";

export const useUserPermissions = () => {
  const { fetchPermissions, hasPermission, loadings, error } = usePermissionsStore();
  const userData = useStore((state) => state.userData); // Get user data from global store
  const org = import.meta.env.VITE_GITEA_ORG_NAME; // Environment variable for org name

  useEffect(() => {
    const username = userData?.username; // Safely get the username
    if (username && org) {
      fetchPermissions(username, org).catch((error) => {
        console.error("Error fetching permissions for org:", org, error);
      });
    }
  }, [fetchPermissions, userData, org]);

  return { hasPermission, loadings, error };
};
