import { useEffect } from "react";
import { useStore } from "@/stores/Store";
import { setHeader } from "@/services/Api";

interface UseAppEffectsParams {
  access_token: string | null; 
  fetchHomePageData?: boolean;
}

export const useAppEffects = ({ access_token, fetchHomePageData = false }: UseAppEffectsParams) => {
  const store = useStore();

  useEffect(() => {
    if (access_token) {
      // Set header for API calls
      setHeader(access_token);

      // Fetch homepage data if required
      if (fetchHomePageData) {
        store.fetchHomePageData();
      }
    }
  }, [access_token]);
};
