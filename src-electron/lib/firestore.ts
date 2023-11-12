import { FIRESTORE_BATCH_LIMIT } from 'app/src-electron/constants';
import { FirestoreAdmin, GApis } from 'app/src-electron/interfaces';
import { DEFAULT_PROJECT_ID, firestore } from 'app/src-electron/lib/firebase-services';
import { toFirestoreDataTypeSchema } from 'app/src-electron/schemas';
import windowCleanup from 'app/src-electron/window-cleanup';
import {
  CollectionReferenceSchema, DataSchema, DocumentReferenceSchema, JSONReferenceSchema,
} from 'app/src-shared/schemas';
import { splitChunks } from 'app/src-shared/utils/array';
import {
  contextBridge,
} from 'electron';
import {
  FieldPath, OrderByDirection, Query, WhereFilterOp,
} from 'firebase-admin/firestore';
import {
  Output,
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

export const document = {
  list: listDocuments,
};

export const documentCreate: FirestoreAdmin['document']['create'] = async (projectId, path, data) => {
  const db = firestore(projectId);

  await Promise.allSettled(splitChunks(data, FIRESTORE_BATCH_LIMIT)
    .map(async (chunk) => {
      const batch = db.batch();

      chunk.forEach((el) => {
        const parsed = parse(record(toFirestoreDataTypeSchema), el);
        const docRef = typeof parsed.id === 'string'
          ? db.collection(path).doc(parsed.id)
          : db.collection(path).doc();
        batch.create(docRef, parsed);
      });

      await batch.commit();
    }));
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

export const recursiveDeletes: FirestoreAdmin['recursiveDeletes'] = async (projectId, path) => {
  const db = firestore(projectId);
  const isDoc = path.split('/').length % 2 === 0;
  await db.recursiveDelete(isDoc ? db.doc(path) : db.collection(path));
};

interface IQuery {
  where?: [
    FieldPath | string,
    WhereFilterOp,
    any,
  ][];
  orderBy?: [
    FieldPath | string,
    OrderByDirection,
  ][];
  startAt?: any[] | Output<typeof JSONReferenceSchema>;
  startAfter?: any[] | Output<typeof JSONReferenceSchema>;
  endAt?: any[] | Output<typeof JSONReferenceSchema>;
  endBefore?: any[] | Output<typeof JSONReferenceSchema>;
  limit?: number;
  limitToLast?: number;
}

interface DocumentsListenOptions {
  projectId: string;
  path: string;
  query?: IQuery;
  onSnapshot: (docs: Output<typeof DataSchema>[]) => void;
  onError?: (err: Error) => void;
}

// eslint-disable-next-line camelcase
export const __experimental_FirestoreAdmin__ = {
  documentsListen: async ({
    projectId,
    path,
    query,
    onSnapshot,
    onError = console.error,
  }: DocumentsListenOptions) => {
    const db = firestore(projectId);
    const root = db.collection(path)
      .withConverter<any>({
        fromFirestore(snapshot) {
          return parse(DataSchema, snapshot.data());
        },
        toFirestore(data) {
          return parse(record(toFirestoreDataTypeSchema), data);
        },
      });

    let q: Query = root;

    if (query?.where) {
      query.where.forEach((where) => {
        q = q.where(...where);
      });
    }

    if (query?.orderBy) {
      query.orderBy.forEach((orderBy) => {
        q = q.orderBy(...orderBy);
      });
    }

    if (query?.startAt) {
      q = Array.isArray(query.startAt)
        ? q.startAt(...query.startAt.map((el) => parse(toFirestoreDataTypeSchema, el)))
        : q.startAt(await db.doc(query.startAt.__ref__).get());
    }

    if (query?.startAfter) {
      q = Array.isArray(query.startAfter)
        ? q.startAfter(...query.startAfter.map((el) => parse(toFirestoreDataTypeSchema, el)))
        : q.startAfter(await db.doc(query.startAfter.__ref__).get());
    }

    if (query?.endAt) {
      q = Array.isArray(query.endAt)
        ? q.endAt(...query.endAt.map((el) => parse(toFirestoreDataTypeSchema, el)))
        : q.endAt(await db.doc(query.endAt.__ref__).get());
    }

    if (query?.endBefore) {
      q = Array.isArray(query.endBefore)
        ? q.endBefore(...query.endBefore.map((el) => parse(toFirestoreDataTypeSchema, el)))
        : q.endBefore(await db.doc(query.endBefore.__ref__).get());
    }

    if (query?.limit) {
      q = q.limit(query.limit);
    }

    if (query?.limitToLast) {
      q = q.limitToLast(query.limitToLast);
    }

    const unsubscribe = q.onSnapshot(async (snapshot) => {
      onSnapshot(await Promise.all(snapshot.docs.map(async (doc) => ({
        ...doc.data(),
        id: doc.id,
        _subcollections: (await doc.ref.listCollections()).map((el) => parse(CollectionReferenceSchema, el)),
      }))));
    }, onError);

    windowCleanup.push(unsubscribe);

    const getCount = async () => {
      /**
       * Rewrite query due to Aggregation limitation.
       * @see https://firebase.google.com/docs/firestore/query-data/aggregation-queries#limitations
       */
      let getCountQ: Query = root;

      if (query?.where) {
        query.where.forEach((where) => {
          getCountQ = q.where(...where);
        });
      }

      const snapshot = await getCountQ.count().get();
      // const snapshot = await q.count().get();
      return snapshot.data().count;
    };

    return { getCount, unsubscribe };
  },
};

contextBridge.exposeInMainWorld('__experimental_FirestoreAdmin__', __experimental_FirestoreAdmin__);
