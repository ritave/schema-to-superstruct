// TODO(ritave): Use superstruct for property validation
// TODO(ritave): Merge multiple same nodes

import { Plugin, Processor, Transformer } from "unified";
import { Node as UnistNode } from "unist";
import { VFile } from "vfile";
import {
  JsonArray,
  JsonDocument,
  JsonLiteral,
  JsonObject,
  JsonProperty,
  JsonValue,
} from "../../parser";
import { isRegex, isURIReference, isValidURL, uniq } from "../../utils.js";
import {
  JsonSchema,
  SchemaAdditionalProperties,
  SchemaAllKeywords,
  SchemaAnchor,
  SchemaComment,
  SchemaConst,
  SchemaContains,
  SchemaDef,
  SchemaDefault,
  SchemaDefs,
  SchemaDependent,
  SchemaDependentRequired,
  SchemaDependentRequiredItem,
  SchemaDependentSchemas,
  SchemaDeprecated,
  SchemaDynamicAnchor,
  SchemaDynamicRef,
  SchemaEnum,
  SchemaId,
  SchemaItems,
  SchemaMultipleOf,
  SchemaOperatorLiteral,
  SchemaOperatorParent,
  SchemaPattern,
  SchemaPatternProperties,
  SchemaPatternProperty,
  SchemaPrefixItems,
  SchemaProperties,
  SchemaProperty,
  SchemaPropertyNames,
  SchemaRef,
  SchemaRequired,
  SchemaSchema,
  SchemaTitle,
  SchemaType,
  SchemaUnevaluatedItems,
  SchemaUnevaluatedProperties,
  SchemaVocabulary,
} from "./types.js";

const origin = "json-to-json-schema";

/** `new URL('http://google.com#').hash === ''` so we need to manually parse empty fragment */
const emptyFragment = /#$/u;
const validAnchor = /^[A-Za-z][-_.0-9a-zA-Z]*$/u;

type TypeofStrToType<T extends string> = T extends "string"
  ? string
  : T extends "number"
  ? number
  : T extends "boolean"
  ? boolean
  : T extends "object"
  ? null
  : any;

const typeofStrToStr = {
  string: "string",
  number: "number",
  boolean: "boolean",
  object: "null",
};

