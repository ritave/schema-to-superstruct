// TODO(ritave): Create a transform that automatically builds those files. Bootstrap style

import { Literal as UnistLiteral, Parent as UnistParent } from "unist";
import { JsonProperty, JsonValue } from "../../parser.js";

export interface JsonSchema extends UnistParent {
  type: "Schema";
  /** Any nodes that are unknown to this implementation */
  unsupported?: JsonProperty[];
  children: SchemaAllKeywords[];
}

export interface SchemaVocabulary extends UnistLiteral {
  type: "$vocabulary";
}

export interface SchemaSchema extends UnistLiteral {
  type: "$schema";
  value: string;
}

export type SchemaAllKeywords =
  | SchemaCoreKeywords
  | SchemaValidationKeywords
  | SchemaMetaKeywords;

export type SchemaCoreKeywords =
  | SchemaVocabulary
  | SchemaSchema
  | SchemaId
  | SchemaAnchor
  | SchemaDynamicAnchor
  | SchemaDefs
  | SchemaComment
  | SchemaRef
  | SchemaDynamicRef
  | SchemaOperatorLiteral
  | SchemaOperatorParent
  | SchemaDependentSchemas
  | SchemaAdditionalProperties
  | SchemaProperties
  | SchemaPrefixItems
  | SchemaItems
  | SchemaContains
  | SchemaPatternProperties
  | SchemaAdditionalProperties
  | SchemaPropertyNames
  | SchemaUnevaluatedItems
  | SchemaUnevaluatedProperties;

export interface SchemaId extends UnistLiteral {
  type: "$id";
  value: string;
}

export interface SchemaAnchor extends UnistLiteral {
  type: "$anchor";
  value: string;
}

export interface SchemaDynamicAnchor extends UnistLiteral {
  type: "$dynamicAnchor";
  value: string;
}

export interface SchemaDynamicRef extends UnistLiteral {
  type: "$dynamicRef";
  value: string;
  resolved?: JsonSchema;
}

export interface SchemaRef extends UnistLiteral {
  type: "$ref";
  value: string;
  resolved?: JsonSchema;
}

export interface SchemaComment extends UnistLiteral {
  type: "$comment";
  value: string;
}

export interface SchemaDefs extends UnistParent {
  type: "$defs";
  children: SchemaDef[];
}

export interface SchemaDef extends UnistParent {
  type: "Definition";
  key: string;
  children: [JsonSchema];
}

export interface SchemaOperatorLiteral extends UnistParent {
  type: "not" | "if" | "then" | "else";
  children: [JsonSchema];
}

export interface SchemaOperatorParent extends UnistParent {
  type: "allOf" | "anyOf" | "oneOf";
  children: JsonSchema[];
}

export interface SchemaDependent extends UnistParent {
  type: "Dependent";
  key: string;
  children: [JsonSchema];
}

export interface SchemaDependentSchemas extends UnistParent {
  type: "dependentSchemas";
  children: SchemaDependent[];
}

export interface SchemaPrefixItems extends UnistParent {
  type: "prefixItems";
  children: JsonSchema[];
}

export interface SchemaItems extends UnistParent {
  type: "items";
  children: [JsonSchema];
}

export interface SchemaContains extends UnistParent {
  type: "contains";
  children: [JsonSchema];
}

export interface SchemaProperty extends UnistParent {
  type: "Property";
  key: string;
  children: [JsonSchema];
}

export interface SchemaPatternProperty extends UnistParent {
  type: "PatternProperty";
  key: string;
  children: [JsonSchema];
}

export interface SchemaProperties extends UnistParent {
  type: "properties";
  children: SchemaProperty[];
}

export interface SchemaPatternProperties extends UnistParent {
  type: "patternProperties";
  children: SchemaPatternProperty[];
}

export interface SchemaAdditionalProperties extends UnistParent {
  type: "additionalProperties";
  children: [JsonSchema];
}

export interface SchemaPropertyNames extends UnistParent {
  type: "propertyNames";
  children: [JsonSchema];
}

