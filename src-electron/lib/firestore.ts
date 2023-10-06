import { FirestoreAdmin, GApis } from 'app/src-electron/interfaces';
import { DEFAULT_PROJECT_ID, firestore } from 'app/src-electron/lib/firebase-services';
import { toFirestoreDataTypeSchema } from 'app/src-electron/schemas';
import {
  CollectionReferenceSchema, DataSchema, DocumentReferenceSchema,
} from 'app/src-shared/schemas';
import { IpcRendererEvent, ipcRenderer } from 'electron';
import { FieldPath, FieldValue } from 'firebase-admin/firestore';
import {
  ValiError,
  flatten,
  parse,
  record,
} from 'valibot';

const listCollections: GApis['firestore']['collection']['list'] = async (path = '/', projectId = DEFAULT_PROJECT_ID) => {
  const root = path === '/'
    ? firestore(projectId)
    : firestore(projectId).doc(path);

  const result = await root.listCollections();

  return result.map((collection) => parse(CollectionReferenceSchema, collection));
};

export const collection = {
  list: listCollections,
};

/**
 * @todo implements offset
 */
const listDocuments: GApis['firestore']['document']['list'] = async (path, offset, projectId = DEFAULT_PROJECT_ID) => {
  const db = firestore(projectId);

  const collectionRef = db.collection(path);

  const docs = await collectionRef.listDocuments();

  const result = await db.getAll(...docs);

  try {
    return {
      data: await Promise.all(result.map(async (document) => ({
        ref: parse(DocumentReferenceSchema, document.ref),
        data: parse(DataSchema, document.data(), { abortEarly: true }),
        subcollections: (await document.ref.listCollections()).map((el) => parse(CollectionReferenceSchema, el)),
      }))),

      // Currently not working,
      // it should store the latest snapshot of the last document then the client receives an Id and use it to get the next snapshot
      offset: result.at(-1)?.id,
    };
  } catch (err) {
    console.log(err instanceof ValiError && flatten(err), { err });
    throw err;
  }
};

export const documentCreate: FirestoreAdmin['document']['create'] = async (projectId, path, data) => {
  const db = firestore(projectId);

  const docRef = path.split('/').filter(Boolean).length % 2 === 0
    ? db.doc(path)
    : db.collection(path).doc();

  const parsed = parse(record(toFirestoreDataTypeSchema), data);

  await docRef.create(parsed);
};

export const documentUpdate: FirestoreAdmin['document']['update'] = async (projectId, path, updates) => {
  const db = firestore(projectId);

  const docRef = db.doc(path);

  const transformedUpdateValues = updates.map((update, i) => {
    // Expecting a FieldPath for every even index
    if (i % 2 === 0) {
      return update;
    }

    return parse(toFirestoreDataTypeSchema, update);
  }) as [FieldPath, any, ...any[]];

  await docRef.update(...transformedUpdateValues);
};

export const documentDeletes: FirestoreAdmin['document']['deletes'] = async (projectId, ...paths) => {
  const db = firestore(projectId);

  const docRefs = paths.map((path) => db.doc(path));

  const batch = db.batch();

  docRefs.forEach((docRef) => batch.delete(docRef));

  await batch.commit();
};

export const document = {
  list: listDocuments,
};
