import React, { useState } from "react";
import AsyncSelect from "react-select/async";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import FeedbackDialog from "@/components/FeedbackDialog";
import { useStore } from "@/stores/Store";
import MultiSelect from "@/components/MultiSelect";
import { API } from "@/services/Api";
import { useAppEffects } from "@/hooks/UseAppEffects";
import axios from "axios";

interface Option {
  value: string;
  label: string;
}
interface FormErrors {
  language_code?: string;
  language_name?: string;
}

const CreateRepo: React.FC = () => {
  const [formData, setFormData] = useState({
    language: "",
    projectName: "",
    isPrivate: true,
    description: "",
  });

  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: "",
    message: "",
    isError: false,
    type: "" as "project" | "language" | "",
  });

  const [languageDialogOpen, setLanguageDialogOpen] = useState(false);
  const [newLanguage, setNewLanguage] = useState({
    language_code: "",
    language_name: "",
  });

  const navigate = useNavigate();
  const postCreateRepoInOrg = useStore.getState().postCreateRepoInOrg;
  const postCreateRepoCatalogue = useStore.getState().postCreateRepoCatalogue;
  const fetchHomePageData = useStore.getState().fetchHomePageData;
  const [selectedOptions, setSelectedOptions] = useState<Option[]>([]);
  const access_token = useStore((state) => state.access_token);
  const [languageKey, setLanguageKey] = useState(0); // Key to force reload
  const [errors, setErrors] = useState({
    language_code: "",
    language_name: "",
  });

  useAppEffects({
    access_token,
    fetchHomePageData: true, // Use the common logic from the hook
  });

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

  // Function to load and filter languages from Gitea
  const loadLanguageOptions = async (inputValue: string) => {
    const orgName = "BCS"; // Replace with your organization name
    const repoName = "languages-repo"; // Replace with your repository name
    try {
      const { data: fileData } = await API.get(
        `/api/v1/repos/${orgName}/${repoName}/contents/language.json`
      );

      const decodedContent = atob(fileData.content);
      const allLanguages = JSON.parse(decodedContent);

      const filteredLanguages = allLanguages
        .filter((lang: { language_name: string }) =>
          lang.language_name.toLowerCase().includes(inputValue.toLowerCase())
        )
        .slice(0, 100)
        .map((lang: { language_code: string; language_name: string }) => ({
          value: lang.language_code,
          label: lang.language_name,
        }));

      return filteredLanguages;
    } catch (error) {
      console.error("Error loading languages:", error);
      return [];
    }
  };

  const handleAddLanguage = async () => {
    const newErrors: FormErrors = {};
    if (!newLanguage.language_code) {
      newErrors.language_code = "Language code is required";
    }
    if (!newLanguage.language_name) {
      newErrors.language_name = "Language name is required";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors as { language_code: string; language_name: string });
      return;
    }
    const orgName = "BCS"; // Replace with your organization name
    const repoName = "languages-repo"; // Replace with your repository name
    try {
      // Fetch the current file
      const { data: fileData } = await API.get(
        `/api/v1/repos/${orgName}/${repoName}/contents/language.json`
      );

      const decodedContent = atob(fileData.content);
      const allLanguages = JSON.parse(decodedContent);

      // Check if the language already exists
      const languageExists = allLanguages.some(
        (lang: { language_code: string; language_name: string }) =>
          lang.language_code === newLanguage.language_code ||
          lang.language_name.toLowerCase() ===
            newLanguage.language_name.toLowerCase()
      );

      if (languageExists) {
        setDialogState({
          isOpen: true,
          title: "Language Exists",
          message: "The language code or name already exists in the list.",
          isError: true,
          type: "language",
        });
        return;
      }

      // Append the new language
      const updatedLanguages = [...allLanguages, newLanguage];

      // Encode and update the file
      const encodedContent = btoa(JSON.stringify(updatedLanguages, null, 2));
      await API.put(
        `/api/v1/repos/${orgName}/${repoName}/contents/language.json`,
        {
          message: "Added new language",
          content: encodedContent,
          sha: fileData.sha,
        }
      );

      // Success dialog
      setDialogState({
        isOpen: true,
        title: "Success",
        message: "Language added successfully!",
        isError: false,
        type: "language",
      });

      setLanguageDialogOpen(false);
      setNewLanguage({ language_code: "", language_name: "" });

      // Force reload of AsyncSelect
      setLanguageKey((prev) => prev + 1);
    } catch (error) {
      console.error("Error adding language:", error);
      setDialogState({
        isOpen: true,
        title: "Error",
        message:
          "An error occurred while adding the language. Please try again.",
        isError: true,
        type: "language",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const orgRepoData = {
        org: "BCS",
        name: formData.projectName,
        private: formData.isPrivate,
        description: formData.description,
      };
      const topics = [
        ...selectedOptions.map((option) => option.value),
        formData.language,
      ];
      await postCreateRepoInOrg(orgRepoData, orgRepoData.org);
      await postCreateRepoCatalogue(topics, formData.projectName);
      await fetchHomePageData();
      setDialogState({
        isOpen: true,
        title: "Success",
        message: "Project created successfully!",
        isError: false,
        type: "project",
      });

      //hackathon
      if (selectedOptions[0]?.value === "bible") {
        console.log("Executing add_project endpoint");
        const response = await axios.post(
          `${import.meta.env.VITE_FASTAPI_BASE_URL}/add_project`,
          {
            project_name: formData.projectName,
          }
        );
        console.log("Response from add_project endpoint:", response);
      }
      //hackathon

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.log("Error details:", error);

      let errorMessage = "Failed to create Project. Please try again.";

      console.log("Error details:", error.status);
      // Check for error status
      if (error.status === 409) {
        errorMessage = "A project with this name already exists.";
      } else {
        errorMessage =
          error.data?.message ||
          error.message ||
          "Failed to create Project. Please try again.";
      }

      setDialogState({
        isOpen: true,
        title: "Error",
        message: errorMessage,
        isError: true,
        type: "project",
      });
    }
  };

  const handleDialogClose = () => {
    const { isError, type } = dialogState;

    // Reset dialog state
    setDialogState((prev) => ({
      ...prev,
      isOpen: false,
      type: "", // Reset type
    }));

    // Only navigate to /repo for successful project creation
    if (!isError && type === "project") {
      navigate("/repo");
    }
  };

  const handleInputChange = (field: any) => (e: any) => {
    const value = e.target.value.trim();
    setNewLanguage((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (value) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  return (
    <>
      <Card className="max-w-xl mx-auto mt-14">
        <CardHeader>
          <CardTitle className="text-center">New Project</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="pt-0 space-y-4">
            <div className="space-y-1 flex-1">
              <Label>Project Name</Label>
              <Input
                name="projectName"
                placeholder="Enter project name"
                value={formData.projectName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    projectName: e.target.value,
                  }))
                }
              />
            </div>
            <div className="flex space-x-4">
              <div className="space-y-1 flex-1">
                <Label>
                  Select Language <span className="text-red-500">*</span>
                </Label>
                <AsyncSelect<Option>
                  key={languageKey} // Re-render when the key changes
                  cacheOptions
                  defaultOptions
                  loadOptions={loadLanguageOptions}
                  // To display the language_code in the dropdown
                  // value={
                  //   formData.language
                  //     ? { value: formData.language, label: formData.language }
                  //     : null
                  // }
                  onChange={(selected) =>
                    setFormData((prev) => ({
                      ...prev,
                      language: selected?.value || "",
                    }))
                  }
                  placeholder="Select language..."
                  noOptionsMessage={({ inputValue }) =>
                    inputValue
                      ? "No languages found"
                      : "Start typing to search languages"
                  }
                />

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLanguageDialogOpen(true)}
                    className="mt-2 flex items-center space-x-1"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      className="size-6"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M12 4.5v15m7.5-7.5h-15"
                      />
                    </svg>
                    <span>Add Language</span>
                  </Button>
                </div>
              </div>
              <div className="space-y-1 flex-1">
                <Label>
                  Select Resource Type <span className="text-red-500">*</span>
                </Label>
                <MultiSelect
                  options={options}
                  value={selectedOptions}
                  onChange={setSelectedOptions}
                  placeholder="Select resource types..."
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                name="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Enter the project description"
                className="resize-none h-20"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="private"
                checked={!formData.isPrivate}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    isPrivate: !checked,
                  }))
                }
              />
              <Label htmlFor="private">Make Project public</Label>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between px-11">
            <Button type="button" onClick={() => navigate("/repo")}>
              Cancel
            </Button>
            <Button
              type="submit"
              className={`bg-green-600 hover:bg-green-700 ${
                !(formData.language && formData.projectName)
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
              disabled={
                !(
                  formData.language &&
                  formData.description &&
                  formData.projectName
                )
              }
            >
              Create Project
            </Button>
          </CardFooter>
        </form>
      </Card>
      <FeedbackDialog {...dialogState} onClose={handleDialogClose} />

      {/* Language Dialog */}
      <Dialog
        open={languageDialogOpen}
        onOpenChange={(open) => {
          setLanguageDialogOpen(open);
          if (!open) {
            setNewLanguage({ language_code: "", language_name: "" });
            setErrors({ language_code: "", language_name: "" });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Language</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-1">
              <div>
                <Label>
                  Language Code <span className="text-red-500">*</span>
                </Label>
              </div>
              <Input
                value={newLanguage.language_code}
                onChange={handleInputChange("language_code")}
                placeholder="Enter language code"
                className={errors.language_code ? "border-red-500" : ""}
                required
              />
              {errors.language_code && (
                <span className="text-xs text-red-500">
                  {errors.language_code}
                </span>
              )}
            </div>
            <div className="space-y-1">
              <div>
                <Label>
                  Language Name <span className="text-red-500">*</span>
                </Label>
              </div>
              <Input
                value={newLanguage.language_name}
                onChange={handleInputChange("language_name")}
                placeholder="Enter language name"
                className={errors.language_name ? "border-red-500" : ""}
                required
              />
              {errors.language_name && (
                <span className="text-xs text-red-500">
                  {errors.language_name}
                </span>
              )}
            </div>
            <div>
              <Button
                onClick={handleAddLanguage}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Add Language
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreateRepo;
