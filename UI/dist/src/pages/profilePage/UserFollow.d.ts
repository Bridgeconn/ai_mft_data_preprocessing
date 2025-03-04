interface UserProps {
    username: string;
    avatar_url?: string;
    created: string;
}
interface UserFollowProps {
    users: UserProps[];
    type: 'followers' | 'following';
}
declare const UserFollow: React.FC<UserFollowProps>;
export default UserFollow;
