import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/stores/Store";
import { Mail, Calendar, Star, Undo2, ShieldCheck } from "lucide-react";
import UserRepos from "./UserRepos";
import { useEffect, useState } from "react";
import { setHeader } from "@/services/Api";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useUserPermissions } from "@/hooks/UserPermission";

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { tab, otherUserName } = useParams();
  const location = useLocation();
  const isProfile = location.pathname?.split("/").length > 2;
  const access_token = useStore((state) => state.access_token);
  const visitedUserData = location.state?.userData;
  const currentUserData = useStore((state) => state.userData);
  const isCurrentUser = !otherUserName;
  const userData = isCurrentUser ? currentUserData : visitedUserData;
  const userRepos = useStore((state) => state.userRepos);
  const starredRepos = useStore((state) => state.starredUserRepos);
  const starredReposCount = starredRepos ? starredRepos.length : 0;
  const userName = userData?.username || "Data unavailable";
  const avatarUrl = userData?.avatar_url;
  const name = userData?.full_name || userData?.username || "Data unavailable";
  const email = userData?.email || "Data unavailable";
  const joinedDate = userData?.created || "Data unavailable";
  const [activeTab, setActiveTab] = useState("starred");
  const { hasPermission } = useUserPermissions();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getTabFromPath = () => {
    const path = location.pathname;
    if (path.includes("/myprofile")) return "starred";
    return "";
  };

  useEffect(() => {
    if (!tab) {
      const currentTab = getTabFromPath();
      if (currentTab === "starred") {
        navigate("/myprofile/starred", { replace: true });
      }
      setActiveTab(currentTab);
    }
    if (tab) {
      navigate(`/profile/${tab}/${otherUserName}`, {
        state: {
          userData: {
            id: visitedUserData.id,
            username: visitedUserData.username,
            full_name: visitedUserData.full_name,
            email: visitedUserData.email,
            created: visitedUserData.created,
            avatar_url: visitedUserData.avatar_url,
            isFollowing: visitedUserData.isFollowing,
          },
        },
      });
      setActiveTab(tab);
    }
  }, []);

  useEffect(() => {
    if (access_token && !userRepos) {
      setHeader(access_token);
      useStore.getState().fetchUserData();
    }
    if (userName) {
      useStore.getState().fetchUserStarredRepos(userName);
    }
  }, [userName]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className={`container mx-auto ${isProfile ? "" : "py-6"} px-4`}>
      {isProfile && (
        <Undo2
          className="m-2 w-6 h-6 hover:cursor-pointer"
          onClick={() => navigate("/repo/users")}
        />
      )}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-1 h-fit">
          <CardContent className="p-4 space-y-4">
            <div className="w-full aspect-square bg-muted rounded-lg mb-4">
              <Avatar className="h-full w-full rounded-none">
                <AvatarImage
                  src={avatarUrl}
                  alt={name}
                  className="object-cover"
                />
                <AvatarFallback className="text-4xl">
                  {getInitials(name)}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="space-y-3">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                {name}
                {!otherUserName && hasPermission("is_admin")  && (
                  <div className="flex items-center gap-1">
                    <ShieldCheck className="w-5 h-5" />
                    <Badge variant="secondary" className="text-xs px-2 py-0.5">
                      ADMIN
                    </Badge>
                  </div>
                )}
              </h2>

              <div className="space-y-2 mt-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span>{email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>Joined on {formatDate(joinedDate)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Project Section */}
        <div className="lg:col-span-4">
          <Tabs
            value={activeTab}
            // onValueChange={handleTabChange}
            className="w-full"
          >
            <div className="border-b">
              <TabsList className="h-auto bg-transparent border-0 p-0">
                <TabsTrigger
                  className="data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:shadow-none data-[state=active]:bg-transparent px-4 py-3 rounded-none h-auto"
                  value="starred"
                >
                  <Star className="w-4 h-4 mr-2" />
                  <span>Starred Projects</span>
                  <span className="ml-2 px-2 rounded-full text-xs bg-gray-100 text-gray-700">
                    {starredReposCount}
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="starred">
              <div className="p-2">
                <UserRepos
                  repositories={starredRepos}
                  type="starred projects"
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Profile;
