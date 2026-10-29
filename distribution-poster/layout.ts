export type Layer = {
  id: string;
  type: "invite_code" | "avatar" | "nickname" | "text";
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  text?: string;
  color?: string;
  font_size?: number;
  bold?: boolean;
  align?: "left" | "center" | "right";
  user_move: boolean;
  user_resize: boolean;
  user_edit: boolean;
};
export type Layout = {
  schema_version: 1;
  canvas: { width: number; height: number; background_asset_id: number };
  layers: Layer[];
};
export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
export const labels = {
  invite_code: "专属推广码",
  avatar: "用户头像",
  nickname: "用户昵称",
  text: "自定义文字",
};
export function initialLayout(): Layout {
  return {
    schema_version: 1,
    canvas: { width: 1080, height: 1440, background_asset_id: 0 },
    layers: [
      {
        id: "code",
        type: "invite_code",
        x: 0.65,
        y: 0.74,
        w: 0.25,
        h: 0.1875,
        z: 20,
        user_move: true,
        user_resize: true,
        user_edit: false,
      },
      {
        id: "avatar",
        type: "avatar",
        x: 0.09,
        y: 0.76,
        w: 0.12,
        h: 0.09,
        z: 10,
        user_move: true,
        user_resize: true,
        user_edit: false,
      },
      {
        id: "nickname",
        type: "nickname",
        x: 0.09,
        y: 0.87,
        w: 0.5,
        h: 0.045,
        z: 11,
        font_size: 30,
        color: "#333333",
        align: "left",
        user_move: true,
        user_resize: true,
        user_edit: false,
      },
      {
        id: "message",
        type: "text",
        x: 0.09,
        y: 0.09,
        w: 0.8,
        h: 0.12,
        z: 1,
        text: "与你分享，更多创作灵感",
        font_size: 52,
        color: "#333333",
        bold: true,
        align: "left",
        user_move: true,
        user_resize: true,
        user_edit: true,
      },
    ],
  };
}
export function errorFor(layout: Layout): string {
  if (!layout.canvas.background_asset_id) return "请先从素材库选择背景图片";
  const codes = layout.layers.filter((x) => x.type === "invite_code");
  if (codes.length !== 1) return "海报需要一个专属推广码";
  const c = codes[0],
    { width, height } = layout.canvas;
  if (
    c.w * width < 180 ||
    c.h * height < 180 ||
    Math.abs(c.w * width - c.h * height) > 2
  )
    return "推广码需为正方形，且不小于 180 像素";
  for (const l of layout.layers) {
    if (
      [l.x, l.y, l.w, l.h].some((v) => !Number.isFinite(v)) ||
      l.x < 0 ||
      l.y < 0 ||
      l.w <= 0 ||
      l.h <= 0 ||
      l.x + l.w > 1.000001 ||
      l.y + l.h > 1.000001
    )
      return "内容超出画布，请调整位置或大小";
    if (
      l.id !== c.id &&
      l.x < c.x + c.w &&
      l.x + l.w > c.x &&
      l.y < c.y + c.h &&
      l.y + l.h > c.y
    )
      return "文字和头像不能遮挡推广码";
  }
  return "";
}
export function moveLayer(l: Layer, x: number, y: number) {
  l.x = Math.max(0, Math.min(1 - l.w, x));
  l.y = Math.max(0, Math.min(1 - l.h, y));
}
export function resizeLayer(l: Layer, width: number, layout: Layout) {
  const min = l.type === "invite_code" ? 180 : 30;
  const w = Math.max(min, Math.min(layout.canvas.width * (1 - l.x), width));
  if (l.type === "invite_code" || l.type === "avatar") {
    const side = Math.min(w, layout.canvas.height * (1 - l.y));
    l.w = side / layout.canvas.width;
    l.h = side / layout.canvas.height;
  } else l.w = w / layout.canvas.width;
}
export function wrapText(
  text: string,
  maxWidth: number,
  measure: (s: string) => number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const ch of Array.from(paragraph)) {
      if (line && measure(line + ch) > maxWidth) {
        lines.push(line);
        line = ch;
      } else line += ch;
    }
    lines.push(line);
  }
  return lines;
}
