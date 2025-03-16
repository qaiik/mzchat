const { contextBridge, ipcRenderer, dialog } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  openImageDialog: dialog
})
