// Ponte mínima entre a página /gestor e o app desktop: só dois avisos, sem
// acesso a Node nem a arquivos. A página detecta o app por window.perinifoodDesktop.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("perinifoodDesktop", {
  isDesktop: true,
  attention: (count) => ipcRenderer.send("gestor:attention", Number(count) || 0),
  notify: (title, body) => ipcRenderer.send("gestor:notify", String(title), String(body)),
});
