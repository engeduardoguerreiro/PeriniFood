const { app, BrowserWindow, Menu, shell } = require("electron");
const { spawn } = require("node:child_process");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const APP_URL = process.env.PERINIFOOD_APP_URL || "https://gastroflow-seven.vercel.app";
const START_URL = new URL("/login", APP_URL).toString();
const APP_ORIGIN = new URL(APP_URL).origin;
const PRINT_AGENT_URL = "http://127.0.0.1:4127/health";
let printAgentStarting = false;

function printAgentPaths() {
  if (app.isPackaged) {
    const agentDir = path.join(process.resourcesPath, "print-agent");
    return {
      node: path.join(agentDir, "node.exe"),
      bridge: path.join(agentDir, "perinifood-print-bridge.js"),
    };
  }

  return {
    node: path.join(__dirname, "runtime", "node.exe"),
    bridge: path.join(__dirname, "..", "scripts", "perinifood-print-bridge.js"),
  };
}

function isPrintAgentOnline(timeoutMs = 1500) {
  return new Promise((resolve) => {
    const request = http.get(PRINT_AGENT_URL, { timeout: timeoutMs }, (response) => {
      response.resume();
      resolve(response.statusCode === 200);
    });
    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
    request.on("error", () => resolve(false));
  });
}

async function ensurePrintAgent() {
  if (printAgentStarting || (await isPrintAgentOnline())) return;
  printAgentStarting = true;

  try {
    const agent = printAgentPaths();
    if (!fs.existsSync(agent.node) || !fs.existsSync(agent.bridge)) return;

    const child = spawn(agent.node, [agent.bridge], {
      detached: true,
      windowsHide: true,
      stdio: "ignore",
      env: { ...process.env, PRINT_BRIDGE_PORT: "4127" },
    });
    child.unref();
  } catch {
    // O painel continuará mostrando o agente como indisponível e poderá tentar novamente.
  } finally {
    printAgentStarting = false;
  }
}

function offlinePage() {
  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>PeriniFood sem conexão</title>
    <style>
      :root { color-scheme: dark; font-family: Arial, sans-serif; }
      body { min-height: 100vh; margin: 0; display: grid; place-items: center; background: #0b1110; color: #f4f7f5; }
      main { width: min(430px, calc(100% - 48px)); text-align: center; }
      img { width: 92px; height: 92px; object-fit: contain; margin-bottom: 24px; }
      h1 { font-size: 26px; margin: 0 0 12px; }
      p { color: #aeb9b4; line-height: 1.55; margin: 0 0 24px; }
      button { border: 0; border-radius: 10px; padding: 12px 20px; background: #31c48d; color: #06130e; font-size: 15px; font-weight: 700; cursor: pointer; }
    </style>
  </head>
  <body>
    <main>
      <h1>Sem conexão com o PeriniFood</h1>
      <p>Verifique sua internet e tente novamente. Seus dados continuam seguros no sistema online.</p>
      <button onclick="location.href='${START_URL}'">Tentar novamente</button>
    </main>
  </body>
</html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

function isInternalUrl(targetUrl) {
  try {
    return new URL(targetUrl).origin === APP_ORIGIN;
  } catch {
    return false;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    backgroundColor: "#0b1110",
    icon: path.join(__dirname, "assets", "perinifood.ico"),
    autoHideMenuBar: true,
    title: "PeriniFood",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      partition: "persist:perinifood",
    },
  });

  win.once("ready-to-show", () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isInternalUrl(url)) {
      win.loadURL(url);
    } else if (url.startsWith("https://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    if (!isInternalUrl(url)) {
      event.preventDefault();
      if (url.startsWith("https://")) shell.openExternal(url);
    }
  });

  win.webContents.on("did-fail-load", (_event, errorCode, _description, validatedUrl, isMainFrame) => {
    if (isMainFrame && errorCode !== -3 && !validatedUrl.startsWith("data:")) {
      win.loadURL(offlinePage());
    }
  });

  win.loadURL(START_URL);
}

const menu = Menu.buildFromTemplate([
  {
    label: "Aplicativo",
    submenu: [
      { label: "Recarregar", accelerator: "F5", role: "reload" },
      { type: "separator" },
      { label: "Sair", accelerator: "Alt+F4", role: "quit" },
    ],
  },
  {
    label: "Navegação",
    submenu: [
      { label: "Voltar", accelerator: "Alt+Left", click: (_item, win) => win?.webContents.goBack() },
      { label: "Avançar", accelerator: "Alt+Right", click: (_item, win) => win?.webContents.goForward() },
    ],
  },
]);

app.whenReady().then(async () => {
  Menu.setApplicationMenu(menu);
  app.setAppUserModelId("com.perinifood.desktop");
  await ensurePrintAgent();
  const printAgentMonitor = setInterval(() => void ensurePrintAgent(), 30000);
  printAgentMonitor.unref();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
