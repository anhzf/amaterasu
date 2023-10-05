import { contextBridge } from 'electron';
import { google } from 'googleapis';
import { mainLog } from 'app/src-electron/utils/ipcMain';
import { ElectronUtils, FirestoreAdmin, GApis } from './interfaces';
import * as firestore from './lib/firestore';
// import { firestore as firestoreService } from './lib/firebase-services';

google.options({
  auth: google.auth,
});

const firebaseApis = google.firebase('v1beta1');

contextBridge.exposeInMainWorld('GApis', <GApis>{
  projects: {
    list: firebaseApis.projects.list.bind(firebaseApis),
  },
  firestore,
});

contextBridge.exposeInMainWorld('FirestoreAdmin', <FirestoreAdmin>{
  document: {
    update: firestore.documentUpdate,
    create: firestore.documentCreate,
  },
});

contextBridge.exposeInMainWorld('ElectronUtils', <ElectronUtils>{
  mainLog,
});
