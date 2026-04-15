# Claude Code Instructions

## Working Style
- Complete one file fully before moving to the next
- Commit after every file or component is complete with a descriptive message
- After each commit, briefly summarize what was done and what's next
- Never attempt to rewrite multiple large files in a single generation
- If a task spans 3+ files, create a step-by-step plan first and execute one step at a time

## Task Management
- Always maintain and update the todo list throughout the session
- Mark todos complete immediately after each commit
- If resuming a session, read todos first before doing anything else
- Prefer many small commits over one large commit at the end

## Code Generation
- Write complete, production-ready code — no placeholders or TODOs in output
- Follow existing patterns and conventions already in the codebase
- When connecting to Supabase, always follow the existing client setup pattern in the repo
- Don't refactor unrelated code while implementing a feature

## On Errors
- If a build or type error occurs, fix it before moving to the next file
- Don't stack unresolved errors across multiple files

## Session Efficiency
- Avoid large sweeping rewrites — prefer targeted, surgical changes
- If a single file exceeds ~300 lines of new code, split the work into logical sections and commit each
