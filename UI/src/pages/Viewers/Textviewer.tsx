import React from "react";
import Markdown from "react-markdown";

interface TextViewerProps {
  content: string;
  isMarkdown: boolean;
  fileName?: string;
  isPreviewMode: boolean;
}

const TextViewer: React.FC<TextViewerProps> = ({
  content,
  isMarkdown,
  fileName,
  isPreviewMode,
}) => {
  const checkMetaFile = fileName?.toLowerCase() === "metadata.json";
  const lines = content.split("\n");
  const renderMetadata = () => {
    const parsedContent = JSON.parse(content);
    return (
      <pre className="whitespace-pre-wrap text-sm">
        {JSON.stringify(parsedContent, null, 2)}
      </pre>
    );
  };

  return (
    <div className="p-4 border rounded bg-slate-50">
      {isMarkdown && isPreviewMode ? (
        <Markdown className="prose max-w-none">{content}</Markdown>
      ) : checkMetaFile ? (
        <>{renderMetadata()}</>
      ) : (
        <>
          {lines.map((line, index) => (
            <div
              key={index}
              className="flex text-sm font-mono whitespace-pre-wrap"
            >
              <span className="text-gray-500 pr-4 select-none">
                {index + 1}
              </span>
              <span>{line}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default TextViewer;
