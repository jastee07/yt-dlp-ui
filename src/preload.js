const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clipper', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  checkDeps: () => ipcRenderer.invoke('deps:check'),
  pickFolder: () => ipcRenderer.invoke('dialog:pick-folder'),
  fetchMetadata: (payload) => ipcRenderer.invoke('clip:metadata', payload),
  runClip: (payload) => ipcRenderer.invoke('clip:run', payload),
});
