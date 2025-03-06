import { Button } from "@/components/ui/button";
import { API } from "@/services/Api";
import axios from "axios";
import { useState } from "react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";

interface ParseBooksProps {
  owner: string;
  repo: string;
}

interface ParseResult {
  bookName: string;
  status: "Success" | "Error";
  message?: any;
  details?: any;
}

const ParseBooks = ({ owner, repo }: ParseBooksProps) => {
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [parseResults, setParseResults] = useState<ParseResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<ParseResult | null>(
    null
  );
  const [usfmCount, setUsfmCount] = useState(0);
  const [parseCount, setParseCount] = useState(0);

  const fetchListBibles = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_FASTAPI_BASE_URL}/list_bibles/?project_name=${repo}`
      );
      const fetchedBooks = response?.data?.bibles[0]?.books || [];
      return fetchedBooks;
    } catch (error) {
      console.error("Error fetching books from FastAPI:", error);
    }
  };

  const usfmParseFunction = async (file: any, method: "post" | "put") => {
    try {
      const contentResponse = await API.get(
        `/api/v1/repos/${owner}/${repo}/contents/${file.path}`
      );
      const responseData = contentResponse.data.content;
      if (responseData) {
        try {
          const uploadResponse = await axios[method](
            `${import.meta.env.VITE_FASTAPI_BASE_URL}/${method === "post" ? "upload_usfm" : "update_usfm"}`,
            {
              project_name: repo,
              usfm_sha: contentResponse?.data?.sha,
              encoded_usfm: JSON.stringify(responseData),
            }
          );
          return {
            bookName: file.name.toUpperCase(),
            status: "Success",
            message: "USFM file processed successfully",
            details: `project_id: ${uploadResponse.data.project_id}, book_id: ${uploadResponse.data.book_id}`,
          };
        } catch (error: any) {
          const errorDetails = error.response || "Unknown error";
          if (errorDetails.status === 400) {
            return {
              bookName: file.name.toUpperCase(),
              status: "Error",
              message:
                errorDetails.data.detail || "Failed to process USFM file",
              details: errorDetails.data.detail.errors || "",
            };
          }
        }
      }
    } catch (error: any) {
      console.log("Error reading file:", error);
    }
  };

  const handleParseBooks = async () => {
    setLoading(true);
    const results: any = [];
    const listBooks = await fetchListBibles();
    // const filterBooksSuccess = listBooks.filter(
    //   (book: any) => book.status === "success"
    // );
    try {
      const filesResponse = await API.get(
        `/api/v1/repos/${owner}/${repo}/contents/`
      );
      const usfmFiles = filesResponse.data.filter((file: { name: string }) =>
        file.name.endsWith(".usfm")
      );
      setUsfmCount(usfmFiles.length);
      if (usfmFiles.length === 0) return;

      for (const file of usfmFiles) {
        setParseCount((prevCount) => prevCount + 1);
        const fileNameUpperCase = file.name?.split(".")[0].toUpperCase();
        const bookExists = listBooks.some(
          (book: any) => book.book_name === fileNameUpperCase
        );
        const method = bookExists ? "put" : "post";
        const parseUSFMResponse = await usfmParseFunction(file, method);
        results.push(parseUSFMResponse);
      }
      setParseCount(0);
      setParseResults(results);
      setSelectedResult(results.length > 0 ? results[0] : null);
      setIsDialogOpen(true);
    } catch (error) {
      console.error("Error fetching books:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result: ParseResult) => {
    setSelectedResult(result);
  };

  return (
    <>
      <Button onClick={handleParseBooks} disabled={loading}>
        {loading ? `${parseCount} of ${usfmCount} books parsed` : "Parse Books"}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <div className="flex h-96">
            <div className="w-1/2 border-r border-gray-200 pr-4">
              <div className="flex text-black font-medium mb-2">
                <div className="flex-1">Book Name</div>
                <div className="w-24">Status</div>
              </div>
              <div className="h-80 overflow-y-auto">
                {parseResults.map((result, index) => (
                  <div
                    key={index}
                    className={`flex py-1 cursor-pointer ${
                      selectedResult?.bookName === result.bookName
                        ? "bg-purple-50"
                        : ""
                    }`}
                    onClick={() => handleResultClick(result)}
                  >
                    <div className="flex-1 text-sm">{result.bookName}</div>
                    <div
                      className={`w-24 text-sm ${
                        result.status === "Success"
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {result.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div
              className="w-1/2 pl-4 overflow-y-auto"
              style={{ maxHeight: "calc(100vh - 200px)" }}
            >
              {selectedResult && (
                <div>
                  {selectedResult.status === "Error" ? (
                    <>
                      <h2 className="text-xl font-semibold mb-2">
                        {selectedResult.bookName?.split(".")[0]}
                      </h2>
                      <div className="text-red-500 mb-2">
                        {selectedResult.message?.message}
                      </div>
                      {selectedResult.details[0]
                        ?.split("\n")
                        .map((line: string, index: number) => (
                          <div key={index} className="mb-2">
                            {line}
                          </div>
                        ))}
                    </>
                  ) : (
                    <>
                      <h2 className="text-xl font-semibold mb-2">
                        {selectedResult.bookName?.split(".")[0]}
                      </h2>
                      <div className="text-green-500 mb-2">
                        {selectedResult.message}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setIsDialogOpen(false)}
              className="ml-auto"
              variant="outline"
            >
              close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ParseBooks;
