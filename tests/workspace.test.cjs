const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const AdmZip = require('adm-zip');
const { Workspace } = require('../electron/workspace.cjs');
const page = (id, content = '<p>Запись</p>') => ({ id, title: 'Проверка', content, createdAt: 1, updatedAt: 1 });
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'diary-test-')); const store = new Workspace(); await store.open(path.join(root, 'one'), true);
  t.after(async () => { await store.close(); await fs.rm(root, { recursive: true, force: true }); }); return { root, store };
}
test('migration keeps legacy backup, extracts attachments, and runs once', async t => {
  const { store } = await fixture(t); const content = '<p><a download="file.txt" href="data:text/plain;base64,aGVsbG8=">Файл</a></p>';
  await store.migrate([page('legacy',content)],{diaryLang:'he'}); const entry = await store.get('legacy');
  assert.match(entry.content,/diary-asset:\/\/local\/[a-f0-9]+\.txt/); assert.equal((await fs.readdir(path.join(store.folder,'assets'))).length,1);
  assert.equal((await store.settings()).diaryLang,'he'); assert.equal((await store.migrate([page('legacy','wrong')],{})).alreadyMigrated,true);
  assert.equal((await store.get('legacy')).content,entry.content); assert.ok((await fs.readdir(path.join(store.folder,'backups'))).some(name=>name.startsWith('legacy-')));
});
test('workspace copy to another folder preserves pages and relative assets',async t=>{
  const {store,root}=await fixture(t);await store.save(page('portable','<img src="data:image/png;base64,aGVsbG8=">'));
  const first=store.folder;await store.close();const copied=path.join(root,'copied');await fs.cp(first,copied,{recursive:true});await store.open(copied);
  const entry=await store.get('portable');assert.match(entry.content,/diary-asset:/);const id=entry.content.match(/local\/([^"<]+)/)[1];assert.equal(await fs.readFile(store.assetPath(id),'utf8'),'hello');
});
test('queued writes retain newest revision and reject a second writer',async t=>{
  const{store}=await fixture(t);await Promise.all(Array.from({length:8},(_,i)=>store.save({...page('queue'),updatedAt:i+1,title:String(i)})));
  assert.equal((await store.get('queue')).title,'7');const other=new Workspace();await assert.rejects(other.open(store.folder),/уже открыто/);
});
test('invalid IDs cannot escape workspace and queue recovers after error',async t=>{
  const{store}=await fixture(t);await assert.rejects(store.save(page('../outside')));assert.throws(()=>store.assetPath('../../outside'));
  await store.save(page('valid'));assert.equal((await store.list()).length,1);
});
test('archive restores assets and merges without overwriting newer page',async t=>{
  const{store,root}=await fixture(t);await store.save(page('archive','<p><input type="checkbox" checked></p><img src="data:image/png;base64,aGVsbG8=">'));const zip=path.join(root,'export.diary');await store.export(zip);
  await store.save({...page('archive','newer'),updatedAt:100});await store.importArchive(zip);assert.equal((await store.get('archive')).content,'newer');
  await store.open(path.join(root,'two'),true);await store.importArchive(zip);assert.match((await store.get('archive')).content,/checked/);assert.equal((await fs.readdir(path.join(store.folder,'assets'))).length,1);assert.ok((await fs.readdir(path.join(store.folder,'backups'))).some(n=>n.startsWith('before-import-')));
});
test('unsafe archive path and future version fail before page writes',async t=>{
  const{store,root}=await fixture(t);const zip=new AdmZip();zip.addFile('workspace.json',Buffer.from(JSON.stringify({format:'diary-workspace',version:2})));zip.addFile('pages/wrong.json',Buffer.from(JSON.stringify(page('different'))));const file=path.join(root,'bad.diary');zip.writeZip(file);
  await assert.rejects(store.importArchive(file));assert.deepEqual(await store.list(),[]);
});
test('previous page versions are available after changes',async t=>{
  const{store}=await fixture(t);await store.save(page('history','first'));await store.save({...page('history','second'),updatedAt:2});const versions=await store.history('history');assert.equal(versions.length,1);assert.equal((await store.revision('history',versions[0].id)).content,'first');await assert.rejects(store.revision('history','../bad'));
});
test('browser archive imports to desktop and extracts embedded assets',async t=>{
  const{store,root}=await fixture(t);const file=path.join(root,'browser.json');await fs.writeFile(file,JSON.stringify({format:'diary-browser',version:2,entries:[page('browser','<img src="data:image/png;base64,aGVsbG8=">')]}));await store.importJSON(file);assert.match((await store.get('browser')).content,/diary-asset:/);
});
test('corrupt attachment fails validation without overwriting workspace',async t=>{
  const{store,root}=await fixture(t);await store.save(page('intact','original'));const zip=new AdmZip();zip.addFile('workspace.json',Buffer.from(JSON.stringify({format:'diary-workspace',version:2})));zip.addFile('assets/'+ 'a'.repeat(64)+'.png',Buffer.from('incorrect hash'));zip.addFile('pages/intact.json',Buffer.from(JSON.stringify({...page('intact','wrong'),updatedAt:100})));const file=path.join(root,'corrupt.diary');zip.writeZip(file);
  await assert.rejects(store.importArchive(file),/повреждено/);assert.equal((await store.get('intact')).content,'original');assert.equal((await fs.readdir(path.join(store.folder,'assets'))).length,0);
});
