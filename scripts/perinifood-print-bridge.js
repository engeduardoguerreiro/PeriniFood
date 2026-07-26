const http = require("http");
const { execFile } = require("child_process");
const { promises: fs } = require("fs");
const os = require("os");
const path = require("path");

const appName = "PeriniFood Print Agent";
const version = "1.0.0";
const host = process.env.PRINT_BRIDGE_HOST || "127.0.0.1";
const port = Number(process.env.PRINT_BRIDGE_PORT || 4127);
const appDataRoot =
  process.env.PRINT_BRIDGE_DATA_DIR ||
  process.env.LOCALAPPDATA ||
  process.env.PROGRAMDATA ||
  path.join(os.homedir(), "AppData", "Local");
const dataDir = process.env.PRINT_BRIDGE_DATA_DIR
  ? appDataRoot
  : path.join(appDataRoot, "PeriniFood", "PrintAgent");
const logsDir = path.join(dataDir, "logs");
const configPath = path.join(dataDir, "config.json");
const logPath = path.join(logsDir, `${new Date().toISOString().slice(0, 10)}.log`);
const startedAt = new Date();

const defaultAllowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://perinifood.vercel.app",
  "https://perinifood-seven.vercel.app",
];

const allowedOrigins = new Set([
  ...defaultAllowedOrigins,
  ...String(process.env.PRINT_BRIDGE_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
]);

async function ensureStorage() {
  await fs.mkdir(logsDir, { recursive: true });
  try {
    await fs.access(configPath);
  } catch {
    await writeConfig({
      defaultPrinter: null,
      token: process.env.PRINT_BRIDGE_TOKEN || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

async function log(event, details = {}) {
  const line = JSON.stringify({
    at: new Date().toISOString(),
    event,
    ...details,
  });
  await fs.mkdir(logsDir, { recursive: true });
  await fs.appendFile(logPath, `${line}\n`, "utf8").catch(() => {});
  if (event.includes("error") || event.includes("failed")) {
    console.error(line);
  } else {
    console.log(line);
  }
}

async function readConfig() {
  await ensureStorage();
  try {
    const raw = await fs.readFile(configPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return { defaultPrinter: null, token: process.env.PRINT_BRIDGE_TOKEN || null };
  }
}

async function writeConfig(config) {
  await fs.mkdir(dataDir, { recursive: true });
  const nextConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(configPath, JSON.stringify(nextConfig, null, 2), "utf8");
  return nextConfig;
}

function corsHeaders(req) {
  const origin = req.headers.origin;
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-PeriniFood-Print-Token",
    "Cache-Control": "no-store",
  };

  if (!origin || allowedOrigins.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin || "http://127.0.0.1";
    headers["Vary"] = "Origin";
  }

  return headers;
}

function sendJson(req, res, status, payload) {
  res.writeHead(status, corsHeaders(req));
  res.end(JSON.stringify(payload));
}

async function requireLocalAuth(req, res) {
  const config = await readConfig();
  const configuredToken = String(config.token || process.env.PRINT_BRIDGE_TOKEN || "").trim();
  if (!configuredToken) return true;

  const received = String(req.headers["x-perinifood-print-token"] || "").trim();
  if (received === configuredToken) return true;

  await log("auth_failed", { remoteAddress: req.socket.remoteAddress, url: req.url });
  sendJson(req, res, 401, { ok: false, error: "Token do agente de impressão inválido." });
  return false;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Payload muito grande."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function powershell(command, env = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
      { windowsHide: true, maxBuffer: 1024 * 1024 * 4, env: { ...process.env, ...env } },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
          return;
        }
        resolve(stdout);
      },
    );
  });
}

async function listWindowsPrinters() {
  const command = [
    "$ErrorActionPreference='Stop';",
    "Get-CimInstance Win32_Printer |",
    "Select-Object Name,DriverName,PortName,Default,WorkOffline,PrinterStatus |",
    "ConvertTo-Json -Compress",
  ].join(" ");

  const stdout = await powershell(command);
  const raw = stdout.trim();
  if (!raw) return [];

  const parsed = JSON.parse(raw);
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  return rows
    .map((printer) => ({
      name: String(printer.Name || ""),
      driver: String(printer.DriverName || ""),
      port: String(printer.PortName || ""),
      isDefault: Boolean(printer.Default),
      isOffline: Boolean(printer.WorkOffline),
      status: printer.PrinterStatus ?? null,
    }))
    .filter((printer) => printer.name);
}

