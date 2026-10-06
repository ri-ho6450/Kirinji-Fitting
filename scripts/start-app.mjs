import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
const url = "http://localhost:3000";
const healthPath = "/__kirinji_launcher_health";
const rootId = createHash("sha256")
  .update(process.platform === "win32" ? root.toLowerCase() : root)
  .digest("hex");
const log = (message) => console.log(`[Kirinji] ${message}`);
const portError =
  "Port 3000 is in use by another server. Stop it and run Start-Kirinji.bat again. The port is kept fixed to preserve browser data.";
function portOccupied() {
  return new Promise((resolveOccupied) => {
    const socket = createConnection({ host: "127.0.0.1", port: 3000 });
    const finish = (occupied) => {
      socket.destroy();
      resolveOccupied(occupied);
    };
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.setTimeout(1500, () => finish(true));
  });
}

function runNpmInstall() {
  return new Promise((resolveInstall, reject) => {
    const child =
      process.platform === "win32"
        ? spawn(
            process.env.ComSpec || "cmd.exe",
            ["/d", "/s", "/c", "npm ci --ignore-scripts"],
            { cwd: root, stdio: "inherit" },
          )
        : spawn("npm", ["ci", "--ignore-scripts"], {
            cwd: root,
            stdio: "inherit",
          });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolveInstall()
        : reject(
            new Error(
              `Dependency installation failed (exit ${code}). Check Internet access and retry.`,
            ),
          ),
    );
  });
}
function openBrowser() {
  log(`Open: ${url}`);
  if (process.argv.includes("--no-browser")) return;
  const command =
    process.platform === "win32"
      ? "rundll32.exe"
      : process.platform === "darwin"
        ? "open"
        : "xdg-open";
  const args =
    process.platform === "win32" ? ["url.dll,FileProtocolHandler", url] : [url];
  const child = spawn(command, args, { detached: true, stdio: "ignore" });
  child.on("error", () =>
    log(
      "Could not open your browser automatically. Open the address above manually.",
    ),
  );
  child.on("exit", (code) => {
    if (code)
      log(
        "Could not open your browser automatically. Open the address above manually.",
      );
  });
  child.unref();
}
async function sameAppRunning() {
  try {
    const response = await fetch(url + healthPath, {
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return false;
    const info = await response.json();
    return (
      info.app === "kirinji-v2" && info.rootId === rootId && info.ready === true
    );
  } catch {
    return false;
  }
}
async function main() {
  if (Number(process.versions.node.split(".")[0]) < 24)
    throw new Error(
      "Install Node.js 24 LTS or newer, then run Start-Kirinji.bat again.",
    );
  if (await sameAppRunning()) {
    log("The app is already running. Opening its page.");
    openBrowser();
    return;
  }
  if (await portOccupied()) throw new Error(portError);
  const lock = await readFile(resolve(root, "package-lock.json"));
  const fingerprint = createHash("sha256")
    .update(lock)
    .update(`${process.platform}:${process.arch}:${process.versions.node}`)
    .digest("hex");
  const stamp = resolve(root, "node_modules/.kirinji-install-stamp");
  let installed = false;
  try {
    installed = (await readFile(stamp, "utf8")) === fingerprint;
    await readFile(resolve(root, "node_modules/vite/package.json"));
  } catch {
    installed = false;
  }
  if (!installed) {
    log("First launch or dependency update: installing packages. Please wait.");
    await runNpmInstall();
    await writeFile(stamp, fingerprint);
  }
  const { createServer } = await import("vite");
  const server = await createServer({
    root,
    server: { host: "127.0.0.1", port: 3000, strictPort: true },
    plugins: [
      {
        name: "kirinji-launcher-health",
        configureServer(vite) {
          vite.middlewares.use((req, res, next) => {
            if (req.url !== healthPath) return next();
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Cache-Control", "no-store");
            res.end(JSON.stringify({ app: "kirinji-v2", rootId, ready: true }));
          });
        },
      },
    ],
  });
  try {
    await server.listen();
  } catch (error) {
    await server.close();
    if (String(error).includes("already in use")) throw new Error(portError);
    throw error;
  }
  if (!(await sameAppRunning())) {
    await server.close();
    throw new Error("Server readiness check failed.");
  }
  log(
    "App ready. Keep this window open while using the app. Press Ctrl+C to stop.",
  );
  openBrowser();
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    log("Stopping the app...");
    await server.close();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
main().catch((error) => {
  console.error(`[Kirinji] ${error.message}`);
  process.exitCode = 1;
});
