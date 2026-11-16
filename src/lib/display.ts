/** 列表里只显示邮箱 @ 前面的部分 */
export function emailUser(email: string) {
  const i = email.indexOf("@");
  return i > 0 ? email.slice(0, i) : email;
}

/** 门店缩写：没填缩写时退回门店全名 */
export function storeAbbr(name: string | null | undefined, code: string | null | undefined) {
  return code?.trim() || name || null;
}
