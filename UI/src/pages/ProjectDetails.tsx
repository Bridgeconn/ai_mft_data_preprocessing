import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/stores/Store";
import MetadataLayout from "./MetadataLayout";
import FeedbackDialog from "@/components/FeedbackDialog";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { useUserPermissions } from "@/hooks/UserPermission";

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  isError: boolean;
}

interface ProjectDetailsProps {
  owner: string;
  repo: string;
}

const ProjectDetails: React.FC<ProjectDetailsProps> = ({ owner, repo }) => {
  const [isLoading, setIsLoading] = useState(true);
  const fileName = "metadata.json";
  const currentRepoData = useStore((state) => state.currentRepoData);
  const fetchRepoDetails = useStore((state) => state.fetchRepoDetails);
  const repoDetails = useStore((state) => state.currentRepoDetails);
  const repoFiles = useStore((state) => state.currentRepoFiles);
  const metaDataContent = useStore((state) => state.metaDataContent);
  const fileExists = repoFiles?.some(
    (item: { name: string; type: string }) =>
      item.name === fileName && item.type === "file"
  );
  const sha = metaDataContent?.sha;
  const [formData, setFormData] = useState<any>(null);
  const [backupData, setBackupData] = useState<any>(null);
  const method = fileExists ? "PUT" : "POST";
  const isValid = !!(formData?.["Project Name"] && formData?.["Project ID"]);
  const { hasPermission } = useUserPermissions();

  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    title: "",
    message: "",
    isError: false,
  });

  const showDialog = (title: string, message: string, isError: boolean) => {
    setDialogState({
      isOpen: true,
      title,
      message,
      isError,
    });
  };

  const handleDialogClose = () => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  };

  const fetchData = async () => {
    if (currentRepoData) {
      await useStore.getState().fetchCurrentRepoFiles();
      setIsLoading(false);
    }
    if (fileExists) {
      await useStore.getState().fetchMetaDataContent();
    } else {
      useStore.setState({ metaDataContent: null });
    }
  };

  useEffect(() => {
    fetchData();
    setIsLoading(true);
    fetchRepoDetails(owner, repo).finally(() => setIsLoading(false));
  }, [owner, repo, fileExists]);

  useEffect(() => {
    if (metaDataContent?.content) {
      try {
        const parsedContent = JSON.parse(atob(metaDataContent.content));
        setFormData(parsedContent);
        setBackupData(parsedContent);
      } catch (error) {
        showDialog("Error", "Failed to parse metadata content.", true);
      }
      setIsLoading(false);
    } else {
      setFormData(null);
      setBackupData(null);
    }
  }, [metaDataContent]);

  const formatDate = (date: Date | null): string | null => {
    if (!date) return null;
    return format(date, "dd/MM/yyyy");
  };

  const handleInputChange = ({ name, value }: { name: string; value: any }) => {
    if (name === "Start Date" || name === "End Date") {
      const formattedDate =
        typeof value === "string" ? value : formatDate(value);
      setFormData({ ...formData, [name]: formattedDate });
      setBackupData({ ...backupData, [name]: formattedDate });
    } else {
      setFormData({ ...formData, [name]: value });
      setBackupData({ ...backupData, [name]: value });
    }
  };

  const handleCancel = () => {
    setFormData(backupData);
  };
  const handleClear = () => {
    setFormData(null);
  };

  const handleSaveClick = async () => {
    if (!isValid) {
      showDialog("Error", "Please fill all the required fields", true);
      return;
    }
    try {
      const requestedData = {
        content: btoa(JSON.stringify(formData).replace(/,/g, ",\n")),
        message: `Updated ${fileName}`,
        branch: "main",
        sha: sha,
      };
      await useStore.getState().postMetaDataContent(requestedData, method);
      showDialog("Success", "Updated successfully!", false);
      fetchData();
    } catch (error) {
      showDialog("Error", "Failed to update . Please try again.", true);
    }
  };

  const ProjectDescription = ({ description }: { description: string }) => {
    const [showFull, setShowFull] = useState(false);

    // Split description into lines
    const lines = description.split(/\r?\n/);
    const isLongDescription = description.length > 150 || lines.length > 2;

    // Displayed preview: max 2 lines OR 150 characters
    const displayedText = showFull
      ? description
      : lines.slice(0, 1).join("\n").slice(0, 150) +
        (isLongDescription ? "...." : "");

    return (
      <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg mx-auto">
        <p className="text-gray-600 whitespace-pre-line">
          {displayedText}
          {isLongDescription && (
            <button
              className="text-blue-500 hover:underline ml-2"
              onClick={() => setShowFull(!showFull)}
            >
              {showFull ? "   Show Less" : " Show More"}
            </button>
          )}
        </p>
      </div>
    );
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      {repoDetails.description && (
        <ProjectDescription description={repoDetails.description} />
      )}

      <Card>
        <CardContent>
          <MetadataLayout data={formData} onChange={handleInputChange} />
          <div className="flex justify-center gap-4">
            <Button
              onClick={() => {
                if (formData === null) {
                  handleCancel();
                } else {
                  handleClear();
                }
              }}
              variant="outline"
              className="w-24"
            >
              {formData ? "Clear" : "Cancel"}
            </Button>
            <Button
              onClick={handleSaveClick}
              disabled={!hasPermission("is_admin") || !isValid}
              variant="default"
              className="w-24"
            >
              Save
            </Button>
          </div>
          <FeedbackDialog
            isOpen={dialogState.isOpen}
            onClose={handleDialogClose}
            title={dialogState.title}
            message={dialogState.message}
            isError={dialogState.isError}
          />
        </CardContent>
      </Card>
    </>
  );
};

export default ProjectDetails;
