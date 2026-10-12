import { toEntry, newId, escapeHTML } from './model';
export const desktop = Boolean(window.diary);
const openDB = (name = 'LocalDiaryDB') => new Promise((resolve, reject) => {
  const request = indexedDB.open(name, 1);
  request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('entries')) request.result.createObjectStore('entries', { keyPath: 'id' }); };
  request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
});
async function transaction(mode, action, name) {
  const db = await openDB(name);
  return new Promise((resolve, reject) => {
    const tx = db.transaction('entries', mode); let result;
    const request = action(tx.objectStore('entries')); request.onsuccess = () => { result = request.result; };
    tx.oncomplete = () => { db.close(); resolve(result); }; tx.onerror = tx.onabort = () => { db.close(); reject(tx.error || new Error('Не удалось сохранить данные.')); };
  });
}
const legacyList = () => transaction('readonly', store => store.getAll());
const settingsKeys = ['diaryLang', 'diaryTheme', 'diaryFont', 'diaryFontSize', 'diaryDrawColor', 'diaryDrawSize'];
export const localSettings = () => Object.fromEntries(settingsKeys.map(key => [key, localStorage.getItem(key)]).filter(([,value]) => value !== null));
function download(name, data, type = 'application/json') { const url = URL.createObjectURL(new Blob([data], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
export const storage = {
  async init() {
    if (!desktop) return { path: 'Хранилище браузера', desktop: false };
    const info = await window.diary.info();
    if (info.path) {
      const old = await legacyList();
      if (info.migrateLegacy && old.length) await window.diary.migrate(old.map(toEntry), localSettings());
      const settings = await window.diary.settings();
      for (const key of settingsKeys) if (settings[key] !== undefined) localStorage.setItem(key, settings[key]);
    }
    return info;
  },
  list: () => desktop ? window.diary.list() : legacyList(),
  get: id => desktop ? window.diary.get(id) : transaction('readonly', store => store.get(id)),
  async save(entry) {
    const next = toEntry(entry); if (desktop) return window.diary.save(next); const previous = await storage.get(entry.id);
    if(previous && (previous.content!==next.content || previous.title!==next.title || previous.overlay!==next.overlay || previous.deletedAt!==next.deletedAt)) await transaction('readwrite',store=>store.put({id:newId(),pageId:entry.id,entry:previous}),'DiaryHistoryDB');
    await transaction('readwrite', store => store.put(next)); return next;
  },
  async history(id) { if(desktop)return window.diary.history(id); const items=await transaction('readonly',store=>store.getAll(),'DiaryHistoryDB');return items.filter(item=>item.pageId===id).map(item=>({id:item.id,title:item.entry.title,updatedAt:item.entry.updatedAt})).sort((a,b)=>b.updatedAt-a.updatedAt); },
  async revision(id,name) { if(desktop)return window.diary.revision(id,name);const item=await transaction('readonly',store=>store.get(name),'DiaryHistoryDB');if(item?.pageId!==id)throw new Error('Версия не найдена.');return item.entry; },
  async saveSettings() { if (desktop) await window.diary.settings(localSettings()); },
  async export() {
    if (desktop) return window.diary.export();
    download(`Diary-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify({ format: 'diary-browser', version: 2, entries: await legacyList(), settings: localSettings() })); return true;
  },
  async importFile(file) {
    const data = JSON.parse(await file.text());
    if (data.format !== 'diary-browser' || !Array.isArray(data.entries)) throw new Error('Выберите экспортированный архив браузерной версии.');
    // Validate the complete archive before writing anything.
    const pages = data.entries.map(e => { if (!e || !/^[a-zA-Z0-9_-]{1,100}$/.test(e.id) || typeof e.content !== 'string') throw new Error('Некорректная страница в архиве.'); return toEntry(e); });
    download(`Diary-before-import-${Date.now()}.json`, JSON.stringify({ format: 'diary-browser', version: 2, entries: await legacyList(), settings: localSettings() }));
    for (const entry of pages) { const existing = await storage.get(entry.id); if (!existing || entry.updatedAt > existing.updatedAt) await storage.save(entry); }
    return { count: pages.length };
  },
};
export async function exportPage(entry) {
  const root=document.createElement('div');root.innerHTML=toEntry(entry).content;
  for(const el of root.querySelectorAll('[src],[href]')){const attr=el.hasAttribute('src')?'src':'href';const url=el.getAttribute(attr);if(url?.startsWith('diary-asset:')){const blob=await(await fetch(url)).blob();const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});el.setAttribute(attr,data);}}
  for(const el of root.querySelectorAll('.diary-database')){try{const db=JSON.parse(decodeURIComponent(el.dataset.database));el.innerHTML=`<h2>${escapeHTML(db.title)}</h2><ul>${db.rows.map(row=>`<li><strong>${escapeHTML(row.title)}</strong><p>${escapeHTML(row.body)}</p></li>`).join('')}</ul>`;}catch{el.textContent='База записей';}}
  download(`${(entry.title || 'Страница').replace(/[<>:"/\\|?*]/g, '_')}.html`, `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHTML(entry.title)}</title><style>body{font:16px/1.6 system-ui;max-width:900px;margin:40px auto;padding:20px}img{max-width:100%}table{border-collapse:collapse}td{border:1px solid #aaa;padding:8px}</style></head><body><h1>${escapeHTML(entry.title)}</h1>${root.innerHTML}</body></html>`, 'text/html');
}
