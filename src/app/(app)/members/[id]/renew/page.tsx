import { redirect } from "next/navigation";

// 续费改为弹窗，旧地址跳到会员详情并打开弹窗
export default async function RenewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/members/${id}?renew=1`);
}
