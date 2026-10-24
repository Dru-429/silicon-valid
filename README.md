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

# Required to render the five-speaker Drama 3 performance.
FISH_AUDIO_API_KEY=your_fish_audio_api_key

# Optional: increases the public GitHub API rate limit.
GITHUB_TOKEN=your_github_token

# Optional: defaults to gpt-6.1-sol.
OPENAI_MODEL=gpt-6.1-sol

# Optional: replace the public demo voices with IDs from your Fish Audio library.
FISH_VOICE_DINESH=your_voice_model_id
FISH_VOICE_GILFOYLE=your_voice_model_id
FISH_VOICE_RICHARD=your_voice_model_id
FISH_VOICE_JARED=your_voice_model_id
FISH_VOICE_ERLICH=your_voice_model_id
```

Secrets are read only by server-side route handlers and are never sent to the browser.

## API routes

- `POST /api/repository` accepts `{ "repoUrl": "https://github.com/owner/repo" }` and returns a normalized `RepositoryContext`.
- `POST /api/script` accepts `{ "repositoryContext": RepositoryContext }` and returns the structured cast, 18–28 conversation turns, Fish Audio-ready text, evidence, and final verdict.
- `POST /api/audio` accepts the generated speaker turns, sends one multi-speaker request to Fish Audio Drama 3, and streams the resulting MP3 back to the stage player.

The five Fish voice overrides are optional. Without them, the app uses public demo voice IDs published in Fish Audio's own API examples. These are distinct panel voices, not imitations of the actors who portrayed the fictional characters.

## Checks

```bash
npm run lint
npm run build
```
