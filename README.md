# Silicon Valid

Silicon Valid turns a public GitHub repository into structured context, then stages an evidence-based five-person technical roast.

## Local setup

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Create `.env.local` in the project root:

```bash
OPENAI_API_KEY=your_openai_api_key

# Optional: increases the public GitHub API rate limit.
GITHUB_TOKEN=your_github_token

# Optional: defaults to gpt-6.1-sol.
OPENAI_MODEL=gpt-6.1-sol
```

Secrets are read only by server-side route handlers and are never sent to the browser.

## API routes

- `POST /api/repository` accepts `{ "repoUrl": "https://github.com/owner/repo" }` and returns a normalized `RepositoryContext`.
- `POST /api/script` accepts `{ "repositoryContext": RepositoryContext }` and returns the structured cast, 18–28 conversation turns, Fish Audio-ready text, evidence, and final verdict.

## Checks

```bash
npm run lint
npm run build
```
