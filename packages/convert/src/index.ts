import { unified } from "unified";

import superstructStringify from "./compiler.js";
import parseJson from "./parser.js";
import jsonToSchema from "./transform/json/jsonToSchema.js";
import schemaToSuperstruct from "./transform/superstruct/schemaToSuperstruct.js";
import superstructOptimize from "./transform/superstruct/superstructOptimize.js";

const parser = unified()
  .use(parseJson)
  .use(jsonToSchema)
  .use(schemaToSuperstruct)
  .use(superstructOptimize)
  .use(superstructStringify)
  .freeze();

export { superstructStringify, parseJson, jsonToSchema, schemaToSuperstruct };

export default parser;
