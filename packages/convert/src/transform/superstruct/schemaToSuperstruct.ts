import { pascalCase } from "change-case";
import { enums, Infer, is } from "superstruct";
import { Processor, Transformer } from "unified";
import { Data as NodeData, Literal, Node, Parent } from "unist";
import { inspect } from "unist-util-inspect";
import { is as isNode, TestFunctionPredicate } from "unist-util-is";
import {} from "unist-util-visit";
import {
  JsonSchema,
  SchemaAdditionalProperties,
  SchemaAllKeywords,
  SchemaAnchor,
  SchemaDependentRequired,
  SchemaExclusiveMaximum,
  SchemaExclusiveMinimum,
  SchemaItems,
  SchemaMaximum,
  SchemaMaxLength,
  SchemaMaxProperties,
  SchemaMinimum,
  SchemaMinLength,
  SchemaMinProperties,
  SchemaMultipleOf,
  SchemaOperatorLiteral,
  SchemaPattern,
  SchemaPatternProperties,
  SchemaProperties,
  SchemaPropertyNames,
  SchemaRequired,
  SchemaType,
} from "../json/types.js";

const validationKeywords = enums([
  "not",
  "if",
  "then",
  "else",
  "allOf",
  "anyOf",
  "oneOf",
  "dependentSchemas",
  "items",
  "contains",
  "properties",
  "patternProperties",
  "additionalProperties",
  "propertyNames",
  "unevaluatedItems",
  "unevaluatedProperties",
  "type",
  "const",
  "enum",
  "multipleOf",
  "maximum",
  "exclusiveMaximum",
  "minimum",
  "exclusiveMinimum",
  "maxLength",
  "minLength",
  "pattern",
  "maxItems",
  "minItems",
  "uniqueItems",
  "maxContains",
  "minContains",
  "maxProperties",
  "minProperties",
  "required",
  "dependentRequired",
]);

const validationNumberKeywords = enums([
  "multipleOf",
  "maximum",
  "exclusiveMaximum",
  "minimum",
  "exclusiveMinimum",
]);
const validationStringKeywords = enums(["maxLength", "minLength", "pattern"]);
const validationArrayKeywords = enums([
  "maxItems",
  "minItems",
  "uniqueItems",
  "maxContains",
  "minContains",
]);
const validationObjectKeywords = enums([
  "maxProperties",
  "minProperties",
  "required",
  "dependentRequired",
  "properties",
  "patternProperties",
  "additionalProperties",
]);

const allTypes = [
  "string",
  "number",
  "integer",
  "object",
  "array",
  "boolean",
  "null",
] as const;

interface SchemaValidation extends Node {
  type: Infer<typeof validationKeywords>;
}

function isValidationNode(
  node: SchemaAllKeywords
): node is SchemaAllKeywords & SchemaValidation {
  return is(node.type, validationKeywords);
}

export interface Constant<Value = unknown> extends Literal<Value> {
  type: "Constant";
}

export interface Call extends Parent {
  type: "Call";
  name: string;
  children: (Call | Constant | CallRecord | CallArray)[];
}

export interface Define extends Parent {
  type: "Define";
  name: string;
  children: [Call];
}

export interface RecordItem extends Parent {
  type: "RecordItem";
  name: string;
  children: [Call | Constant];
}

export interface CallArray extends Parent {
  type: "Array";
  children: (Call | Constant)[];
}

export interface CallRecord extends Parent {
  type: "Record";
  children: RecordItem[];
}

export interface Root extends Parent {
  type: "Root";
  children: Define[];
}

export type AllNodes =
  | Root
  | Call
  | CallRecord
  | CallArray
  | RecordItem
  | Define
  | Constant;

function anchorToName(anchor: string) {
  return pascalCase(anchor);
}

function anchor(node: JsonSchema): SchemaAnchor | undefined {
  return node.children.find<SchemaAnchor>(
    (n): n is SchemaAnchor => n.type === "$anchor"
  );
}

function c(f: string, ...children: Call["children"]): Call {
  return { type: "Call", name: f, children };
}
function d(name: string, call: Call): Define {
  return { type: "Define", name, children: [call] };
}

