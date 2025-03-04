import React, { useState } from "react";
import { API } from "@/services/Api";
import { useLocation, useNavigate } from "react-router-dom";
import { useStore } from "@/stores/Store";
import TextViewer from "./Viewers/Textviewer";
import ImageViewer from "./Viewers/ImageViewer";
import AudioViewer from "./Viewers/AudioViewer";
import CSVViewer from "./Viewers/CSVViewer";
import { Copy, Download, Eye, EyeOff, Trash2, Undo2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ExcelViewer from "./Viewers/ExcelViewer";
import { useUserPermissions } from "@/hooks/UserPermission";
import { useAppEffects } from "@/hooks/UseAppEffects";
import { ExcelRenderer } from "react-excel-renderer";
import * as XLSX from "xlsx";
import ProjectListView from "./Viewers/ProjectListView";
import { FIXED_HEADERS } from "@/utils/columnHeaders";
import PDFViewer from "./Viewers/PDFViewer";
export const ViewFile: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { fileContent, filePath, owner, repo } = location.state || {};
  const access_token = useStore((state) => state.access_token);
  const { hasPermission } = useUserPermissions();
  const [isPreviewMode, setIsPreviewMode] = useState(true);

  useAppEffects({
    access_token,
    fetchHomePageData: true,
  });

  if (!fileContent || !filePath || !owner || !repo) {
    return <div>Invalid file data. Please try again.</div>;
  }

  // Decode Base64 content
  const decodedContent = new TextDecoder("utf-8").decode(
    Uint8Array.from(atob(fileContent.content || ""), (char) =>
      char.charCodeAt(0)
    )
  );

  const fileName = filePath.split("/").pop() || "Unknown";
  const checkMetaFile = fileName?.toLowerCase() === "metadata.json";
  const fileExtension = fileName.split(".").pop()?.toLowerCase() || "";
  const isMdFile = fileExtension === "md";
  const isCSVFile = fileExtension === "csv";

  const fileSize =
    fileContent.size >= 1024 * 1024
      ? (fileContent.size / (1024 * 1024)).toFixed(2) + " MB"
      : (fileContent.size / 1024).toFixed(2) + " KB";

  // Determine whether "Copy" and "Lines" are enabled
  const isCopyEnabled = ["txt", "md", "usfm", "csv"].includes(fileExtension);
  const isLineEnabled = ["txt", "pdf", "md", "usfm", "csv"].includes(
    fileExtension
  );
  const isDownloadEnabled = ["pdf"].includes(fileExtension);
  const downloadExcel = () => {
    try {
      const byteCharacters = atob(fileContent.content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const file = new File([blob], "temp.xlsx", { type: blob.type });
      ExcelRenderer(file, (err, resp) => {
        if (err) {
          console.error("Error processing Excel file:", err);
          return;
        }
        const wb = XLSX.utils.book_new();
        const headerMap = resp.rows[0].reduce(
          (acc: { [key: string]: number }, cell: string, index: number) => {
            if (cell) acc[cell] = index;
            return acc;
          },
          {}
        );
        const reorderedRows = [
          FIXED_HEADERS,
          ...resp.rows.slice(1).map((row) => {
            return FIXED_HEADERS.map((header) => {
              const index = headerMap[header];
              return index !== undefined ? row[index] : "";
            });
          }),
        ];
        const ws = XLSX.utils.aoa_to_sheet(reorderedRows);
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const newBlob = new Blob([excelBuffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = URL.createObjectURL(newBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error("Error downloading file:", error);
    }
  };

  // Placeholder actions
  const handleDownload = () => {
    if (
      fileName.startsWith("Project List") &&
      ["xlsx", "xls"].includes(fileExtension)
    ) {
      downloadExcel();
    } else {
      const blob = new Blob([
        new Uint8Array(
          atob(fileContent.content)
            .split("")
            .map((char) => char.charCodeAt(0))
        ),
      ]);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(decodedContent).then(() => {
      toast({
        title: "Copied",
        description: "Content copied to clipboard!",
      });
    });
  };

  const navigateBack = () => {
    const directoryPath = filePath.split("/").slice(0, -1).join("/");
    navigate(`/repo/files/${owner}/${repo}/${directoryPath}`);
  };

  const handleDelete = async () => {
    try {
      const response = await API.delete(
        `api/v1/repos/${owner}/${repo}/contents/${filePath}`,
        {
          data: {
            message: `Deleting file ${filePath}`, // Commit message
            branch: "main",
            sha: fileContent.sha, // SHA of the file
          },
        }
      );

      if (response.status !== 200) {
        throw new Error("Failed to delete the file");
      }

      toast({
        variant: "destructive",
        title: "Deleted",
        description: `File "${fileName}" has been successfully deleted.`,
      });
      const directoryPath = filePath.split("/").slice(0, -1).join("/");
      navigate(`/repo/files/${owner}/${repo}/${directoryPath}`);
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  };

  // Determine viewer component
  const renderViewer = () => {
    if (isMdFile) {
      return (
        <TextViewer
          content={decodedContent}
          isMarkdown={true}
          isPreviewMode={isPreviewMode}
        />
      );
    } else if (["txt", "usfm", "json"].includes(fileExtension)) {
      return (
        <TextViewer
          content={decodedContent}
          isMarkdown={false}
          fileName={fileName}
          isPreviewMode={isPreviewMode}
        />
      );
    } else if (["jpg", "jpeg", "png", "gif"].includes(fileExtension)) {
      return <ImageViewer content={fileContent.content} />;
    } else if (["mp3", "wav", "ogg"].includes(fileExtension)) {
      return <AudioViewer content={fileContent.content} />;
    } else if (["csv"].includes(fileExtension)) {
      return <CSVViewer content={decodedContent} isTableView={isPreviewMode} />;
    } else if (
      fileName.startsWith("Project List") &&
      ["xlsx", "xls"].includes(fileExtension)
    ) {
      return <ProjectListView content={fileContent.content} />;
    } else if (["xlsx", "xls"].includes(fileExtension)) {
      return <ExcelViewer content={fileContent.content} />;
    } else if (["pdf"].includes(fileExtension)) {
      return <PDFViewer content={fileContent.content} onClose={() => navigateBack()} handleDownload={handleDownload} handleDelete={handleDelete} fileName={fileName}  />;
    } else {
      return <p className="text-gray-500">Unsupported file type.</p>;
    }
  };

  return (
    <div className="container mx-auto px-20 mt-6">
      <div className="border-b pb-1 mb-2">
        <h2 className="text-xl font-bold flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            className="size-6 mr-2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605"
            />
          </svg>
          {`${repo}`}
        </h2>
        <p className="mt-2 ml-5 text-sm text-gray-500">{fileName}</p>
      </div>

      {/* File Details */}
      <div className="flex justify-between items-center mb-2">
        <div className=" flex space-y-2">
          <Undo2
            className="w-5 h-5 hover:cursor-pointer hover:text-blue-500 ml-2"
            onClick={navigateBack}
          />
          <p className="text-sm text-gray-600 !mt-0 ml-8">
            {fileSize} | {fileExtension.toUpperCase()}
            {"  "}
            {isLineEnabled
              ? ` |  ${decodedContent.split("\n").length} lines`
              : ""}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-6 mr-2">
          {(isCSVFile || isMdFile) &&
            (isPreviewMode ? (
              <Eye
                className="w-6 h-6 hover:cursor-pointer text-cyan-400 hover:text-cyan-600"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
              />
            ) : (
              <EyeOff
                className="w-6 h-6 hover:cursor-pointer hover:text-blue-500"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
              />
            ))}

          {isCopyEnabled && (
            <Copy
              className="w-5 h-5 hover:cursor-pointer hover:text-blue-500"
              onClick={handleCopy}
            />
          )}
          {!isDownloadEnabled && (
            <Download
              className="w-5 h-5 hover:cursor-pointer hover:text-blue-500"
              onClick={handleDownload}
            />
          )}

          {!checkMetaFile && hasPermission("is_admin") && (
            <Trash2
              className="w-5 h-5 pr hover:cursor-pointer hover:text-blue-500"
              onClick={handleDelete}
            />
          )}
        </div>
      </div>

      {/* File Viewer */}
      <div>{renderViewer()}</div>
    </div>
  );
};
