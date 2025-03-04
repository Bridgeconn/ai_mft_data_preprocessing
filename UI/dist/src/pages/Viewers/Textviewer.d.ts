import React from "react";
interface TextViewerProps {
    content: string;
    isMarkdown: boolean;
    fileName?: string;
    isPreviewMode: boolean;
}
declare const TextViewer: React.FC<TextViewerProps>;
export default TextViewer;
