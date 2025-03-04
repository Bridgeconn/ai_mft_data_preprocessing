import React from "react";
interface CreateReleaseModalProps {
    owner: string;
    repo: string;
    onClose: () => void;
    onReleaseCreated: () => void;
}
declare const CreateRelease: React.FC<CreateReleaseModalProps>;
export default CreateRelease;
