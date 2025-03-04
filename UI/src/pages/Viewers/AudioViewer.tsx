import React from "react";

interface AudioViewerProps {
  content: string; // Base64 encoded audio content
}

const AudioViewer: React.FC<AudioViewerProps> = ({ content }) => {
  // Ensure the content starts with a proper MIME type for audio
  const audioSrc = content.startsWith("data:audio/")
    ? content
    : `data:audio/mpeg;base64,${content}`;

  return (
    <div className="audio-viewer">
      <div className="flex justify-center items-center">
        <audio
          controls
          src={audioSrc}
          className="w-full max-w-lg border rounded shadow"
        >
          Your browser does not support the audio element.
        </audio>
      </div>
      <p className="mt-4 text-sm text-gray-500 text-center">
        Preview of the selected audio file.
      </p>
    </div>
  );
};

export default AudioViewer;
