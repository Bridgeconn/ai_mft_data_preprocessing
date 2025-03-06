import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SelectProjects from "./SelectProjects";
import { API } from "@/services/Api";
import { Spinner } from "@/components/ui/spinner";
import axios from "axios";
import SelectBooks from "./SelectBooks";

const ParallelCorpora: React.FC = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject1, setSelectedProject1] = useState("");
  const [selectedProject2, setSelectedProject2] = useState("");

  const [projectFiles1, setProjectFiles1] = useState("");
  const [projectFiles2, setProjectFiles2] = useState("");

  const [listBibles1, setListBibles1] = useState([]);
  const [listBibles2, setListBibles2] = useState([]);

  const [withBCV, setWithBCV] = useState(false);

  const listBible1Count = listBibles1.length;
  const listBible2Count = listBibles2.length;

  const [isOpen, setIsOpen] = useState(false);

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

  const fetchListBibles = async (reopo: string, selectedRepo: string) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_FASTAPI_BASE_URL}/list_bibles/?project_name=${selectedRepo}`
      );
      if (reopo === "repo1") {
        setListBibles1(response?.data?.bibles);
      } else {
        setListBibles2(response?.data?.bibles);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const onClose = () => {
    setIsOpen(false);
  };

  console.log({
    projects,
    selectedProject1,
    selectedProject2,
    projectFiles1,
    projectFiles2,
    withBCV,
    listBibles1,
    listBibles2,
    listBible1Count,
    listBible2Count,
  });
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
                  <Button variant="outline" onClick={() => setIsOpen(true)}>
                    {listBible1Count}/{projectFiles1}
                  </Button>
                  <Button variant="outline">Parse</Button>
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
                options={projects}
                placeholder="Select target project"
              />
            </div>
            {selectedProject2 &&
              (projectFiles2 ? (
                <>
                  <Button variant="outline">
                    {listBible2Count}/{projectFiles2}
                  </Button>
                  <Button variant="outline">Parse</Button>
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
            <Button className="w-full mt-4 bg-green-600 hover:bg-green-700">
              Download CSV
            </Button>
          </div>
        </CardContent>
      </Card>
      <SelectBooks isOpen={isOpen} onClose={onClose} />
    </>
  );
};

export default ParallelCorpora;
