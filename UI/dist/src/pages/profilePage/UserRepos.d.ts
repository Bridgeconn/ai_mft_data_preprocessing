interface Repository {
    name?: string;
    full_name?: string;
    description?: string;
    updated_at: string;
    stars_count: number;
}
interface UserReposProps {
    repositories: Repository[];
    type: "projects" | "starred projects";
}
declare const UserRepos: ({ repositories, type }: UserReposProps) => import("react/jsx-runtime").JSX.Element;
export default UserRepos;
