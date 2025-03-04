import React, { useEffect, useState } from "react";
import { ExcelRenderer, ExcelRendererResponse } from "react-excel-renderer";

interface ExcelViewerProps {
  content: string;
}

interface ExcelData {
  rows: any[][];
  cols: any[];
}

const ExcelViewer: React.FC<ExcelViewerProps> = ({ content }) => {
  const [excelData, setExcelData] = useState<ExcelData>({
    rows: [],
    cols: [],
  });
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      const byteCharacters = atob(content);
      const byteNumbers = new Array(byteCharacters.length);

      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const file = new File([blob], "temp.xlsx", { type: blob.type });

      ExcelRenderer(file, (err, resp: ExcelRendererResponse) => {
        if (err) {
          setError(err);
        } else {
          setExcelData({
            rows: resp.rows,
            cols: resp.cols,
          });
        }
      });
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Unknown error occurred")
      );
    }
  }, [content]);

  if (error) {
    return (
      <div className="text-red-500">
        Error loading Excel file: {error.message}
      </div>
    );
  }

  if (
    !excelData.rows.length ||
    (excelData.rows.length === 1 && excelData.rows[0].every((cell) => !cell))
  ) {
    return (
      <div className="flex items-center justify-center p-4 text-gray-500">
        <p>This Excel file is empty</p>
      </div>
    );
  }

  const maxColumns = Math.max(...excelData.rows.map((row) => row.length));
  const paddedRows = excelData.rows.map((row) =>
    row.length < maxColumns
      ? [...row, ...Array(maxColumns - row.length).fill("")]
      : row
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse border border-gray-200">
      <thead className="bg-gray-300">
          <tr>
            {paddedRows[0].map((cell, cellIndex) => (
              <th key={cellIndex} className="border p-2 text-left font-bold">
                {cell || ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paddedRows.slice(1).map((row, index) => (
            <tr
              key={index}
              className={`${index % 2 === 0 ? "bg-white" : "bg-gray-100"} h-10`}
            >
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="border border-gray-200 p-2">
                  {cell || ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ExcelViewer;
