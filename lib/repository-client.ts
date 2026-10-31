import type { RepositoryContext } from "@/types/repository";

const inFlightRepositoryRequests = new Map<string, Promise<RepositoryContext>>();
const repositoryContextCache = new Map<string, RepositoryContext>();

export function fetchRepositoryContext(repoUrl: string) {
  const cachedContext = repositoryContextCache.get(repoUrl);
  if (cachedContext) return Promise.resolve(cachedContext);

  const existingRequest = inFlightRepositoryRequests.get(repoUrl);
  if (existingRequest) return existingRequest;

  const request = fetch("/api/repository", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repoUrl }),
  }).then(async (response) => {
    const payload = (await response.json()) as RepositoryContext | { error?: string };

    if (!response.ok) {
      throw new Error("error" in payload && payload.error ? payload.error : "The repository could not be fetched.");
    }

    const repositoryContext = payload as RepositoryContext;
    repositoryContextCache.set(repoUrl, repositoryContext);
    return repositoryContext;
  });

  inFlightRepositoryRequests.set(repoUrl, request);

  const clearRequest = () => {
    if (inFlightRepositoryRequests.get(repoUrl) === request) {
      inFlightRepositoryRequests.delete(repoUrl);
    }
  };
  void request.then(clearRequest, clearRequest);

  return request;
}

export function clearRepositoryContextCache(repoUrl: string) {
  repositoryContextCache.delete(repoUrl);
  inFlightRepositoryRequests.delete(repoUrl);
}

