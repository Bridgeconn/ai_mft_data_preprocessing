import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import SignIn from "./pages/authentication/SignIn";
import OAuthCallback from "./pages/authentication/oauth/CallBack";
import ListRepo from "./pages/ListRepo";
import TopBar from "./components/layout/TopBar";
import CreateRepo from "./pages/CreateRepo";
import Profile from "./pages/profilePage/Profile";
import RepoPage from "./pages/repo/[slug]";
import { ViewFile } from "./pages/ViewFile";
import { Toaster } from "./components/ui/toaster";
function AppContent() {
  const location = useLocation();
  // Check if the current route is /signin
  const shouldShowTopBar = location.pathname !== "/sign-in";

  return (
    <>
      {/* Render TopBar conditionally */}
      {shouldShowTopBar && <TopBar />}
      <Routes>
        <Route path="/" element={<Navigate to="/sign-in" replace />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="/myprofile" element={<Profile />}>
          <Route index element={<Navigate to="starred" replace />} />
          <Route path="starred" element={<Profile />} />
        </Route>
        <Route path="/profile/:tab/:otherUserName" element={<Profile />} />
        <Route path="/repo" element={<ListRepo />}>
          <Route index element={<Navigate to="projects" replace />} />
          <Route path="projects" element={<ListRepo />} />
          <Route path="users" element={<ListRepo />} />
        </Route>
        <Route path="/createrepo" element={<CreateRepo />} />
        <Route path="/repo/:tab/:owner/:repo/*" element={<RepoRoutes />} />
      </Routes>
    </>
  );
}

function RepoRoutes() {
  const location = useLocation();
  const isFileRoute = (path: string) => {
    // Split the path and get the last segment
    const pathSegments = path.split("/").filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];

    // Check if the last segment contains a dot (.) which indicates an extension
    return lastSegment.includes(".");
  };

  // Determine which component to render based on route
  if (isFileRoute(location.pathname)) {
    return <ViewFile />;
  }

  return <RepoPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
      <Toaster />
    </BrowserRouter>
  );
}
