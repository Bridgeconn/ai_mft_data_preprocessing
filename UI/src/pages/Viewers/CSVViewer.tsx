import React from "react";

interface CSVViewerProps {
  content: string;
  isTableView: boolean;
}

const CSVViewer: React.FC<CSVViewerProps> = ({ content, isTableView }) => {
  // Parse the CSV content into rows and columns
  const parseCSV = (csvContent: string) => {
    const rows = csvContent.split("\n").map((row) => {
      const cells = [];
      let currentCell = "";
      let insideQuotes = false;

      for (const char of row) {
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === "," && !insideQuotes) {
          cells.push(currentCell);
          currentCell = "";
        } else {
          currentCell += char;
        }
      }
      cells.push(currentCell);
      return cells;
    });
    return rows;
  };

  const rows = parseCSV(content);

  return (
    <div>
      {isTableView ? (
        <div className="overflow-auto">
          <table className="min-w-full border-collapse border border-gray-300">
            <thead className="bg-gray-200">
              <tr>
                <th className="border border-gray-300 w-12 px-4 py-2 text-left text-sm font-medium text-gray-700">
                  #
                </th>
                {rows[0]?.map((header, index) => (
                  <th
                    key={index}
                    className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(1).map((row, rowIndex) => (
                <tr key={rowIndex} className="odd:bg-white even:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">
                    {rowIndex + 1}
                  </td>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="border border-gray-300 px-4 py-2 text-sm text-gray-600"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 p-4 rounded border">
          {content}
        </pre>
      )}
    </div>
  );
};

export default CSVViewer;
