const { app, BrowserWindow } = require('electron');
const path = require('path');
function createWindow() {
  const win = new BrowserWindow({
    width:1600, height:1200, minWidth:1000, minHeight:600, autoHideMenuBar:true,
    icon:path.join(__dirname,'dist','icon.ico'),
    webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}
  });
  win.loadFile(path.join(__dirname,'dist','index.html'));
}
app.whenReady().then(createWindow);
app.on('window-all-closed',()=>{if(process.platform!=='darwin') app.quit();});
