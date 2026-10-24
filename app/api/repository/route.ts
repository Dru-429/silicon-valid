import { getRepositoryContext, GitHubApiError } from "@/lib/github";

function parseRepositoryUrl(value: unknown) {
  if (typeof value !== "string") return null;

  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com") return null;

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length !== 2) return null;

    const owner = decodeURIComponent(parts[0]);
    const repository = decodeURIComponent(parts[1]).replace(/\.git$/i, "");
    if (!/^[a-z0-9_.-]+$/i.test(owner) || !/^[a-z0-9_.-]+$/i.test(repository)) return null;

    return { owner, repository };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const repoUrl =
      body && typeof body === "object" && "repoUrl" in body
        ? (body as { repoUrl: unknown }).repoUrl
        : undefined;
    const parsed = parseRepositoryUrl(repoUrl);

    if (!parsed) {
      return Response.json(
        { error: "Enter a valid repository URL in the form https://github.com/owner/repo." },
        { status: 400 },
      );
    }

    const context = await getRepositoryContext(parsed.owner, parsed.repository);
    return Response.json(context);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: "The request body must be valid JSON." }, { status: 400 });
    }
    if (error instanceof GitHubApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    console.error("Repository analysis failed:", error);
    return Response.json(
      { error: "The repository could not be analyzed right now. Please try again." },
      { status: 500 },
    );
  }
}
