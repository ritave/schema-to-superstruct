import assert from "assert";
import JsonParser from "json-to-ast";
import { Parser, Plugin, Processor } from "unified";
import {
  Literal as UnistLiteral,
  Node as UnistNode,
  Parent as UnistParent,
} from "unist";
import { CONTINUE, visit } from "unist-util-visit";

export interface JsonIdentifier extends UnistLiteral {
  type: "Identifier";
  value: string;
  raw: string;
}

export interface JsonProperty<Value extends JsonValue = JsonValue>
  extends UnistParent {
  type: "Property";
  key: JsonIdentifier;
  children: [Value];
}

export interface JsonObject extends UnistParent {
  type: "Object";
  children: JsonProperty[];
}

export interface JsonArray extends UnistParent {
  type: "Array";
  children: (JsonObject | JsonArray | JsonLiteral)[];
}

export interface JsonLiteral<
  Value extends string | number | boolean | null =
    | string
    | number
    | boolean
    | null
> extends UnistLiteral {
  type: "Literal";
  value: Value;
  raw: string;
}

export type JsonValue = JsonObject | JsonArray | JsonLiteral;

export interface JsonDocument extends UnistParent {
  type: "Document";
  children: [JsonValue];
}

const parser: Plugin<[], string, JsonDocument> = function (
  this: Processor<JsonDocument, JsonDocument>
) {
  const parser: Parser<JsonDocument> = (document, file) => {
    let root: JsonParser.ValueNode;
    try {
      root = JsonParser(document, { loc: true });
    } catch (e) {
      assert(e instanceof Error);
      file.fail(e);
    }
    visit(root!, (node) => {
      const loc = node.loc;
      delete node.loc;
      (node as UnistNode).position = loc;
      if (node.type === "Property") {
        const value = node.value;
        delete (node as any).value;
        (node as any).children = [value];
      }
      return CONTINUE;
    });
    return {
      type: "Document",
      children: [root!],
      position: (root! as UnistNode).position,
    };
  };

  Object.assign(this, { Parser: parser });
};

export default parser;
