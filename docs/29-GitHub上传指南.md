# 29 GitHub 上传指南

> 本地仓库已就绪（55 文件已提交）。推送只需两步。

## 第一步 · 在 GitHub 创建空仓库（3 分钟）

1. 登录 github.com → 右上角 + → New repository；
2. Repository name：如 `relicchain`（可公开或私有）；
3. **不要勾选** Add a README / .gitignore / license（保持完全空白）；
4. 点 Create repository → 复制仓库地址，形如：
   `https://github.com/你的用户名/relicchain.git`

## 第二步 · 推送（二选一）

**方式 A（最简单）**：双击 `上传GitHub.bat`，把仓库地址粘贴进去，回车。
**方式 B（命令行）**：
```
git remote add origin https://github.com/你的用户名/relicchain.git
git branch -M main
git push -u origin main
```

## 认证说明（第一次推送必看）

- GitHub 已不支持密码推送，需要 **Personal Access Token**：
  头像 → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token（勾选 repo 权限）；
- 推送时用户名填 GitHub 用户名，**密码填 token**；
- 或在 bat 里直接把地址写成 `https://用户名:TOKEN@github.com/用户名/仓库名.git`（token 别发给别人）。

## 已就绪的内容

- 仓库：git 已初始化，55 个文件首次提交完成（root-commit）；
- LICENSE：MIT 开源协议；
- .gitignore：已排除运行数据 data.json（首次启动自动生成）、系统垃圾文件；
- 分支：main。

## 常见问题

| 问题 | 解决 |
| --- | --- |
| 推送报 403/认证失败 | 用 token 当密码，见上文 |
| 报 rejected（远端有内容） | 创建仓库时勾了 README——删掉远端仓库重建，或 `git pull --rebase` 后重推 |
| 想更新代码后再推 | `git add -A` → `git commit -m "更新说明"` → `git push` |
| data.json 想公开样例 | 删除 .gitignore 中 data.json 那行即可（注意含账号哈希） |
