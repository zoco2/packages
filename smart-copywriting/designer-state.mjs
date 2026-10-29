import {
  normalizeDocument,
  clone,
  cloneNode,
  newId,
  renameField,
} from "./document.mjs";
export function createDesignerState(input) {
  let document = normalizeDocument(input),
    past = [],
    future = [];
  const find = (id, nodes = document.page.nodes) => {
    for (const node of nodes) {
      if (node.id === id) return node;
      const child = find(id, node.children || []);
      if (child) return child;
    }
  };
  const remove = (id, nodes = document.page.nodes) => {
    const i = nodes.findIndex((n) => n.id === id);
    if (i >= 0) return nodes.splice(i, 1)[0];
    for (const n of nodes) {
      const v = remove(id, n.children || []);
      if (v) return v;
    }
  };
  return {
    serialize: () => clone(document),
    find,
    undo() {
      if (!past.length) return;
      future.push(clone(document));
      document = past.pop();
    },
    redo() {
      if (!future.length) return;
      past.push(clone(document));
      document = future.pop();
    },
    applyCommand(c) {
      past.push(clone(document));
      if (past.length > 100) past.shift();
      future = [];
      try {
        const n =
          c.id === "__page__"
            ? { styles: document.page.styles ?? (document.page.styles = {}) }
            : c.id
              ? find(c.id)
              : null;
        if (c.type === "setStyle") {
          if (!n) throw Error("组件不存在");
          n.styles ??= {};
          let owner = n.styles;
          if (c.part && c.part !== "root") {
            owner.parts ??= {};
            owner.parts[c.part] ??= {};
            owner = owner.parts[c.part];
          }
          const layer = c.layer || "base";
          if (layer === "base") {
            owner.base ??= {};
            owner.base[c.property] = c.value;
          } else {
            const [group, key] = layer.split(":");
            owner[group] ??= {};
            owner[group][key] ??= {};
            owner[group][key][c.property] = c.value;
          }
        } else if (c.type === "setContent") {
          n.content = { ...n.content, ...c.value };
        } else if (c.type === "replaceStyle") {
          n.styles = c.value;
        } else if (c.type === "addField") {
          document.fields.push(c.field);
          const node = {
            id: newId(),
            name: "cw-field",
            content: { field_id: c.field.id },
            styles: { base: { marginBottom: { value: 16, unit: "px" } } },
          };
          const p = find(c.parentId || "form");
          (p ? (p.children ??= []) : document.page.nodes).push(node);
        } else if (c.type === "editField") {
          const f = document.fields.find((v) => v.id === c.field.id);
          Object.assign(f, c.field);
        } else if (c.type === "renameField") {
          document = renameField(document, c.fieldId, c.key);
        } else if (c.type === "insert") {
          const p = find(c.parentId);
          (p ? (p.children ??= []) : document.page.nodes).splice(
            c.index ?? 999,
            0,
            c.node,
          );
        } else if (c.type === "remove") {
          remove(c.id);
        } else if (c.type === "move") {
          const parent = c.parentId ? find(c.parentId) : null;
          if (c.parentId === c.id) throw Error("不能放入自身");
          const ids = [];
          const scan = (n) => {
            ids.push(n.id);
            for (const v of n.children || []) scan(v);
          };
          if (n) scan(n);
          if (ids.includes(c.parentId)) throw Error("不能放入自己的子组件");
          const moving = remove(c.id);
          if (moving)
            (parent ? (parent.children ??= []) : document.page.nodes).splice(
              c.index ?? 999,
              0,
              moving,
            );
        } else if (c.type === "copy") {
          const copy = cloneNode(n);
          const walk = (v) => {
            if (v.name === "cw-field") {
              const f = document.fields.find(
                (f) => f.id === v.content.field_id,
              );
              if (f) {
                const field = clone(f);
                field.id = newId();
                field.key =
                  f.key + "_" + Math.random().toString(36).slice(2, 6);
                document.fields.push(field);
                v.content.field_id = field.id;
              }
            }
            for (const child of v.children || []) walk(child);
          };
          walk(copy);
          document.page.nodes.push(copy);
        } else if (c.type === "replaceDocument") {
          document = normalizeDocument(c.document);
        } else if (c.type === "setPrompt") {
          document.prompt = { ...document.prompt, ...c.value };
        }
        return clone(document);
      } catch (e) {
        document = past.pop();
        throw e;
      }
    },
  };
}
