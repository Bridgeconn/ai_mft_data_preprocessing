import { useParams } from "react-router-dom";
import FileExplorer from "../FileExplorer";

export default function RepoPage() {
  const { owner, repo } = useParams();

  return (
    <div className="container mx-auto">
      <FileExplorer owner={owner!} repo={repo!} />
    </div>
  );
}
