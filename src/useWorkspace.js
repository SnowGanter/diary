import { useCallback, useEffect, useRef, useState } from 'react';
import { storage } from './storage';
import { emptyEntry, toEntry, cloneEntry, canMovePage } from './model';

export default function useWorkspace() {
  const [entries, setEntries] = useState([]);
  const [activeEntry, setActive] = useState(null);
  const [info, setInfo] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const active = useRef(null);
  const drafts = useRef(new Map());
  const saving = useRef(null);
  const select = useCallback(entry => { active.current = entry; setActive(entry); }, []);
  const fail = useCallback(error => { setError(error.message || String(error)); setStatus('error'); }, []);
  const refresh = useCallback(async (preferred) => {
    const list = await storage.list(); setEntries(list);
    const next = list.find(e => e.id === preferred && !e.deletedAt) || list.find(e => !e.deletedAt);
    select(next ? await storage.get(next.id) : null); setStatus('saved');
  }, [select]);
  useEffect(() => {
    let alive = true;
    storage.init().then(async workspace => {
      if (!alive) return; setInfo(workspace);
      if (!workspace.desktop || workspace.path) await refresh(location.hash.startsWith('#page/') ? location.hash.slice(6).split('/')[0] : undefined);
      else setStatus('saved');
    }).catch(fail);
    return () => { alive = false; };
  }, [refresh, fail]);
  const update = useCallback(next => {
    const previous = active.current;
    const value = typeof next === 'function' ? next(previous) : next;
    if (!value) { select(value); return; }
    const entry = { ...value, updatedAt: Date.now() };
    drafts.current.set(entry.id, entry); select(entry);
    setEntries(list => list.map(e => e.id === entry.id ? { ...e, title: entry.title, parentId: entry.parentId, favorite: entry.favorite, locked: entry.locked, searchText: entry.searchText, updatedAt: entry.updatedAt } : e));
    setStatus('dirty');
  }, [select]);
  const flush = useCallback(async () => {
    if (saving.current) { await saving.current; if (!drafts.current.size) return; }
    if (!drafts.current.size) return;
    const task = (async () => {
      setStatus('saving');
      while (drafts.current.size) {
        const [id, draft] = drafts.current.entries().next().value;
        const saved = await storage.save(draft);
        if (drafts.current.get(id) === draft) drafts.current.delete(id);
        setEntries(list => list.map(e => e.id === id ? { ...e, ...saved, content: undefined, blocks: undefined, overlay: undefined } : e));
      }
      setStatus('saved'); setError('');
    })();
    saving.current = task;
    try { await task; } catch (error) { fail(error); throw error; } finally { saving.current = null; }
  }, [fail]);
  useEffect(() => { if (status !== 'dirty') return; const timer = setTimeout(() => { flush().catch(() => {}); }, 700); return () => clearTimeout(timer); }, [activeEntry, status, flush]);
  useEffect(() => {
    const preventLoss = e => { if (drafts.current.size) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', preventLoss);
    const hide = () => { if (document.visibilityState === 'hidden') flush().catch(() => {}); };
    document.addEventListener('visibilitychange', hide);
    const unsubscribe = window.diary?.onFlush(async () => { try { await flush(); window.diary.flushed(); } catch (error) { window.diary.flushed(error.message); } });
    return () => { window.removeEventListener('beforeunload', preventLoss); document.removeEventListener('visibilitychange', hide); unsubscribe?.(); };
  }, [flush]);
  const open = useCallback(async id => {
    await flush(); const entry = await storage.get(id); if (!entry || entry.deletedAt) throw new Error('Страница находится в корзине или недоступна.'); select(toEntry(entry)); location.hash = `page/${id}`;
  }, [flush, select]);
  const create = useCallback(async parentId => {
    await flush(); const entry = await storage.save(emptyEntry(parentId)); setEntries(list => [entry, ...list]); select(entry); location.hash = `page/${entry.id}`; setStatus('saved'); return entry;
  }, [flush, select]);
  const duplicate = useCallback(async id => { await flush(); const entry = await storage.save(cloneEntry(await storage.get(id))); setEntries(list => [entry, ...list]); select(entry); location.hash = `page/${entry.id}`; }, [flush, select]);
  const patch = useCallback(async (id, fields) => {
    if (active.current?.id === id) { update(entry => ({ ...entry, ...fields })); await flush(); }
    else { await flush(); const entry = await storage.get(id); await storage.save({ ...entry, ...fields, updatedAt: Date.now() }); setEntries(list => list.map(e => e.id === id ? { ...e, ...fields } : e)); }
  }, [flush, update]);
  const trash = useCallback(async id => {
    await flush(); const list = await storage.list(); const ids = new Set([id]);
    let changed = true; while (changed) { changed = false; for (const e of list) if (ids.has(e.parentId) && !ids.has(e.id)) { ids.add(e.id); changed = true; } }
    const deletionGroup=crypto.randomUUID();const deletedAt=Date.now();
    for (const page of list.filter(e => ids.has(e.id) && !e.deletedAt)) await storage.save({ ...await storage.get(page.id), deletedAt, deletionGroup, updatedAt: Date.now() });
    await refresh(ids.has(active.current?.id) ? undefined : active.current?.id);
  }, [flush, refresh]);
  const restore = useCallback(async id => {
    await flush(); const list = await storage.list(); const root=list.find(e=>e.id===id);const subtree=new Set([id]);
    let changed=true;while(changed){changed=false;for(const child of list)if(subtree.has(child.parentId)&&!subtree.has(child.id)&&child.deletionGroup===root.deletionGroup){subtree.add(child.id);changed=true;}}
    let page=root;const seen=new Set();while(page&&!seen.has(page.id)){seen.add(page.id);subtree.add(page.id);page=list.find(e=>e.id===page.parentId);}
    for(const page of list.filter(e=>subtree.has(e.id)))await storage.save({...await storage.get(page.id),deletedAt:null,deletionGroup:null,updatedAt:Date.now()});
    await refresh(id);
  }, [flush, refresh]);
  const move = useCallback(async (id, parentId) => { if (!canMovePage(entries, id, parentId)) throw new Error('Нельзя переместить страницу внутрь самой себя.'); await patch(id, { parentId }); }, [entries, patch]);
  const changeWorkspace = useCallback(async createNew => { await flush(); const next = await window.diary.choose(createNew); if (next) { const initialized = await storage.init(); setInfo(initialized); await refresh(); } }, [flush, refresh]);
  return { entries, activeEntry, update, info, status, error, fail, flush, refresh, open, create, duplicate, patch, trash, restore, move, changeWorkspace };
}
