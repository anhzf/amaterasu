import { ipcRenderer } from 'electron';

export const mainLog = (...args: any[]) => {
  ipcRenderer.send('log', ...args);
};
