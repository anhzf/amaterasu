import { ElectronUtils as IElectronUtils, FirestoreAdmin as IFirestoreAdmin, GApis as IGApi } from 'app/src-electron/interfaces';

declare global {
  const GApis: IGApi;
  const FirestoreAdmin: IFirestoreAdmin;
  const ElectronUtils: IElectronUtils;
}

export { };