function stripForThermal(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\x80-\xFF]/g, "");
}

function buildEscPosReceipt(content, options = {}) {
  const text = stripForThermal(content).replace(/\r?\n/g, "\n");
  const body = Buffer.from(text, "latin1");
  const shouldCut = options.cutPaper !== false;
  const parts = [
    Buffer.from([0x1b, 0x40]),
    Buffer.from([0x1b, 0x74, 0x10]),
    Buffer.from([0x1b, 0x21, 0x00]),
    Buffer.from([0x1d, 0x42, 0x00]),
    body,
    Buffer.from("\n\n\n", "latin1"),
  ];

  if (shouldCut) parts.push(Buffer.from([0x1d, 0x56, 0x41, 0x10]));
  return Buffer.concat(parts);
}

async function assertPrinterReady(printerName) {
  const printers = await listWindowsPrinters();
  const printer = printers.find((item) => item.name.toLowerCase() === String(printerName).toLowerCase());
  if (!printer) {
    throw new Error(`Impressora "${printerName}" não encontrada neste Windows.`);
  }
  if (printer.isOffline) {
    throw new Error(`Impressora "${printerName}" está offline.`);
  }
  return printer;
}

async function sendRawToPrinter({ printerName, content, copies, cutPaper }) {
  const safeContent = String(content || "").trim();
  if (!safeContent) throw new Error("Conteúdo de impressão vazio.");

  const printer = String(printerName || "").trim();
  if (!printer) throw new Error("Nenhuma impressora selecionada.");
  await assertPrinterReady(printer);

  const copyCount = Math.min(5, Math.max(1, Number(copies || 1)));
  const raw = buildEscPosReceipt(safeContent, { cutPaper });
  const base64 = raw.toString("base64");

  const helper = String.raw`
using System;
using System.Runtime.InteropServices;
public class RawPrinterHelper {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }
  [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);
  [DllImport("winspool.Drv", EntryPoint="ClosePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
  [DllImport("winspool.Drv", EntryPoint="EndDocPrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="StartPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="EndPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, Int32 dwCount, out Int32 dwWritten);
  public static bool SendBytes(string printerName, byte[] bytes) {
    IntPtr hPrinter;
    DOCINFOA di = new DOCINFOA();
    di.pDocName = "PeriniFood Pedido";
    di.pDataType = "RAW";
    if (!OpenPrinter(printerName.Normalize(), out hPrinter, IntPtr.Zero)) return false;
    try {
      if (!StartDocPrinter(hPrinter, 1, di)) return false;
      if (!StartPagePrinter(hPrinter)) return false;
      int written;
      bool ok = WritePrinter(hPrinter, bytes, bytes.Length, out written);
      EndPagePrinter(hPrinter);
      EndDocPrinter(hPrinter);
      return ok && written == bytes.Length;
    } finally {
      ClosePrinter(hPrinter);
    }
  }
}`;

  const command = [
    "$ErrorActionPreference='Stop';",
    "Add-Type -TypeDefinition $env:PF_RAW_HELPER;",
    "$bytes = [Convert]::FromBase64String($env:PF_PRINT_RAW);",
    "$copies = [int]$env:PF_PRINT_COPIES;",
    "1..$copies | ForEach-Object {",
    "$ok = [RawPrinterHelper]::SendBytes($env:PF_PRINTER_NAME, $bytes);",
    "if (-not $ok) { throw 'Falha ao enviar dados RAW para a impressora.' }",
    "};",
  ].join(" ");

  await powershell(command, {
    PF_RAW_HELPER: helper,
    PF_PRINT_RAW: base64,
    PF_PRINT_COPIES: String(copyCount),
    PF_PRINTER_NAME: printer,
  });
}

