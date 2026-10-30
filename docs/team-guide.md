# 队友上传指南（直接复制给 Codex）

> 用法：把下面整段复制给 Codex，把【】里的内容换成你自己的。
> 前提：nate 已经把你的 GitHub 账号加为仓库协作者（Collaborator），并且你在邮箱里点了接受邀请。

---

请帮我把代码和资料上传到团队仓库 https://github.com/Hawk0321/pandaAI_game ，按以下步骤做：

1. **拿到仓库**：如果本地还没有，执行 `git clone https://github.com/Hawk0321/pandaAI_game.git` 并进入目录；如果已经有，先 `git checkout main` 再 `git pull origin main`。
2. **先读规则**：完整阅读仓库根目录的 `AGENTS.md`，之后所有操作都遵守它。
3. **新建分支**：`git checkout -b 【我的名字】/【做了什么，英文短词】`，例如 `xiaoming/replay-page`。不要在 `main` 上直接改。
4. **放对位置**：把我要上传的东西【说明是哪些文件或文件夹，在电脑哪里】放进仓库：
   - 文档、方案、笔记 → `docs/`
   - 前端页面代码 → `frontend/`
   - 后端、数据处理、推荐逻辑代码 → `backend/`
   - 示例数据、模拟数据 → `data/samples/`（文件名以 `sample_` 开头）
5. **检查安全**：确认没有密钥、token、账号密码、`.env` 文件、`node_modules` 等大文件或依赖目录被加进来；Panda Data 凭证只能从环境变量读取。发现问题先改掉再继续。
6. **提交并推送**：`git add` 相关文件，写一句清楚的提交信息，然后 `git push -u origin 【分支名】`。
7. **开 PR**：如果装了 GitHub CLI，用 `gh pr create --base main` 开 Pull Request；没有的话，把推送后终端里给出的链接发给我，我在网页上点 "Create pull request"。PR 描述写清：加了什么、放在哪、怎么运行或查看、还有什么没做完、用了哪些第三方代码或 AI 工具。
8. **告诉我结果**：最后把 PR 链接发给我，并列出上传了哪些文件。

如果某一步报错（比如没有权限、有冲突），停下来告诉我原因，不要强行推送，也不要推到 `main`。
