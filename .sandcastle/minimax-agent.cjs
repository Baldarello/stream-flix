"use strict";
const { OpenAI } = require("openai");
const { spawn } = require("child_process");
const apiKey = process.env.MINIMAX_API_KEY;
const baseURL = process.env.MINIMAX_BASE_URL || "https://api.minimax.io/v1";
const model = process.env.MODEL || "MiniMax-Text-01";
if (!apiKey) { console.error("MINIMAX_API_KEY not set"); process.exit(1); }
const client = new OpenAI({ apiKey, baseURL });
function runCommand(cmd) {
  return new Promise((resolve) => {
    const isWindows = process.platform === "win32";
    const shell = isWindows ? "cmd.exe" : "/bin/bash";
    const shellArgs = isWindows ? ["/c", cmd] : ["-c", cmd];
    let stdout = "", stderr = "";
    const child = spawn(shell, shellArgs, { cwd: process.cwd(), timeout: 30000, env: { ...process.env, TERM: "xterm-256color" } });
    child.stdout.on("data", d => stdout += d);
    child.stderr.on("data", d => stderr += d);
    child.on("close", code => resolve({ stdout: stdout.slice(0,10000), stderr: stderr.slice(0,3000), code }));
    child.on("error", err => resolve({ stdout: "", stderr: err.message, code: 1 }));
  });
}
function extractCommands(text) {
  const commands = [];
  // Remove markdown code blocks (fenced) and process content
  const codeBlockPattern = /```(?:\w+)?\n?([\s\S]*?)```/g;
  let match;
  while ((match = codeBlockPattern.exec(text)) !== null) {
    const block = match[1];
    // Look for $ command lines in the block
    const lines = block.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      // Match $ bash -c "...", $ sh -c '...', $ "command", bare $ command
      const dollarMatch = trimmed.match(/^\$ (?:bash -c |sh -c |)?(.*)/);
      if (dollarMatch) {
        let cmd = dollarMatch[1].trim();
        if (cmd && !cmd.includes("COMPLETE") && cmd.length > 2 && cmd.length < 500) {
          // Remove surrounding quotes
          if ((cmd.startsWith("\"") && cmd.endsWith("\"")) || (cmd.startsWith("'") && cmd.endsWith("'"))) {
            cmd = cmd.slice(1, -1);
          }
          if (cmd.startsWith("bash -c ")) cmd = cmd.slice(8);
          if (cmd.startsWith("sh -c ")) cmd = cmd.slice(6);
          if ((cmd.startsWith("\"") && cmd.endsWith("\"")) || (cmd.startsWith("'") && cmd.endsWith("'"))) {
            cmd = cmd.slice(1, -1);
          }
          if (cmd && cmd.length > 2 && cmd.length < 500 && !cmd.includes("COMPLETE")) {
            commands.push(cmd);
          }
        }
      }
    }
  }
  // Also check inline backtick commands
  const inlinePattern = /`\$ (.*?)`/g;
  while ((match = inlinePattern.exec(text)) !== null) {
    let cmd = match[1].trim();
    if (cmd.startsWith("bash -c ")) cmd = cmd.slice(8);
    if (cmd.startsWith("sh -c ")) cmd = cmd.slice(6);
    if ((cmd.startsWith("\"") && cmd.endsWith("\"")) || (cmd.startsWith("'") && cmd.endsWith("'"))) {
      cmd = cmd.slice(1, -1);
    }
    if (cmd && cmd.length > 2 && cmd.length < 500 && !cmd.includes("COMPLETE")) {
      commands.push(cmd);
    }
  }
  return commands;
}
async function chat(prompt, systemExtra) {
  const sys = systemExtra || "You are a coding agent. You MUST use shell commands to make changes." +
    " Commands are executed automatically. Use: \n" +
    "  $ bash -c \"cat frontend/store/libraryStore.js\"  (read file)\n" +
    "  $ bash -c \"grep pattern file\"  (search)\n" +
    "  $ bash -c \"echo text > file\"  (write file, OVERWRITES)\n" +
    "  $ bash -c \"git add . && git commit -m msg\"  (commit)\n" +
    " IMPORTANT: Use > to OVERWRITE files, NOT >> to append.\n" +
    " After making changes, commit and output <promise>COMPLETE</promise>\n" +
    " Working dir: " + process.cwd();
  const messages = [{ role: "system", content: sys }, { role: "user", content: prompt }];
  const stream = await client.chat.completions.create({ model, messages, stream: true, max_tokens: 4096 });
  let response = "";
  for await (const event of stream) {
    if (event.choices?.[0]?.delta?.content) response += event.choices[0].delta.content;
  }
  return response;
}
async function main() {
  let prompt = "";
  process.stdin.on("data", d => prompt += d);
  process.stdin.on("end", async () => {
    try {
      let done = false, iteration = 0;
      const maxIterations = 20;
      let currentPrompt = prompt;
      while (!done && iteration < maxIterations) {
        iteration++;
        process.stderr.write("[ITERATION " + iteration + "]\\n");
        const response = await chat(currentPrompt);
        process.stderr.write("[RESPONSE LEN: " + response.length + "]\\n");
        // Extract commands
        const cmds = extractCommands(response);
        let commandOutput = "";
        if (cmds.length > 0) {
          for (const cmd of cmds) {
            process.stderr.write("[CMD] " + cmd.slice(0, 200) + "\\n");
            const result = await runCommand(cmd);
            commandOutput += "\\n--- Shell: " + cmd.slice(0, 100) + " ---\\n";
            commandOutput += result.stdout || "(no stdout)";
            if (result.stderr) commandOutput += "\\nERR: " + result.stderr;
            commandOutput += "\\n[exit:" + result.code + "]\\n";
          }
        } else {
          process.stderr.write("[NO CMDS FOUND in response]\\n");
        }
        // Send response to sandcastle
        let outMsg = response;
        if (commandOutput) outMsg += "\\n" + commandOutput;
        process.stdout.write(JSON.stringify({ type: "text", message: outMsg }) + "\n");
        if (response.includes("COMPLETE")) { done = true; break; }
        if (iteration >= maxIterations) { process.stderr.write("[MAX ITER reached]\\n"); break; }
        // Continue conversation with results
        currentPrompt = prompt + "\n\n--- Agent iteration " + iteration + " ---\n" + response.substring(Math.max(0, response.length - 1500)) + "\n\n--- Shell results ---\n" + commandOutput.substring(Math.max(0, commandOutput.length - 3000)) + "\n\nContinue making changes. Output <promise>COMPLETE</promise> when committed.";
      }
      process.stdout.write("<promise>COMPLETE</promise>\\n");
    } catch (err) {
      console.error("Error: " + err.message);
      process.exit(1);
    }
  });
}
main();