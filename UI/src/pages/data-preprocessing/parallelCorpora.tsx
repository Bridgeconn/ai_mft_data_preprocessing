import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SelectProjects from "./selectProjects";
import { API } from "@/services/Api";
import { Spinner } from "@/components/ui/spinner";
import { useStore } from "@/stores/Store";
import { setHeader } from "@/services/Api";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";

// import SelectBooks from "./SelectBooks";

const ParallelCorpora: React.FC = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject1, setSelectedProject1] = useState("");
  const [selectedProject2, setSelectedProject2] = useState("");

  const [projectFiles1, setProjectFiles1] = useState("");
  const [projectFiles2, setProjectFiles2] = useState("");

  interface Bible {
    successCount: number;
  }

  const [listBibles1, setListBibles1] = useState<Bible[]>([]);
  const [listBibles2, setListBibles2] = useState<Bible[]>([]);

  const [withBCV, setWithBCV] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const listBible1Count = listBibles1[0]?.successCount || 0;
  const listBible2Count = listBibles2[0]?.successCount || 0;

  const access_token = useStore((state) => state.access_token);
  const { toast } = useToast();

  useEffect(() => {
    if (access_token) {
      setHeader(access_token);
      useStore.getState().fetchHomePageData();
    }
  }, [access_token]);

  useEffect(() => {
    const fetchRepositories = async () => {
      try {
        const response = await API.get(
          `/api/v1/repos/search?q=bible&topic=true&owner=${import.meta.env.VITE_GITEA_ORG_NAME}`
        );
        const filteredRepos = response?.data?.data?.filter((repo: any) =>
          repo.full_name.includes("BCS")
        );
        setProjects(filteredRepos);
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };

    fetchRepositories();
  }, []);

  const handleClear = () => {
    setSelectedProject1("");
    setSelectedProject2("");
    setProjectFiles1("");
    setProjectFiles2("");
  };

  const handleSelectValueChange = (repo: string, selectedRepo: string) => {
    if (repo === "repo1") {
      setProjectFiles1("");
      setSelectedProject1(selectedRepo);
      fetchFileCount(repo, selectedRepo);
      fetchListBibles(repo, selectedRepo);
    } else {
      setProjectFiles2("");
      setSelectedProject2(selectedRepo);
      fetchFileCount(repo, selectedRepo);
      fetchListBibles(repo, selectedRepo);
    }
  };

  const fetchFileCount = async (repo: string, value: string) => {
    try {
      const response = await API.get(
        `/api/v1/repos/${import.meta.env.VITE_GITEA_ORG_NAME}/${value}/contents`
      );
      const totalFiles = response.data.length;
      if (repo === "repo1") {
        setProjectFiles1(totalFiles);
      } else {
        setProjectFiles2(totalFiles);
      }
    } catch (error) {
      console.error("Error fetching files for repo:", repo, error);
    }
  };

  // fetch API for projects

  const fetchListBibles = async (repo: string, selectedRepo: string) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_FASTAPI_BASE_URL}/list_books/?project_name=${selectedRepo}`
      );

      // Handle different response scenarios
      if (repo === "repo1") {
        // Get the bibles array or default to empty array
        const bibles = response?.data?.bibles || [];

        // Calculate the total successful books across all bibles
        const successfulBooksCount = bibles.reduce((total, bible) => {
          // Check if bible has books array
          if (bible.books && Array.isArray(bible.books)) {
            // Count only the books with status "success"
            const successfulBooks = bible.books.filter(
              (book) => book.status === "success"
            );
            return total + successfulBooks.length;
          }
          return total;
        }, 0);

        // Store the successful books count
        setListBibles1(
          successfulBooksCount > 0
            ? [{ successCount: successfulBooksCount }]
            : []
        );
      } else {
        // Same logic for repo2
        const bibles = response?.data?.bibles || [];

        const successfulBooksCount = bibles.reduce((total, bible) => {
          if (bible.books && Array.isArray(bible.books)) {
            const successfulBooks = bible.books.filter(
              (book) => book.status === "success"
            );
            return total + successfulBooks.length;
          }
          return total;
        }, 0);

        setListBibles2(
          successfulBooksCount > 0
            ? [{ successCount: successfulBooksCount }]
            : []
        );
      }
    } catch (error: any) {
      // Handle 404 or other error scenarios
      if (error.response && error.response.status === 404) {
        // If 404 with "No Bibles found" message
        if (repo === "repo1") {
          setListBibles1([]);
        } else {
          setListBibles2([]);
        }
      }
      console.error("Error fetching bibles:", error);
    }
  };

  const handleDownloadCSV = async () => {
    // Validate that both projects are selected
    if (!selectedProject1 || !selectedProject2) {
      alert("Please select both source and target projects.");
      return;
    }

    setIsDownloading(true);

    try {
      // Determine which API endpoint to use based on withBCV
      const apiEndpoint = withBCV
        ? `${import.meta.env.VITE_FASTAPI_BASE_URL}/parallel_corpora/withbcv/csv/`
        : `${import.meta.env.VITE_FASTAPI_BASE_URL}/parallel_corpora/withoutbcv/csv/`;

      // Make the API call
      const response = await axios.get(apiEndpoint, {
        params: {
          project_name_1: selectedProject1,
          project_name_2: selectedProject2,
        },
        responseType: "blob", // Important for downloading files
      });

      // Create a blob from the response data
      const blob = new Blob([response.data], { type: "text/csv" });

      // Create a link element and trigger download
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `parallel_corpora_${selectedProject1}_${selectedProject2}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading CSV:", error);
      toast({
        variant: "destructive",
        title: "Download failed",
        description:
          error.response?.data?.detail ||
          "Failed to download CSV. Please try again.",
        className: "bg-red-500 text-white",
        duration: 2000,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <Card className="max-w-lg mx-auto mt-32">
        <CardHeader>
          <CardTitle className="text-center">Create Parallel Corpora</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="flex space-x-4 items-center">
            <div className="flex-1">
              <SelectProjects
                value={selectedProject1}
                onValueChange={(value) =>
                  handleSelectValueChange("repo1", value)
                }
                options={projects}
                placeholder={"Select source project"}
              />
            </div>
            {selectedProject1 &&
              (projectFiles1 ? (
                <>
                  <Button variant="ghost" className="w-[20px]">
                    {listBible1Count}/{projectFiles1}
                  </Button>
                </>
              ) : (
                <Spinner />
              ))}
          </div>

          <div className="flex space-x-4 items-center">
            <div className="flex-1">
              <SelectProjects
                value={selectedProject2}
                onValueChange={(value) =>
                  handleSelectValueChange("repo2", value)
                }
                options={projects.filter(
                  (project) => project.name !== selectedProject1
                )}
                placeholder="Select target project"
              />
            </div>
            {selectedProject2 &&
              (projectFiles2 ? (
                <>
                  <Button variant="ghost" className="w-[20px]">
                    {listBible2Count}/{projectFiles2}
                  </Button>
                </>
              ) : (
                <Spinner />
              ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="radio"
                id="withoutBev"
                name="bevOption"
                checked={withBCV}
                onClick={() => setWithBCV(!withBCV)}
                className="ml-4 mr-2"
              />
              <label htmlFor="withoutBev">With BCV</label>
            </div>
            <span
              className="block text-sm text-gray-500 mr-2 hover:cursor-pointer"
              onClick={handleClear}
            >
              Clear
            </span>
          </div>

          <div className="text-center">
            <Button
              className="w-full mt-4 bg-green-600 hover:bg-green-700"
              onClick={handleDownloadCSV}
              disabled={isDownloading || !selectedProject1 || !selectedProject2}
            >
              {isDownloading ? "Downloading..." : "Download CSV"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default ParallelCorpora;
