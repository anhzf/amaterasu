import {
  App,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import { initializeFirestore } from 'firebase-admin/firestore';

let activeApp: App;

const useApp = (projectId?: string) => {
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

export const DEFAULT_PROJECT_ID = useApp().name;

export const getActiveApp = () => activeApp ?? useApp();

export const firestore = (projectId = DEFAULT_PROJECT_ID) => initializeFirestore(useApp(projectId));
