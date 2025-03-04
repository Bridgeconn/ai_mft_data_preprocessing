import { API_Callback } from "@/services/Api";
import { useStore } from "@/stores/Store";

/**
 * Utility function to refresh access tokens.
 */
 
async function refreshToken() {
  // const navigate = useNavigate();
  const refresh_token = useStore.getState().refresh_token;
  try {
    if (!refresh_token) throw new Error("No refresh token found");

    const response = await API_Callback.post(
      "/login/oauth/access_token",
      new URLSearchParams({
        client_id: import.meta.env.VITE_GITEA_CLIENT_ID as string,
        client_secret: import.meta.env.VITE_GITEA_CLIENT_SECRET as string,
        grant_type: "refresh_token",
        refresh_token: refresh_token,
      }).toString()
    );

    const data = response.data;
    // console.log("Refreshed token:", data.access_token);

    useStore.getState().setToken(data.access_token, data.refresh_token, data.expires_in);
    console.log("token refreshed successfully"); //keeping this for staging testing
  } catch (error) {
    console.error("Error refreshing access_token:", error);
    window.location.href = '/';
  }
}

// Set up a timer to automatically refresh the access_token shortly before it expires.
let tokenRefreshTimeout: ReturnType<typeof setTimeout> | null = null;

export function setupTokenRefresh(expiresIn: number): void {
  // Clear any existing timeout first
  if (tokenRefreshTimeout) {
    clearTimeout(tokenRefreshTimeout);
    tokenRefreshTimeout = null;
  }

  const refreshTime = (expiresIn - 300) * 1000;
  console.log(`Token refresh scheduled in ${refreshTime/1000} seconds`);
  
  tokenRefreshTimeout = setTimeout(() => {
      refreshToken();
  }, refreshTime);
}

// Add a function to clear the timeout
export function clearTokenRefresh(): void {
  if (tokenRefreshTimeout) {
    clearTimeout(tokenRefreshTimeout);
    tokenRefreshTimeout = null;
  }
}