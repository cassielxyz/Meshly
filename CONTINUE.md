# Resume Meshly after chat/context loss

Use this exact prompt in a new ChatGPT/agent session:

> Continue `cassielxyz/Meshly` from the repository state. First read `AGENTS.md`, `CHECKPOINT.md`, `.meshly/project-state.json`, and the newest file in `docs/checkpoints/`. Then inspect commits and CI newer than the recorded checkpoint, reconcile newer work, and continue only the unfinished ordered `Next actions`. Do not restart or overwrite completed work. After each substantial verified milestone, update the checkpoint files before finishing.

That is enough. The agent should recover project context from GitHub instead of asking you to reconstruct the previous chat.
