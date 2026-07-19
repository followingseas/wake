import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { writeFile } from 'fs/promises'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { listProjects, listSessions } from './lib/scanner'
import { parseConversation } from './lib/parser'
import { deleteSession, forkSession, resumeSession, revealSession } from './lib/actions'
import { loadSettings, saveSettings } from './lib/settings'
import { listTerminals } from './lib/terminals'
import type { AppSettings, SettingsInfo } from '../shared/types'

function settingsInfo(): SettingsInfo {
  return { settings: loadSettings(), terminals: listTerminals() }
}

function registerIpcHandlers(): void {
  ipcMain.handle('projects:list', () => listProjects())
  ipcMain.handle('sessions:list', (_event, projectId: string) => listSessions(projectId))
  ipcMain.handle('conversation:load', (_event, filePath: string) => parseConversation(filePath))
  ipcMain.handle('session:resume', (_event, sessionId: string, cwd: string | null) =>
    resumeSession(sessionId, cwd)
  )
  ipcMain.handle('session:fork', (_event, sessionId: string, cwd: string | null) =>
    forkSession(sessionId, cwd)
  )
  ipcMain.handle('session:delete', (_event, filePath: string) => deleteSession(filePath))
  ipcMain.handle('session:reveal', (_event, filePath: string) => revealSession(filePath))
  ipcMain.handle('shell:openExternal', (_event, url: string) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url)
  })
  ipcMain.handle('settings:get', () => settingsInfo())
  ipcMain.handle('settings:save', (_event, settings: AppSettings) => {
    saveSettings({ terminal: typeof settings?.terminal === 'string' ? settings.terminal : 'auto' })
    return settingsInfo()
  })
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#171512',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 개발용 스크린샷: CHV_CAPTURE=경로 로 실행하면 첫 세션을 열어 캡처하고 종료한다
  if (process.env.CHV_CAPTURE) {
    mainWindow.webContents.on('did-finish-load', () => {
      setTimeout(async () => {
        await mainWindow.webContents.executeJavaScript(
          process.env.CHV_JS ?? `document.querySelector('.session')?.click()`
        )
        await new Promise((resolve) => setTimeout(resolve, 2500))
        if (process.env.CHV_SCROLL) {
          await mainWindow.webContents.executeJavaScript(
            `document.querySelector('.conversation__scroll')?.scrollBy(0, ${Number(process.env.CHV_SCROLL)})`
          )
          await new Promise((resolve) => setTimeout(resolve, 400))
        }
        const image = await mainWindow.webContents.capturePage()
        await writeFile(process.env.CHV_CAPTURE as string, image.toPNG())
        app.quit()
      }, 2000)
    })
  }

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.jeongph.wake')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcHandlers()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
