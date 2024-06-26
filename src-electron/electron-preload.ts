import { mainLog } from 'app/src-electron/utils/ipcMain';
import { contextBridge } from 'electron';
import { google } from 'googleapis';
import { ElectronUtils, FirestoreAdmin, GApis } from './interfaces';
import {
  collection, document,
  documentCreate,
  documentDeletes,
  documentUpdate,
  recursiveDeletes,
} from './lib/firestore';

google.options({
  auth: google.auth,
});

const firebaseApis = google.firebase('v1beta1');

contextBridge.exposeInMainWorld('GApis', <GApis>{
  projects: {
    list: firebaseApis.projects.list.bind(firebaseApis),
  },
  firestore: {
    collection,
    document,
  },
});

contextBridge.exposeInMainWorld('FirestoreAdmin', <FirestoreAdmin>{
  document: {
    update: documentUpdate,
    create: documentCreate,
    deletes: documentDeletes,
  },
  recursiveDeletes,
});

contextBridge.exposeInMainWorld('ElectronUtils', <ElectronUtils>{
  mainLog,
});
