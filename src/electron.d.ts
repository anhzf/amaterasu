import { ElectronUtils as IElectronUtils, FirestoreAdmin as IFirestoreAdmin, GApis as IGApi } from 'app/src-electron/interfaces';
// eslint-disable-next-line camelcase
import type { __experimental_FirestoreAdmin__ as t__experimental_FirestoreAdmin__ } from 'app/src-electron/lib/firestore';

declare global {
  const GApis: IGApi;
  const FirestoreAdmin: IFirestoreAdmin;
  const ElectronUtils: IElectronUtils;
  // eslint-disable-next-line camelcase
  const __experimental_FirestoreAdmin__: typeof t__experimental_FirestoreAdmin__;
}

export { };
