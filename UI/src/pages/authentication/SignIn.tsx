import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../../stores/Store";

const SignIn: React.FC = () => {

  const setOauthState = useStore.getState().setOauthState;
  const storedToken = useStore.getState().access_token;
  

  const navigate = useNavigate();
  
  // navigate to List Repo page if the access_token exists in local storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (storedToken) {
        navigate("/repo");
      }
    }
  }, []);

  const handleGiteaSignIn = () => {
    const state = Math.random().toString(36).substring(7); // Generate a random state for CSRF protection
    setOauthState(state);

    const params = new URLSearchParams({
      client_id: import.meta.env.VITE_GITEA_CLIENT_ID,
      redirect_uri: import.meta.env.VITE_GITEA_REDIRECT_URI,
      response_type: "code",
      state: state,
    });

    window.location.href = `${
      import.meta.env.VITE_GITEA_BASE_URL
    }/login/oauth/authorize?${params.toString()}`;
  };

  const handleRegister = () => {
    window.open(
      `${import.meta.env.VITE_GITEA_BASE_URL}/user/sign_up`,
      "_blank" // Open in a new tab
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center space-y-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome to Gitea-UI
          </h1>
          <p className="text-gray-500">
            Sign in or create an account to continue
          </p>
        </div>

        <button
          onClick={handleGiteaSignIn}
          className="group relative w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:border-gray-400 bg-white hover:bg-gray-50 transition-all duration-200 space-x-4"
        >
          {/* Gitea Logo SVG */}
          <svg className="w-6 h-6" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM8 14.5C4.41 14.5 1.5 11.59 1.5 8C1.5 4.41 4.41 1.5 8 1.5C11.59 1.5 14.5 4.41 14.5 8C14.5 11.59 11.59 14.5 8 14.5Z" />
            <path d="M8 2.75C5.1 2.75 2.75 5.1 2.75 8C2.75 10.9 5.1 13.25 8 13.25C10.9 13.25 13.25 10.9 13.25 8C13.25 5.1 10.9 2.75 8 2.75ZM8 11.75C5.93 11.75 4.25 10.07 4.25 8C4.25 5.93 5.93 4.25 8 4.25C10.07 4.25 11.75 5.93 11.75 8C11.75 10.07 10.07 11.75 8 11.75Z" />
          </svg>

          <span className="text-gray-600 font-medium text-lg">
            Signin with Gitea
          </span>

          {/* Arrow Icon */}
          <svg
            className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform duration-200"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>

        <p className="mt-4 text-center">
          <a
            onClick={handleRegister}
            className="text-black text-sm font-medium cursor-pointer hover:underline"
          >
            Don't have an account? Create an Account
          </a>
        </p>
      </div>
    </div>
  );
};

export default SignIn;
