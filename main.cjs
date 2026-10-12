const { app, BrowserWindow, ipcMain, dialog, shell, protocol, net } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const { Workspace, atomicWrite } = require('./electron/workspace.cjs');
protocol.registerSchemesAsPrivileged([{ scheme: 'diary-asset', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } }]);
app.setPath('userData', process.env.DIARY_PROFILE || path.join(app.getPath('appData'), 'Diary'));
const store = new Workspace();
let win; let closing = false; let closePending = false; let legacyMigrated = false;
const configFile = () => process.env.PORTABLE_EXECUTABLE_DIR ? path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'diary-location.json') : path.join(app.getPath('userData'), 'workspace-location.json');
const saveLocation = info => atomicWrite(configFile(),JSON.stringify({path:process.env.PORTABLE_EXECUTABLE_DIR?path.relative(process.env.PORTABLE_EXECUTABLE_DIR,info.path):info.path,relative:Boolean(process.env.PORTABLE_EXECUTABLE_DIR),legacyMigrated}));
const safeWebURL = value => { const url = new URL(value); if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Допустимы только ссылки http и https.'); return url.href; };
function registerIPC() {
  const handle = (name, action) => ipcMain.handle(`diary:${name}`, async (event, ...args) => { if (event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame) throw new Error('Доступ запрещён.'); return action(...args); });
  handle('info', () => ({...store.info(),migrateLegacy:!legacyMigrated})); handle('list', () => store.list()); handle('get', id => store.get(id)); handle('save', entry => store.save(entry)); handle('settings', next => store.settings(next)); handle('migrate', async(entries, settings) => {const result=await store.migrate(entries,settings);legacyMigrated=true;await saveLocation(store.info());return result;});
  handle('history', id => store.history(id)); handle('revision', (id,name) => store.revision(id,name));
  handle('choose', async create => { const result = await dialog.showOpenDialog(win, { title: create ? 'Создать хранилище в пустой папке' : 'Открыть хранилище Diary', properties: ['openDirectory', 'createDirectory'] }); if (result.canceled) return null; const info = await store.open(result.filePaths[0], Boolean(create)); legacyMigrated=true;await saveLocation(info);return info; });
  handle('reveal', () => shell.openPath(store.folder)); handle('external', url => shell.openExternal(safeWebURL(url)));
  handle('asset', async (value,name) => { const url = new URL(value); if (url.protocol !== 'diary-asset:' || url.hostname !== 'local') throw new Error('Некорректное вложение.'); const file = store.assetPath(url.pathname.slice(1)); const result = await dialog.showSaveDialog(win, { title: 'Сохранить вложение', defaultPath: path.basename(name||file) }); if (!result.canceled) await fs.copyFile(file, result.filePath); });
  handle('export', async () => { const result = await dialog.showSaveDialog(win, { defaultPath: `Diary-${new Date().toISOString().slice(0,10)}.diary`, filters: [{ name: 'Хранилище Diary', extensions: ['diary'] }] }); if (result.canceled) return null; return store.export(result.filePath); });
  handle('import', async () => { const result = await dialog.showOpenDialog(win, { filters: [{ name: 'Хранилище Diary', extensions: ['diary','json'] }], properties: ['openFile'] }); if (result.canceled) return null; return result.filePaths[0].endsWith('.json') ? store.importJSON(result.filePaths[0]) : store.importArchive(result.filePaths[0]); });
  ipcMain.on('diary:flushed', async (event, error) => { if (event.sender !== win.webContents || !closePending) return; closePending = false; if (error) { await dialog.showMessageBox(win, { type: 'error', message: 'Не удалось сохранить изменения', detail: String(error), buttons: ['Вернуться в дневник'] }); return; } await store.close(); closing = true; win.close(); });
}
async function start() {
  let target = process.env.DIARY_WORKSPACE;
  if (!target) { try { const config=JSON.parse(await fs.readFile(configFile(), 'utf8'));target=config.relative?path.resolve(process.env.PORTABLE_EXECUTABLE_DIR||app.getPath('documents'),config.path):config.path;legacyMigrated=Boolean(config.legacyMigrated); } catch { /* First launch. */ } }
  if (!target) target = process.env.PORTABLE_EXECUTABLE_DIR ? path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'DiaryData') : path.join(app.getPath('documents'), 'My Diary', 'DiaryData');
  try { await store.open(target, true); } catch (error) { await dialog.showMessageBox({ type: 'error', message: 'Хранилище недоступно', detail: `${error.message}\nВыберите папку в настройках после запуска.`, buttons: ['Продолжить'] }); }
  protocol.handle('diary-asset', async request => { const url = new URL(request.url); try { if (url.hostname !== 'local') throw new Error(); const response=await net.fetch(pathToFileURL(store.assetPath(url.pathname.slice(1))).href);const headers=new Headers(response.headers);headers.set('Access-Control-Allow-Origin','*');return new Response(response.body,{status:response.status,headers}); } catch { return new Response('Not found', { status: 404 }); } });
  win = new BrowserWindow({ show: !process.env.DIARY_TEST_RESULT, width: 1500, height: 1000, minWidth: 760, minHeight: 560, autoHideMenuBar: true, icon: path.join(__dirname, 'dist', 'icon.ico'), webPreferences: { preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true } });
  registerIPC(); win.webContents.setWindowOpenHandler(({ url }) => { try { shell.openExternal(safeWebURL(url)); } catch { /* Reject other schemes. */ } return { action: 'deny' }; }); win.webContents.on('will-navigate', event => event.preventDefault());
  win.on('close', event => { if (closing) return; event.preventDefault(); if (closePending) return; closePending = true; win.webContents.send('diary:flush'); setTimeout(async () => { if (!closePending || win.isDestroyed()) return; closePending = false; const result = await dialog.showMessageBox(win, { type: 'warning', message: 'Редактор не отвечает', detail: 'Подождите, чтобы сохранить изменения. Принудительное закрытие может потерять последние изменения.', buttons: ['Подождать', 'Закрыть без сохранения'], defaultId: 0, cancelId: 0 }); if (result.response === 1) { await store.close(); closing = true; win.close(); } }, 15000); });
  if (process.env.DIARY_DEV_URL) await win.loadURL(process.env.DIARY_DEV_URL); else await win.loadFile(path.join(__dirname, 'dist', 'index.html'));
}
if (!app.requestSingleInstanceLock()) app.quit();
else { app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } }); app.whenReady().then(start).catch(error => { dialog.showErrorBox('Diary не запустился', error.message); app.quit(); }); app.on('window-all-closed', () => app.quit()); }
