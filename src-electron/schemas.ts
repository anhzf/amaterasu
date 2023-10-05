import { getActiveApp } from 'app/src-electron/lib/firebase-services';
import { GeoPoint, Timestamp, initializeFirestore } from 'firebase-admin/firestore';
import {
  BaseSchema,
  Input, Output,
  array, boolean, nullType, number,
  object,
  record, recursive, string,
  transform, union, coerce, literal,
} from 'valibot';

export const toFirestoreReferenceSchema = transform(
  object({
    __ref__: string(),
  }),
  (value) => initializeFirestore(getActiveApp())
    .doc(value.__ref__),
);

export const toFirestoreTimestampSchema = transform(
  object({
    __timestamp__: union([
      transform(literal('$now'), () => Date.now()),
      coerce(number(), Number),
    ]),
  }),
  (value) => Timestamp.fromMillis(value.__timestamp__),
);

export const toFirestoreGeoSchema = transform(
  object({
    __geo__: object({
      latitude: number(),
      longitude: number(),
    }),
  }),
  (value) => new GeoPoint(value.__geo__.latitude, value.__geo__.longitude),
);

export const toFirestoreSpecialDataSchema = union([
  toFirestoreReferenceSchema,
  toFirestoreTimestampSchema,
  toFirestoreGeoSchema,
]);

type TInputDataTypeSchema = Input<typeof toFirestoreSpecialDataSchema>
  | string
  | number
  | boolean
  | null
  | TInputDataTypeSchema[]
  | { [k: string]: TInputDataTypeSchema };

type TOutputDataTypeSchema = Output<typeof toFirestoreSpecialDataSchema>
  | string
  | number
  | boolean
  | null
  | TOutputDataTypeSchema[]
  | { [k: string]: TOutputDataTypeSchema };

export const toFirestoreDataTypeSchema: BaseSchema<TInputDataTypeSchema, TOutputDataTypeSchema> = recursive(() => union([
  ...toFirestoreSpecialDataSchema.union,
  array(toFirestoreDataTypeSchema),
  string(),
  number(),
  boolean(),
  nullType(),
  record(toFirestoreDataTypeSchema),
]));

// export const toFirestoreDataTypeSchema = recursive(() => special());
