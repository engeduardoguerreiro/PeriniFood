// PeriniFood Gestor — app desktop (Linux e Windows) do Gestor de Pedidos.
// Abre /gestor do site numa janela própria e acrescenta o que o navegador não faz
// bem: continua tocando e consultando minimizado (bandeja), notificação nativa,
// janela piscando com a contagem de pedidos, som sem precisar clicar antes e
// iniciar junto com o computador.
const { app, BrowserWindow, Menu, Notification, Tray, ipcMain, nativeImage, powerSaveBlocker, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const APP_URL = (process.env.PERINIFOOD_APP_URL || "https://perinifood.com.br").replace(/\/$/, "");
const APP_ORIGIN = new URL(APP_URL).origin;
const START_URL = `${APP_URL}/gestor`;
const ICON = path.join(__dirname, "assets", process.platform === "win32" ? "icon.ico" : "icon.png");
const TRAY_ICON = path.join(__dirname, "assets", "tray.png");
const TRAY_ALERT_ICON = path.join(__dirname, "assets", "tray-alert.png");
const SETTINGS_FILE = () => path.join(app.getPath("userData"), "settings.json");

// Pedido novo toca som assim que chega, sem esperar um clique na janela.
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

let mainWindow = null;
let tray = null;
let quitting = false;
let waitingCount = 0;
let retryTimer = null;

function readSettings() {
  try { return JSON.parse(fs.readFileSync(SETTINGS_FILE(), "utf8")); } catch { return {}; }
}
function writeSettings(patch) {
  const next = { ...readSettings(), ...patch };
  try {
    fs.mkdirSync(path.dirname(SETTINGS_FILE()), { recursive: true });
    fs.writeFileSync(SETTINGS_FILE(), JSON.stringify(next, null, 2));
  } catch {}
  return next;
}

function isInternal(url) {
  try { return new URL(url).origin === APP_ORIGIN; } catch { return false; }
}

// ---------- Iniciar com o sistema ----------
// Windows usa o registro (setLoginItemSettings); Linux, um .desktop em ~/.config/autostart.
function linuxAutostartFile() {
  return path.join(app.getPath("home"), ".config", "autostart", "perinifood-gestor.desktop");
}
function getAutostart() {
  if (process.platform === "linux") return fs.existsSync(linuxAutostartFile());
  return app.getLoginItemSettings().openAtLogin;
}
function setAutostart(enabled) {
  if (process.platform === "linux") {
    const file = linuxAutostartFile();
    if (!enabled) { try { fs.unlinkSync(file); } catch {} return; }
    // AppImage: o executável real é o próprio .AppImage (APPIMAGE), não o binário montado em /tmp.
    const exec = process.env.APPIMAGE || process.execPath;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, [
      "[Desktop Entry]",
      "Type=Application",
      "Name=PeriniFood Gestor",
      `Exec="${exec}" --hidden`,
      "Icon=perinifood-gestor",
      "X-GNOME-Autostart-enabled=true",
      "Terminal=false",
      "",
    ].join("\n"));
    return;
  }
  app.setLoginItemSettings({ openAtLogin: enabled, args: ["--hidden"] });
}