function l(value: unknown): Constant {
  return { type: "Constant", value };
}

function a(children: (Call | Constant)[]): CallArray {
  return { type: "Array", children };
}

function r(entries: [string, RecordItem["children"][0]][]): CallRecord {
  return {
    type: "Record",
    children: entries.map<RecordItem>(([name, value]) => ({
      type: "RecordItem",
      name,
      children: [value],
    })),
  };
}

const cUnknown = () => c("unknown");
const cIntersect = (...children: Call[]) => c("intersection", a(children));
const cUnion = (...children: Call[]) => c("union", a(children));

function child<T extends Node<NodeData>>(
  node: Parent,
  test:
    | T["type"]
    | Partial<T>
    | TestFunctionPredicate<T>
    | (T["type"] | Partial<T> | TestFunctionPredicate<T>)[],
  context?: unknown
): T | undefined {
  return node.children.find<T>((c): c is T =>
    isNode(c, test, undefined, undefined, context)
  );
}

function childAll<T extends Node<NodeData>>(
  node: Parent,
  test:
    | T["type"]
    | Partial<T>
    | TestFunctionPredicate<T>
    | (T["type"] | Partial<T> | TestFunctionPredicate<T>)[],
  context?: unknown
): T[] {
  return node.children.filter<T>((c): c is T =>
    isNode(c, test, undefined, undefined, context)
  );
}

function isEmptySchema(node: JsonSchema) {
  for (const child of node.children) {
    if (isValidationNode(child)) {
      return false;
    }
  }
  return true;
}

