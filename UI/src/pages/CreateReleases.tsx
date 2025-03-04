import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { API } from "@/services/Api";
import FeedbackDialog from "@/components/FeedbackDialog";

interface CreateReleaseModalProps {
  owner: string;
  repo: string;
  onClose: () => void;
  onReleaseCreated: () => void;
}

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  isError: boolean;
}

const CreateRelease: React.FC<CreateReleaseModalProps> = ({
  owner,
  repo,
  onClose,
  onReleaseCreated,
}) => {
  const [tagName, setTagName] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleSubmit = async () => {
    if (!tagName || !name || !description) {
      showDialog("Error", "All fields are required.", true);
      return;
    }
    setIsSubmitting(true);
    try {
      await API.post(`/api/v1/repos/${owner}/${repo}/releases`, {
        tag_name: tagName,
        name,
        body: description,
        draft: false,
        prerelease: false,
      });
      onReleaseCreated();
      showDialog("Success", `Release ${tagName} created successfully!`, false);
    } catch (error: any) {
      if (error?.response?.data?.message === "Release is has no Tag") {
        showDialog(
          "Error",
          `Failed to create release. Tag name ${tagName} already exists.`,
          true
        );
      } else {
        showDialog(
          "Error",
          `Failed to create release. ${error?.response?.data?.message}`,
          true
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDialogClose = () => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (!dialogState.isError) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-lg font-bold mb-4">Create New Release</h2>
        <div className="mb-4">
          <Input
            placeholder="Tag Name"
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <Input
            placeholder="Release Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <Textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create"}
          </Button>
        </div>
      </div>

      <FeedbackDialog
        isOpen={dialogState.isOpen}
        onClose={handleDialogClose}
        title={dialogState.title}
        message={dialogState.message}
        isError={dialogState.isError}
      />
    </div>
  );
};

export default CreateRelease;
