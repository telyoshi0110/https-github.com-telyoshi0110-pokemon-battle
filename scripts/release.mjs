import { execSync } from "node:child_process";

function run(command, options = {}) {
  console.log(`\n> ${command}`);
  execSync(command, { stdio: "inherit", ...options });
}

function read(command) {
  return execSync(command, { encoding: "utf8" }).trim();
}

function nowStamp() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

function releaseMessage() {
  const custom = process.argv.slice(2).join(" ").trim();
  if (custom) return custom;
  return `chore: release ${nowStamp()}`;
}

function main() {
  const message = releaseMessage();

  run("npm run build");

  const status = read("git status --porcelain");
  if (status) {
    run("git add -A");
    run(`git commit -m "${message.replaceAll('"', '\\"')}"`);
  } else {
    console.log("\nNo local changes to commit.");
  }

  run("git push");
  run("npx vercel --prod --yes --no-wait");

  console.log("\nRelease flow completed.");
}

main();
