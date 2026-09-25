import fs from "node:fs";
import process from "node:process";

const file = process.argv[2] || process.env.MESHLY_INTEGRATION_RESULTS || ".meshly/integration-results.json";
if (!fs.existsSync(file)) {
  console.error(`Release readiness failed: missing ${file}. Copy docs/integration-results.template.json to ${file} and fill it after real production tests.`);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(fs.readFileSync(file, "utf8"));
} catch (error) {
  console.error(`Release readiness failed: invalid JSON in ${file}: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

if (data.project !== "Meshly") {
  console.error("Release readiness failed: integration results are not for Meshly");
  process.exit(1);
}
if (data.automatedPreflight?.status !== "pass") {
  console.error("Release readiness failed: automated production preflight is not marked pass");
  process.exit(1);
}
if (!Array.isArray(data.tests)) {
  console.error("Release readiness failed: tests must be an array");
  process.exit(1);
}

const required = data.tests.filter((test) => test?.required === true);
const failed = required.filter((test) => test.status !== "pass");
if (failed.length) {
  console.error(`Release readiness failed: ${failed.map((test) => `${test.id}=${test.status ?? "missing"}`).join(", ")}`);
  process.exit(1);
}

console.log(`Release readiness PASS: automated preflight + ${required.length} required credential-dependent tests are recorded as pass.`);
console.log("Before tagging, rerun pnpm verify and ensure the evidence corresponds to the exact commit being released.");