async function printText({ printerName, content, copies }) {
  const safeContent = String(content || "").trim();
  if (!safeContent) throw new Error("Conteúdo de impressão vazio.");

  const printer = String(printerName || "").trim();
  if (printer) await assertPrinterReady(printer);

  const copyCount = Math.min(5, Math.max(1, Number(copies || 1)));
  const tempFile = path.join(os.tmpdir(), `perinifood-print-${Date.now()}.txt`);
  await fs.writeFile(tempFile, safeContent, "utf8");

  const command = [
    "$ErrorActionPreference='Stop';",
    "$content = Get-Content -LiteralPath $env:PF_PRINT_FILE -Raw;",
    "$copies = [int]$env:PF_PRINT_COPIES;",
    "1..$copies | ForEach-Object {",
    "if ($env:PF_PRINTER_NAME) { $content | Out-Printer -Name $env:PF_PRINTER_NAME }",
    "else { $content | Out-Printer }",
    "};",
  ].join(" ");

  try {
    await powershell(command, {
      PF_PRINT_FILE: tempFile,
      PF_PRINT_COPIES: String(copyCount),
      PF_PRINTER_NAME: printer,
    });
  } finally {
    fs.unlink(tempFile).catch(() => {});
  }
}

async function printImage({ printerName, image, copies }) {
  const base64 = String(image || "").replace(/^data:image\/\w+;base64,/, "").trim();
  if (!base64) throw new Error("Imagem de impressão vazia.");

  const printer = String(printerName || "").trim();
  if (printer) await assertPrinterReady(printer);

  const copyCount = Math.min(5, Math.max(1, Number(copies || 1)));
  const tempFile = path.join(os.tmpdir(), `perinifood-print-${Date.now()}.png`);
  await fs.writeFile(tempFile, Buffer.from(base64, "base64"));

  const command = [
    "$ErrorActionPreference='Stop';",
    "Add-Type -AssemblyName System.Drawing;",
    "$img = [System.Drawing.Image]::FromFile($env:PF_IMG_FILE);",
    "$copies = [int]$env:PF_PRINT_COPIES;",
    "1..$copies | ForEach-Object {",
    "  $pd = New-Object System.Drawing.Printing.PrintDocument;",
    "  if ($env:PF_PRINTER_NAME) { $pd.PrinterSettings.PrinterName = $env:PF_PRINTER_NAME };",
    "  $pd.PrintController = New-Object System.Drawing.Printing.StandardPrintController;",
    "  $pd.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0,0,0,0);",
    "  $pd.add_PrintPage({ param($s,$e)",
    "    $e.Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor;",
    "    $e.Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half;",
    "    $e.Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None;",
    "    $w = $e.PageBounds.Width;",
    "    $scale = $w / $img.Width;",
    "    $h = [int]($img.Height * $scale);",
    "    $e.Graphics.DrawImage($img, 0, 0, [int]$w, $h);",
    "    $e.HasMorePages = $false;",
    "  });",
    "  $pd.Print();",
    "};",
    "$img.Dispose();",
  ].join(" ");

  try {
    await powershell(command, {
      PF_IMG_FILE: tempFile,
      PF_PRINT_COPIES: String(copyCount),
      PF_PRINTER_NAME: printer,
    });
  } finally {
    fs.unlink(tempFile).catch(() => {});
  }
}

async function getStatus() {
  const [config, printers] = await Promise.all([readConfig(), listWindowsPrinters()]);
  const defaultPrinter = config.defaultPrinter || printers.find((printer) => printer.isDefault)?.name || null;
  const selected = defaultPrinter ? printers.find((printer) => printer.name === defaultPrinter) : null;
  return {
    ok: true,
    app: appName,
    version,
    host,
    port,
    uptimeSeconds: Math.round((Date.now() - startedAt.getTime()) / 1000),
    startedAt: startedAt.toISOString(),
    defaultPrinter,
    printerConnected: Boolean(selected && !selected.isOffline),
    printerMissing: Boolean(defaultPrinter && !selected),
    printers,
    config: {
      defaultPrinter,
      tokenConfigured: Boolean(config.token || process.env.PRINT_BRIDGE_TOKEN),
      dataDir,
      logPath,
    },
  };
}

