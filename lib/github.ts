import type { RepositoryContext } from "@/types/repository";

const GITHUB_API = "https://api.github.com";
const MAX_IMPORTANT_FILES = 18;
const MAX_FILE_BYTES = 120_000;

type GitHubRepo = {
  name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  subscribers_count: number;
  watchers_count: number;
  open_issues_count: number;
  language: string | null;
  topics?: string[];
  license: { spdx_id: string | null; name: string } | null;
  default_branch: string;
  created_at: string;
  updated_at: string;
  owner: { login: string };
};

type GitHubTreeItem = {
  path: string;
  mode: string;
  type: "blob" | "tree" | "commit";
  sha: string;
  size?: number;
};

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
  }
}

function requestHeaders(accept = "application/vnd.github+json") {
  const headers: Record<string, string> = {
    Accept: accept,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "silicon-valid",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

async function githubFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${GITHUB_API}${path}`, {
    headers: requestHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { message?: string };
      detail = body.message ? ` ${body.message}` : "";
    } catch {
      // GitHub occasionally responds without a JSON body.
    }

    if (response.status === 404) {
      throw new GitHubApiError("Repository not found. Make sure it is public and the URL is correct.", 404);
    }
    if (response.status === 403 || response.status === 429) {
      throw new GitHubApiError("GitHub's API rate limit was reached. Add GITHUB_TOKEN to .env.local and try again.", 429);
    }
    throw new GitHubApiError(`GitHub API request failed (${response.status}).${detail}`, response.status);
  }

  return response.json() as Promise<T>;
}

function isImportantFile(path: string) {
  const lower = path.toLowerCase();
  const fileName = lower.split("/").at(-1) ?? lower;
  const depth = path.split("/").length;

  const exactNames = new Set([
    "package.json",
    "tsconfig.json",
    "jsconfig.json",
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
    "vite.config.js",
    "vite.config.ts",
    "astro.config.mjs",
    "svelte.config.js",
    "tailwind.config.js",
    "tailwind.config.ts",
    "eslint.config.js",
    "eslint.config.mjs",
    "dockerfile",
    "docker-compose.yml",
    "cargo.toml",
    "go.mod",
    "pyproject.toml",
    "requirements.txt",
    "gemfile",
    "composer.json",
  ]);

  if (exactNames.has(fileName)) return true;
  if (/^\.env\.example$|^\.github\/workflows\/[^/]+\.ya?ml$/.test(lower)) return true;

  return (
    depth <= 4 &&
    /^(src|app|pages|lib)\/(index|main|app|page|layout|route)\.(ts|tsx|js|jsx|py|go|rs)$/.test(lower)
  );
}

function decodeBase64(value: string) {
  return Buffer.from(value.replace(/\n/g, ""), "base64").toString("utf8");
}

async function readBlob(owner: string, repo: string, item: GitHubTreeItem) {
  if (item.size && item.size > MAX_FILE_BYTES) return null;

  try {
    const blob = await githubFetch<{ content: string; encoding: string }>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/blobs/${item.sha}`,
    );
    if (blob.encoding !== "base64") return null;
    return { path: item.path, content: decodeBase64(blob.content) };
  } catch {
    return null;
  }
}

export async function getRepositoryContext(owner: string, repo: string): Promise<RepositoryContext> {
  const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const repository = await githubFetch<GitHubRepo>(base);

  const [languages, contributors, commits, tree, readmeResult] = await Promise.all([
    githubFetch<Record<string, number>>(`${base}/languages`).catch(() => ({})),
    githubFetch<Array<{ login: string; contributions: number }>>(`${base}/contributors?per_page=30`).catch(() => []),
    githubFetch<Array<{ sha: string; commit: { message: string; author: { name: string; date: string } | null }; author: { login: string } | null }>>(
      `${base}/commits?per_page=15`,
    ).catch(() => []),
    githubFetch<{ tree: GitHubTreeItem[]; truncated: boolean }>(
      `${base}/git/trees/${encodeURIComponent(repository.default_branch)}?recursive=1`,
    ).catch(() => ({ tree: [], truncated: false })),
    githubFetch<{ content: string; encoding: string }>(`${base}/readme`).catch(() => null),
  ]);

  const candidates = tree.tree
    .filter((item) => item.type === "blob" && isImportantFile(item.path))
    .sort((a, b) => {
      const aRoot = a.path.split("/").length === 1 ? 0 : 1;
      const bRoot = b.path.split("/").length === 1 ? 0 : 1;
      return aRoot - bRoot || a.path.localeCompare(b.path);
    })
    .slice(0, MAX_IMPORTANT_FILES);

  const importantFiles = (await Promise.all(candidates.map((item) => readBlob(owner, repo, item)))).filter(
    (file): file is { path: string; content: string } => file !== null,
  );

  return {
    repository: {
      owner: repository.owner.login,
      name: repository.name,
      url: repository.html_url,
      description: repository.description,
      stars: repository.stargazers_count,
      forks: repository.forks_count,
      watchers: repository.subscribers_count ?? repository.watchers_count,
      openIssues: repository.open_issues_count,
      primaryLanguage: repository.language,
      languages,
      topics: repository.topics ?? [],
      license: repository.license?.spdx_id ?? repository.license?.name ?? null,
      defaultBranch: repository.default_branch,
      createdAt: repository.created_at,
      updatedAt: repository.updated_at,
    },
    contributors: contributors.map((contributor) => ({
      username: contributor.login,
      contributions: contributor.contributions,
    })),
    recentCommits: commits.map((commit) => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.author?.login ?? commit.commit.author?.name ?? "Unknown",
      date: commit.commit.author?.date ?? "",
    })),
    structure: tree.tree
      .filter((item) => item.type === "blob" || item.type === "tree")
      .map((item) => ({
        path: item.path,
        type: item.type === "tree" ? ("directory" as const) : ("file" as const),
        ...(item.type === "blob" && typeof item.size === "number" ? { size: item.size } : {}),
      })),
    importantFiles,
    readme:
      readmeResult?.encoding === "base64" ? decodeBase64(readmeResult.content) : null,
  };
}
