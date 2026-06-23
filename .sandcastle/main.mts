import { run } from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import { writeFileSync } from "fs";
import { join } from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const scriptPath = join(process.cwd(), ".sandcastle", "minimax-agent.cjs");
const scriptContent = `
"use strict";
const { OpenAI } = require("openai");
const apiKey = process.env.MINIMAX_API_KEY;
const baseURL = process.env.MINIMAX_BASE_URL || "https://api.minimax.io/v1";
const model = process.env.MODEL || "MiniMax-Text-01";
if (!apiKey) {
  console.error("MINIMAX_API_KEY not set");
  process.exit(1);
}
const client = new OpenAI({ apiKey, baseURL });
let prompt = "";
process.stdin.on("data", d => prompt += d);
process.stdin.on("end", async () => {
  try {
    const stream = await client.chat.completions.create({
      model, messages: [{ role: "user", content: prompt }], stream: true,
    });
    let done = false;
    for await (const event of stream) {
      if (event.choices?.[0]?.delta?.content) {
        const text = event.choices[0].delta.content;
        process.stdout.write(JSON.stringify({ type: "text", message: text }));
        process.stdout.write("\\n");
        done = true;
      }
    }
    if (!done) process.stdout.write(JSON.stringify({ type: "text", message: "(no response)" }) + "\\n");
    process.stdout.write("<promise>COMPLETE</promise>\\n");
  } catch (err) {
    console.error("Error: " + err.message);
    process.exit(1);
  }
});
`;
writeFileSync(scriptPath, scriptContent);

const minimax = () => ({
  name: "minimax",
  env: { NODE_PATH: "/usr/local/lib/node_modules" },
  captureSessions: false,
  buildPrintCommand({ prompt }) {
    return { command: "node .sandcastle/minimax-agent.cjs", stdin: prompt };
  },
  parseStreamLine(line) {
    try {
      const p = JSON.parse(line);
      if (p.type === "text") return [{ type: "text", text: p.message }];
      return [];
    } catch {
      return line.trim() ? [{ type: "text", text: line }] : [];
    }
  },
});

await run({
  agent: minimax(),
  sandbox: docker(),
  promptFile: "./.sandcastle/prompt.md",
});