export interface SchemaUnevaluatedItems extends UnistParent {
  type: "unevaluatedItems";
  children: [JsonSchema];
}

export interface SchemaUnevaluatedProperties extends UnistParent {
  type: "unevaluatedProperties";
  children: [JsonSchema];
}

export type SchemaValidationKeywords =
  | SchemaType
  | SchemaEnum
  | SchemaConst
  | SchemaValidationNumber
  | SchemaValidationString
  | SchemaValidationArray
  | SchemaValidationObject;

export interface SchemaType extends UnistLiteral {
  type: "type";
  value: (
    | "null"
    | "boolean"
    | "object"
    | "array"
    | "number"
    | "string"
    | "integer"
  )[];
}

export interface SchemaEnum extends UnistParent {
  type: "enum";
  children: JsonValue[];
}

export interface SchemaConst extends UnistParent {
  type: "const";
  children: [JsonValue];
}

export type SchemaValidationNumber =
  | SchemaMultipleOf
  | SchemaMaximum
  | SchemaExclusiveMaximum
  | SchemaMinimum
  | SchemaExclusiveMinimum;

export interface SchemaMultipleOf extends UnistLiteral {
  type: "multipleOf";
  value: number;
}

export interface SchemaMaximum extends UnistLiteral {
  type: "maximum";
  value: number;
}

export interface SchemaExclusiveMaximum extends UnistLiteral {
  type: "exclusiveMaximum";
  value: number;
}

export interface SchemaMinimum extends UnistLiteral {
  type: "minimum";
  value: number;
}

export interface SchemaExclusiveMinimum extends UnistLiteral {
  type: "exclusiveMinimum";
  value: number;
}

export type SchemaValidationString =
  | SchemaMaxLength
  | SchemaMinLength
  | SchemaPattern;

export interface SchemaMaxLength extends UnistLiteral {
  type: "maxLength";
  value: number;
}

export interface SchemaMinLength extends UnistLiteral {
  type: "minLength";
  value: number;
}

export interface SchemaPattern extends UnistLiteral {
  type: "pattern";
  value: string;
}

export type SchemaValidationArray =
  | SchemaMaxItems
  | SchemaMinItems
  | SchemaUniqueItems
  | SchemaMaxContains
  | SchemaMinContains;

export interface SchemaMaxItems extends UnistLiteral {
  type: "maxItems";
  value: number;
}

export interface SchemaMinItems extends UnistLiteral {
  type: "minItems";
  value: number;
}

export interface SchemaUniqueItems extends UnistLiteral {
  type: "uniqueItems";
  value: boolean;
}

export interface SchemaMaxContains extends UnistLiteral {
  type: "maxContains";
  value: number;
}

export interface SchemaMinContains extends UnistLiteral {
  type: "minContains";
  value: number;
}

export type SchemaValidationObject =
  | SchemaMaxProperties
  | SchemaMinProperties
  | SchemaRequired
  | SchemaDependentRequired;

export interface SchemaMaxProperties extends UnistLiteral {
  type: "maxProperties";
  value: number;
}

export interface SchemaMinProperties extends UnistLiteral {
  type: "minProperties";
  value: number;
}

export interface SchemaRequired extends UnistLiteral {
  type: "required";
  value: string[];
}

export interface SchemaDependentRequiredItem extends UnistLiteral {
  type: "DependentRequiredItem";
  key: string;
  value: string[];
}

export interface SchemaDependentRequired extends UnistParent {
  type: "dependentRequired";
  children: SchemaDependentRequiredItem[];
}

export type SchemaMetaKeywords =
  | SchemaTitle
  | SchemaDescription
  | SchemaDefault
  | SchemaDeprecated;

export interface SchemaTitle extends UnistLiteral {
  type: "title";
  value: string;
}

export interface SchemaDescription extends UnistLiteral {
  type: "description";
  value: string;
}

export interface SchemaDefault extends UnistParent {
  type: "default";
  children: [JsonValue];
}

export interface SchemaDeprecated extends UnistLiteral {
  type: "deprecated";
  value: boolean;
}
