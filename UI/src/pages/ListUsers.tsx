import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { API } from "@/services/Api";
import { Calendar, Mail } from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

interface User {
  id: string;
  username: string;
  email: string;
  joinDate: string;
  isFollowing: boolean;
}
interface ListUsersProps {
  onUserCountChange: (count: number) => void;
}

const ListUsers: React.FC<ListUsersProps> = ({ onUserCountChange }) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = useCallback(
    async (searchTerm?: string) => {
      const usersResponse = await API.get(
        `/api/v1/users/search?limit=100&q=${searchTerm ?? ""}`
      );
      const data = await usersResponse.data.data;
      setUsers(data);
      onUserCountChange(data.length);
    },
    [onUserCountChange]
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    fetchData(e.target.value);
  };

  return (
    <div>
      <div className="mb-4">
        <input
          type="search"
          className="w-full px-4 py-2 border rounded-md"
          placeholder="Search users..."
          value={search}
          onChange={handleSearch}
        />
      </div>
      {users.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          Users not found.
        </div>
      ) : (
        users.map((user: any) => (
          <div
            key={user.id}
            className="flex items-center justify-between py-2 border-b hover:bg-muted/50"
          >
            <div className="flex items-center">
              <Avatar className="h-14 w-14 rounded">
                <AvatarImage
                  src={user?.avatar_url}
                  alt={user?.username}
                  className=""
                />
                <AvatarFallback>
                  {user?.username[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <h3
                  className="text-base font-semibold text-left cursor-pointer hover:underline"
                  onClick={() => {
                    navigate(`/profile/starred/${user.login}`, {
                      state: {
                        userData: {
                          id: user.id,
                          username: user.username,
                          full_name: user.full_name,
                          email: user.email,
                          created: user.created,
                          avatar_url: user.avatar_url,
                          isFollowing: user.isFollowing,
                        },
                      },
                    });
                  }}
                >
                  {user.login}
                </h3>
                <div className="flex space-x-2">
                  <div className="flex items-center text-muted-foreground space-x-1">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm text-black">{user.email}</span>
                  </div>
                  <div className="flex items-center text-muted-foreground space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm text-black">
                      Joined on{" "}
                      {new Date(user.created).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ListUsers;
