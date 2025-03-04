import { useEffect } from 'react';
import { useRepoPermissionsStore} from '@/stores/RepoPermission';

export const useRepoPermissions = (owner: string, repo: string) => {
  const { fetchUserRepos, hasRepoPermission, getRepoPermission, loading, error } = useRepoPermissionsStore();

  useEffect(() => {
    fetchUserRepos().catch(error => {
      console.error('Error fetching user repositories:', error);
    });
  }, [fetchUserRepos]);

  return {
    hasRepoPermission: (requiredLevel: 'admin' | 'write' | 'read' = 'write') => 
      hasRepoPermission(owner, repo, requiredLevel),
    getRepoPermission: () => getRepoPermission(owner, repo),
    loading,
    error
  };
};