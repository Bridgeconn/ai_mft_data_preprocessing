import React from "react";
interface ListUsersProps {
    onUserCountChange: (count: number) => void;
}
declare const ListUsers: React.FC<ListUsersProps>;
export default ListUsers;
