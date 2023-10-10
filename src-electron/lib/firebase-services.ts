import electronConfig from 'app/src-electron/config';
import {
  App,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { initializeFirestore } from 'firebase-admin/firestore';
import appConfig from 'src/config';

const EMULATOR_HOST = '127.0.0.1';
const EMULATOR_APP_NAME = electronConfig.firebase.emulatorAppName;

let activeApp: App;


const setUpEmulatorEnv = () => {
  process.env.FIRESTORE_EMULATOR_HOST = `${EMULATOR_HOST}:${appConfig.firebase.emulator.port.firestore}`;
  process.env.FIREBASE_AUTH_EMULATOR_HOST = `${EMULATOR_HOST}:${appConfig.firebase.emulator.port.auth}`;
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = `${EMULATOR_HOST}:${appConfig.firebase.emulator.port.storage}`;
};

const clearEmulatorEnv = () => {
  process.env.FIRESTORE_EMULATOR_HOST = undefined;
  process.env.FIREBASE_AUTH_EMULATOR_HOST = undefined;
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = undefined;
};

const getEmulatorApp = () => getApps().find((el) => el.name === EMULATOR_APP_NAME)
  || initializeApp({}, EMULATOR_APP_NAME);
export const useApp = (projectId?: string) => {
  const app = getApps().find((el) => el.options.projectId === projectId);

  const usedApp = (() => {
    if (app) {
      return app;
    }

    return projectId
      ? initializeApp({ projectId }, projectId)
      : initializeApp({}, projectId);
  })();

  activeApp = usedApp;

  return usedApp;
};

getEmulatorApp();

export const DEFAULT_PROJECT_ID = useApp().name;

export const getActiveApp = () => activeApp ?? useApp();

export const firestore = (projectId = DEFAULT_PROJECT_ID) => {
  if (projectId === EMULATOR_APP_NAME) {
    setUpEmulatorEnv();
    const db = initializeFirestore(getEmulatorApp(), {});
    clearEmulatorEnv();
    return db;
  }

  return initializeFirestore(useApp(projectId));
};
