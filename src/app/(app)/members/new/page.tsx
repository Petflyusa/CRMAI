import { redirect } from "next/navigation";

// 新增会员改为弹窗，旧地址跳到会员列表并打开弹窗
export default function NewMemberPage() {
  redirect("/members?new=1");
}
