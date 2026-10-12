const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const AdmZip = require('adm-zip');
const VERSION = 2;
const idPattern = /^[a-zA-Z0-9_-]{1,100}$/;
const assetPattern = /^[a-f0-9]{64}\.[a-z0-9]{1,10}$/;
const extensions = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'application/pdf': 'pdf', 'text/plain': 'txt', 'audio/mpeg': 'mp3', 'video/mp4': 'mp4' };
async function atomicWrite(file, data) {
  const temp = `${file}.${crypto.randomUUID()}.tmp`; const handle = await fs.open(temp, 'wx');
  try { await handle.writeFile(data); await handle.sync(); } finally { await handle.close(); }
  try { await fs.rename(temp, file); } catch (error) { await fs.rm(temp, { force: true }); throw error; }
}
function validateEntry(entry) {
  if (!entry || !idPattern.test(entry.id) || typeof entry.content !== 'string' || entry.content.length > 100 * 1024 * 1024) throw new Error('Некорректный файл страницы.');
  if (entry.parentId && !idPattern.test(entry.parentId)) throw new Error('Некорректная родительская страница.');
  return { ...entry, title: String(entry.title || '').slice(0, 1000), createdAt: Number(entry.createdAt) || Date.now(), updatedAt: Number(entry.updatedAt) || Date.now(), schemaVersion: VERSION };
}
class Workspace {
  constructor() { this.folder = null; this.queue = Promise.resolve(); this.lock = null; }
  async open(folder, create = false) {
    await this.queue; const root = path.resolve(folder); if (root === this.folder) return this.info();
    if (create) { await fs.mkdir(root, { recursive: true }); const items = await fs.readdir(root); if (items.length && !items.includes('workspace.json')) throw new Error('Выберите пустую папку для нового хранилища.'); }
    let manifest;
    try { manifest = JSON.parse(await fs.readFile(path.join(root, 'workspace.json'), 'utf8')); }
    catch (error) { if (!create || error.code !== 'ENOENT') throw new Error('В папке нет хранилища Diary. Выберите папку с workspace.json.'); }
    if (manifest && (manifest.format !== 'diary-workspace' || manifest.version > VERSION)) throw new Error('Это хранилище создано другой версией Diary.');
    const lockPath = path.join(root, '.diary-lock');
    try { await fs.writeFile(lockPath, JSON.stringify({ pid: process.pid, host: os.hostname() }), { flag: 'wx' }); }
    catch (error) {
      if (error.code !== 'EEXIST') throw error; const old = JSON.parse(await fs.readFile(lockPath, 'utf8')); let active = old.host !== os.hostname();
      if (!active) { try { process.kill(old.pid, 0); active = true; } catch { active = false; } }
      if (active) throw new Error('Хранилище уже открыто. Закройте другой экземпляр Diary.');
      await fs.rm(lockPath); await fs.writeFile(lockPath, JSON.stringify({ pid: process.pid, host: os.hostname() }), { flag: 'wx' });
    }
    try {
      for (const name of ['pages', 'assets', 'backups']) await fs.mkdir(path.join(root, name), { recursive: true });
      if (!manifest) { manifest = { format: 'diary-workspace', version: VERSION, id: crypto.randomUUID(), createdAt: Date.now(), migrations: [] }; await atomicWrite(path.join(root, 'workspace.json'), JSON.stringify(manifest, null, 2)); await atomicWrite(path.join(root, 'settings.json'), '{}'); }
    } catch (error) { await fs.rm(lockPath, { force: true }); throw error; }
    await this.close(); this.folder = root; this.lock = lockPath; return this.info();
  }
  info() { return { path: this.folder, version: VERSION, desktop: true }; }
  requireOpen() { if (!this.folder) throw new Error('Сначала откройте хранилище.'); }
  enqueue(task) { const next = this.queue.then(task); this.queue = next.catch(() => {}); return next; }
  pagePath(id) { this.requireOpen(); if (!idPattern.test(id)) throw new Error('Некорректный ID страницы.'); return path.join(this.folder, 'pages', `${id}.json`); }
  async list() {
    await this.queue; this.requireOpen(); const names = await fs.readdir(path.join(this.folder, 'pages'));
    const entries = await Promise.all(names.filter(n => n.endsWith('.json') && idPattern.test(n.slice(0, -5))).map(async name => {
      const entry = validateEntry(JSON.parse(await fs.readFile(path.join(this.folder, 'pages', name), 'utf8')));
      const { content, blocks, overlay, ...metadata } = entry; void content; void blocks; void overlay; return metadata;
    })); return entries.sort((a, b) => b.createdAt - a.createdAt);
  }
  async get(id) { await this.queue; return validateEntry(JSON.parse(await fs.readFile(this.pagePath(id), 'utf8'))); }
  async saveAsset(bytes, mime, filename = '') {
    this.requireOpen(); if (bytes.length > 100 * 1024 * 1024) throw new Error('Максимальный размер вложения — 100 МБ.');
    const ext = extensions[mime] || path.extname(filename).slice(1).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || 'bin';
    const id = `${crypto.createHash('sha256').update(bytes).digest('hex')}.${ext}`; const target = path.join(this.folder, 'assets', id);
    try { await fs.access(target); } catch { await atomicWrite(target, bytes); } return `diary-asset://local/${id}`;
  }
  async externalize(value) {
    if (typeof value !== 'string') return value; const matches = [...value.matchAll(/data:([a-zA-Z0-9.+/-]+);base64,([a-zA-Z0-9+/=]+)/g)]; let result = value;
    for (const match of matches) result = result.replaceAll(match[0], await this.saveAsset(Buffer.from(match[2], 'base64'), match[1])); return result;
  }
  save(entry) {
    return this.enqueue(async () => {
      const next = validateEntry(entry); next.content = await this.externalize(next.content); next.overlay = await this.externalize(next.overlay);
      if (next.blocks) next.blocks = JSON.parse(await this.externalize(JSON.stringify(next.blocks)));
      const backup = path.join(this.folder, 'backups', `${new Date().toISOString().slice(0, 10)}.diary`);
      try { await fs.access(backup); } catch { await this.createArchive(backup); }
      let previous;
      try { previous = JSON.parse(await fs.readFile(this.pagePath(next.id), 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (previous && (previous.content !== next.content || previous.title !== next.title || previous.overlay !== next.overlay || previous.deletedAt !== next.deletedAt)) {
        const folder = path.join(this.folder, 'backups', 'history', next.id); await fs.mkdir(folder, { recursive: true });
        await atomicWrite(path.join(folder, `${Date.now()}-${crypto.randomUUID()}.json`), JSON.stringify(previous));
        const versions = (await fs.readdir(folder)).filter(name=>name.endsWith('.json')).sort();
        for (const old of versions.slice(0, Math.max(0, versions.length - 30))) await fs.rm(path.join(folder, old));
      }
      await atomicWrite(this.pagePath(next.id), JSON.stringify(next, null, 2)); return next;
    });
  }
  async settings(next) {
    this.requireOpen(); const file = path.join(this.folder, 'settings.json');
    if (next !== undefined) return this.enqueue(async () => { await atomicWrite(file, JSON.stringify(next, null, 2)); return next; });
    await this.queue; return JSON.parse(await fs.readFile(file, 'utf8'));
  }
  async createArchive(destination) {
    this.requireOpen(); const zip = new AdmZip(); zip.addLocalFile(path.join(this.folder, 'workspace.json')); zip.addLocalFile(path.join(this.folder, 'settings.json')); zip.addLocalFolder(path.join(this.folder, 'pages'), 'pages'); zip.addLocalFolder(path.join(this.folder, 'assets'), 'assets'); await atomicWrite(destination, zip.toBuffer()); return destination;
  }
  export(destination) { return this.enqueue(() => this.createArchive(destination)); }
  async history(id) {
    this.pagePath(id); await this.queue; const folder = path.join(this.folder, 'backups', 'history', id);
    let files; try { files = await fs.readdir(folder); } catch (error) { if(error.code==='ENOENT')return[]; throw error; }
    return Promise.all(files.filter(name=>/^\d+-[a-f0-9-]+\.json$/.test(name)).sort().reverse().map(async name=>{const entry=JSON.parse(await fs.readFile(path.join(folder,name),'utf8'));return {id:name,title:entry.title,updatedAt:entry.updatedAt};}));
  }
  async revision(id, name) {
    this.pagePath(id); if(!/^\d+-[a-f0-9-]+\.json$/.test(name))throw new Error('Некорректная версия.');await this.queue;
    return validateEntry(JSON.parse(await fs.readFile(path.join(this.folder,'backups','history',id,name),'utf8')));
  }
  importJSON(file) {
    return this.enqueue(async()=>{
      const data=JSON.parse(await fs.readFile(file,'utf8')); if(data.format!=='diary-browser'||!Array.isArray(data.entries)||data.version>VERSION)throw new Error('Неподдерживаемый архив браузера.');
      const pages=data.entries.map(validateEntry); await this.createArchive(path.join(this.folder,'backups',`before-import-${Date.now()}.diary`));
      for(const entry of pages){const target=this.pagePath(entry.id);let previous;try{previous=JSON.parse(await fs.readFile(target,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
        if(!previous||entry.updatedAt>previous.updatedAt){entry.content=await this.externalize(entry.content);entry.overlay=await this.externalize(entry.overlay);if(entry.blocks)entry.blocks=JSON.parse(await this.externalize(JSON.stringify(entry.blocks)));await atomicWrite(target,JSON.stringify(entry,null,2));}}
      return{count:pages.length};
    });
  }
  importArchive(file) {
    return this.enqueue(async () => {
      this.requireOpen(); const zip = new AdmZip(file); const manifestItem = zip.getEntry('workspace.json'); if (!manifestItem) throw new Error('Архив не содержит хранилище Diary.');
      const manifest = JSON.parse(manifestItem.getData().toString()); if (manifest.format !== 'diary-workspace' || manifest.version > VERSION) throw new Error('Неподдерживаемый формат архива.');
      const items = zip.getEntries(); if (items.reduce((sum, item) => sum + item.header.size, 0) > 1024 * 1024 * 1024) throw new Error('Архив слишком большой.'); const pages = []; const assets = [];
      for (const item of items) {
        if (item.isDirectory) continue;
        if (/^pages\/[a-zA-Z0-9_-]{1,100}\.json$/.test(item.entryName)) { const entry = validateEntry(JSON.parse(item.getData().toString())); if (item.entryName !== `pages/${entry.id}.json`) throw new Error('ID страницы не совпадает с именем файла.'); pages.push(entry); }
        else if (item.entryName.startsWith('assets/') && assetPattern.test(item.entryName.slice(7))) {
          const bytes = item.getData();
          if (crypto.createHash('sha256').update(bytes).digest('hex') !== item.entryName.slice(7,71)) throw new Error('Вложение в архиве повреждено.');
          assets.push(item);
        }
        else if (!['workspace.json', 'settings.json'].includes(item.entryName)) throw new Error('Недопустимый путь внутри архива.');
      }
      await this.createArchive(path.join(this.folder, 'backups', `before-import-${Date.now()}.diary`));
      for (const item of assets) await atomicWrite(path.join(this.folder, item.entryName), item.getData());
      for (const entry of pages) { const target = this.pagePath(entry.id); let current; try { current = JSON.parse(await fs.readFile(target, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; } if (!current || current.updatedAt < entry.updatedAt) await atomicWrite(target, JSON.stringify(entry, null, 2)); }
      return { count: pages.length };
    });
  }
  migrate(entries, settings, source = 'indexeddb-v1') {
    return this.enqueue(async () => {
      this.requireOpen(); const file = path.join(this.folder, 'workspace.json'); const manifest = JSON.parse(await fs.readFile(file, 'utf8')); if (manifest.migrations?.includes(source)) return { count: 0, alreadyMigrated: true };
      const validated = entries.map(validateEntry); await atomicWrite(path.join(this.folder, 'backups', `legacy-${Date.now()}.json`), JSON.stringify({ entries: validated, settings }));
      for (const entry of validated) { const target = this.pagePath(entry.id); try { await fs.access(target); continue; } catch { /* Missing page. */ } entry.content = await this.externalize(entry.content); entry.overlay = await this.externalize(entry.overlay); if (entry.blocks) entry.blocks = JSON.parse(await this.externalize(JSON.stringify(entry.blocks))); await atomicWrite(target, JSON.stringify(entry, null, 2)); }
      const current = JSON.parse(await fs.readFile(path.join(this.folder, 'settings.json'), 'utf8')); await atomicWrite(path.join(this.folder, 'settings.json'), JSON.stringify({ ...settings, ...current }, null, 2)); manifest.migrations = [...(manifest.migrations || []), source]; await atomicWrite(file, JSON.stringify(manifest, null, 2)); return { count: validated.length };
    });
  }
  assetPath(id) { this.requireOpen(); if (!assetPattern.test(id)) throw new Error('Некорректное вложение.'); return path.join(this.folder, 'assets', id); }
  async close() { await this.queue; if (this.lock) await fs.rm(this.lock, { force: true }); this.lock = null; this.folder = null; }
}
module.exports = { Workspace, atomicWrite, validateEntry };
