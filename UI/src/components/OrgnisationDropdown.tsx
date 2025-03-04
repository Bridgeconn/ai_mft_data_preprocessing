import React, { useState, useEffect, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { useStore } from "@/stores/Store";
import { useAppEffects } from "@/hooks/UseAppEffects";

const OrgnisationDropdown: React.FC<{
  onSelect: (selected: string) => string;
}> = ({ onSelect }) => {
  const [orgs, setOrgs] = useState<
    {
      value: string;
      label: string;
      avatarUrl: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedValue, setSelectedValue] = useState("");
  const access_token = useStore.getState().access_token;
  const currentUser = useStore.getState().userData;
  const fetchOrganizations = useStore.getState().fetchOrganizations;
  const fetchOrgsWithCreateRepoPermission =
    useStore.getState().fetchOrgsWithCreateRepoPermission;

  const fetchOrgsWithPermissions = useCallback(async () => {
    try {
      setLoading(true);
      await fetchOrganizations();
      const allOrgs = useStore.getState().userOrganizations;

      const orgsWithPermissions = await Promise.all(
        allOrgs.map(async (org: { name: string; avatar_url: string }) => {
          try {
            await fetchOrgsWithCreateRepoPermission(
              useStore.getState().userData.username,
              org.name
            );
            const permissionData =
              useStore.getState().orgsWithCreateRepoPermission;

            if (permissionData.can_create_repository) {
              return {
                ...org,
                value: org.name.toLowerCase(),
                label: org.name,
                avatarUrl: org.avatar_url,
              };
            }
            return null;
          } catch (error) {
            console.error(`Error checking permissions for ${org.name}:`, error);
            return null;
          }
        })
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filteredOrgs: any = orgsWithPermissions.filter(Boolean);

      // Set default value if org name starts with BCS or bridge
      const defaultOrg = filteredOrgs.find(
        (org: { name: string }) =>
          org.name.toLowerCase().startsWith("bcs") ||
          org.name.toLowerCase().startsWith("bridge")
      );

      if (defaultOrg) {
        setSelectedValue(defaultOrg.value);
        onSelect(defaultOrg);
      }

      setOrgs(filteredOrgs);
      setLoading(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setError(error?.message || "Failed to fetch organizations");
      setLoading(false);
    }
  }, [fetchOrganizations, fetchOrgsWithCreateRepoPermission, onSelect]);

  useAppEffects({
    access_token,
    fetchHomePageData: true,
  });

  useEffect(() => {
    if (access_token) {
      fetchOrgsWithPermissions();
    }
  }, [access_token, fetchOrgsWithPermissions]);

  const handleValueChange = (value: string) => {
    setSelectedValue(value);

    const selected =
      value === currentUser?.username
        ? { ...currentUser, type: "user" }
        : orgs.find((org) => org.value === value);
    onSelect(selected);
  };

  if (loading) {
    return <div className="h-10 w-full animate-pulse bg-gray-100 rounded-md" />;
  }

  if (error) {
    return <div className="text-red-500 text-sm">{error}</div>;
  }

  return (
    <Select value={selectedValue} onValueChange={handleValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select owner">
          {selectedValue && (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <img
                  src={
                    selectedValue === currentUser?.username
                      ? currentUser?.avatar_url
                      : orgs.find((org) => org.value === selectedValue)
                          ?.avatarUrl
                  }
                  alt="Avatar"
                  className="h-full w-full object-cover rounded-full"
                />
              </Avatar>
              <span>
                {selectedValue === currentUser?.username
                  ? currentUser?.username
                  : orgs.find((org) => org.value === selectedValue)?.label}
              </span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {/* Current User Option */}
          <SelectItem value={currentUser?.username}>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <img
                  src={currentUser?.avatar_url}
                  alt={`${currentUser?.username}'s avatar`}
                  className="h-full w-full object-cover rounded-full"
                />
              </Avatar>
              <span>{currentUser?.username}</span>
            </div>
          </SelectItem>

          {/* Organization Options */}
          {orgs.map((org) => (
            <SelectItem key={org.value} value={org.value}>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <img
                    src={org.avatarUrl}
                    alt={`${org.label}'s avatar`}
                    className="h-full w-full object-cover rounded-full"
                  />
                </Avatar>
                <span>{org.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

export default OrgnisationDropdown;
