/** Bundled icons belong to the active site; tenant uploads retain their URL. */
export function copywritingIconUrl(value, origin = "") {
  const url = String(value || "");
  const path = url.replace(/^https?:\/\/[^/]+/i, "");
  if (/^\/?resource\/image\/copywriting\//.test(path))
    return origin.replace(/\/$/, "") + "/" + path.replace(/^\//, "");
  return url;
}
export function mergeTaskSnapshot(current, incoming) {
  if (!current || current.id !== incoming.id) return incoming;
  if ((incoming.last_seq ?? 0) < (current.last_seq ?? 0)) return current;
  if (
    ["success", "failed", "canceled"].includes(current.status) &&
    ["pending", "running"].includes(incoming.status)
  )
    return current;
  return {
    ...current,
    ...incoming,
    result_text: incoming.result_text ?? current.result_text,
  };
}
export function parseResult(rawText = "", mode = "article") {
  const raw = String(rawText),
    sections = [];
  if (mode === "variants") {
    const chunks = raw
      .split(/(?:^|\n)\s*\d+[.、．]\s*/)
      .filter((v) => v.trim());
    if (chunks.length > 1)
      chunks.forEach((text, i) =>
        sections.push({ id: String(i), text: text.trim() }),
      );
  }
  return { raw, sections, parse_status: sections.length ? "parsed" : "raw" };
}
export function buildRegenerateRequest(task, model, key) {
  if (["pending", "running"].includes(task.status))
    throw Error("请先等待或停止当前生成");
  return {
    tool_id: task.tool_id,
    version_id: task.version_id,
    values: { ...task.values },
    model_selection: model,
    idempotency_key: key,
    source_task_id: task.id,
  };
}
export async function copyResultText(result, scope, clipboard) {
  const text =
    scope === "all"
      ? result.raw
      : result.sections.find((v) => v.id === scope)?.text;
  if (!text) throw Error("暂无可复制的内容");
  await clipboard(text);
  return text;
}
export function buildCategoryView(categories = [], tools = [], selected = "") {
  return [...categories]
    .filter((c) => c.is_visible !== 0 && (!selected || c.code === selected))
    .sort((a, b) => (b.sort || 0) - (a.sort || 0))
    .map((c) => ({
      ...c,
      tools: tools
        .filter((t) => String(t.category_id) === String(c.id))
        .sort((a, b) => (b.sort || 0) - (a.sort || 0)),
    }))
    .filter((c) => c.tools.length);
}
export function createSseParser(emit) {
  let buffer = "";
  return (chunk) => {
    buffer += chunk;
    let m;
    while ((m = /\r?\n\r?\n/.exec(buffer))) {
      const block = buffer.slice(0, m.index);
      buffer = buffer.slice(m.index + m[0].length);
      const text = block
        .split(/\r?\n/)
        .filter((v) => v.startsWith("data:"))
        .map((v) => v.slice(5).trimStart())
        .join("\n");
      if (text && text !== "[DONE]") emit(JSON.parse(text));
    }
  };
}
export function createUtf8Decoder() {
  let pending = [];
  return (bytes) => {
    const input = pending.concat(Array.from(bytes));
    pending = [];
    let out = "";
    for (let i = 0; i < input.length;) {
      const first = input[i],
        width = first < 128 ? 1 : first < 224 ? 2 : first < 240 ? 3 : 4;
      if (i + width > input.length) {
        pending = input.slice(i);
        break;
      }
      let code = width === 1 ? first : first & (127 >> width);
      for (let j = 1; j < width; j++) code = (code << 6) | (input[i + j] & 63);
      out += String.fromCodePoint(code);
      i += width;
    }
    return out;
  };
}

// A received business rejection is safe to edit; an absent response keeps its key.
export function unwrapSubmission(response) {
  if (Number(response?.code) === 1) return response.data;
  const error = new Error(response?.msg || "提交未完成");
  error.submissionRejected = true;
  throw error;
}

export function nodeInteractionStates(
  name,
  {
    focus = false,
    hover = false,
    busy = false,
    hasModel = true,
    preview = false,
    error = false,
  } = {},
) {
  return [
    ...(focus ? ["focus"] : []),
    ...(hover ? ["hover"] : []),
    ...(busy ? ["loading"] : []),
    ...(name === "cw-submit" && (busy || !hasModel || preview)
      ? ["disabled"]
      : []),
    ...(name === "cw-result" && error ? ["error"] : []),
  ];
}
