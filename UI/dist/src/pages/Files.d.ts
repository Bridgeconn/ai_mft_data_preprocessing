import React from "react";
interface File {
    name: string;
    path: string;
    size: number;
    type: string;
    last_commit_sha: string;
    lastUpdated: string;
}
interface FileProps {
    owner: string;
    repo: string;
}
declare const File: React.FC<FileProps>;
export default File;