// ---------- Janela ----------
function offlinePage() {
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>PeriniFood Gestor</title>
<style>
:root{font-family:system-ui,Segoe UI,Arial,sans-serif}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f4f5;color:#18181b}
main{width:min(440px,calc(100% - 48px));text-align:center}
.dot{width:64px;height:64px;border-radius:50%;background:#dc2626;margin:0 auto 20px;display:grid;place-items:center;color:#fff;font-size:30px;font-weight:800}
h1{font-size:24px;margin:0 0 10px}p{color:#52525b;line-height:1.55;margin:0 0 22px}
button{border:0;border-radius:12px;padding:12px 22px;background:#dc2626;color:#fff;font-size:15px;font-weight:700;cursor:pointer}
small{display:block;margin-top:14px;color:#a1a1aa}
</style></head><body><main><div class="dot">!</div><h1>Sem conexão com o PeriniFood</h1>
<p>Verifique a internet deste computador. Os pedidos continuam guardados no sistema e aparecem assim que a conexão voltar.</p>
<button onclick="location.href='${START_URL}'">Tentar novamente</button><small>Nova tentativa automática a cada 15 segundos.</small></main></body></html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

function showWindow() {
  if (!mainWindow) { createWindow(); return; }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function openChild(url) {
  const child = new BrowserWindow({
    width: 1200,
    height: 820,
    parent: undefined,
    icon: ICON,
    autoHideMenuBar: true,
    title: "PeriniFood",
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, partition: "persist:perinifood-gestor" },
  });
  guardNavigation(child);
  child.loadURL(url);
}

function guardNavigation(win) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isInternal(url)) openChild(url);
    else if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (isInternal(url) || url.startsWith("data:")) return;
    event.preventDefault();
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
  });
}

function createWindow({ hidden = false } = {}) {
  const settings = readSettings();
  const bounds = settings.bounds || {};
  mainWindow = new BrowserWindow({
    width: bounds.width || 1366,
    height: bounds.height || 800,
    x: bounds.x,
    y: bounds.y,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    backgroundColor: "#f4f4f5",
    icon: ICON,
    autoHideMenuBar: true,
    title: "PeriniFood Gestor",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      // Minimizado ou na bandeja continua consultando pedidos e tocando o alerta.
      backgroundThrottling: false,
      partition: "persist:perinifood-gestor",
    },
  });
  if (settings.maximized) mainWindow.maximize();

  mainWindow.once("ready-to-show", () => { if (!hidden) mainWindow.show(); });
  guardNavigation(mainWindow);

  mainWindow.webContents.on("did-fail-load", (_event, code, _description, url, isMainFrame) => {
    if (!isMainFrame || code === -3 || url.startsWith("data:")) return;
    mainWindow.loadURL(offlinePage());
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => mainWindow && mainWindow.loadURL(START_URL), 15_000);
  });
  mainWindow.webContents.on("did-navigate", (_event, url) => {
    if (!url.startsWith("data:")) clearTimeout(retryTimer);
  });

  // Fechar a janela só esconde: o gestor continua avisando pela bandeja.
  mainWindow.on("close", (event) => {
    writeSettings({ bounds: mainWindow.getNormalBounds(), maximized: mainWindow.isMaximized() });
    if (quitting) return;
    event.preventDefault();
    mainWindow.hide();
    if (!readSettings().trayHintShown && Notification.isSupported()) {
      new Notification({ title: "PeriniFood Gestor continua aberto", body: "Os pedidos novos continuam chegando. Para sair, use o ícone na bandeja.", icon: ICON }).show();
      writeSettings({ trayHintShown: true });
    }
  });
  mainWindow.on("closed", () => { mainWindow = null; });
  mainWindow.on("focus", () => mainWindow && mainWindow.flashFrame(false));

  mainWindow.loadURL(START_URL);
}

// ---------- Bandeja ----------
function trayMenu() {
  return Menu.buildFromTemplate([
    { label: waitingCount ? `${waitingCount} pedido(s) aguardando` : "Nenhum pedido aguardando", enabled: false },
    { type: "separator" },
    { label: "Abrir Gestor de Pedidos", click: showWindow },
    { label: "Recarregar", click: () => { showWindow(); mainWindow && mainWindow.loadURL(START_URL); } },
    { type: "separator" },
    { label: "Iniciar com o computador", type: "checkbox", checked: getAutostart(), click: (item) => { setAutostart(item.checked); updateTray(); } },
    { type: "separator" },
    { label: "Sair", click: () => { quitting = true; app.quit(); } },
  ]);
}