const transform = function (this: Processor<void, JsonSchema>) {
  const transformer: Transformer<JsonSchema, Root> = (
    tree: JsonSchema
  ): Root => {
    function objectKeywords(node: JsonSchema): Call {
      const required = child<SchemaRequired>(node, "required");
      const properties = child<SchemaProperties>(node, "properties");
      const patternProperties = child<SchemaPatternProperties>(
        node,
        "patternProperties"
      );
      const additionalProperties = child<SchemaAdditionalProperties>(
        node,
        "additionalProperties"
      );
      const dependentRequired = child<SchemaDependentRequired>(
        node,
        "dependentRequired"
      );
      const minProperties = child<SchemaMinProperties>(node, "minProperties");
      const maxProperties = child<SchemaMaxProperties>(node, "maxProperties");
      const propertyNames = child<SchemaPropertyNames>(node, "propertyNames");

      let obj;
      {
        const entries =
          required?.value.flatMap<[string, Call | Constant]>((key) => {
            if (properties?.children.find((prop) => prop.key)) {
              return [];
            }
            return [[key, cUnknown()]];
          }) ?? [];
        entries.push(
          ...(properties?.children.map<[string, Call | Constant]>(
            ({ key, children: [value] }) => {
              const optional = !(required?.value.includes(key) ?? false);
              if (optional) {
                return [key, c("optional", mapSchema(value))];
              } else {
                const result = mapSchema(value);
                return [key, result];
              }
            }
          ) ?? [])
        );

        obj = c("type", r(entries));
      }
      if (minProperties) {
        obj = c("minProperties", obj, l(minProperties.value));
      }
      if (maxProperties) {
        obj = c("maxProperties", obj, l(maxProperties.value));
      }
      if (dependentRequired) {
        const schema = Object.fromEntries(
          dependentRequired.children.map(({ key, value }) => [key, value])
        );
        obj = c("dependentProperties", obj, l(schema));
      }

      const union = [];
      if (patternProperties) {
        const schema = r(
          patternProperties.children.map(({ key, children: [value] }) => [
            key,
            mapSchema(value),
          ])
        );
        union.push(c("patternType", schema));
      }
      if (additionalProperties) {
        const literalKeys = new Set<string>();
        properties?.children.forEach(({ key }) => literalKeys.add(key));
        required?.value.forEach((v) => literalKeys.add(v));
        const patternKeys = patternProperties?.children.map(({ key }) => key);

        const not = [];
        if (literalKeys.size) {
          not.push(
            c(
              "object",
              r([...literalKeys.values()].map((key) => [key, cUnknown()]))
            )
          );
        }
        if (patternKeys?.length) {
          not.push(
            c("patternObject", r(patternKeys.map((key) => [key, cUnknown()])))
          );
        }
        if (!not.length) {
          not.push(c("never"));
        }
        union.push(
          cIntersect(
            c("not", cUnion(...not)),
            mapSchema(additionalProperties.children[0])
          )
        );
      }
      if (propertyNames) {
        const requiredString: JsonSchema = {
          type: "Schema",
          children: [{ type: "type", value: ["string"] }],
        };
        const schema: JsonSchema = {
          type: "Schema",
          children: [
            {
              type: "allOf",
              children: [requiredString, propertyNames.children[0]],
            },
          ],
        };
        obj = c("keys", obj, mapSchema(schema));
      }

      if (union.length === 0) {
        return obj;
      } else {
        return cIntersect(obj, cUnion(...union));
      }
    }

    function stringKeywords(node: JsonSchema): Call {
      const maxLength = child<SchemaMaxLength>(node, "maxLength");
      const minLength = child<SchemaMinLength>(node, "minLength");
      const pattern = child<SchemaPattern>(node, "pattern");

      let str = c("string");

      if (maxLength || minLength) {
        str = c("size", str, l(minLength?.value), l(maxLength?.value));
      }
      if (pattern) {
        str = c("pattern", str, l(new RegExp(pattern.value)));
      }

      return str;
    }

    function numberKeywords(
      node: JsonSchema,
      type: "integer" | "number"
    ): Call {
      const multiOf = child<SchemaMultipleOf>(node, "multipleOf");
      const maximum = child<SchemaMaximum>(node, "maximum");
      const minimum = child<SchemaMinimum>(node, "minimum");
      const exclusiveMaximum = child<SchemaExclusiveMaximum>(
        node,
        "exclusiveMaximum"
      );
      const exclusiveMinimum = child<SchemaExclusiveMinimum>(
        node,
        "exclusiveMinimum"
      );

      let num = c(type);

      if (multiOf) {
        num = c("multipleOf", num, l(multiOf.value));
      }
      if (maximum) {
        num = c("max", num, l(maximum.value));
      }
      if (exclusiveMaximum) {
        num = c("max", num, l(exclusiveMaximum.value), l({ exclusive: true }));
      }
      if (minimum) {
        num = c("min", num, l(minimum.value));
      }
      if (exclusiveMinimum) {
        num = c("min", num, l(exclusiveMinimum.value), l({ exclusive: true }));
      }
      return num;
    }

    function arrayKeywords(node: JsonSchema): Call {
      const items = child<SchemaItems>(node, "items");
      let itemValue = items ? mapSchema(items.children[0]) : cUnknown();
      return c("array", itemValue);
    }

    function mapSchema(node: JsonSchema): Call {
      if (isEmptySchema(node)) {
        return cUnknown();
      }

      const intersection: Call[] = [];

      const types = child<SchemaType>(node, "type")?.value ?? allTypes;
      if (types.length > 0) {
        intersection.push(
          cUnion(
            ...types.map((v) => {
              switch (v) {
                case "array":
                  return arrayKeywords(node);
                case "boolean":
                  return c("boolean");
                case "integer":
                case "number":
                  // TODO(ritave): merge integer and number
                  return numberKeywords(node, v);
                case "null":
                  return c("literal", l(null));
                case "object":
                  return objectKeywords(node);
                case "string":
                  return stringKeywords(node);
              }
            })
          )
        );
      } else {
        intersection.push(c("never"));
      }

      const notNode = child<SchemaOperatorLiteral>(node, "not");
      if (notNode) {
        intersection.push(c("not", mapSchema(notNode.children[0])));
      }

      if (intersection.length === 0) {
        return cUnknown();
      } else if (intersection.length === 1) {
        return intersection[0];
      } else {
        return cIntersect(...intersection);
      }
    }

    console.log(inspect(tree));
    const newTree: Root = {
      type: "Root",
      children: [
        // TODO(ritave): Default name in case of "root" anchor conflict
        d(anchorToName(anchor(tree)?.value ?? "root"), mapSchema(tree)),
      ],
    };
    console.log(inspect(newTree));

    return newTree;
  };
  return transformer;
};

export default transform;
