import assert from "assert";
import { Processor, Transformer } from "unified";
import { visit } from "unist-util-visit";
import { AllNodes, Call, CallArray, Root } from "./schemaToSuperstruct.js";

function isDefaultScheme(node: AllNodes) {
  // ss.union([
  //   ss.string(),
  //   ss.number(),
  //   ss.integer(),
  //   ss.type({}),
  //   ss.array(ss.unknown()),
  //   ss.boolean(),
  //   ss.literal(null),
  // ]),
}

function isIntersectionOrUnion(node: Call) {
  return node.name === "intersection" || node.name === "union";
}

const transform = function (this: Processor<void, Root>) {
  const transformer: Transformer<Root, Root> = (tree: Root) => {
    visit(
      tree,
      [
        { type: "Call", name: "intersection" },
        { type: "Call", name: "union" },
        { type: "Call", name: "not" },
      ],
      (node, index, parent) => {
        assert(node.type === "Call");
        assert(parent !== null && index !== null);

        /*
        // `not(unknown())` => `never()`
        if (
          node.function === "not" &&
          node.children[0].type === "Call" &&
          node.children[0].function === "unknown"
        ) {
          parent.children[index] = {
            type: "Call",
            function: "never",
            children: [],
          };
          return;
        }*/

        // Remove all intersection/union calls with only one child
        // `intersection(type())` => `type()`
        if (
          isIntersectionOrUnion(node) &&
          (node.children[0] as CallArray).children.length === 1
        ) {
          assert(
            node.children.length === 1 && node.children[0].type === "Array"
          );
          parent.children[index] = node.children[0].children[0];
          return;
        }
      }
    );
    return tree;
  };
  return transformer;
};

export default transform;
