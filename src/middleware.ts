import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { missingEnv, supabaseKey, supabaseUrl } from "@/lib/supabase/env";

function configErrorPage(missing: string[]) {
  const items = missing.map((m) => `<li><code>${m}</code></li>`).join("");
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>配置未完成 · CRMAI</title>
<style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#f5f4f0;color:#1b1a17;font:14px/1.6 system-ui,"PingFang SC","Microsoft YaHei",sans-serif;padding:16px}
main{max-width:520px;background:#fdfcfa;border:1px solid #e3e0d8;border-radius:8px;padding:24px}h1{font-size:18px;margin:0 0 8px}code{background:#efede7;padding:1px 6px;border-radius:4px}p,li{color:#4a4740}</style></head>
<body><main><h1>缺少环境变量，系统还不能连接数据库</h1><p>请在 Vercel → Project → Settings → Environment Variables 添加：</p><ul>${items}</ul>
<p>值在 Supabase → Project Settings → API Keys。添加后到 Deployments 里对最新一次部署点 <b>Redeploy</b>，变量才会生效。</p></main></body></html>`;
  return new NextResponse(html, { status: 503, headers: { "content-type": "text/html; charset=utf-8" } });
}

export async function middleware(request: NextRequest) {
  const missing = missingEnv();
  if (missing.length) return configErrorPage(missing);

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabaseKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isLogin = path.startsWith("/login");

  if (!user && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (user && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
