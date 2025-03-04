import React from "react";
import { Download, Trash2, X } from "lucide-react";

interface PDFViewerProps {
  content: string;
  onClose: () => void;
  handleDownload: () => void;
  handleDelete: () => void;
  fileName: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  content,
  handleDownload,
  handleDelete,
  onClose,
  fileName,
}) => {
  const pdfSrc = `data:application/pdf;base64,${content}#toolbar=0&view=FitH&title=${encodeURIComponent(fileName)}`;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="absolute top-1 left-0 right-0 flex items-center justify-between z-10 px-4 py-2 bg-gray-100 border-b">
        <span className="text-gray-950 font-semibold ml-3 truncate max-w-[calc(100%-3rem)]">
          {fileName}
        </span>
        <div className="space-x-4">
          <button
            onClick={handleDownload}
            className="p-1 rounded-full hover:bg-gray-200 transition-colors"
            aria-label="Close PDF viewer"
          >
            <Download className="w-5 h-5 hover:cursor-pointer hover:text-blue-500" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 rounded-full hover:bg-gray-200 transition-colors"
            aria-label="Close PDF viewer"
          >
            <Trash2 className="w-5 h-5 pr hover:cursor-pointer hover:text-blue-500" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 transition-colors"
            aria-label="Close PDF viewer"
          >
            <X size={24} className="text-gray-700" />
          </button>
        </div>
      </div>
      <div className="h-full w-full pt-12 flex items-center justify-center">
        <iframe
          src={pdfSrc}
          className="w-9/12 h-full border-0"
          title={fileName}
        />
      </div>
    </div>
  );
};

export default PDFViewer;