const transform: Plugin<[], JsonDocument, JsonSchema> = function (
  this: Processor<void, JsonDocument>
) {
  const transformer: Transformer<JsonDocument, JsonSchema> = (
    tree: JsonDocument,
    file: VFile
  ): JsonSchema => {
    function assertLiteral<T extends string>(
      node: JsonObject | JsonLiteral | JsonArray,
      type?: T
    ): asserts node is JsonLiteral<TypeofStrToType<T>> {
      if (node.type !== "Literal") {
        file.fail(
          `Expected type "${(typeofStrToStr as any)[type]} got ${node.type}"`,
          node,
          origin
        );
      }
      if (type !== undefined && typeof node.value !== type) {
        file.fail(
          `Expected type "${(typeofStrToStr as any)[type]}" got "${
            (typeofStrToStr as any)[typeof node.value]
          }"`,
          node,
          origin
        );
      }
    }

    function assertObject(node: JsonValue): asserts node is JsonObject {
      if (node.type !== "Object") {
        file.fail(`Expected Object, got "${node.type}"`, node, origin);
      }
    }

    function assertArray(node: JsonValue): asserts node is JsonArray {
      if (node.type !== "Array") {
        file.fail(`Expected Array, got "${node.type}"`, node, origin);
      }
    }

    function assertUniq(arr: any[], node: UnistNode) {
      if (uniq(arr).length !== arr.length) {
        file.fail("Elements in array are not unique", node, origin);
      }
    }

    function validateSchema(node: JsonValue): JsonSchema {
      if (node.type === "Literal" && typeof node.value === "boolean") {
        if (node.value) {
          return {
            type: "Schema",
            children: [],
            position: node.position,
          };
        } else {
          return {
            type: "Schema",
            children: [
              { type: "not", children: [{ type: "Schema", children: [] }] },
            ],
            position: node.position,
          };
        }
      } else if (node.type === "Object") {
        const children: SchemaAllKeywords[] = [];
        const unsupported: JsonProperty[] = [];
        for (const child of node.children) {
          const mapped = validateKeyword(child);
          if (mapped === undefined) {
            unsupported.push(child);
          } else {
            children.push(mapped);
          }
        }
        if (
          children.find((el) => el.type === "$anchor") !== undefined &&
          children.find((el) => el.type === "$dynamicAnchor") !== undefined
        ) {
          file.fail(
            `"$anchor" and "$dynamicAnchor" on one schema`,
            node,
            origin
          );
        }
        return {
          type: "Schema",
          children,
          unsupported: unsupported.length === 0 ? undefined : unsupported,
          position: node.position,
        };
      } else {
        file.fail("JSON-Schema is neither an object nor a boolean", tree);
      }
    }

    function validateKeyword(node: JsonProperty) {
      const mappedNode = ((): SchemaAllKeywords | undefined => {
        const value = node.children[0];
        switch (node.key.value) {
          case "$schema":
            assertLiteral(value, "string");
            file.message('"$schema" directive not yet supported', node, origin);
            return {
              type: "$schema",
              value: value.value,
            } as SchemaSchema;
          case "$vocabulary":
            file.message(
              '"$vocabulary" keyword not yet supported',
              node,
              origin
            );
            return {
              type: "$vocabulary",
            } as SchemaVocabulary;
          case "$id":
            assertLiteral(value, "string");
            const parsed = isValidURL(value.value);
            if (!parsed) {
              file.fail(`URI expected, got "${value.value}"`, value, origin);
            }
            if (parsed.hash !== "") {
              file.fail(
                '"$id" directive contains non-empty fragment',
                value,
                origin
              );
            } else if (emptyFragment.test(value.value)) {
              file.message(
                '"$id" directive empty fragments are deprecated',
                value,
                origin
              );
            }
            return {
              type: "$id",
              value: value.value,
            } as SchemaId;
          case "$ref":
          case "$dynamicRef":
            assertLiteral(value, "string");
            if (!isURIReference(value.value)) {
              file.fail(
                `URI reference expected, got "${value.value}"`,
                value,
                origin
              );
            }
            return {
              type: node.key.value,
              value: value.value,
            } as SchemaRef | SchemaDynamicRef;
          case "$anchor":
          case "$dynamicAnchor":
            assertLiteral(value, "string");
            if (!validAnchor.test(value.value)) {
              file.fail(`Anchor expected, got "${value.value}"`);
            }
            return {
              type: node.key.value,
              value: value.value,
            } as SchemaAnchor | SchemaDynamicAnchor;
          case "$comment":
            assertLiteral(value, "string");
            return {
              type: "$comment",
              value: value.value,
            } as SchemaComment;
          case "$defs":
            assertObject(value);
            return {
              type: "$defs",
              children: value.children.map<SchemaDef>((prop) => ({
                type: "Definition",
                key: prop.key.value,
                children: [validateSchema(value)],
                position: prop.position,
              })),
            } as SchemaDefs;
          case "not":
          case "if":
          case "then":
          case "else":
          case "items":
          case "contains":
          case "additionalProperties":
          case "propertyNames":
          case "unevaluatedItems":
          case "unevaluatedProperties":
            return {
              type: node.key.value,
              children: [validateSchema(value)],
            } as
              | SchemaOperatorLiteral
              | SchemaItems
              | SchemaContains
              | SchemaAdditionalProperties
              | SchemaPropertyNames
              | SchemaUnevaluatedItems
              | SchemaUnevaluatedProperties;
          case "allOf":
          case "anyOf":
          case "oneOf":
            assertArray(value);
            return {
              type: node.key.value,
              children: value.children.map(validateSchema),
            } as SchemaOperatorParent;
          case "dependentSchemas":
            assertObject(value);
            return {
              type: "dependentSchemas",
              children: value.children.map<SchemaDependent>((prop) => ({
                type: "Dependent",
                key: prop.key.value,
                children: [validateSchema(prop.children[0])],
                position: prop.position,
              })),
            } as SchemaDependentSchemas;
          case "prefixItems":
            assertArray(value);
            return {
              type: "prefixItems",
              children: value.children.map((el) => validateSchema(el)),
            } as SchemaPrefixItems;
          case "properties":
            assertObject(value);
            return {
              type: "properties",
              children: value.children.map<SchemaProperty>((prop) => ({
                type: "Property",
                key: prop.key.value,
                children: [validateSchema(prop.children[0])],
                position: prop.position,
              })),
            } as SchemaProperties;
          case "patternProperties":
            assertObject(value);
            return {
              type: "patternProperties",
              children: value.children.map<SchemaPatternProperty>((prop) => ({
                type: "PatternProperty",
                key: prop.key.value,
                children: [validateSchema(prop.children[0])],
                position: prop.position,
              })),
            } as SchemaPatternProperties;
          case "title":
          case "description":
            assertLiteral(value, "string");
            return { type: node.key.value, value: value.value } as SchemaTitle;
          case "default":
            return { type: "default", children: [value] } as SchemaDefault;
          case "deprecated":
          case "uniqueItems":
            assertLiteral(value, "boolean");
            return {
              type: node.key.value,
              value: value.value,
            } as SchemaDeprecated;
          case "type":
            const assertType: (
              _: JsonValue
            ) => asserts _ is JsonLiteral<string> = (node) => {
              assertLiteral(node, "string");
              if (
                ![
                  "null",
                  "boolean",
                  "object",
                  "array",
                  "number",
                  "string",
                  "integer",
                ].includes(node.value)
              ) {
                file.fail(`Expected type string, got "${node.value}"`);
              }
            };
            {
              let result: string[];
              if (value.type === "Array") {
                result = value.children.map((child) => {
                  assertType(child);
                  return child.value;
                });
              } else {
                assertType(value);
                result = [value.value];
              }
              return { type: "type", value: result } as SchemaType;
            }
          case "enum":
            assertArray(value);
            {
              const result = value.children.map((child) => {
                return child;
              });
              return { type: "enum", children: result } as SchemaEnum;
            }
          case "const":
            return { type: "const", children: [value] } as SchemaConst;
          case "multipleOf":
            assertLiteral(value, "number");
            if (value.value <= 0) {
              file.fail(
                `"multipleOf" required a number > 0, got "${value.value}"`,
                value,
                origin
              );
            }
            return {
              type: "multipleOf",
              value: value.value,
            } as SchemaMultipleOf;
          case "maximum":
          case "exclusiveMaximum":
          case "minimum":
          case "exclusiveMinimum":
            assertLiteral(value, "number");
            return { type: node.key.value, value: value.value };
          case "maxLength":
          case "minLength":
          case "maxItems":
          case "minItems":
          case "maxContains":
          case "minContains":
          case "maxProperties":
          case "minProperties":
            assertLiteral(value, "number");
            if (value.value < 0 || !Number.isSafeInteger(value.value)) {
              file.fail(
                `"${node.key.value}" expected integer >= 0, got "${value.value}"`,
                value,
                origin
              );
            }
            return { type: node.key.value, value: value.value };
          case "pattern":
            assertLiteral(value, "string");
            if (!isRegex(value.value)) {
              file.fail("Value is not a proper regexp string", value, origin);
            }
            return {
              type: "pattern",
              value: value.value,
            } as SchemaPattern;
          case "required":
            assertArray(value);
            {
              const result = value.children.map((child) => {
                assertLiteral(child, "string");
                return child.value;
              });
              return { type: "required", value: result } as SchemaRequired;
            }
          case "dependentRequired":
            assertObject(value);
            {
              const children = value.children.map<SchemaDependentRequiredItem>(
                (child) => {
                  assertArray(child.children[0]);
                  const value = child.children[0].children.map<string>((el) => {
                    assertLiteral(el, "string");
                    return el.value;
                  });
                  assertUniq(value, child.children[0]);
                  return {
                    type: "DependentRequiredItem",
                    key: child.key.value,
                    value,
                    position: child.position,
                  };
                }
              );
              return {
                type: "dependentRequired",
                children,
              } as SchemaDependentRequired;
            }
          default:
            undefined;
        }
      })();

      if (mappedNode) {
        mappedNode.position = node.position;
      } else {
        file.message(`Unsupported keyword "${node.key.value}"`, node, origin);
      }

      return mappedNode;
    }

    return validateSchema(tree.children[0]);
  };
  return transformer;
};
export default transform;
