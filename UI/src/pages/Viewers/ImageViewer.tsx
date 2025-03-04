import React from "react";

interface ImageViewerProps {
  content: string; // Base64 encoded image content
}

const ImageViewer: React.FC<ImageViewerProps> = ({ content }) => {
  // Convert Base64 string to a data URL for rendering the image
  const imageSrc = `data:image/*;base64,${content}`;

  return (
    <div className="image-viewer mb-10">
      <div className="flex justify-center items-center">
        <img
          src={imageSrc}
          alt="File Preview"
          className="max-w-full max-h-screen object-contain border rounded shadow"
        />
      </div>

    </div>
  );
};

export default ImageViewer;
