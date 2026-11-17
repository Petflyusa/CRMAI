# CRMAI 会员管理系统

多币种（USD / CAD / CNY）会员、门店、服务管理后台。Next.js 15 + Supabase，部署在 Vercel。

## 功能

- **概览**：本月收入、利润、利润率、有效会员数、30 天内到期人数；近 12 个月收入与利润图；门店业绩；本月收款币种构成；待续费名单。
- **会员**：录入邮箱、服务、开始/到期日期、实付金额与币种，自动算出美元口径利润；列表里可编辑、续费、删除；按门店、状态筛选和搜索。
- **门店**：新增、编辑、停用、删除；每个门店的会员数、本月收入、累计收入和利润。
- **服务**：价格和成本可用任意币种录入，系统按汇率折算；有效期天数用于自动推算到期日。
- **汇率**：自动抓取（默认 12 小时缓存，过期后有人访问时才重新抓取，不需要定时任务），可手动刷新；有换算器和抓取记录。
- **展示币种**：侧边栏可切换 USD / CAD / CNY，统计数字按所选币种显示。

## 利润怎么算

```
利润(USD) = 实付金额 ÷ 汇率[实付币种] − 成本(USD)
```

- 汇率以 USD 为基准：`1 USD = rates[CAD] CAD = rates[CNY] CNY`。
- 成本默认取服务成本（按服务成本的币种折算成 USD），录入时可以手动改。
- 每笔付款都会保存当时的汇率快照（`fx_snapshot`），以后汇率变动不会改变历史利润。编辑付款时默认沿用原汇率，勾选「按最新汇率重新计算」才会换成当前汇率。

例：服务成本 USD 40，会员付了 CNY 700，汇率 1 USD = 6.6719 CNY
→ 实付折合 USD 104.92，利润 USD 64.92。

汇率来源：[Frankfurter](https://frankfurter.dev)（欧洲央行数据，免费、无需 key），失败时自动改用 [ExchangeRate-API](https://open.er-api.com)。

## 第一次部署

### 1. 建数据库

二选一：

- **Supabase SQL Editor**：打开项目 → SQL Editor，粘贴并运行 `supabase/migrations/20261116000000_init.sql`。
- **Claude Code + Supabase MCP**：项目里已带 `.mcp.json`。在终端里进入本项目目录，运行 `claude`，再输入 `/mcp`，选 supabase → Authenticate。授权后让 Claude 用 `apply_migration` 执行上面的迁移文件。

### 2. 建管理员账号

Supabase → Authentication → Users → **Add user**，填邮箱和密码，勾选 Auto Confirm。
然后在 Authentication → Sign In / Providers 里**关闭 Allow new users to sign up**，这样别人无法自己注册。
（数据表开启了 RLS，只有登录用户能读写。）

### 3. 本地运行

```bash
cp .env.example .env.local   # 填入 Publishable key（Project Settings → API Keys）
npm install
npm run dev
```

### 4. 部署到 Vercel

1. Vercel → Add New → Project → 导入 `Petflyusa/CRMAI`。
2. Environment Variables 填：
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://ruvxylrrdwlowumdqjaz.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = Supabase 的 Publishable key（旧项目可用 anon key）
   - `FX_TTL_HOURS`（可选，默认 12）
3. Deploy。

## 目录

```
supabase/migrations/   数据库结构（表、视图、RLS）
src/lib/currency.ts    币种、换算、格式化
src/lib/fx.ts          汇率抓取与缓存
src/lib/pricing.ts     利润计算（前后端共用）
src/app/actions/       Server Actions：会员、门店、服务、汇率、登录
src/app/(app)/         各页面：概览、会员、门店、服务、汇率
```