async function handlePrint(req, res) {
  const payload = await readJsonBody(req);
  const config = await readConfig();
  const printerName = String(payload.printerName || config.defaultPrinter || "").trim();
  const printPayload = { ...payload, printerName };

  await log("print_requested", { printerName, copies: payload.copies || 1, mode: payload.image ? "image" : "text" });

  if (payload.image) {
    try {
      await printImage(printPayload);
      await log("print_success", { printerName, mode: "image" });
      sendJson(req, res, 200, { ok: true, printerName, mode: "image" });
    } catch (imageError) {
      await log("image_print_failed", { printerName, error: imageError instanceof Error ? imageError.message : String(imageError) });
      sendJson(req, res, 500, { ok: false, error: imageError instanceof Error ? imageError.message : "Falha ao imprimir imagem." });
    }
    return;
  }

  try {
    await sendRawToPrinter(printPayload);
    await log("print_success", { printerName, mode: "raw" });
    sendJson(req, res, 200, { ok: true, printerName, mode: "raw" });
  } catch (rawError) {
    await log("raw_print_failed", { printerName, error: rawError instanceof Error ? rawError.message : String(rawError) });
    await printText(printPayload);
    await log("print_success", { printerName, mode: "windows" });
    sendJson(req, res, 200, { ok: true, printerName, mode: "windows" });
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || "/", `http://${host}:${port}`);

    if (req.method === "OPTIONS") {
      sendJson(req, res, 200, { ok: true });
      return;
    }

    if (requestUrl.pathname === "/health") {
      sendJson(req, res, 200, { ok: true, app: appName, version });
      return;
    }

    if (!(await requireLocalAuth(req, res))) return;

    if (requestUrl.pathname === "/status") {
      sendJson(req, res, 200, await getStatus());
      return;
    }

    if (requestUrl.pathname === "/printers") {
      const printers = await listWindowsPrinters();
      await log("printers_detected", { count: printers.length });
      sendJson(req, res, 200, { ok: true, printers });
      return;
    }

    if (requestUrl.pathname === "/config" && req.method === "GET") {
      const config = await readConfig();
      sendJson(req, res, 200, {
        ok: true,
        config: {
          defaultPrinter: config.defaultPrinter || null,
          tokenConfigured: Boolean(config.token || process.env.PRINT_BRIDGE_TOKEN),
        },
      });
      return;
    }

    if (requestUrl.pathname === "/config" && req.method === "POST") {
      const body = await readJsonBody(req);
      const current = await readConfig();
      const next = await writeConfig({
        ...current,
        defaultPrinter: String(body.defaultPrinter || "").trim() || null,
        token: String(body.token || current.token || "").trim() || null,
      });
      await log("config_updated", { defaultPrinter: next.defaultPrinter || null });
      sendJson(req, res, 200, { ok: true, config: { defaultPrinter: next.defaultPrinter || null } });
      return;
    }

    if (requestUrl.pathname === "/diagnostics") {
      const status = await getStatus();
      const logs = await readRecentLogs(80);
      sendJson(req, res, 200, { ok: true, status, logs });
      return;
    }

    if (requestUrl.pathname === "/logs") {
      sendJson(req, res, 200, { ok: true, logs: await readRecentLogs(200) });
      return;
    }

    if (requestUrl.pathname === "/print" && req.method === "POST") {
      await handlePrint(req, res);
      return;
    }

    sendJson(req, res, 404, { ok: false, error: "Rota não encontrada." });
  } catch (error) {
    await log("request_error", { url: req.url, error: error instanceof Error ? error.message : String(error) });
    sendJson(req, res, 500, { ok: false, error: error instanceof Error ? error.message : "Erro interno no agente de impressão." });
  }
});

async function readRecentLogs(limit) {
  try {
    const files = await fs.readdir(logsDir);
    const latest = files.filter((file) => file.endsWith(".log")).sort().slice(-3);
    const content = await Promise.all(latest.map((file) => fs.readFile(path.join(logsDir, file), "utf8").catch(() => "")));
    return content
      .join("")
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-limit)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return { raw: line };
        }
      });
  } catch {
    return [];
  }
}

process.on("uncaughtException", (error) => {
  void log("uncaught_exception", { error: error.message });
});

process.on("unhandledRejection", (error) => {
  void log("unhandled_rejection", { error: error instanceof Error ? error.message : String(error) });
});

ensureStorage()
  .then(() => {
    server.listen(port, host, () => {
      void log("agent_started", { url: `http://${host}:${port}`, version, dataDir });
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
