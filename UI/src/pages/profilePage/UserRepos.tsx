import { FolderGit2, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

interface Repository {
  name?: string;
  full_name?: string;
  description?: string;
  updated_at: string;
  stars_count: number;
}
interface UserReposProps {
  repositories: Repository[];
  type: "projects" | "starred projects";
}
const UserRepos = ({ repositories, type }: UserReposProps) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filteredData, setFilteredData] = useState<Repository[]>([]);

  useEffect(() => {
    if (repositories?.length > 0) {
      const filtered = repositories.filter((name: any) =>
        name.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredData(filtered);
    }else{
      setFilteredData([])
    }
  }, [searchTerm, repositories]);

  return (
    <div>
      <input
        type="text"
        placeholder={`search ${type}..`}
        className="w-full mb-4 p-2 border rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-100"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      {filteredData.map((repo, index) => (
        <div key={repo?.name}>
          {index < repositories?.length && (
            <div className="h-px bg-[#d0d7de] w-full" />
          )}
          <div className="grid grid-cols-3 px-1 py-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  to={`/repo/files/${repo.full_name}`}
                  className="text-base font-medium text-[#4183c4] hover:underline flex items-center gap-2"
                >
                  <FolderGit2 className="h-5 w-5 text-black flex-shrink-0" />
                  <span className="font-medium text-md text-[#4183c4]">
                    {type === "starred projects" ? repo?.full_name : repo?.name}
                  </span>
                </Link>
              </div>

              {repo?.description && (
                <p className="text-sm text-gray-500 pl-7 break-words pr-4">
                  {repo?.description}
                </p>
              )}
            </div>

            <div className="text-sm text-gray-500 self-start text-center">
              {formatDistanceToNow(new Date(repo?.updated_at), {
                addSuffix: true,
              })}
            </div>

            <div className="flex items-center gap-1 text-sm text-gray-500 self-start justify-end">
              <Star className="h-4 w-4" />
              <span>{repo?.stars_count}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default UserRepos;
