import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button"; // Shadcn Button
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { API } from "@/services/Api";
import CreateRelease from "./CreateReleases";
import { useToast } from "@/hooks/use-toast";
import { useUserPermissions } from "@/hooks/UserPermission";

interface Release {
  id: number;
  name: string;
  tag_name: string;
  published_at: string;
  body: string;
  zipball_url: string;
  tarball_url: string;
  author: { login: string };
}

interface ReleasesProps {
  owner: string;
  repo: string;
}

const Releases: React.FC<ReleasesProps> = ({ owner, repo }) => {
  const [releases, setReleases] = useState<Release[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false); // State for modal
  const { toast } = useToast();
  const { hasPermission } = useUserPermissions();

  const fetchReleases = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await API.get(`/api/v1/repos/${owner}/${repo}/releases`);
      setReleases(response.data); // Update releases list
    } catch (error) {
      console.error("Error fetching releases:", error);
    } finally {
      setIsLoading(false);
    }
  }, [owner, repo]);

  useEffect(() => {
    fetchReleases();
  }, [fetchReleases, owner, repo]);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const handleDownload = (url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", name);
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast({
      variant: "default",
      title: "Downloading Release",
      description: `Your file (${name}) is being downloaded...`,
      className: "bg-green-500 text-white",
      duration: 2000,
    });
  };

  return (
    <div>
      {/* Create Release Button */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          Releases{" "}
          <span className="text-gray-500 text-base">
            ({releases.length}) {/* Display total releases */}
          </span>
        </h2>
        {hasPermission("is_admin") && (
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={openModal}
          >
            Create Release
          </Button>
        )}
      </div>

      {/* Modal for Creating Release */}
      {isModalOpen && (
        <CreateRelease
          owner={owner}
          repo={repo}
          onClose={closeModal}
          onReleaseCreated={fetchReleases}
        />
      )}

      {/* Releases List */}
      {isLoading ? (
        <div className="flex justify-center">
          <span className="loader">Loading...</span>
        </div>
      ) : releases.length === 0 ? (
        <p className="text-gray-600">No releases available.</p>
      ) : (
        releases.map((release) => (
          <Card
            key={release.id}
            className="mb-4 border border-gray-200 shadow-sm"
          >
            <CardContent className="pb-0">
              <h1 className="text-2xl font-bold flex items-center">
                {release.name}
                <span className="ml-2 text-base text-green-600 font-bold">
                  Stable
                </span>
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {release.author.login} released this{" "}
                {formatDistanceToNow(new Date(release.published_at))} ago |{" "}
                <span className="font-medium">{release.tag_name}</span>
              </p>
              {release?.body
                ?.split("\n")
                .map((line) => (
                  <p className="text-sm text-gray-700 mt-2">{line}</p>
                ))}
            </CardContent>
            <CardFooter className="flex gap-4 py-4">
              <Button
                variant="outline"
                onClick={() =>
                  handleDownload(
                    release.zipball_url,
                    `${repo}-${release.tag_name}.zip`
                  )
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="size-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                  />
                </svg>
                Source Code (ZIP)
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  handleDownload(
                    release.tarball_url,
                    `${repo}-${release.tag_name}.tar.gz`
                  )
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="size-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                  />
                </svg>
                Source Code (TAR.GZ)
              </Button>
            </CardFooter>
          </Card>
        ))
      )}
    </div>
  );
};

export default Releases;
