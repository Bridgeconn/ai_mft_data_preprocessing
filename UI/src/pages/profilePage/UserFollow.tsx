// import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface UserProps {
  username: string;
  avatar_url?: string;
  created: string;
}

interface UserFollowProps {
  users: UserProps[];
  type: 'followers' | 'following';
}

const UserFollow: React.FC<UserFollowProps> = ({ users, type }) => {

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filteredData, setFilteredData] = useState<UserProps[]>([]);

  useEffect(() => {
    if (users?.length > 0) {
      const filtered = users.filter((user: any) =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredData(filtered);
    }else{
      setFilteredData([])
    }
  }, [searchTerm, users]);

  return (
    <div>
      <input 
        type="text"
        placeholder={`search ${type}..`}
        className="w-full mb-6 p-2 border rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-100"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredData?.map((user:any) => (
        <Card key={user?.username} className="w-full">
          <CardContent className="p-4">
            <div className="flex items-start space-x-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.avatar_url} alt={user?.username} />
                <AvatarFallback>{user?.username[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-md font-semibold">{user?.username}</h4>
                  {/* <Button 
                    variant="outline" 
                    size="sm"
                    className="text-xs"
                  >
                    {type === 'followers' ? 'Follow Back' : 'Unfollow'}
                  </Button> */}
                </div>
                
                <div className="flex items-center text-sm text-muted-foreground">
                  <CalendarDays className="mr-1 h-3 w-3" />
                  <span>Joined on {formatDistanceToNow(new Date(user?.created), {
                        addSuffix: true,
                      })}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
  );
};

export default UserFollow;