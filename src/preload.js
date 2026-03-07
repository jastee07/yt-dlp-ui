const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clipper', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  updateSettings: (payload) => ipcRenderer.invoke('settings:update', payload),
  getLogsInfo: () => ipcRenderer.invoke('logs:get-info'),
  openLogsFolder: () => ipcRenderer.invoke('logs:open-folder'),
  checkDeps: () => ipcRenderer.invoke('deps:check'),
  pickFolder: () => ipcRenderer.invoke('dialog:pick-folder'),
  fetchMetadata: (payload) => ipcRenderer.invoke('clip:metadata', payload),
  runClip: (payload) => ipcRenderer.invoke('clip:run', payload),
});
