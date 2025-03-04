import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStore } from "@/stores/Store";
import { API_Callback } from "@/services/Api";

const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const access_token = useStore.getState().access_token;
  const storedState = useStore.getState().oauth_state;
  const setToken = useStore.getState().setToken;

  async function handleCallback() {
    if (state !== storedState) {
      navigate("/sign-in");
      return;
    }

    if (!code) return;

    try {
      const tokenResponse = await API_Callback.post(
        "/login/oauth/access_token",
        new URLSearchParams({
          client_id: import.meta.env.VITE_GITEA_CLIENT_ID as string,
          client_secret: import.meta.env.VITE_GITEA_CLIENT_SECRET as string,
          code,
          grant_type: "authorization_code",
          redirect_uri: import.meta.env.VITE_GITEA_REDIRECT_URI as string,
        }).toString()
      );

      const { access_token, refresh_token, expires_in } = tokenResponse.data;
      // console.log("Access token:", tokenResponse.data.access_token);

      setToken(access_token, refresh_token, expires_in);
      navigate("/repo");
    } catch (error) {
      console.error("Authentication error:", error);
      navigate("/sign-in");
    }
  }

  useEffect(() => {
    if (code && state && !access_token) {
      // console.log("code and state:", code, state);
      handleCallback();
    }
  }, []); // empty dependency array to run only once

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-xl font-semibold">Authenticating...</div>
    </div>
  );
};

export default OAuthCallback;
