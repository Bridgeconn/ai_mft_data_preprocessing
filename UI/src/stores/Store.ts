import { apiService, setHeader } from "@/services/Api";
import { setupTokenRefresh } from "@/utils/refreshToken";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { API } from "@/services/Api";

export const user_url = "/api/v1/user"; // URL to fetch user data
export const org_url = "/api/v1/orgs"; // URL to fetch all organization data
// export const repo_url = "/api/v1/repos/search"; // URL to fetch all repository data
export const repo_url = `/api/v1/orgs/${import.meta.env.VITE_GITEA_ORG_NAME}/repos`;

interface StoreState {
  access_token: string | null; // Access token for authenticated requests
  refresh_token: string | null; // Refresh token for token refresh
  expires_in: number | null; // Expiration time for access token
  oauth_state: string | null; // OAuth state for authentication
  userData: any; // Current user data
  userOrganizations: any; // User's organizations
  allRepos: any; // All repositories of the user
  orgsWithCreateRepoPermission: any; // Organizations with create repository permission
  userRepos: any; // User's repositories list
  starredUserRepos: any; // User's starred repositories list
  followers: any; // User's followers list
  following: any; // User's following list
  currentRepoData: any; // Current clickedrepository data includes owner and repo name
  currentRepoFiles: any; // all files of the current repository
  currentRepoDetails: any;
  metaDataContent: any;
  catalogueData: any;
  error: any; // Error message
  languageFileContent: any;
  setToken: (access_token: string, refresh_token: string, expires_in: number) => void;
  setOauthState: (oauth_state: string) => void;
  logOut: () => void;
  setUserData: (data: any) => void;
  fetchUserData: () => Promise<void>;
  fetchHomePageData: () => Promise<void>;
  fetchAllRepos: () => Promise<any | []>;
  fetchOrganizations: () => Promise<any | []>;
  fetchOrgsWithCreateRepoPermission: (username:string, orgName:string) => Promise<any | []>;
  fetchUserRepos: (userName: string) => Promise<any | []>;
  fetchUserStarredRepos: (userName: string) => Promise<any | []>;
  fetchFollowers: (userName: string) => Promise<any | []>;
  fetchFollowing: (userName: string) => Promise<any | []>;
  fetchCurrentRepoFiles: () => Promise<any | []>;
  fetchMetaDataContent: () => Promise<any | []>;
  fetchCatalogueData: () => Promise<any | []>;
  postCreateRepoInOrg: (data: any, orgName: string) => Promise<any | []>;
  postCreateUserRepo: (data: any) => Promise<any | []>;
  postMetaDataContent:(data: any, method: string) => Promise<any | []>;
  postCreateRepoCatalogue:(data: any, repoName: string) => Promise<any | []>;
  fetchRepoDetails: (owner: string, repoName: string) => Promise<any | []>;
  editFileContent: (data: any, filePath: string) => Promise<any | []>;
}

const initializeLanguageRepo = async () => {
  try {
    const orgName = "BCS"; // Replace with your organization name
    const repoName = "languages-repo"; // Replace with your repository name
    const filePath = "language.json"; // Path to the file in the repository
    const description = "Repository for language JSON file"; // Repository description
  
    // Step 1: Dynamically load the JSON file
    const languageFileModule = await import("../../data/languages_list.json");
    const languageFileContent = JSON.stringify(languageFileModule.default);
  
    // Step 2: Check if the repository exists
    let repoExists = false;
    try {
      const reposResponse = await API.get(`/api/v1/orgs/${orgName}/repos`);
      const repos = reposResponse.data;
  
      // Check if the repository name exists in the list
      repoExists = repos.some((repo: any) => repo.name === repoName);
  
      if (repoExists) {
        // console.log("Repository already exists!");
      } else {
        // console.log("Repository does not exist, creating...");
        // Create the repository
        try {
          const response = await API.post(`/api/v1/orgs/${orgName}/repos`, {
            name: repoName,
            description,
            private: true,
            auto_init: true, // Initialize the repository with a README
          });
          console.log("Repository created successfully!", response.data);
        } catch (error: any) {
          console.error("Error creating repository:", error.message);
          throw new Error("Error creating repository");
        }
      }
    } catch (error: any) {
      console.error("Error checking repositories:", error.message);
      throw new Error("Error checking repositories");
    }
  
    // Step 3: Check if the file already exists in the repository
    if (repoExists) {
      try {
        const fileResponse = await API.get(
          `/api/v1/repos/${orgName}/${repoName}/contents/${filePath}`
        );
        if (fileResponse.status === 200) {
          // console.log("language.json file already exists!");
          return; // Skip the upload if the file exists
        }
      } catch (error: any) {
        if (error.response && error.response.status === 404) {
          console.log("File does not exist, uploading...");
        } else {
          console.error("Error checking file:", error.message);
          throw new Error("Error checking file");
        }
      }
    }
  
    // Step 4: Upload the JSON file if it doesn't exist
    try {
      const fileUploadResponse = await API.post(
        `/api/v1/repos/${orgName}/${repoName}/contents/${filePath}`,
        {
          content: btoa(unescape(encodeURIComponent(languageFileContent))), // Encode content to base64
          message: "Initial commit of language.json",
          branch: "main",
        }
      );
  
      if (fileUploadResponse.status === 201) {
        // console.log("language.json file uploaded successfully!");
      } else {
        console.error("Error uploading file:", fileUploadResponse.status, fileUploadResponse.statusText);
      }
    } catch (error: any) {
      console.error("Error uploading the file:", error.message);
      throw new Error("Error uploading the file");
    }
  } catch (error: any) {
    console.error("Error initializing language repository:", error.message);
  }
  
};



