import React from "react";
interface UploadFileProps {
    owner: string;
    repo: string;
    onClose: () => void;
}
declare const UploadFile: React.FC<UploadFileProps>;
export default UploadFile;
