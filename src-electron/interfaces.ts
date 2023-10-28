import { FieldPath, FieldValue } from 'firebase-admin/firestore';
import {
  CollectionReferenceSchema, DataSchema,
  DocumentReferenceSchema,
} from 'app/src-shared/schemas';
import { RecordOf } from 'app/src-shared/utils/type';
import { type firebase_v1beta1 } from 'googleapis';
import { Output } from 'valibot';

export interface ElectronUtils {
  mainLog: (...args: any[]) => void;
}

export interface GApis {
  // eslint-disable-next-line camelcase
  projects: Pick<RecordOf<firebase_v1beta1.Firebase>['projects'], 'list'>;
  firestore: {
    collection: {
      list: (path?: string, projectId?: string) => Promise<Output<typeof CollectionReferenceSchema>[]>;
    };
    document: {
      list: (path: string, offset?: string, project?: string) => Promise<{
        data: {
          ref: Output<typeof DocumentReferenceSchema>;
          data: Output<typeof DataSchema>;
          subcollections: Output<typeof CollectionReferenceSchema>[];
        }[];
        offset?: string;
      }>;
    };
  };
}

export interface FirestoreAdmin {
  query: {
    listen: () => void;
  };
  document: {
    create: (projectId: string, path: string, data: Output<typeof DataSchema>[]) => Promise<void>;
    update: (projectId: string, path: string, updates: [FieldPath, FieldValue, ...any]) => Promise<void>;
    deletes: (projectId: string, ...paths: string[]) => Promise<void>;
  };
  recursiveDeletes: (projectId: string, path: string) => Promise<void>;
}
