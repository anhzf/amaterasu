import {
  BaseSchema, array, boolean, date, null_, number, record, recursive, string,
  undefined_,
  union,
} from 'valibot';

export const FirestoreRecordSchema: BaseSchema<Record<string, any>> = recursive(() => record(union([
  date(),
  array(FirestoreRecordSchema),
  FirestoreRecordSchema,
  boolean(),
  string(),
  number(),
  null_(),
  undefined_(),
])));
