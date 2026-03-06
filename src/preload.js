const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clipper', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  checkDeps: () => ipcRenderer.invoke('deps:check'),
  pickFolder: () => ipcRenderer.invoke('dialog:pick-folder'),
  runClip: (payload) => ipcRenderer.invoke('clip:run', payload),
});
