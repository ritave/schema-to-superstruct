import prettier from "prettier";
import { Compiler, Plugin, Processor } from "unified";
import {
  Call,
  CallArray,
  CallRecord,
  Constant,
  Define,
  Root,
} from "./transform/superstruct/schemaToSuperstruct";

const stdCalls = new Set([
  "keys",
  "dependentProperties",
  "minProperties",
  "maxProperties",
  "patternObject",
  "patternType",
  "oneOf",
  "not",
  "unique",
  "multipleOf",
]);

function stringify(
  node: Call | Define | Constant | CallRecord | CallArray
): string {
  switch (node.type) {
    case "Define":
      return `export const ${node.name} = ${stringify(node.children[0])};`;
    case "Constant":
      switch (typeof node.value) {
        case "string":
          return `"${node.value}"`;
        case "bigint":
          return `${node.value}n`;
        default:
          return String(node.value);
      }
    case "Call":
      let f;
      if (stdCalls.has(node.name)) {
        f = `std.${node.name}`;
      } else {
        f = `ss.${node.name}`;
      }
      return `${f}(${node.children.map(stringify).join(", ")})`;
    case "Record":
      return `{\n${node.children
        .map(
          ({ name: key, children: [value] }) => `"${key}": ${stringify(value)}`
        )
        .join(",\n")}\n}`;
    case "Array":
      return `[${node.children.map(stringify).join(", ")}]`;
  }
}

const preamble = `import * as ss from 'superstruct'
import * as std from '@schema-to-superstruct/std'

`;

export interface Options {
  /**
   * @defaultValue true
   */
  prettier?: boolean;
}

const defaultOptions = { prettier: true };

const compiler: Plugin<[Options] | [], Root, string> = function (
  this: Processor,
  options: Options = defaultOptions
) {
  const opts = { ...defaultOptions, ...options };

  const compiler: Compiler<Root, string> = (tree, file) => {
    let result = tree.children.map<string>(stringify).join("\n\n") + "\n";
    if (opts.prettier) {
      result = prettier.format(result, { parser: "typescript" });
    }
    return preamble + result;
  };

  Object.assign(this, { Compiler: compiler });
};

export default compiler;
