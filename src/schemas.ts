import {
  BaseSchema, array, boolean, date, nullType, number, record, recursive, string,
  undefinedType,
  union,
} from 'valibot';

export const FirestoreRecordSchema: BaseSchema<Record<string, any>> = recursive(() => record(union([
  date(),
  array(FirestoreRecordSchema),
  FirestoreRecordSchema,
  boolean(),
  string(),
  number(),
  nullType(),
  undefinedType(),
])));
