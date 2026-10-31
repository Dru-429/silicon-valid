const GITHUB_REPOSITORY_URL = /^https:\/\/github\.com\/[^/]+\/[^/?#]+\/?(?:[?#].*)?$/;

export function normalizeGitHubRepositoryUrl(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return GITHUB_REPOSITORY_URL.test(normalized) ? normalized : null;
}

