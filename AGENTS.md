<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- AI features (assistant, listing writer, smart search, listing guard) live in `src/lib/ai.functions.ts` as authenticated server functions using `@lovable.dev/ai-gateway`; keep prompts and model calls server-side only.
- Keep browsing click handlers ungated; the Sell form prompts signed-out visitors on submission, while private features retain their existing auth checks to protect user data.
- Site content uses a singleton settings row with database-enforced editor authorization; branding lives in private storage with public read only for referenced assets, so visitors see published images but only the designated verified owner can edit.
- Branding image controls stage replacement/removal in the editor until Save changes; reset file inputs after selection so choosing the same file triggers another upload.
