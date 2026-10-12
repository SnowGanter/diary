const { contextBridge, ipcRenderer } = require('electron');
const invoke = (channel, ...args) => ipcRenderer.invoke(`diary:${channel}`, ...args);
contextBridge.exposeInMainWorld('diary', {
  info: () => invoke('info'), list: () => invoke('list'), get: id => invoke('get', id), save: entry => invoke('save', entry), settings: next => invoke('settings', next), choose: create => invoke('choose', create), reveal: () => invoke('reveal'), export: () => invoke('export'), import: () => invoke('import'),
  migrate: (entries, settings) => invoke('migrate', entries, settings), openExternal: url => invoke('external', url), openAsset: (url,name) => invoke('asset', url, name),
  history: id => invoke('history', id), revision: (id,name) => invoke('revision', id, name),
  onFlush: callback => { const handler = () => callback(); ipcRenderer.on('diary:flush', handler); return () => ipcRenderer.removeListener('diary:flush', handler); }, flushed: error => ipcRenderer.send('diary:flushed', error || null),
});
