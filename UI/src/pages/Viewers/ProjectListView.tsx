import React, { useEffect, useState } from "react";
import { ExcelRenderer, ExcelRendererResponse } from "react-excel-renderer";
import { FIXED_HEADERS } from "@/utils/columnHeaders";
interface ExcelViewerProps {
  content: string;
}

interface ExcelData {
  rows: any[][];
  cols: any[];
}

const ProjectListView: React.FC<ExcelViewerProps> = ({ content }) => {
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
          const headerMap = resp.rows[0].reduce(
            (acc: { [key: string]: number }, cell: string, index: number) => {
              if (cell) acc[cell] = index;
              return acc;
            },
            {}
          );
          const reorderedRows = resp.rows.slice(1).map((row) => {
            return FIXED_HEADERS.map((header) => {
              const index = headerMap[header];
              return index !== undefined ? row[index] : "";
            });
          });
          setExcelData({
            rows: [FIXED_HEADERS, ...reorderedRows],
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

  return (
    <div className="overflow-x-auto h-[80vh] relative">
      <table className="min-w-full border-collapse border border-gray-200">
        <thead className="bg-gray-300 sticky top-0 z-10">
          <tr>
            {FIXED_HEADERS.map((header, index) => (
              <th
                key={index}
                className="border p-2 text-left font-bold whitespace-nowrap"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="overflow-y-auto">
          {excelData.rows.slice(1).map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={`${rowIndex % 2 === 0 ? "bg-white" : "bg-gray-100"} h-10`}
            >
              {FIXED_HEADERS.map((_, cellIndex) => (
                <td
                  key={cellIndex}
                  className="border border-gray-200 p-2 whitespace-nowrap"
                >
                  {row[cellIndex] || ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProjectListView;
