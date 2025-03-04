import React, { useState, useEffect } from "react";
import { API } from "@/services/Api";
import { formatDistanceToNow } from "date-fns";
import { useNavigate, useParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Folder, FileIcon, Download, Copy, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface File {
  name: string;
  path: string;
  size: number;
  type: string;
  last_commit_sha: string;
  lastUpdated: string;
  commitMessage: string;
}

interface FileProps {
  owner: string;
  repo: string;
}

const File: React.FC<FileProps> = ({ owner, repo }) => {
  const { "*": pathParam } = useParams<{ "*": string }>();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [repoSize, setRepoSize] = useState<number>(0);
  const [currentPath, setCurrentPath] = useState<string>(pathParam || "");
  const [projectUrl] = useState<string>(
    `${window.location.origin}/repo/files/${owner}/${repo}`
  );
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchRepoSize();
    fetchFiles(currentPath);
  }, [currentPath]);

  useEffect(() => {
    const newPath = `/repo/files/${owner}/${repo}/${currentPath}`;
    navigate(newPath, { replace: true });
  }, [currentPath, navigate, owner, repo]);

  const fetchRepoSize = async () => {
    try {
      const response = await API.get(`/api/v1/repos/${owner}/${repo}`);
      setRepoSize(response.data.size || 0);
    } catch (error) {
      console.error("Error fetching repo size:", error);
    }
  };

  const fetchFiles = async (path: string) => {
    setLoading(true);
    try {
      const response = await API.get(
        `/api/v1/repos/${owner}/${repo}/contents/${path}`
      );

      const fileData = await Promise.all(
        response.data.map(async (file: any) => {
          const commitResponse = await API.get(
            `/api/v1/repos/${owner}/${repo}/git/commits/${file.last_commit_sha}`
          );
          return {
            ...file,
            lastUpdated: commitResponse.data.created,
            commitMessage: commitResponse.data.commit.message,
          };
        })
      );

      setFiles(fileData);
    } catch (error) {
      console.error("Error fetching file contents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileClick = async (filePath: string) => {
    try {
      const response = await API.get(
        `/api/v1/repos/${owner}/${repo}/contents/${filePath}`
      );
      navigate(`/repo/files/${owner}/${repo}/${filePath}`, {
        state: {
          fileContent: response.data,
          filePath,
          owner,
          repo,
        },
      });
    } catch (error) {
      console.error("Error fetching file content:", error);
    }
  };

  const formatSize = (size: number) => {
    if (size >= 1073741824) return (size / 1073741824).toFixed(2) + " GB";
    if (size >= 1048576) return (size / 1048576).toFixed(2) + " MB";
    if (size >= 1024) return (size / 1024).toFixed(2) + " KB";
    return size + " bytes";
  };

  const downloadRepoZip = async () => {
    try {
      const response = await API.get(
        `/api/v1/repos/${owner}/${repo}/archive/main.zip`,
        { responseType: "blob" }
      );

      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${repo}-${new Date().toISOString().split("T")[0]}.zip`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: "Your Project download has begun.",
        className: "bg-green-500 text-white",
        duration: 2000,
      });
    } catch (error) {
      console.error("Error downloading Project zip:", error);
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "There was an error downloading the Project.",
      });
    }
  };

  const renderBreadcrumbs = () => {
    const pathParts = currentPath.split("/").filter(Boolean);
    const allParts = [repo, ...pathParts];

    return (
      <div className="text-sm">
        {allParts.map((part, index) => {
          const isLast = index === allParts.length - 1;
          const pathToHere = allParts.slice(1, index + 1).join("/");

          return (
            <React.Fragment key={index}>
              {index > 0 && <span className="text-gray-500">/</span>}
              <button
                onClick={() => {
                  if (!isLast) {
                    if (index === 0) {
                      setCurrentPath("");
                    } else {
                      setCurrentPath(pathToHere);
                    }
                  }
                }}
                className={cn(
                  "px-1",
                  isLast
                    ? "text-gray-900 cursor-default font-medium hover:no-underline"
                    : "text-blue-600 hover:underline cursor-pointer"
                )}
                disabled={isLast}
              >
                {part}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const folders = filteredFiles.filter((file) => file.type === "dir");
  const fileList = filteredFiles.filter((file) => file.type === "file");

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 text-center text-gray-500">
          Loading files...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        {currentPath === "" ? (
          <div className="flex items-center justify-between">
            <Input
              type="text"
              placeholder="Search files..."
              className="max-w-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="flex flex-col items-center md:flex-row gap-4">
              <Badge variant="secondary" className="py-2.5">
                <Database className="mr-2 h-4 w-4" />
                {(repoSize / 1024).toFixed(2)} MB
              </Badge>

              <div className="flex items-center bg-secondary rounded-md">
                <Badge variant="secondary" className="py-2.5 text-gray-500">
                  {projectUrl}
                </Badge>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(projectUrl);
                    toast({
                      title: "Copied",
                      description: "URL copied to clipboard",
                    });
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                className="bg-green-200 hover:bg-green-300 p-2"
                onClick={downloadRepoZip}
              >
                <Download />
              </Button>
            </div>
          </div>
        ) : (
          renderBreadcrumbs()
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Size</TableHead>
              <TableHead className="text-right">Last Modified</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {folders.map((folder, index) => (
              <TableRow key={`folder-${index}`}>
                <TableCell className="font-medium">
                  <button
                    onClick={() => setCurrentPath(folder.path)}
                    className="flex items-center space-x-2 hover:text-primary"
                  >
                    <Folder className="h-4 w-4 text-yellow-500" />
                    <span>{folder.name}</span>
                  </button>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {folder.commitMessage}
                </TableCell>
                <TableCell className="text-muted-foreground">-</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatDistanceToNow(new Date(folder.lastUpdated))} ago
                </TableCell>
              </TableRow>
            ))}
            {fileList.map((file, index) => (
              <TableRow key={`file-${index}`}>
                <TableCell className="font-medium">
                  <button
                    onClick={() => handleFileClick(file.path)}
                    className="flex items-center space-x-2 hover:text-primary"
                  >
                    <FileIcon className="h-4 w-4 text-muted-foreground" />
                    <span>{file.name}</span>
                  </button>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {file.commitMessage}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatSize(file.size)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatDistanceToNow(new Date(file.lastUpdated))} ago
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default File;
