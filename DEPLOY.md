# 部署指南 —— 让别人能访问《人生重开模拟器》

架构:前端(静态) + 后端(Node/Fastify) + SQLite。所以**光推 GitHub 不够**(GitHub Pages 跑不了后端)。本方案:后端部署到 **Render**(带持久盘存 SQLite),前端部署到 **Vercel**(静态),全部有免费档。

## 一、推代码到 GitHub
```bash
git remote add origin git@github.com:<你的用户名>/game.git
git push -u origin main   # 或当前分支
```

## 二、部署后端到 Render(含 SQLite 持久化)
仓库根已备好 `render.yaml`(Blueprint)。
1. 打开 https://render.com → 登录(可用 GitHub 一键登录)
2. **New → Blueprint** → 选中本仓库,Render 自动识别 `render.yaml`
3. 确认后它会:
   - 安装 `@game/api` 依赖、构建 `game-core` 与 `api`
   - 用 `node apps/api/dist/index.js` 启动
   - 挂 1GB 持久盘到 `/var/data`,SQLite 落在 `/var/data/life.db`(重启不丢)
4. 部署完成,记下公网地址,形如:`https://game-api.onrender.com`
5. 验证:`curl https://game-api.onrender.com/api/health` 应返回 `{"code":0,...}`

> 免费档 Render 15 分钟无请求会休眠,首次访问需等几十秒冷启动,属正常现象。

## 三、部署前端到 Vercel
1. 打开 https://vercel.com → 用 GitHub 登录 → **Add New → Project** → 选中本仓库
2. **Root Directory** 选 `apps/life-restart`(Vercel 已识别 `vercel.json`,framework=vite)
3. 在 **Environment Variables** 添加:
   - `VITE_API_BASE` = `https://game-api.onrender.com`(你第二步拿到的地址,无末尾斜杠)
4. Deploy。完成后得到前端地址,形如 `https://your-game.vercel.app`

## 四、收紧后端跨域(可选但推荐)
后端默认放开 CORS(方便本地)。上线后在 Render 的环境变量加:
```
CORS_ORIGINS=https://your-game.vercel.app
```
保存即自动重新部署,之后只允许你的前端域名访问。

## 五、完成
把 `https://your-game.vercel.app` 发给任何人,点开就能玩,历代人生集中存在 Render 的 SQLite 里,全网互通。

---
### 本地开发(不变)
```bash
pnpm install
pnpm dev   # api(3001) + web(5173),走 Vite proxy,无需任何环境变量
```

### 常见问题
- **前端转圈连不上**:多为 Render 冷启动,刷新重试;或 `VITE_API_BASE` 填错/带了斜杠。
- **CORS 报错**:后端 `CORS_ORIGINS` 没包含前端域名。
- **历代人生消失**:确认 Render 持久盘已挂载且 `DB_PATH=/var/data/life.db` 生效。
