import React, { useCallback, useEffect, useState } from "react";
import { useStore } from "@/stores/Store";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  Star,
  Plus,
  Book,
  BookLock,
  ArrowDownToLine,
  FileSpreadsheet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { API, setHeader } from "@/services/Api";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as XLSX from "xlsx";
import ListUsers from "./ListUsers";
import { useUserPermissions } from "@/hooks/UserPermission";
import { FIXED_HEADERS } from "@/utils/columnHeaders";

interface Repo {
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  updated_at: string;
  stars_count: number;
  private: boolean;
  topics: string[];
}

const ListRepo: React.FC = () => {
  const access_token = useStore((state) => state.access_token);
  const navigate = useNavigate();
  const location = useLocation();
  const repos = useStore((state) => state.allRepos);
  const [filteredRepos, setFilteredRepos] = useState<Repo[]>([]);
  const repoCount = filteredRepos ? filteredRepos.length : repos?.length;
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState<boolean>(false);
  const { hasPermission } = useUserPermissions();

  const getTabFromUrl = () => {
    const path = location.pathname.split("/");
    return path[path.length - 1] === "repo"
      ? "projects"
      : path[path.length - 1];
  };

  const [activeTab, setActiveTab] = useState(getTabFromUrl());

  useEffect(() => {
    if (access_token && !repos) {
      setLoading(true);
      setHeader(access_token);
      useStore.getState().fetchHomePageData();
    }
  }, [access_token, repos]);

  useEffect(() => {
    if (repos?.length > 0) {
      const filtered = repos
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((repo: any) => repo.name !== "languages-repo") // Exclude 'languages-repo'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((repo: any) =>
          repo.full_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      setFilteredRepos(filtered);
      setLoading(false);
    }
  }, [searchTerm, repos]);

  useEffect(() => {
    if (location.pathname === "/repo") {
      navigate("/repo/projects", { replace: true });
    }
    setActiveTab(getTabFromUrl());
  }, [location.pathname]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    navigate(`/repo/${value}`);
  };

  const handleUserCountChange = useCallback((count: number) => {
    setUserCount(count);
  }, []);

  const searchCategoriesAPi = async (topic: string) => {
    try {
      const response = await API.get(
        `/api/v1/repos/search?q=${topic}&topic=true&owner=${import.meta.env.VITE_GITEA_ORG_NAME}`
      );
      const data = await response.data;

      if (data.data.length > 0) {
        const reposWithTopics = await Promise.all(
          data.data
            .filter((repo: any) => repo.full_name.includes("BCS"))
            .map(async (repo: any) => {
              try {
                const topicsResponse = await API.get(
                  `/api/v1/repos/${import.meta.env.VITE_GITEA_ORG_NAME}/${repo.name}/topics`
                );

                return {
                  ...repo,
                  topics: topicsResponse.data.topics || [],
                };
              } catch (error) {
                console.error(`Error fetching topics for ${repo.name}:`, error);
                return {
                  ...repo,
                  topics: [],
                };
              }
            })
        );
        setFilteredRepos(reposWithTopics.filter(Boolean));
      } else {
        setFilteredRepos([]);
      }
    } catch (error) {
      console.error("Error searching repositories:", error);
      setFilteredRepos([]);
    }
  };

  const handleTopicClick = (topic: string) => {
    setSearchTerm(topic);
    searchCategoriesAPi(topic);
  };

  const renderRepositoriesContent = () => (
    <>
      {loading ? (
        <div className="text-center text-muted-foreground">Loading...</div>
      ) : filteredRepos.length > 0 ? (
        <div className="overflow-y-auto max-h-[calc(100vh-260px)] [&::-webkit-scrollbar]:hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Name</TableHead>
                <TableHead className=" w-[25%] text-center">
                  Last Modified
                </TableHead>
                <TableHead className=" w-[25%] text-right">
                  Categories
                </TableHead>
                <TableHead className=" w-[15%] text-right">Stars</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRepos.map((repo, index) => (
                <TableRow key={index} className="hover:bg-muted/50">
                  <TableCell className="w-[40%]">
                    <Link
                      to={`/repo/files/${repo.full_name}`}
                      className="text-base font-medium text-[#4183c4] hover:underline flex items-center"
                    >
                      {repo.private ? (
                        <BookLock className="w-4 h-4 mr-1 text-gray-500" />
                      ) : (
                        <Book className="w-4 h-4 mr-1 text-gray-500" />
                      )}
                      {repo.name}
                      {!repo.private && (
                        <Badge variant="secondary" className="ml-2">
                          Public
                        </Badge>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell className="w-[25%] text-center whitespace-nowrap text-muted-foreground">
                    {formatDistanceToNow(new Date(repo.updated_at), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell className="w-[25%] text-right whitespace-nowrap text-muted-foreground">
                    {repo.topics?.map((topic) => (
                      <Badge
                        key={topic}
                        variant="secondary"
                        className="px-2 mx-0.5 text-purple-900 text-sm cursor-pointer"
                        onClick={() => handleTopicClick(topic)}
                      >
                        {topic}
                      </Badge>
                    ))}
                  </TableCell>
                  <TableCell className="w-[15%] text-right">
                    <div className="flex items-center justify-end space-x-1 text-muted-foreground">
                      <Star className="h-4 w-4" />
                      <span>{repo.stars_count}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-8">
          No projects found.
        </div>
      )}
    </>
  );

  const formatMetadata = (encodedMetadata: string) => {
    try {
      const decodedString = atob(encodedMetadata);
      const metadata = JSON.parse(decodedString);
      return metadata;
    } catch (error) {
      console.error("Error formatting metadata:", error);
      return {};
    }
  };

  const fetchMetadata = async (owner: string, repoName: string) => {
    try {
      const response = await API.get(
        `api/v1/repos/${owner}/${repoName}/contents/metadata.json`
      );
      if (!response) throw new Error("Failed to fetch metadata");
      const data = await response;
      return data?.data?.content;
    } catch (error) {
      console.error(`Error fetching metadata for ${owner}/${repoName}:`, error);
      return null;
    }
  };

  const fetchTopics = async (owner: string, repoName: string) => {
    try {
      const response = await API.get(
        `api/v1/repos/${owner}/${repoName}/topics`
      );
      if (!response) throw new Error("Failed to fetch topics");
      const data = await response;
      return data?.data?.topics || [];
    } catch (error) {
      console.error(`Error fetching topics for ${owner}/${repoName}:`, error);
      return [];
    }
  };

  const formatRepoData = async () => {
    if (filteredRepos.length > 0) {
      const reposWithData = await Promise.all(
        filteredRepos.map(async (repo) => {
          const owner = import.meta.env.VITE_GITEA_ORG_NAME;
          const repoName = repo.name;
          const [metadata, topicsData] = await Promise.all([
            fetchMetadata(owner, repoName),
            fetchTopics(owner, repoName),
          ]);
          const baseData = {
            Name: repo.full_name,
            Topics: Array.isArray(topicsData) ? topicsData.join(", ") : "",
          };
          if (metadata) {
            const parsedMetadata = formatMetadata(metadata);
            return {
              ...baseData,
              ...parsedMetadata,
            };
          }

          return baseData;
        })
      );
      return reposWithData;
    } else {
      return [];
    }
  };

  const downloadRepoExcel = async () => {
    try {
      const formattedData = await formatRepoData();
      const reorderedData = formattedData.map((row) => {
        const newRow: { [key: string]: any } = {};
        FIXED_HEADERS.forEach((header) => {
          newRow[header] = row[header] || "";
        });
        return newRow;
      });
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(reorderedData, {
        header: FIXED_HEADERS,
      });
      const columnWidths = FIXED_HEADERS.map((header) => ({
        wch:
          Math.max(
            header.length,
            ...reorderedData.map((row) => String(row[header] || "").length)
          ) + 2,
      }));
      worksheet["!cols"] = columnWidths;
      XLSX.utils.book_append_sheet(workbook, worksheet, "Projects");
      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
        cellStyles: true,
      });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Project List.xlsx";
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading Excel file:", error);
    }
  };

  const handleDownload = async () => {
    await downloadRepoExcel();
  };

  return (
    <div className="container mx-auto mt-10">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <Card className="p-0">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger
                  value="projects"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:shadow-none data-[state=active]:bg-transparent rounded-none p-0"
                >
                  Projects
                  <Badge className="text-[10px]" variant="secondary">
                    {repoCount}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="users"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:shadow-none data-[state=active]:bg-transparent rounded-none h-auto"
                >
                  Users
                  <Badge className="text-[10px]" variant="secondary">
                    {userCount}
                  </Badge>
                </TabsTrigger>
              </TabsList>
              {activeTab === "projects" && (
                <div className="flex items-center space-x-2 w-[50%]">
                  <Input
                    type="text"
                    placeholder={`Search ${activeTab}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-md"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        searchCategoriesAPi(searchTerm);
                      }
                    }}
                  />
                </div>
              )}
              <div>
                {activeTab === "projects" && (
                  <Button
                    className="mr-4 bg-slate-600 text-white hover:bg-slate-900"
                    title={`Create a Dataset`}
                    variant="secondary"
                    onClick={() => navigate("/createdataset")}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                  </Button>
                )}
                {activeTab === "projects" && (
                  <Button
                    className="mr-4 bg-green-500 text-white hover:bg-green-600"
                    title={`Download Projects in Excel`}
                    variant="secondary"
                    onClick={() => handleDownload()}
                  >
                    <ArrowDownToLine className="h-4 w-4" />
                  </Button>
                )}
                {activeTab === "projects" && hasPermission("is_admin") && (
                  <Button
                    className="bg-slate-600 text-white hover:bg-slate-900"
                    title={`Create a new projects`}
                    variant="secondary"
                    onClick={() => navigate("/createrepo")}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <TabsContent value="projects" className="mt-0 pt-0">
              {renderRepositoriesContent()}
            </TabsContent>
            <TabsContent value="users" className="mt-0">
              <ListUsers onUserCountChange={handleUserCountChange} />
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
};

export default ListRepo;
