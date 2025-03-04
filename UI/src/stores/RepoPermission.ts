import { create } from "zustand";
import { API } from "@/services/Api";

interface RepoOwner {
  id: number;
  username: string;
  // ... other owner fields
}

interface RepoPermissions {
  admin: boolean;
  push: boolean;
  pull: boolean;
}

interface Repository {
  id: number;
  owner: RepoOwner;
  name: string;
  full_name: string;
  permissions: RepoPermissions;
  // ... other repo fields
}

interface PermissionLevel {
  type: 'admin' | 'write' | 'read' | 'none';
}

interface RepoPermissionsState {
  repositories: Repository[];
  loading: boolean;
  error: string | null;
  fetchUserRepos: () => Promise<void>;
  getRepoPermission: (owner: string, repo: string) => PermissionLevel;
  hasRepoPermission: (owner: string, repo: string, requiredLevel: 'admin' | 'write' | 'read') => boolean;
}

export const useRepoPermissionsStore = create<RepoPermissionsState>((set, get) => ({
  repositories: [],
  loading: false,
  error: null,

  fetchUserRepos: async () => {
    set({ loading: true, error: null });
    try {
      const response = await API.get('/api/v1/user/repos');
      set({ repositories: response.data, loading: false });
    } catch (error) {
      console.error('Error fetching user repositories:', error);
      set({ error: 'Failed to fetch repositories', loading: false });
    }
  },

  getRepoPermission: (owner: string, repo: string) => {
    const repository = get().repositories.find(
      r => r.owner.username.toLowerCase() === owner.toLowerCase() && 
           r.name.toLowerCase() === repo.toLowerCase()
    );

    if (!repository) {
      return { type: 'none' };
    }

    if (repository.permissions.admin) {
      return { type: 'admin' };
    }
    if (repository.permissions.push) {
      return { type: 'write' };
    }
    if (repository.permissions.pull) {
      return { type: 'read' };
    }
    return { type: 'none' };
  },

  hasRepoPermission: (owner: string, repo: string, requiredLevel: 'admin' | 'write' | 'read') => {
    const permission = get().getRepoPermission(owner, repo);
    
    switch (requiredLevel) {
      case 'read':
        return ['admin', 'write', 'read'].includes(permission.type);
      case 'write':
        return ['admin', 'write'].includes(permission.type);
      case 'admin':
        return permission.type === 'admin';
      default:
        return false;
    }
  },
}));