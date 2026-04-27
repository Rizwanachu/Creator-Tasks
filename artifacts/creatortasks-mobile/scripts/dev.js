/**
 * Dev server wrapper for Expo on Replit.
 *
 * 1. Kills any stale process on PORT and METRO_PORT
 * 2. Starts a simple HTTP health-check server on PORT (returns 200 immediately)
 * 3. Launches Metro bundler on METRO_PORT
 *
 * This ensures Replit's health check can verify the workflow is running,
 * while Metro serves the native app via the Expo dev domain (QR code).
 */

const http = require("http");
const { spawn, exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const PORT = parseInt(process.env.PORT || "20296", 10);
const METRO_PORT = 8085;
console.log(`[dev] ENV PORT="${process.env.PORT}" → using PORT=${PORT}`);
const REPLIT_DEV_DOMAIN = process.env.REPLIT_DEV_DOMAIN || "localhost";
const REPLIT_EXPO_DEV_DOMAIN = process.env.REPLIT_EXPO_DEV_DOMAIN || "";
const REPL_ID = process.env.REPL_ID || "";

const projectRoot = path.resolve(__dirname, "..");

function getAppName() {
  try {
    const appJson = JSON.parse(
      fs.readFileSync(path.join(projectRoot, "app.json"), "utf-8")
    );
    return appJson.expo?.name || "CreatorTasks Mobile";
  } catch {
    return "CreatorTasks Mobile";
  }
}

const APP_NAME = getAppName();
const EXPO_URL = REPLIT_EXPO_DEV_DOMAIN
  ? `exp://${REPLIT_EXPO_DEV_DOMAIN}`
  : `exp://localhost:${METRO_PORT}`;

const LANDING_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${APP_NAME}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0a0a0f;
      color: #e4e4f0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 20px;
      text-align: center;
    }
    .logo {
      width: 80px; height: 80px;
      background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
      border-radius: 22px;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 24px;
      font-size: 36px;
    }
    h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
    .subtitle { font-size: 15px; color: #71717a; margin-bottom: 40px; }
    .card {
      background: #18181b; border: 1px solid #27272a; border-radius: 20px;
      padding: 32px; max-width: 440px; width: 100%; margin-bottom: 24px;
    }
    .card h2 { font-size: 17px; font-weight: 600; margin-bottom: 8px; }
    .card p { font-size: 14px; color: #71717a; margin-bottom: 20px; line-height: 1.6; }
    .steps { list-style: none; text-align: left; }
    .steps li {
      display: flex; align-items: flex-start; gap: 14px;
      margin-bottom: 16px; font-size: 14px; color: #a1a1aa;
    }
    .step-num {
      width: 28px; height: 28px; border-radius: 50%;
      background: rgba(168,85,247,0.15); border: 1px solid rgba(168,85,247,0.3);
      color: #a855f7; font-size: 12px; font-weight: 700;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .url-box {
      background: #09090b; border: 1px solid #27272a; border-radius: 12px;
      padding: 12px 16px; font-family: monospace; font-size: 13px;
      color: #a855f7; word-break: break-all; margin-top: 8px;
    }
    .badge {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.2);
      color: #22c55e; font-size: 12px; font-weight: 600;
      padding: 4px 12px; border-radius: 100px; margin-bottom: 32px;
    }
    .dot { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  </style>
</head>
<body>
  <div class="logo">🎬</div>
  <h1>${APP_NAME}</h1>
  <p class="subtitle">AI Content Job Board · Mobile App</p>
  <div class="badge"><span class="dot"></span> Metro Bundler Running</div>
  <div class="card">
    <h2>Open on Your Phone</h2>
    <p>Download <strong>Expo Go</strong> from the App Store or Google Play, then scan the QR code shown in the Replit console.</p>
    <ol class="steps">
      <li><div class="step-num">1</div><span>Download <strong>Expo Go</strong> from App Store / Google Play</span></li>
      <li><div class="step-num">2</div><span>Scan the QR code in the Replit Workflows console</span></li>
      <li><div class="step-num">3</div><span>Or paste this URL into Expo Go:</span></li>
    </ol>
    <div class="url-box">${EXPO_URL}</div>
  </div>
  <div class="card">
    <h2>Web Version</h2>
    <p>Browse tasks and manage your account on the <strong>CreatorTasks</strong> web app in the preview above.</p>
  </div>
</body>
</html>`;

function killPort(port) {
  return new Promise((resolve) => {
    try {
      const hexPort = port.toString(16).toUpperCase().padStart(4, "0");
      const procFiles = ["/proc/net/tcp", "/proc/net/tcp6"];
      const pids = new Set();

      for (const procFile of procFiles) {
        if (!fs.existsSync(procFile)) continue;
        const lines = fs.readFileSync(procFile, "utf-8").split("\n").slice(1);
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (!parts[1]) continue;
          const localAddr = parts[1];
          const localPort = localAddr.split(":")[1];
          if (localPort === hexPort) {
            const inode = parts[9];
            if (inode && inode !== "0") {
              const fds = fs.readdirSync("/proc").filter((p) => /^\d+$/.test(p));
              for (const pid of fds) {
                try {
                  const socketPath = `/proc/${pid}/fd`;
                  if (!fs.existsSync(socketPath)) continue;
                  const fdLinks = fs.readdirSync(socketPath);
                  for (const fd of fdLinks) {
                    try {
                      const link = fs.readlinkSync(`${socketPath}/${fd}`);
                      if (link.includes(`socket:[${inode}]`)) {
                        pids.add(parseInt(pid, 10));
                      }
                    } catch {}
                  }
                } catch {}
              }
            }
          }
        }
      }

      for (const pid of pids) {
        if (pid !== process.pid) {
          try {
            process.kill(pid, "SIGKILL");
            console.log(`[dev] Killed PID ${pid} holding port ${port}`);
          } catch {}
        }
      }
    } catch (e) {
      console.warn(`[dev] killPort warning: ${e.message}`);
    }
    setTimeout(resolve, 500);
  });
}

let metroProcess = null;

async function startMetro() {
  console.log(`[dev] Clearing Metro port ${METRO_PORT}...`);
  await killPort(METRO_PORT);
  console.log("[dev] Starting Metro bundler...");

  const env = {
    ...process.env,
    EXPO_PACKAGER_PROXY_URL: `https://${REPLIT_EXPO_DEV_DOMAIN}`,
    EXPO_PUBLIC_DOMAIN: REPLIT_DEV_DOMAIN,
    EXPO_PUBLIC_REPL_ID: REPL_ID,
    REACT_NATIVE_PACKAGER_HOSTNAME: REPLIT_DEV_DOMAIN,
  };

  metroProcess = spawn(
    "pnpm",
    ["exec", "expo", "start", "--localhost", "--port", String(METRO_PORT)],
    { cwd: projectRoot, env, stdio: "inherit" }
  );

  metroProcess.on("error", (err) => {
    console.error("[Metro] Failed to start:", err.message);
  });

  metroProcess.on("exit", (code) => {
    console.log(`[Metro] Exited with code ${code}`);
  });
}

async function main() {
  console.log(`[dev] Clearing health-check port ${PORT}...`);
  await killPort(PORT);

  const server = http.createServer((req, res) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(LANDING_HTML);
  });

  server.on("error", (err) => {
    console.error(`[dev] Server error: ${err.message}`);
    process.exit(1);
  });

  await new Promise((resolve) => {
    server.listen(PORT, "0.0.0.0", resolve);
  });
  console.log(`[dev] Health check server ready on port ${PORT}`);

  startMetro();

  const shutdown = () => {
    console.log("[dev] Shutting down...");
    if (metroProcess) metroProcess.kill("SIGTERM");
    server.close();
    setTimeout(() => process.exit(0), 2000);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("[dev] Fatal:", err.message);
  process.exit(1);
});
