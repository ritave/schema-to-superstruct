export function isValidURL(url: string, protocols?: string[]): false | URL {
  try {
    const parsed = new URL(url);
    return protocols === undefined
      ? parsed
      : protocols.includes(parsed.protocol.slice(0, -1))
      ? parsed
      : false; // remove ':' at end
  } catch (e) {
    return false;
  }
}

export function isURIReference(uri: string): boolean {
  return true;
}

export function isRegex(r: string): boolean {
  return true;
}

export function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

/**
 * @see {@link https://github.com/syntax-tree/unist#tree-traversal}
 */
export enum Traversal {
  /**
   * 1. Visit the current node.
   * 2. Traverse the head child.
   * 3. Traverse tail children.
   */
  PreOrder,
  /**
   * 1. Traverse the head child.
   * 2. Traverse tail children.
   * 3. Visit the current node.
   */
  PostOrder,
  /**
   * 1. Visit the current node.
   * 2. Traverse tail children.
   * 3. Traverse the head child.
   */
  RevPreOrder,
  /**
   * 1. Traverse tail children
   * 2. Traverse the head child.
   * 3. Visit the current node.
   */
  RevPostOrder,
}

/*
export function visit<Tree extends Node<Data>>(
  tree: Tree,
  visitor: BuildVisitor<Tree, string>,
  order?: Traversal
): void;
export function visit<Tree extends Node<Data>, Check extends Test>(
  tree: Tree,
  test: Check,
  visitor: BuildVisitor<Tree, Check>,
  order?: Traversal
): void;
export function visit<Tree extends Node<Data>, Check extends Test>(
  tree: Tree,
  testOrVisitor: Check | BuildVisitor<Tree, Check>,
  visitorOrOrder?: BuildVisitor<Tree, Check> | Traversal,
  order?: Traversal
): void {
  let test: Check | null;
  let visitor: BuildVisitor<Tree, Check>;
  if (
    typeof testOrVisitor === "function" &&
    typeof visitorOrOrder !== "function"
  ) {
    order = visitorOrOrder;
    visitor = testOrVisitor;
    test = null;
  } else {
    test = testOrVisitor as Check;
    visitor = visitorOrOrder as BuildVisitor<Tree, Check>;
  }
  order ??= Traversal.PreOrder;

  visitParents(tree, test, overload, order);

  function overload(node: Node, parents: Parent[]) {
    const parent = parents[parents.length - 1];
    return visitor(
      node as any,
      parent ? parent.children.indexOf(node) : null,
      parent as any
    );
  }
}

export function visitParents<Tree extends Node<Data>>(
  tree: Tree,
  visitor: BuildVisitorParents<Tree, string>,
  order?: Traversal
): void;
export function visitParents<Tree extends Node<Data>, Check extends Test>(
  tree: Tree,
  test: Check,
  visitor: BuildVisitorParents<Tree, Check>,
  order?: Traversal
): void;
export function visitParents<Tree extends Node<Data>, Check extends Test>(
  tree: Tree,
  testOrVisitor: Check | BuildVisitorParents<Tree, Check>,
  visitorOrOrder?: BuildVisitorParents<Tree, Check> | Traversal,
  order?: Traversal
) {
  let test: Check | null;
  let visitor: BuildVisitorParents<Tree, Check>;

  if (
    typeof testOrVisitor === "function" &&
    typeof visitorOrOrder !== "function"
  ) {
    order = visitorOrOrder;
    visitor = testOrVisitor;
    test = null;
  } else {
    test = testOrVisitor as Check;
    visitor = visitorOrOrder as BuildVisitor<Tree, Check>;
  }

  order ??= Traversal.PreOrder;

  const is = convert(test);
}
*/
