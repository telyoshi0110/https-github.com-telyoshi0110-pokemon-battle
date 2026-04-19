# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Release Shortcut

- Default:
  - `npm run release`
- With custom commit message:
  - `npm run release -- "feat: adjust mobile layout"`

This command runs:
1. `npm run build`
2. `git add -A` + `git commit` (if there are changes)
3. `git push`
4. `npx vercel --prod --yes --no-wait`
