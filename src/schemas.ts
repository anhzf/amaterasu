import {
  BaseSchema,
  array, boolean, date, null_, number, record, recursive, string,
  undefined_,
  union,
} from 'valibot';

export const FirestoreDataSchema: BaseSchema = recursive(() => union([
  date(),
  array(FirestoreDataSchema),
  record(FirestoreDataSchema),
  boolean(),
  string(),
  number(),
  null_(),
  undefined_(),
]));

export const FirestoreRecordSchema = record(FirestoreDataSchema);