export const useStore = create<StoreState>()(
  persist(
    (set) => ({

      // Initial States

      access_token: null,
      refresh_token: null,
      expires_in: null,
      oauth_state: null,
      userData: null,
      userOrganizations: null,
      allRepos: null,
      orgsWithCreateRepoPermission: null,
      userRepos: null,
      starredUserRepos : null,
      followers: null,
      following: null,
      currentRepoData: null, // Current clickedrepository data includes owner and repo name
      currentRepoDetails: null,
      currentRepoFiles: null,
      metaDataContent: null,
      catalogueData: null,
      error: null,
      languageFileContent: null,

      // Actions Functions for updating states
      // UPDATING DATA
      setToken: (access_token: string, refresh_token: string, expires_in: number) => {
        set({ access_token, refresh_token, expires_in });
        set({ oauth_state: null });
        setHeader(access_token);
        setupTokenRefresh(expires_in);

        // Initialize repository after token is set
        initializeLanguageRepo()
          .then(() => console.log("Language repository initialized."))
          .catch((error) => console.error("Failed to initialize repository:", error));
      },

      setOauthState: (oauth_state: string) => {
        set({ oauth_state });
      },

      logOut: () => {
        set({ 
          access_token: null,
          refresh_token: null,
          expires_in: null,
        });
      },

      setUserData: (data) => {
        set({ userData: data });
      },


      //  FETCHING DATA

      fetchUserData: async () => {
        try {
          const userData = await apiService.get(user_url);
          set({ userData });
        } catch (error) {
          set({ error });
          console.error("Error fetching user data:", error);
        }
      },
      
      fetchHomePageData: async () => {
        try {
          const [userData, reposResponse] = await Promise.all([
            apiService.get(user_url),
            apiService.get(repo_url),
          ]);
          const reposWithTopics = await Promise.all(
            reposResponse.map(async (repo: any) => {
              try {
                const topicsResponse = await apiService.get(`/api/v1/repos/${import.meta.env.VITE_GITEA_ORG_NAME}/${repo.name}/topics`);
                return {
                  ...repo,
                  topics: topicsResponse.topics || []
                };
              } catch (error) {
                console.error(`Error fetching topics for ${repo.name}:`, error);
                return {
                  ...repo,
                  topics: []
                };
              }
            })
          );
          set({ 
            userData, 
            allRepos: reposWithTopics
            
          });
        } catch (error) {
          set({ error });
          console.error("Error fetching home page data:", error);
        }
      },

      fetchCatalogueData: async () => {
        const owner = useStore.getState().currentRepoData.owner;  
        const repoName = useStore.getState().currentRepoData.repo;
        try {
          const catalogueData  = await apiService.get(`/api/v1/repos/${owner}/${repoName}/topics`);
          set({ catalogueData: catalogueData.topics });
        } catch (error) {
          set({ error });
          console.error("Error fetching catalogue data:", error);
        }
      },

      fetchAllRepos: async () => {
        try {
          const allRepos = await apiService.get(repo_url);
          set({ allRepos });
        } catch (error) {
          set({ error });
          console.error("Error fetching all repositories:", error);
        }
      },

      fetchRepoDetails: async (owner: string, repoName: string) => {
        const repo_url = `/api/v1/repos/${owner}/${repoName}`;
        try {
          const repoData = await apiService.get(repo_url);
          set({ currentRepoDetails: repoData });
        } catch (error) {
          set({ error });
          console.error("Error fetching repository data:", error);
        }
      },

      fetchOrganizations: async () => {
        try {
          const userOrganizations = await apiService.get(org_url);
          set({ userOrganizations });
        } catch (error) {
          set({ error });
          console.error("Error fetching user organizations:", error);
        }
      },

      fetchOrgsWithCreateRepoPermission: async (username:string, orgName:string) => {
        const org_permission_url = `/api/v1/users/${username}/orgs/${orgName}/permissions`;
        try {
          const orgsWithCreateRepoPermission = await apiService.get(org_permission_url);
          set({ orgsWithCreateRepoPermission });
        } catch (error) {
          set({ error });
          console.error("Error fetching user organizations:", error);
        }
      },
      fetchUserRepos: async (userName: string) => { // Function to fetch repos owned by the current user;
        const repo_url = `/api/v1/users/${userName}/repos`;
        try {
          const userRepos = await apiService.get(repo_url);
          set({ userRepos });
        } catch (error) {
          set({ error });
          console.error("Error fetching user repositories:", error);
        }
      },
      fetchUserStarredRepos: async (userName: string) => { // Function to fetch starred repos by current user;
        const starred_repo_url = `/api/v1/users/${userName}/starred`;
        try {
          const starredUserRepos = await apiService.get(starred_repo_url);
          set({ starredUserRepos });
        } catch (error) {
          set({ error });
          console.error("Error fetching starred repositories:", error);
        }
      },
      fetchFollowers: async (userName: string) => { // Function to fetch followers by current user;    
        const followers_url = `/api/v1/users/${userName}/followers`;
        try {
          const followers = await apiService.get(followers_url);
          set({ followers });
        } catch (error) {
          console.error("Error fetching followers:", error);
          throw error;
        }
      },
      fetchFollowing: async (userName: string) => { // Function to fetch following by current user;    
        const following_url = `/api/v1/users/${userName}/following`;
        try {
          const following = await apiService.get(following_url);
          set({ following });
        } catch (error) {
          console.error("Error fetching following:", error);
          throw error;
        }
      },
      fetchCurrentRepoFiles: async () => {
        const owner = useStore.getState().currentRepoData.owner;  
        const repoName = useStore.getState().currentRepoData.repo;
        const repo_url = `/api/v1/repos/${owner}/${repoName}/contents`;
        try {
          const repo = await apiService.get(repo_url);
          set({ currentRepoFiles: repo });
        } catch (error) {
          console.error("Error fetching current repository:", error);
          throw error;
        }
      },

      fetchMetaDataContent: async () => {
        const owner = useStore.getState().currentRepoData.owner;  
        const repoName = useStore.getState().currentRepoData.repo;
        const repo_url = `/api/v1/repos/${owner}/${repoName}/contents/metadata.json`;
        try {
          const metaDataContent = await apiService.get(repo_url);
          set({ metaDataContent });
        } catch (error) {
          console.error("Error fetching current repository:", error);
          throw error;
        }
      },

      // POSTING DATA

      postCreateRepoInOrg: async (data: any, orgName: string) => {
        const create_repo_url = `/api/v1/orgs/${orgName}/repos`
        try {
          const response = await apiService.post(data, create_repo_url);
          return response;
        } catch (error) {
          console.error("Error creating repository:", error);
          throw error;
        }
      },

      postCreateUserRepo: async (data: any) => {
        const create_repo_url = `/api/v1/user/repos`
        try {
          const response = await apiService.post(data, create_repo_url);
          return response;
        } catch (error) {
          console.error("Error creating repository:", error);
          throw error;
        }
      },
      editFileContent: async (data: any , filePath: string) => {
        const owner = useStore.getState().currentRepoData.owner;  
        const repoName = useStore.getState().currentRepoData.repo;
        const create_url = `/api/v1/repos/${owner}/${repoName}/contents/${filePath}`;
        try {
          const response = await apiService.put(data, create_url);
          return response;
        } catch (error) {
          console.error("Error updating file:", error);
          throw error;
        }
      },
      postMetaDataContent: async (data: any, method: string) => {
        const owner = useStore.getState().currentRepoData.owner;  
        const repoName = useStore.getState().currentRepoData.repo;
        const create_url = `/api/v1/repos/${owner}/${repoName}/contents/metadata.json`;
        try {
          if(method === "POST"){
            const response = await apiService.post(data, create_url);
            return response;
          }else{
            const response = await apiService.put(data, create_url);
            return response;
          }
        } catch (error) {
          console.error("Error creating repository:", error);
          throw error;
        }
      },

      postCreateRepoCatalogue: async (topics:any, repoName) => {
        const owner = 'BCS' 
        const url = `api/v1/repos/${owner}/${repoName}/topics`
        try {
          const response = await apiService.put({topics: topics}, url)
          return response
        } catch (error){
          console.error("Error creating repository:", error);
          throw error;
        }
      }
    }),
    {
      name: "GiteaUIStore",
      partialize: (state) => ({
        access_token: state.access_token,
        refresh_token: state.refresh_token,
        expires_in: state.expires_in,
        oauth_state: state.oauth_state
      }),
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
