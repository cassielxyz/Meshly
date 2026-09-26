# Resume Meshly after chat/context loss

Use this exact prompt in a new ChatGPT/agent session:

> Continue `cassielxyz/Meshly` from repository state. First read `AGENTS.md`, `HANDOFF.md`, `NEXT_ACTION.md`, `CHECKPOINT.md`, `.meshly/project-state.json`, `.meshly/current-task.json`, `.meshly/resume-state.json`, and the newest file in `docs/checkpoints/`. Then inspect current `main`, the active branch/PR named by the handoff, commits and CI newer than the recorded checkpoint. Repository state wins when newer. Continue only the first unfinished action, do not restart completed work, preserve the storage/security invariants, and after each substantial verified milestone update every checkpoint layer before finishing.

That is enough. The agent should recover both verified progress and in-flight work from GitHub instead of asking you to reconstruct the previous chat.
