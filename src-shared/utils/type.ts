export type RecordOf<T> = {
  [k in keyof T]: T[k];
};

export type ItemOfArray<T extends any[]> = T extends (infer U)[] ? U : never;
