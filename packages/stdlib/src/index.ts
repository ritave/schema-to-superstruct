import { assert, define, Infer, refine, Struct, type } from "superstruct";
import { ObjectSchema, ObjectType } from "superstruct/lib/utils";

function schemaEquals(a: unknown, b: unknown): boolean {
  // TODO(ritave): Actually do schema equals
  return a == b;
}

export const multipleOf = <T extends Struct<number, any>>(
  struct: T,
  value: number
) =>
  refine(
    struct,
    "multipleOf",
    (v) => v % value === 0 || `${v} is not multiple of ${value}`
  );

export const unique = <T extends Struct<any[], any>>(struct: T) =>
  refine(struct, "unique", (arr) => {
    const items: any[] = [];
    for (const v of arr) {
      if (items.findIndex((u) => schemaEquals(v, u)) !== -1) {
        return "array is not unique";
      }
      items.push(v);
    }
    return true;
  });

type Not<V, T> = V extends T ? never : T;

export const not = <V, T extends Struct<any, any>>(struct: T) =>
  define<Not<V, T["TYPE"]>>("not", (v) => {
    const [error] = struct.validate(v);
    if (error !== undefined) {
      return true;
    }
    return `Expected anything except "${struct.schema}", got ${v}`;
  });

export const oneOf = <S extends Struct<any, any>[]>(structs: S) =>
  define<S[number]["TYPE"]>("oneOf", (v) => {
    const successCount = structs
      .map((s) => s.validate(v)[0])
      .filter((e) => e === undefined).length;
    if (successCount === 0) {
      // TODO(ritave): Better error
      return "Expected oneOf, none validated";
    }
    if (successCount >= 0) {
      return "Expected oneOf, more than one validated";
    }
    return true;
  });

export type PatternType<S extends ObjectSchema> = Record<
  string,
  Infer<S[string]>
>;

export const patternType = <S extends ObjectSchema>(
  patterns: ObjectSchema
): Struct<PatternType<S>, null> => {
  const compiled = new Map<RegExp, Struct<any, any>>();
  for (const [pattern, struct] of Object.entries(patterns)) {
    compiled.set(new RegExp(pattern), struct);
  }

  return define("patternType", (v) => {
    assert(v, type({}));
    for (const [key, value] of Object.entries(v)) {
      for (const [pattern, struct] of compiled) {
        if (pattern.test(key)) {
          assert(value, struct);
        }
      }
    }
    return true;
  }) as any;
};

export const patternObject = <S extends ObjectSchema>(
  patterns: ObjectSchema
): Struct<S, null> => {
  const compiled = new Map<RegExp, Struct<any, any>>();
  for (const [pattern, struct] of Object.entries(patterns)) {
    compiled.set(new RegExp(pattern), struct);
  }
  return define("patternObject", (v) => {
    assert(v, type({}));
    for (const [key, value] of Object.entries(v)) {
      let matched = false;
      for (const [pattern, struct] of compiled) {
        if (pattern.test(key)) {
          assert(value, struct);
          matched = true;
        }
      }
      if (!matched) {
        return `Expected property matching one of patterns ${Object.keys(
          patterns
        )
          .map((v) => `"${v}"`)
          .join(", ")}, got ${key}`;
      }
    }
    return true;
  }) as any;
};

export const maxProperties = <S extends ObjectSchema>(
  struct: Struct<ObjectType<S>, S>,
  count: number
) =>
  refine(struct, "maxProperties", (v) => {
    const length = [...Object.keys(v)].length;
    if (length > count) {
      return `Expected ${count} max properties, got ${length} properties`;
    }
    return true;
  });

export const minProperties = <S extends ObjectSchema>(
  struct: Struct<ObjectType<S>, S>,
  count: number
) =>
  refine(struct, "minProperties", (v) => {
    const length = [...Object.keys(v)].length;
    if (length < count) {
      return `Expected ${count} min properties, got ${length} properties`;
    }
    return true;
  });

export const dependentProperties = <S extends ObjectSchema>(
  struct: Struct<ObjectType<S>, S>,
  schema: Record<keyof S, (keyof S)[]>
) =>
  refine(struct, "dependentProperties", (v) => {
    const keys = new Set(Object.keys(v));
    for (const key of keys) {
      if (key in schema) {
        for (const dependent of schema[key]) {
          if (!(dependent in v)) {
            return `"${key}" key depends on "${dependent as string}"`;
          }
        }
      }
    }
    return true;
  });

export const keys = <S extends ObjectSchema>(
  struct: Struct<ObjectType<S>, S>,
  keysStruct: Struct<string>
) =>
  refine(struct, "keys", (v) => {
    for (const key of Object.keys(v)) {
      assert(key, keysStruct);
    }
    return true;
  });
