import { run, opencode } from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";

// Blank template: customize this to build your own orchestration.
// Run this with: npx tsx .sandcastle/main.mts
// Or add to package.json scripts: "sandcastle": "npx tsx .sandcastle/main.mts"

await run({
  agent: opencode("minimax/MiniMax-M2.7"),
  sandbox: docker(),
  promptFile: "./.sandcastle/prompt.md",
});
