export interface RepositoryContext {
  repository: {
    owner: string;
    name: string;
    url: string;
    description: string | null;
    stars: number;
    forks: number;
    watchers: number;
    openIssues: number;
    primaryLanguage: string | null;
    languages: Record<string, number>;
    topics: string[];
    license: string | null;
    defaultBranch: string;
    createdAt: string;
    updatedAt: string;
  };
  contributors: {
    username: string;
    contributions: number;
  }[];
  recentCommits: {
    sha: string;
    message: string;
    author: string;
    date: string;
  }[];
  structure: {
    path: string;
    type: "file" | "directory";
    size?: number;
  }[];
  importantFiles: {
    path: string;
    content: string;
  }[];
  readme: string | null;
}