function updateTray() {
  if (!tray) return;
  tray.setImage(nativeImage.createFromPath(waitingCount ? TRAY_ALERT_ICON : TRAY_ICON));
  tray.setToolTip(waitingCount ? `PeriniFood Gestor — ${waitingCount} pedido(s) novo(s)` : "PeriniFood Gestor");
  tray.setContextMenu(trayMenu());
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(TRAY_ICON));
  tray.on("click", showWindow);
  updateTray();
}

// ---------- Ponte com a página (preload.cjs) ----------
function fromApp(event) {
  try { return isInternal(event.senderFrame.url); } catch { return false; }
}

ipcMain.on("gestor:attention", (event, count) => {
  if (!fromApp(event)) return;
  waitingCount = Math.max(0, Math.min(999, Number(count) || 0));
  updateTray();
  if (process.platform === "linux") app.setBadgeCount(waitingCount);
  if (mainWindow) {
    mainWindow.setTitle(waitingCount ? `(${waitingCount}) PeriniFood Gestor` : "PeriniFood Gestor");
    if (waitingCount && !mainWindow.isFocused()) mainWindow.flashFrame(true);
    if (!waitingCount) mainWindow.flashFrame(false);
  }
});

ipcMain.on("gestor:notify", (event, title, body) => {
  if (!fromApp(event) || !Notification.isSupported()) return;
  const notification = new Notification({
    title: String(title).slice(0, 80),
    body: String(body).slice(0, 200),
    icon: ICON,
    urgency: "critical",
  });
  notification.on("click", showWindow);
  notification.show();
  // Janela escondida na bandeja: traz para a frente para ninguém perder o pedido.
  if (mainWindow && !mainWindow.isVisible() && readSettings().popOnOrder !== false) {
    mainWindow.showInactive();
  }
});

// ---------- Ciclo de vida ----------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", showWindow);

  app.whenReady().then(() => {
    app.setAppUserModelId("com.perinifood.gestor");
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      {
        label: "Gestor",
        submenu: [
          { label: "Recarregar", accelerator: "F5", click: () => mainWindow && mainWindow.webContents.reload() },
          { label: "Tela cheia", accelerator: "F11", click: () => mainWindow && mainWindow.setFullScreen(!mainWindow.isFullScreen()) },
          { label: "Zoom +", accelerator: "CommandOrControl+=", click: () => mainWindow && mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() + 0.5) },
          { label: "Zoom −", accelerator: "CommandOrControl+-", click: () => mainWindow && mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() - 0.5) },
          { label: "Zoom normal", accelerator: "CommandOrControl+0", click: () => mainWindow && mainWindow.webContents.setZoomLevel(0) },
          { label: "Voltar", accelerator: "Alt+Left", click: () => mainWindow && mainWindow.webContents.navigationHistory.goBack() },
          { type: "separator" },
          { label: "Sair", accelerator: "CommandOrControl+Q", click: () => { quitting = true; app.quit(); } },
        ],
      },
    ]));
    // Primeira execução: liga "iniciar com o computador" (pode desligar na bandeja).
    const settings = readSettings();
    if (!settings.autostartConfigured && app.isPackaged) {
      setAutostart(true);
      writeSettings({ autostartConfigured: true });
    } else if (process.platform === "linux" && app.isPackaged && getAutostart()) {
      // Reescreve o atalho com o executável atual: trocar o AppImage por .deb/.rpm
      // (ou mover o AppImage) deixaria o "iniciar com o computador" apontando para o antigo.
      setAutostart(true);
    }
    // Evita que o sistema suspenda o app enquanto espera pedidos.
    powerSaveBlocker.start("prevent-app-suspension");
    createTray();
    createWindow({ hidden: process.argv.includes("--hidden") });
  });

  app.on("before-quit", () => { quitting = true; });
  app.on("window-all-closed", () => {
    // Fica na bandeja; só sai pelo menu "Sair".
  });
}
