import React, { useEffect, useState } from "react";
import File from "./Files";
import { useStore } from "@/stores/Store";
import { setHeader } from "@/services/Api";
import ProjectDetails from "./ProjectDetails";
import UploadFile from "../components/UploadFiles";
import Starrepo from "../components/StarRepo";
import Releases from "./Releases";
import { Button } from "@/components/ui/button";
import { Upload, Pencil, Check, FolderOutput, Folder } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import MultiSelect from "@/components/MultiSelect";
import { useNavigate, useParams } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRepoPermissions } from "@/hooks/useRepoPermission";

interface RepoDetails {
  owner: string;
  repo: string;
}
interface Option {
  value: string;
  label: string;
}
interface Topic {
  value: string;
  label: string;
}

const FileExplorer: React.FC<RepoDetails> = ({ owner, repo }) => {
  const navigate = useNavigate();
  const { tab } = useParams();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState("");
  const access_token = useStore((state) => state.access_token);
  const [pencil, setPencil] = useState(true);
  const catalogue = useStore((state) => state.catalogueData);
  const [selectedTopics, setSelectedTopics] = useState<Option[]>([]);
  const [selectedLang, setSelectedLang] = useState<string[]>([]);
  const postCreateRepoCatalogue = useStore.getState().postCreateRepoCatalogue;
  const [activeTab, setActiveTab] = useState(tab || "files");
  const { hasRepoPermission } = useRepoPermissions(owner, repo);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    navigate(`/repo/${value}/${owner}/${repo}`, { replace: true });
  };

  useEffect(() => {
    const currentTab = tab || "files";
    if (currentTab === "files") {
      navigate(`/repo/${tab}/${owner}/${repo}`, { replace: true });
    }
    setActiveTab(currentTab);
  }, [tab]);

  useEffect(() => {
    if (access_token) {
      setHeader(access_token);
      useStore.getState().fetchHomePageData();
      useStore.setState({ currentRepoData: { owner, repo } });
    }
    if (access_token && owner && repo) {
      useStore.getState().fetchCatalogueData();
    }
  }, [access_token]);

  useEffect(() => {
    if (catalogue?.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lang: any[] = [];
      const catalogueOptions: Topic[] = catalogue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((topic: any) => {
          if (topic.length <= 2) {
            lang.push(topic);
            // return null;
          } else {
            return {
              value: topic.toLowerCase(),
              label: topic,
            };
          }
        })
        .filter(Boolean);
      setSelectedTopics(catalogueOptions);
      setSelectedLang(lang);
    }
  }, [catalogue]);

  const options = [
    { value: "bible", label: "Bible" },
    { value: "commentary", label: "Commentary" },
    { value: "video", label: "Video" },
    { value: "audio", label: "Audio" },
    { value: "infographic", label: "Infographic" },
    { value: "isl", label: "ISL" },
    { value: "obs", label: "OBS" },
    { value: "obt", label: "OBT" },
  ];

  const handleTopicChange = (newSelection: Option[] | null) => {
    if (newSelection === null) {
      setSelectedTopics([]);
    } else {
      setSelectedTopics(newSelection);
    }
  };

  const handleSaveTopics = async () => {
    const topicsForApi = [
      ...selectedTopics.map((topic) => topic.value),
      ...selectedLang,
    ];
    try {
      await postCreateRepoCatalogue(topicsForApi, repo);
    } catch (error) {
      console.error("Error saving topics:", error);
    }
    setPencil(true);
    useStore.getState().fetchCatalogueData();
  };

  return (
    <div className="mt-6">
      <div className="flex justify-between w-[100%]">
        <div className="flex items-center gap-2 w-[50%]">
          <FolderOutput
            className=" h-6 w-6 hover:bg-gray-100 hover:rounded-md hover:cursor-pointer"
            onClick={() => navigate("/repo")}
          />
          <h1 className="text-xl font-bold mr-8 ">{`${repo}`}</h1>
          {catalogue?.length > 0 && (
            <>
              {pencil ? (
                <>
                  {selectedLang?.map((lang) => (
                    <Badge
                      key={lang}
                      variant="secondary"
                      className="px-2 text-purple-900 text-sm"
                    >
                      {lang}
                    </Badge>
                  ))}
                  {selectedTopics?.map((topic) => (
                    <Badge
                      key={topic.value}
                      variant="secondary"
                      className="px-2 text-purple-900 text-sm"
                    >
                      {topic.label}
                    </Badge>
                  ))}
                  <Pencil
                    className="h-4 w-3 hover:cursor-pointer hover:text-[#4183c4]"
                    onClick={() => setPencil(false)}
                  />
                </>
              ) : (
                <>
                  <div className="w-[45%]">
                    <MultiSelect
                      options={options}
                      value={selectedTopics}
                      onChange={handleTopicChange}
                      placeholder="Select items..."
                      clearable={true}
                    />
                  </div>
                  {selectedTopics?.length > 0 && (
                    <Check
                      className="h-5 w-5 hover:cursor-pointer hover:text-[#4183c4]"
                      onClick={handleSaveTopics}
                    />
                  )}
                </>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Starrepo owner={owner} repo={repo} />
          {hasRepoPermission("write") && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Upload
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setIsUploadModalOpen("file")}>
                  <Upload className="h-4 w-4 mr-2" />
                  File Upload
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsUploadModalOpen("folder")}
                >
                  <Folder className="h-4 w-4 mr-2" />
                  Folder Upload
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="border-b border-gray-300 mt-2">
        <Tabs
          defaultValue="files"
          className="w-full"
          value={activeTab}
          onValueChange={handleTabChange}
        >
          <TabsList>
            <TabsTrigger
              value="files"
              className="data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:shadow-none data-[state=active]:bg-transparent rounded-none p-2"
            >
              Files
            </TabsTrigger>
            <TabsTrigger
              value="releases"
              className="data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:shadow-none data-[state=active]:bg-transparent rounded-none p-2"
            >
              Releases
            </TabsTrigger>
            <TabsTrigger
              value="project-details"
              className="data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:shadow-none data-[state=active]:bg-transparent rounded-none p-2"
            >
              Project Details
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="mt-4">
        {activeTab === "files" && <File owner={owner} repo={repo} />}
        {activeTab === "releases" && <Releases owner={owner} repo={repo} />}
        {activeTab === "project-details" && (
          <ProjectDetails owner={owner} repo={repo} />
        )}
      </div>
      {isUploadModalOpen && (
        <UploadFile
          owner={owner}
          repo={repo}
          type={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen("")}
        />
      )}
    </div>
  );
};

export default FileExplorer;
