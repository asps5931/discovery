/**
 * ponytail: smoke-check document folder tree builder.
 * Run: node scripts/check-document-tree.mjs
 */
import assert from "node:assert/strict";

const FOLDER_MARKER = "_folder";

function buildDocumentTree(relMdPaths) {
  const root = new Map();

  const ensureFolder = (map, name, folderPath) => {
    const existing = map.get(name);
    if (existing?.kind === "folder") return existing;
    const folder = { kind: "folder", name, path: folderPath, children: new Map() };
    map.set(name, folder);
    return folder;
  };

  for (const rel of relMdPaths) {
    if (!rel.endsWith(".md")) continue;
    const withoutExt = rel.slice(0, -".md".length);
    const parts = withoutExt.split("/").filter(Boolean);
    if (parts.length === 0) continue;

    const marker = parts[parts.length - 1] === FOLDER_MARKER;
    const folderParts = marker ? parts.slice(0, -1) : parts.slice(0, -1);
    const filePart = marker ? null : parts[parts.length - 1];

    let map = root;
    let accPath = "";
    for (const part of folderParts) {
      accPath = accPath ? `${accPath}/${part}` : part;
      map = ensureFolder(map, part, accPath).children;
    }

    if (filePart) {
      map.set(filePart, {
        kind: "file",
        name: filePart,
        path: withoutExt,
        label: filePart,
      });
    }
  }

  const toNodes = (map) => {
    const nodes = [];
    for (const node of map.values()) {
      if (node.kind === "folder") {
        nodes.push({
          kind: "folder",
          name: node.name,
          path: node.path,
          children: toNodes(node.children),
        });
      } else {
        nodes.push(node);
      }
    }
    return nodes.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  };

  return toNodes(root);
}

const tree = buildDocumentTree([
  "checkout.md",
  "pocs/_folder.md",
  "pocs/bulk-import.md",
  "pocs/nested/deep.md",
]);

assert.equal(tree.length, 2);
assert.equal(tree[0].kind, "folder");
assert.equal(tree[0].path, "pocs");
assert.equal(tree[0].children.length, 2);
assert.equal(tree[0].children[0].kind, "folder");
assert.equal(tree[0].children[0].path, "pocs/nested");
assert.equal(tree[0].children[0].children[0].path, "pocs/nested/deep");
assert.equal(tree[0].children[1].path, "pocs/bulk-import");
assert.equal(tree[1].kind, "file");
assert.equal(tree[1].path, "checkout");

const emptyFolder = buildDocumentTree(["archive/_folder.md"]);
assert.equal(emptyFolder.length, 1);
assert.equal(emptyFolder[0].kind, "folder");
assert.equal(emptyFolder[0].children.length, 0);

console.log("check-document-tree: ok");
