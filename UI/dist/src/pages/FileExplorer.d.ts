import React from "react";
interface RepoDetails {
    owner: string;
    repo: string;
}
declare const FileExplorer: React.FC<RepoDetails>;
export default FileExplorer;
