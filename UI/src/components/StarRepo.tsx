import React, { useEffect, useState } from "react";
import { API } from "@/services/Api";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StarRepoProps {
  owner: string;
  repo: string;
}

const StarRepo: React.FC<StarRepoProps> = ({ owner, repo }) => {
  const [isStarred, setIsStarred] = useState<boolean>(false);
  const [starCount, setStarCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchRepoData = async () => {
    try {
      const repoResponse = await API.get(`/api/v1/repos/${owner}/${repo}`);
      const repoData = repoResponse.data;
      setStarCount(repoData.stars_count);

      await API.get(`/api/v1/user/starred/${owner}/${repo}`);
      setIsStarred(true);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setIsStarred(false);
      } else {
        console.error("Error fetching repo data:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStar = async () => {
    try {
      setIsLoading(true);
      if (isStarred) {
        await API.delete(`/api/v1/user/starred/${owner}/${repo}`);
        setStarCount((prev) => prev - 1);
        setIsStarred(false);
      } else {
        await API.put(`/api/v1/user/starred/${owner}/${repo}`);
        setStarCount((prev) => prev + 1);
        setIsStarred(true);
      }
    } catch (error) {
     console.error("Error toggling star:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRepoData();
  }, [owner, repo]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            onClick={toggleStar}
            disabled={isLoading}
            variant={isStarred ? "secondary" : "outline"}
            className="group relative transition-all duration-300 hover:scale-105 px-3"
          >
            <Star
              className={`h-4 w-4 transition-transform duration-300 ${
                isStarred ? 'fill-yellow-400 text-yellow-400' : 'group-hover:scale-110'
              }`}
            />
            <span>{isStarred ? "Unstar" : "Star"}</span>
            <span className="text-xs font-bold mt-[1px]">
              {starCount.toLocaleString()}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{isStarred ? "Remove star from this project" : "Star this project"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default StarRepo;