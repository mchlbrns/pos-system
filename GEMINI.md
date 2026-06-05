# Project Instructions (GEMINI.md)

Welcome, AI Agent. This file contains the foundational mandates and workflows for this repository. Adhere to these strictly.

## 🚀 Git & Source Control Mandates

The project owner requires all changes to be proactively committed and pushed.

1.  **Commit Frequency:** Commit your changes immediately after completing a functional sub-task or fixing a bug. Do not wait for the end of the session to stage changes.
2.  **Commit Style:** Use [Conventional Commits](https://www.conventionalcommits.org/).
    *   `feat:` for new features.
    *   `fix:` for bug fixes.
    *   `docs:` for documentation changes.
    *   `refactor:` for code changes that neither fix a bug nor add a feature.
    *   `chore:` for routine tasks, dependency updates, etc.
3.  **Content:** Include a concise summary of "why" the change was made, not just "what" changed.
4.  **Pushing:** After a successful commit, you are authorized to push to the remote branch (`origin/main` or the current active branch).
5.  **Validation:** Never commit code that breaks the build or fails existing tests. Always run `npm run lint` (or equivalent) if available before committing.

## 📈 Progress Tracking

1.  **PROGRESS.md:** This is our source of truth for project status. 
2.  **Update Requirement:** Every time you complete a task mentioned in `PROGRESS.md`, you MUST update the checklist in that file before committing your code.

## 🛠 Tech Stack & Architecture

*   **Backend:** Node.js + Express + SQLite (`better-sqlite3`).
*   **Frontend:** React (TypeScript/JSX) + Vite.
*   **Plugin System:** JSON-defined business logic in `backend/plugins/`.
*   **Database:** `backend/data/pos.db` using WAL mode.
*   **Printer:** Custom abstraction layer in `printer-drivers/` and `backend/utils/printerQueue.js`.

## 🏗 Coding Standards

*   **UI/UX:** Focus on "mobile-first" touch-optimized interfaces. Use large, touch-friendly buttons.
*   **Error Handling:** Use the global error handler in `backend/app.js`. Log errors to `backend/logs/error.log`.
*   **Plugin Safety:** When adding features that depend on business type, check `business.type` and use `pluginHelper.js`.
