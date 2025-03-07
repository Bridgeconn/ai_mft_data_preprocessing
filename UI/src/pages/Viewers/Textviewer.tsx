import React, { useState, useEffect } from "react";
import Markdown from "react-markdown";
import { useStore } from "@/stores/Store";
import { Ban, CircleDashed, FilePenLine, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  isError: boolean;
}

interface TextViewerProps {
  content: string;
  isMarkdown: boolean;
  fileName?: string;
  isPreviewMode: boolean;
  filePath: string;
  sha: string;
  onSaveSuccess?: () => void;
}

const TextViewer: React.FC<TextViewerProps> = ({
  content: initialContent,
  isMarkdown,
  fileName,
  isPreviewMode,
  filePath,
  sha,
  onSaveSuccess,
}) => {
  const [content, setContent] = useState(initialContent);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    title: "",
    message: "",
    isError: false,
  });

  // Update local content when prop changes (e.g., different file loaded)
  useEffect(() => {
    setContent(initialContent);
    setEditedContent(initialContent);
  }, [initialContent, filePath, sha]);

  console.log("path", filePath);

  const checkMetaFile = fileName?.toLowerCase() === "metadata.json";
  const lines = content.split("\n");

  const handleEdit = () => {
    setEditedContent(content);
    setIsEditing(true);
    setError(null);
  };

  const showDialog = (title: string, message: string, isError: boolean) => {
    setDialogState({
      isOpen: true,
      title,
      message,
      isError,
    });
  };

  const closeDialog = () => {
    setDialogState({
      ...dialogState,
      isOpen: false,
    });
  };

  const handleSave = async () => {
    if (content === editedContent) return; // Prevent saving if unchanged

    setIsSaving(true);
    setError(null);

    try {
      // Prepare the data for the API
      const data = {
        content: btoa(unescape(encodeURIComponent(editedContent))),
        message: `Update ${fileName || filePath}`,
        branch: "main",
        sha: sha,
      };

      // Call the editFileContent method from your store
      const response = await useStore
        .getState()
        .editFileContent(data, filePath);

      // Update the local content state with the edited content
      setContent(editedContent);

      // Exit edit mode
      setIsEditing(false);

      // Show success dialog
      showDialog(
        "File Saved",
        `${fileName || filePath} has been successfully updated.`,
        false
      );

      // Call the success callback if provided
      if (onSaveSuccess) {
        onSaveSuccess();
      }

      // Update SHA if the response includes it
      if (response && response.content && response.content.sha) {
        sha = response.content.sha;
      }
    } catch (err) {
      console.error("Failed to save file:", err);
      setError("Failed to save changes. Please try again.");

      // Show error dialog
      showDialog(
        "Error Saving File",
        `Failed to save ${fileName || filePath}. Please try again.`,
        true
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedContent(content);
    setError(null);
  };

  const renderMetadata = () => {
    try {
      const parsedContent = JSON.parse(content);
      return (
        <pre className="whitespace-pre-wrap text-sm">
          {JSON.stringify(parsedContent, null, 2)}
        </pre>
      );
    } catch (error) {
      return <div className="text-red-500">Invalid JSON</div>;
    }
  };

  const renderEditButtons = () => (
    <div className="flex justify-end gap-2">
      {isEditing ? (
        <>
          <Button
            className="text-black hover:bg-green-600"
            title={`Cancel`}
            variant="ghost"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <Ban className="h-full w-5" />
          </Button>
          <Button
            className="mr-2 text-black hover:bg-green-600"
            title={`Save`}
            variant="ghost"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <CircleDashed className="h-full w-5 ml-2 animate-spin" />
              </>
            ) : (
              <>
                <Save className="h-full w-5" />
              </>
            )}
          </Button>
        </>
      ) : (
        <Button
          className="mr-2 text-black hover:bg-gray-100"
          title={`Edit the File`}
          variant="ghost"
          onClick={handleEdit}
        >
          <FilePenLine className="w-6 h-7" />
          <span>Edit</span>
        </Button>
      )}
    </div>
  );

  const renderDialog = () => {
    if (!dialogState.isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3
            className={`text-lg font-medium mb-2 ${dialogState.isError ? "text-red-600" : "text-green-600"}`}
          >
            {dialogState.title}
          </h3>
          <p className="mb-4 text-gray-700">{dialogState.message}</p>
          <div className="flex justify-end">
            <button
              onClick={closeDialog}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="border rounded bg-slate-50">
      {renderEditButtons()}

      {error && (
        <div className="mx-4 mb-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {isEditing ? (
        <div className="relative">
          <textarea
            value={editedContent
              .split("\n")
              .map((line, i) => `${i + 1} ${line}`)
              .join("\n")}
            onChange={(e) =>
              setEditedContent(e.target.value.replace(/^(\d+) /gm, ""))
            }
            className="w-full h-96 p-2 border rounded font-mono text-sm"
          />
        </div>
      ) : (
        <div className="p-2" style={{ paddingTop: 0 }}>
          {isMarkdown && isPreviewMode ? (
            <Markdown className="prose max-w-none">{content}</Markdown>
          ) : checkMetaFile ? (
            <>{renderMetadata()}</>
          ) : (
            <>
              {lines.map((line, index) => (
                <div
                  key={index}
                  className="flex text-sm font-mono whitespace-pre-wrap"
                >
                  <span className="text-gray-500 pr-4 select-none">
                    {index + 1}
                  </span>
                  <span>{line}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {renderDialog()}
    </div>
  );
};

export default TextViewer;
