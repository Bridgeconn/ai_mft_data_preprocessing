import { Button } from "@/components/ui/button";
import { API } from "@/services/Api";
import axios from "axios";
import { useState } from "react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Eye } from "lucide-react";

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

interface BookPreview {
  project_name: string;
  book_name: string;
  chapters: Array<{
    chapter: string;
    verses: Array<{
      verse: string;
      text: string;
    }>;
  }>;
}

const ParseBooks = ({ owner, repo }: ParseBooksProps) => {
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [parseResults, setParseResults] = useState<ParseResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<ParseResult | null>(null);
  const [bookPreview, setBookPreview] = useState<BookPreview | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [usfmCount, setUsfmCount] = useState(0);
  const [parseCount, setParseCount] = useState(0);

  const fetchListBibles = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_FASTAPI_BASE_URL}/list_books/?project_name=${repo}`
      );
      const fetchedBooks = response?.data?.bibles[0]?.books || [];
      return fetchedBooks;
    } catch (error) {
      console.error("Error fetching books from FastAPI:", error);
    }
  };

  const fetchBookPreview = async (bookName: string) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_FASTAPI_BASE_URL}/book/json/?project_name=${repo}&book_name=${bookName}`
      );
      console.log("response of book data", response.data);
      setBookPreview(response.data);
      setIsPreviewMode(true);
    } catch (error) {
      console.error("Error fetching book preview:", error);
    }
  };

  const usfmParseFunction = async (file: any, method: "post" | "put") => {
    try {
      const contentResponse = await API.get(
        `/api/v1/repos/${owner}/${repo}/contents/${file.path}`
      );
      const responseData = contentResponse.data.content;
      console.log("file", file, "method", method);
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
      const usfmFiles = filesResponse.data.filter(
        (file: { name: string }) =>
          file.name.endsWith(".usfm") || file.name.endsWith(".SFM")
      );
      setUsfmCount(usfmFiles.length);
      if (usfmFiles.length === 0) return;

      for (const file of usfmFiles) {
        setParseCount((prevCount) => prevCount + 1);
        const fileNameUpperCase = file.name?.split(".")[0].toUpperCase();
        console.log("list of books", listBooks)
        const bookExists = listBooks.some(
          (book: any) => book.book_name === fileNameUpperCase
        );
        console.log("book exists", bookExists)
        const method = bookExists ? "put" : "post";
        const parseUSFMResponse = await usfmParseFunction(file, method);
        results.push(parseUSFMResponse);
      }
      setParseCount(0);
      setParseResults(results);
      setSelectedResult(results.length > 0 ? results[0] : null);
      setIsDialogOpen(true);
      setIsPreviewMode(false);
    } catch (error) {
      console.error("Error fetching books:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result: ParseResult) => {
    setSelectedResult(result);
    setIsPreviewMode(false);
  };

  const handlePreviewClick = (result: ParseResult) => {
    const cleanBookName = result.bookName.split('.')[0];
    fetchBookPreview(cleanBookName);
  };

  const renderDialogContent = () => {
    if (isPreviewMode && bookPreview) {
      return (
        <div className="flex flex-col h-96 overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-2xl font-bold">{bookPreview.book_name}</h2>
        </div>
        <div 
          className="flex-grow overflow-y-auto p-4 space-y-6"
        >
          {bookPreview.chapters.map((chapter) => (
            <div key={chapter.chapter}>
              <h3 className="text-xl font-semibold mb-2 bg-white/90">
                Chapter {chapter.chapter}
              </h3>
              {chapter.verses.map((verse, index) => (
                <div 
                  key={index} 
                  className="flex mb-2 text-sm"
                >
                  <span className="font-medium mr-2 w-12 flex-shrink-0">
                    {verse.verse}
                  </span>
                  <span className="flex-grow">{verse.text}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      );
    }

    return (
      <div className="flex h-96">
        <div className="w-1/2 border-r border-gray-200 pr-4">
          <div className="flex text-black font-medium mb-2">
            <div className="flex-1">Book Name</div>
            <div className="w-24">Status</div>
            <div className="w-12">Preview</div>
          </div>
          <div className="h-80 overflow-y-auto">
            {parseResults.map((result, index) => (
              <div
                key={index}
                className={`flex items-center py-1 cursor-pointer ${
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
                {result.status === "Success" ? (
                  <div 
                    className="w-12 flex justify-center cursor-pointer hover:bg-gray-100 rounded-full p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreviewClick(result);
                    }}
                  >
                    <Eye size={20} />
                  </div>
                ): (
                  <div className="w-12"></div>
                )}
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
    );
  };

  return (
    <>
      <Button onClick={handleParseBooks} disabled={loading}>
        {loading ? `${parseCount} of ${usfmCount} books parsed` : "Parse Books"}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          {renderDialogContent()}

          <DialogFooter>
            {isPreviewMode ? (
              <Button 
                onClick={() => {
                  setIsPreviewMode(false);
                  setBookPreview(null);
                }} 
                className="ml-auto"
                variant="outline"
              >
                Back to Results
              </Button>
            ) : (
              <Button
                onClick={() => setIsDialogOpen(false)}
                className="ml-auto"
                variant="outline"
              >
                close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ParseBooks;