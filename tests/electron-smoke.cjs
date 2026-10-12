const { app } = require('electron');
const fs = require('node:fs');
const assert = require('node:assert/strict');
let result = false;
let consoleErrors = '';
const finish = (ok, detail) => { if(result)return;result=true;fs.writeFileSync(process.env.DIARY_TEST_RESULT,JSON.stringify({ok,detail}));if(!ok)app.exit(1); };
setTimeout(()=>finish(false,'Desktop check timed out'),25000);
app.on('browser-window-created', (_event, win) => {
  win.webContents.on('console-message', (_event, details) => { if(details.level === 'error') consoleErrors += details.message + '\n'; });
  win.webContents.once('did-finish-load', async()=>{
    try {
      const value=await win.webContents.executeJavaScript(`(async()=>{
        const info=await window.diary.info();
        const entry={id:'native-smoke',title:'Desktop smoke test',content:'<p><input type="checkbox" checked>Ready</p><img src="data:image/png;base64,aGVsbG8=">',overlay:null,createdAt:1,updatedAt:1};
        const saved=await window.diary.save(entry);const loaded=await window.diary.get(entry.id);
        const asset=saved.content.match(/diary-asset:[^"<]+/)[0];const response=await fetch(asset);
        let rejected=false;try{await window.diary.openExternal('javascript:alert(1)');}catch{rejected=true;}
        return{info,loaded,assetText:await response.text(),rejected,nodeAvailable:typeof window.require};
      })()`);
      assert.ok(value.info.path);assert.match(value.loaded.content,/checked/);assert.match(value.loaded.content,/diary-asset:/);assert.equal(value.assetText,'hello');assert.equal(value.rejected,true);assert.equal(value.nodeAvailable,'undefined');
      finish(true,'Electron preload, IPC, asset protocol, persistence and safe URL checks passed');win.close();
    }catch(error){finish(false,error.message+'\n'+consoleErrors);}
  });
});
require(process.env.DIARY_PACKAGED_ROOT ? require('node:path').join(process.env.DIARY_PACKAGED_ROOT, 'main.cjs') : '../main.cjs');
