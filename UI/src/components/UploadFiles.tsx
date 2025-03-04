import React, { useState, useEffect } from "react";
import { API } from "@/services/Api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, Folder, X, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface UploadFileProps {
  owner: string;
  repo: string;
  type: string;
  onClose: () => void;
}

interface UploadResult {
  success: boolean;
  fileName: string;
  error?: string;
}

const ResultsDialog = ({
  results,
  open,
  onClose,
}: {
  results: UploadResult[];
  open: boolean;
  onClose: () => void;
}) => {
  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.length - successCount;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {failureCount === 0 ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            )}
            Upload Results
          </DialogTitle>
        </DialogHeader>
        <div className="my-4">
          <div
            className="grid grid-cols-2 gap-4"
            style={{ minHeight: "200px", maxHeight: "400px" }}
          >
            <div className="text-sm">
              <p className="text-green-600 font-medium mb-2">
                Success: {successCount}
              </p>
              <div className="overflow-y-auto pr-2 max-h-[320px]">
                <ul className="space-y-2">
                  {results
                    .filter((r) => r.success)
                    .map((result, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                        <span className="break-all">
                          {result.fileName.length > 18
                            ? `${result.fileName.slice(0, 18)} ...`
                            : result.fileName}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
            <div className="text-sm">
              <p className="text-red-600 font-medium mb-2">
                Failed: {failureCount}
              </p>
              <div className="overflow-y-auto pr-2 max-h-[320px]">
                <ul className="space-y-2">
                  {results
                    .filter((r) => !r.success)
                    .map((result, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <X className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                        <div>
                          {result.fileName.length > 15
                            ? `${result.fileName.slice(0, 15)} ...`
                            : result.fileName}
                        </div>
                        {result.error && (
                          <div className="text-sm text-gray-500">
                            {result.error.includes("file already exists")
                              ? "File already exists"
                              : result.error}
                          </div>
                        )}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const UploadFile: React.FC<UploadFileProps> = ({
  owner,
  repo,
  type,
  onClose,
}) => {
  const [basePath, setBasePath] = useState<string>("");
  const [subPath, setSubPath] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const uploadMode = type === "folder";
  const [replaceExisting, setReplaceExisting] = useState<boolean>(false);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [inputError, setInputError] = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [commitMessageError, setCommitMessageError] = useState("");
  const { toast } = useToast();
  const [baseUrl, setBaseUrl] = useState<string>("");

  useEffect(() => {
    const currentUrl = window.location.pathname;
    const pathAfterRepo = currentUrl.split(`/${owner}/${repo}/`)[1];
    setBasePath(pathAfterRepo || "");
  }, [owner, repo]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);

      if (!uploadMode) {
        const onlyFiles = filesArray.filter((file) => {
          const hasExtension = file.name.includes(".");
          return hasExtension && !file.webkitRelativePath;
        });

        if (onlyFiles.length === 0) {
          toast({
            variant: "destructive",
            title: "Invalid Selection",
            description:
              "Folders cannot be uploaded in file mode. Please select valid files.",
          });
          return;
        }

        if (onlyFiles.length > 20) {
          toast({
            variant: "destructive",
            title: "Upload failed",
            description: "You can only upload a maximum of 20 files at a time.",
          });
          return;
        }

        setSelectedFiles(onlyFiles);
      } else {
        setSelectedFiles(filesArray);
      }
    }
  };

  const uploadFile = async (
    file: File,
    uploadPath: string
  ): Promise<UploadResult> => {
    const reader = new FileReader();
    const fileType = file.type.split("/")[0];

    return new Promise((resolve) => {
      reader.onload = async () => {
        let fileContent;

        try {
          if (fileType === "text" || file.type === "text/plain") {
            const textContent = reader.result as string;
            fileContent = btoa(unescape(encodeURIComponent(textContent)));
          } else if (fileType === "image" || fileType === "audio") {
            fileContent = (reader.result as string).split(",")[1];
          } else {
            const binary = new Uint8Array(reader.result as ArrayBuffer);
            const binaryString = Array.from(binary)
              .map((b) => String.fromCharCode(b))
              .join("");
            fileContent = btoa(binaryString);
          }

          const endpoint = `api/v1/repos/${owner}/${repo}/contents/${uploadPath}`;
          if (replaceExisting) {
            try {
              const response = await API.get(endpoint);
              const sha = response.data.sha;
              await API.put(endpoint, {
                content: fileContent,
                message: commitMessage,
                branch: "main",
                sha: sha,
              });
            } catch (error) {
              console.log("File doesn't exist, creating new");
              await API.post(endpoint, {
                content: fileContent,
                message: commitMessage,
                branch: "main",
              });
            }
          } else {
            await API.post(endpoint, {
              content: fileContent,
              message: commitMessage,
              branch: "main",
            });
          }

          resolve({ success: true, fileName: file.name });
        } catch (error: any) {
          resolve({
            success: false,
            fileName: file.name,
            error: error?.response?.data?.message || "Error uploading file",
          });
        }
      };

      reader.onerror = () => {
        resolve({
          success: false,
          fileName: file.name,
          error: "Error reading file",
        });
      };

      if (fileType === "text" || file.type === "text/plain") {
        reader.readAsText(file, "UTF-8");
      } else if (fileType === "image" || fileType === "audio") {
        reader.readAsDataURL(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  };

  const handleFileUpload = async () => {
    if (!commitMessage) {
      setCommitMessageError("Please enter a message");
      return;
    }
    if (selectedFiles.length === 0) {
      toast({
        variant: "destructive",
        title: "No Files",
        description: "No files selected for upload.",
      });
      return;
    }

    const trimmedBasePath = basePath.endsWith("/")
      ? basePath.slice(0, -1)
      : basePath;
    const trimmedSubPath = subPath.startsWith("/") ? subPath.slice(1) : subPath;
    const baseUploadPath = `${trimmedBasePath}/${trimmedSubPath}`.replace(
      /\/\/+/g,
      "/"
    );
    setBaseUrl(baseUploadPath);
    setUploading(true);
    setUploadedCount(0);
    setUploadResults([]);

    const results: UploadResult[] = [];

    for (const [index, file] of selectedFiles.entries()) {
      let uploadPath;
      if (uploadMode) {
        const folderPath = file.webkitRelativePath;
        uploadPath = `${baseUploadPath}/${folderPath}`;
      } else {
        uploadPath = `${baseUploadPath}/${file.name}`;
      }

      uploadPath = uploadPath.replace(/\/\/+/g, "/");
      const result = await uploadFile(file, uploadPath);
      results.push(result);
      setUploadedCount(index + 1);
    }

    setUploadResults(results);
    setUploading(false);
    setShowResultsDialog(true);
  };

  const handlePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.includes(".")) {
      setInputError("Invalid path: Dots (.) are not allowed");
    } else {
      setInputError("");
    }
    setSubPath(value);
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (!value) {
      setCommitMessageError("Please enter a message");
    } else {
      setCommitMessageError("");
    }
    setCommitMessage(value);
  };

  const handleResultsClose = () => {
    setShowResultsDialog(false);
    setSelectedFiles([]);
    onClose();
    const uploadedPath = `/repo/files/${owner}/${repo}/${baseUrl}`;
    window.location.href = uploadedPath;
    // Add this if you want keep the upload dialog open after upload
    // if (uploadResults.every((r) => r.success)) {
    // }
  };

  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <Card className="w-[500px] max-h-[90vh] overflow-y-auto">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">
                Upload {uploadMode ? "Folder" : "Files"}
              </h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="mb-6">
              <Label className="text-sm mb-2">Upload Path</Label>
              <div className="flex items-center gap-2">
                <div className="bg-gray-200 px-3 py-2 rounded text-sm">
                  {basePath.replace("/", " / ") || "/"}
                </div>
                <div className="flex-grow">
                  <Input
                    value={subPath}
                    onChange={handlePathChange}
                    placeholder="Enter additional path"
                    className={inputError ? "border-red-500" : ""}
                  />
                  {inputError && (
                    <p className="text-xs text-red-500 mt-1">{inputError}</p>
                  )}
                </div>
              </div>
              <div className="mt-2">
                <Label className="text-sm mb-2">
                  Message <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={commitMessage}
                  onChange={handleMessageChange}
                  placeholder="Enter a message to associate with the upload"
                  className={commitMessageError ? "border-red-500" : "w-full"}
                />
                {commitMessageError && (
                  <p className="text-xs text-red-500 mt-1">
                    Please enter a message
                  </p>
                )}
              </div>
            </div>

            <div className="mb-6">
              <Input
                type="file"
                id={uploadMode ? "folder" : "files"}
                multiple={!uploadMode}
                onChange={handleFileChange}
                className="hidden"
                {...(uploadMode ? { webkitdirectory: "", directory: "" } : {})}
              />
              <Label
                htmlFor={uploadMode ? "folder" : "files"}
                className="block border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex flex-col items-center gap-2">
                  {uploadMode ? (
                    <Folder className="h-8 w-8 text-gray-400" />
                  ) : (
                    <Upload className="h-8 w-8 text-gray-400" />
                  )}
                  <div className="text-sm font-medium">
                    {uploadMode
                      ? "Click to select a folder"
                      : "Click to select files"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {uploadMode
                      ? "Upload entire folder contents"
                      : "Maximum 20 files"}
                  </div>
                </div>
              </Label>
            </div>

            <div className="flex items-center px-3 pb-8 rounded-lg">
              <div className="flex items-center gap-2 flex-1">
                <Checkbox
                  id="replace"
                  checked={replaceExisting}
                  onCheckedChange={(checked) =>
                    setReplaceExisting(checked as boolean)
                  }
                />
                <Label htmlFor="replace" className="text-sm font-medium">
                  Replace existing files
                </Label>
              </div>
              <div className="text-xs text-gray-500">
                Overwrites files if they already exist
              </div>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    {selectedFiles.length} file(s) selected
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFiles([])}
                  >
                    Clear
                  </Button>
                </div>
                <div className="max-h-32 overflow-y-auto rounded-lg border border-gray-100 divide-y">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="px-3 py-2 text-sm">
                      {uploadMode ? file.webkitRelativePath : file.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uploading && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    Uploading {uploadedCount}/{selectedFiles.length}
                  </span>
                  <span className="text-sm text-gray-500">
                    {Math.round((uploadedCount / selectedFiles.length) * 100)}%
                  </span>
                </div>
                <Progress
                  value={(uploadedCount / selectedFiles.length) * 100}
                />
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose} disabled={uploading}>
                Cancel
              </Button>
              <Button
                onClick={handleFileUpload}
                disabled={
                  uploading || selectedFiles.length === 0 || !!inputError
                }
                className="bg-blue-600 hover:bg-blue-700"
              >
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <ResultsDialog
        results={uploadResults}
        open={showResultsDialog}
        onClose={handleResultsClose}
      />
    </>
  );
};

export default UploadFile;
