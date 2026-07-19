import { contextBridge, ipcRenderer } from 'electron'
import type { ClaudeHistoryApi } from '../shared/types'

const api: ClaudeHistoryApi = {
  listProjects: () => ipcRenderer.invoke('projects:list'),
  listSessions: (projectId) => ipcRenderer.invoke('sessions:list', projectId),
  loadConversation: (filePath) => ipcRenderer.invoke('conversation:load', filePath),
  resumeSession: (sessionId, cwd) => ipcRenderer.invoke('session:resume', sessionId, cwd),
  forkSession: (sessionId, cwd) => ipcRenderer.invoke('session:fork', sessionId, cwd),
  deleteSession: (filePath) => ipcRenderer.invoke('session:delete', filePath),
  revealSession: (filePath) => ipcRenderer.invoke('session:reveal', filePath),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  checkForUpdate: (force) => ipcRenderer.invoke('update:check', force)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.api = api
}
