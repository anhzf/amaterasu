import {
  BaseSchema, Input, Output, array, boolean, nullType, number, object, record, recursive, string, transform, union,
} from 'valibot';

const SECONDS_IN_MILLISECONDS = 1000;

const NANOSECONDS_IN_MILLISECONDS = 1e-6;

export const JSONReferenceSchema = object({
  __ref__: string(),
});

export const JSONTimestampSchema = object({
  // in milliseconds
  __timestamp__: string(),
});

export const JSONGeoSchema = object({
  __geo__: object({
    latitude: string(),
    longitude: string(),
  }),
});

export const CollectionReferenceSchema = object({
  id: string(),
  path: string(),
});

export const DocumentReferenceSchema = object({
  id: string(),
  path: string(),
});

export const SourceTimestampSchema = object({
  seconds: number(),
  nanoseconds: number(),
});

export const SourceGeoSchema = object({
  latitude: number(),
  longitude: number(),
});

export const ReferenceSchema = transform(
  DocumentReferenceSchema,
  (value) => ({
    __ref__: value.path,
  }),
);

export const TimestampSchema = transform(
  SourceTimestampSchema,
  (value) => ({
    __timestamp__: value.seconds * SECONDS_IN_MILLISECONDS + value.nanoseconds * NANOSECONDS_IN_MILLISECONDS,
  }),
);

export const GeoSchema = transform(
  SourceGeoSchema,
  (value) => ({
    __geo__: {
      latitude: value.latitude,
      longitude: value.longitude,
    },
  }),
);

export const SpecialDataSchema = union([
  ReferenceSchema,
  TimestampSchema,
  GeoSchema,
]);

export type TInputDataSchema = Input<typeof SpecialDataSchema>
  | string
  | number
  | boolean
  | null
  | TInputDataSchema[]
  | { [k: string]: TInputDataSchema };

export type TOutputDataSchema = Output<typeof SpecialDataSchema>
  | string
  | number
  | boolean
  | null
  | TOutputDataSchema[]
  | { [k: string]: TOutputDataSchema };

export const DataTypeSchema: BaseSchema<TInputDataSchema, TOutputDataSchema> = recursive(() => union([
  ...SpecialDataSchema.union,
  array(DataTypeSchema),
  string(),
  number(),
  boolean(),
  nullType(),
  record(DataTypeSchema),
]));

export const DataSchema = record(DataTypeSchema);
