import fs from "node:fs";

const requiredFiles = [
  "AGENTS.md",
  "HANDOFF.md",
  "NEXT_ACTION.md",
  "CHECKPOINT.md",
  "CONTINUE.md",
  ".meshly/project-state.json",
  ".meshly/current-task.json",
  ".meshly/resume-state.json",
  "docs/checkpoints/README.md",
];

const fail = (message) => {
  console.error(`Checkpoint validation failed: ${message}`);
  process.exit(1);
};

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) fail(`missing ${file}`);
}

const parseJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(`invalid ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const state = parseJson(".meshly/project-state.json");
const task = parseJson(".meshly/current-task.json");
const resume = parseJson(".meshly/resume-state.json");

for (const key of ["schemaVersion", "project", "repository", "branch", "phase", "status", "checkpointDate", "lastVerifiedRuntimeCommit"]) {
  if (state[key] === undefined || state[key] === null || state[key] === "") fail(`project-state missing ${key}`);
}
for (const key of ["requiredReads", "completed", "verifiedByCI", "pendingIntegration", "nextActions", "invariants"]) {
  if (!Array.isArray(state[key])) fail(`project-state ${key} must be an array`);
}
if (state.project !== "Meshly") fail("project-state project must be Meshly");
if (state.repository !== "cassielxyz/Meshly") fail("project-state repository mismatch");
if (state.branch !== "main") fail("project-state branch must be main");
if (state.nextActions.length === 0) fail("nextActions cannot be empty");

for (const key of ["schemaVersion", "project", "taskId", "title", "branch", "status", "checkpointDate", "lastVerifiedRuntimeCommit"]) {
  if (task[key] === undefined || task[key] === null || task[key] === "") fail(`current-task missing ${key}`);
}
for (const key of ["completedOnTask", "remaining", "blockers", "invariants"]) {
  if (!Array.isArray(task[key])) fail(`current-task ${key} must be an array`);
}
if (task.project !== "Meshly") fail("current-task project must be Meshly");
if (task.remaining.length === 0) fail("current-task remaining cannot be empty");

for (const key of ["schemaVersion", "project", "repository", "activeBranch", "resumeStatus", "lastStableCheckpoint", "lastVerifiedRuntimeCommit", "requiredReads", "resumeProcedure", "exactNextAction"]) {
  if (resume[key] === undefined || resume[key] === null || resume[key] === "") fail(`resume-state missing ${key}`);
}
if (!Array.isArray(resume.requiredReads) || !Array.isArray(resume.resumeProcedure)) fail("resume-state read/procedure fields must be arrays");
if (resume.project !== "Meshly" || resume.repository !== "cassielxyz/Meshly") fail("resume-state project/repository mismatch");
if (resume.activeBranch !== task.branch) fail("resume-state activeBranch must match current-task branch");

const checkpoint = fs.readFileSync("CHECKPOINT.md", "utf8");
for (const heading of ["## Completed in code", "## Verification already completed", "## NOT yet proven with real production credentials", "## Next actions — do these in order"]) {
  if (!checkpoint.includes(heading)) fail(`CHECKPOINT.md missing heading: ${heading}`);
}

const handoff = fs.readFileSync("HANDOFF.md", "utf8");
if (!handoff.includes("## Active task") || !handoff.includes("## Exact next action")) fail("HANDOFF.md missing active-task or next-action section");
const next = fs.readFileSync("NEXT_ACTION.md", "utf8");
if (!next.includes("## Do this next")) fail("NEXT_ACTION.md missing immediate action heading");

const combined = [
  checkpoint,
  handoff,
  next,
  fs.readFileSync("AGENTS.md", "utf8"),
  fs.readFileSync("CONTINUE.md", "utf8"),
  JSON.stringify(state),
  JSON.stringify(task),
  JSON.stringify(resume),
].join("\n");

if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(combined)) fail("private key material detected in checkpoint files");
if (/postgres(?:ql)?:\/\/[^\s:@]+:[^\s@]+@/i.test(combined)) fail("credential-bearing database URL detected in checkpoint files");

console.log(`Checkpoint OK: ${state.phase} · ${state.status} · active=${task.taskId}:${task.status} · ${state.nextActions.length} project action(s)`);
