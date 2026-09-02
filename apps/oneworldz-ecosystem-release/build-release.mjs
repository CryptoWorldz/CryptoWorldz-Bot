import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildStages, buildSteps } from "./build-stages.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));

function run(step) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [step.script], {
      cwd: root,
      env: { ...process.env, ...step.env },
      stdio: "inherit"
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${step.script} failed with ${signal || `exit ${code}`}`));
    });
  });
}

for (const stage of buildStages) {
  console.log(`BUILD_STAGE_START name=${stage.name} steps=${stage.steps.length}`);
  for (const step of stage.steps) await run(step);
  console.log(`BUILD_STAGE_PASS name=${stage.name}`);
}

console.log(`ECOSYSTEM_RELEASE_BUILD=PASS stages=${buildStages.length} steps=${buildSteps.length}`);
