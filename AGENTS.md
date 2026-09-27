# Instructions for contributors and coding agents

## Project

Cat Profiler is a French, dependency-free web app for inspecting HAR files. It finds response headers named `x-cat-profiler` case-insensitively, decodes their Base64 gzip content as UTF-8, parses the profiler steps, and lets users explore, search, sort, and rank them. All HAR processing happens locally in the browser. Never add captured HAR files or their contents to Git.

## Setup and checks

- Serve locally with `python3 -m http.server 3000`, then open http://localhost:3000.
- Run automated checks with `node --test` (Node.js 18+).
- Keep browser supplied values as text (`textContent`); do not execute or fetch URLs from an imported HAR.
- For JavaScript or CSS changes, run `python3 scripts/version-assets.py` before publishing. It adds content hashes to the resource URLs in `index.html` and to local JavaScript imports so browsers do not mix cached files from different releases.
- Run the tests and `git diff --check` before committing. For interface changes, also try the example, a HAR import, search, sort, the profiler tree, and Top 10 links where relevant.

## Behavior to preserve

- Match the exact response-header name `x-cat-profiler`, ignoring case. Do not match request headers.
- Keep duplicate header values and profiler steps as separate occurrences.
- Profiler lines use paired leading equals signs for depth (`==`, `====`, `======`); the trailing ` == <duration>ms` separates the name and inclusive duration. Preserve source order, skipped levels, and original durations; never add child times to parent times.
- The global Top 10 scans all decoded profiler headers regardless of the table search. Each result must retain its HAR request, header index, and source line so its link opens and highlights the exact step.
- Keep the app static, dependency-free, and usable from a repository subpath.

## GitHub and Pages

- `main` is the source and documentation branch. The repository is `farnulfo/x-cat-profiler` and the public site is https://farnulfo.github.io/x-cat-profiler/.
- GitHub Pages publishes the root of `gh-pages`. Keep this branch limited to the static app assets (`index.html`, `styles.css`, and the JavaScript modules needed by the page) plus `.nojekyll`; do not put HAR captures there.
- When changing the app, version its resources, commit the source and docs to `main`, and update the matching app files on `gh-pages`. Verify the GitHub Pages Actions run succeeds and that the published `index.html` references the new hashed assets before reporting deployment complete.
- The Pages site is public, even when repository access settings change. Never place secrets, credentials, private HAR data, or user-specific traces in the published tree.

## Documentation

Keep `README.md` focused on use and setup, `CONTRIBUTING.md` on contributor checks, and `docs/architecture.md` on implementation details. Update the relevant docs and checks when behavior changes.
