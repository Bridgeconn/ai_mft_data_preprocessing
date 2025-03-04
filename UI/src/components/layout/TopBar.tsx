import React from "react";
import { Home, LogOut, User, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/stores/Store";
import { DropdownMenuLabel } from "@radix-ui/react-dropdown-menu";
import { clearTokenRefresh } from "@/utils/refreshToken";

const TopBar: React.FC = () => {
  const navigate = useNavigate();
  const userData = useStore((state) => state.userData);
  const logOut = useStore.getState().logOut;
  const handleLogout = () => {
    clearTokenRefresh();
    logOut();
    useStore.persist.clearStorage(); // to clear the session storage
    navigate("/");
  };

  return (
    <nav className="bg-[#fafafa]">
      <div className="flex h-14 items-center px-4 shadow-md">
        {/* Left section - Home icon */}
        <div className="flex items-center">
          <button
            className="p-2 pl-5 rounded-full"
            onClick={() => navigate("/repo")}
          >
            <Home className="h-6 w-6" />
          </button>
        </div>
        <div className="ml-4">
          <img src="/logo-1.png" alt="Logo" className="h-19 w-28" />
        </div>

        {/* Center section - App name */}
        <div className="flex-1 flex items-center justify-center">
          <h1 className="text-xl font-bold ml-[-5.5em]">BCS PROJECTS</h1>
        </div>

        {/* Right section - Add and Profile buttons */}
        <div className="flex items-center gap-4 mr-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className=" rounded-lg flex items-center gap-1 p-1">
                <Avatar className="h-8 w-8 rounded">
                  <AvatarImage src={userData?.avatar_url} className="rounded" />
                  <AvatarFallback className="rounded">CN</AvatarFallback>
                </Avatar>
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {userData && (
                <>
                  <DropdownMenuLabel>
                    <span className="text-[.7rem] font-medium uppercase p-1">
                      SIGNED IN AS
                      <strong>{" " + userData.username.toUpperCase()}</strong>
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              )}

              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => navigate("/myprofile")}
              >
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
};

export default TopBar;
