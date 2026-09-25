import fs from "node:fs";

const requiredFiles = [
  "AGENTS.md",
  "CHECKPOINT.md",
  "CONTINUE.md",
  ".meshly/project-state.json",
  "docs/checkpoints/README.md",
];

const fail = (message) => {
  console.error(`Checkpoint validation failed: ${message}`);
  process.exit(1);
};

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) fail(`missing ${file}`);
}

let state;
try {
  state = JSON.parse(fs.readFileSync(".meshly/project-state.json", "utf8"));
} catch (error) {
  fail(`invalid .meshly/project-state.json: ${error instanceof Error ? error.message : String(error)}`);
}

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

const checkpoint = fs.readFileSync("CHECKPOINT.md", "utf8");
for (const heading of ["## Completed in code", "## Verification already completed", "## NOT yet proven with real production credentials", "## Next actions — do these in order"]) {
  if (!checkpoint.includes(heading)) fail(`CHECKPOINT.md missing heading: ${heading}`);
}

const combined = [
  checkpoint,
  fs.readFileSync("AGENTS.md", "utf8"),
  fs.readFileSync("CONTINUE.md", "utf8"),
  JSON.stringify(state),
].join("\n");

if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(combined)) fail("private key material detected in checkpoint files");
if (/postgres(?:ql)?:\/\/[^\s:@]+:[^\s@]+@/i.test(combined)) fail("credential-bearing database URL detected in checkpoint files");

console.log(`Checkpoint OK: ${state.phase} · ${state.status} · ${state.nextActions.length} next action(s)`);
