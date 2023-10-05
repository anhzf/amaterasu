import {
  BaseSchema, array, boolean, date, nullType, number, record, recursive, string, union,
} from 'valibot';

export const FirestoreRecordSchema: BaseSchema = recursive(() => record(union([
  date(),
  array(FirestoreRecordSchema),
  FirestoreRecordSchema,
  boolean(),
  string(),
  number(),
  nullType(),
])));
