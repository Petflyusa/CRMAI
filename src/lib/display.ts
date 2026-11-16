/** 列表里只显示邮箱 @ 前面的部分 */
export function emailUser(email: string) {
  const i = email.indexOf("@");
  return i > 0 ? email.slice(0, i) : email;
}

const STOP_WORDS = new Set(["of", "the", "and", "&", "at", "de"]);

/**
 * 门店缩写，按名称自动生成：
 * - 多个英文单词取首字母：Global Pet Service → GPS，Pet Store 2 → PS2
 * - 单个驼峰单词取大写字母：VetHub → VH；其他单词取前 3 个字母：Petland → PET
 * - 中文名称取前两个字：多伦多店 → 多伦
 */
export function storeAbbr(name: string | null | undefined): string | null {
  const n = name?.trim();
  if (!n) return null;
  const words = n.match(/[A-Za-z][A-Za-z']*|\d+/g) ?? [];
  const latin = words.filter((w) => /[A-Za-z]/.test(w));
  if (latin.length >= 2) {
    const picked = words.filter((w) => !STOP_WORDS.has(w.toLowerCase()));
    return picked
      .map((w) => (/\d/.test(w) ? w : w[0].toUpperCase()))
      .join("")
      .slice(0, 6);
  }
  if (latin.length === 1) {
    const w = latin[0];
    const caps = w.match(/[A-Z]/g) ?? [];
    const base = caps.length >= 2 ? caps.join("") : w.slice(0, 3).toUpperCase();
    const digits = words.filter((x) => /^\d+$/.test(x)).join("");
    return (base + digits).slice(0, 6);
  }
  const cjk = n.match(/[㐀-鿿]/g);
  if (cjk && cjk.length > 2) return cjk.slice(0, 2).join("") + (n.match(/\d+/)?.[0] ?? "");
  return n;
}

/** 下拉框里的门店名：GPS · Global Pet Service */
export function storeLabel(name: string) {
  const abbr = storeAbbr(name);
  return abbr && abbr !== name ? `${abbr} · ${name}` : name;
}
