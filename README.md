# SillyTavern 小总结助手 (XiaoSummary)

精简自《酒馆助手脚本 - 全自动总结 0.4.1》（原作：默默 & 萧然；代理改造：90 & FLOW），重做为 **SillyTavern 原生 UI 扩展**，给个人自用。

## 与原脚本相比的差异

| 功能 | 原脚本 0.4.1 | 本插件 1.1.0 |
| --- | --- | --- |
| 形态 | 酒馆助手 (TavernHelper) 脚本，JSON 导入 | SillyTavern 原生扩展，文件夹形式 |
| 自动触发总结 | 有 | **砍掉** |
| 大总结（`大总结-` 前缀） | 有 | **砍掉** |
| 手动单次总结（指定起止楼层） | 有 | ✅ 保留 |
| "破甲提示词"手写在配置里 | 有 | ❌ 不再单独写破甲，**改成下拉选一个聊天补全预设**，整个预设作为请求 messages 直接发出 |
| 总结提示词 | 手写 | ✅ 保留，可改可重置 |
| 代理 (CORS) | 有 | ✅ 保留 |
| 世界书读写 | 走 `TavernHelper_API` | 走 SillyTavern 原生 `loadWorldInfo / saveWorldInfo`，不再依赖酒馆助手 |
| 自定义 OpenAI 兼容 API (URL/Key/Model) | 有 | ✅ 保留 |

## 安装

### 方法 1：本地文件夹安装（推荐，个人自用最方便）

把整个 `SillyTavern-XiaoSummary` 文件夹拷到下面任一目录里：

- **当前用户**（推荐）：`<SillyTavern 安装目录>/data/<你的用户名>/extensions/third-party/SillyTavern-XiaoSummary/`
- **所有用户**：`<SillyTavern 安装目录>/public/scripts/extensions/third-party/SillyTavern-XiaoSummary/`

然后重启 SillyTavern。

### 方法 2：通过 Git URL 安装

1. SillyTavern → 顶部菜单 → **Extensions** → **Install extension**
2. 粘贴本仓库的 Git URL → 确认

## 使用流程

1. 启动 SillyTavern 后，点顶部 **Extensions** → 在扩展设置区域找到折叠面板 **"小总结助手 (XiaoSummary)"**。
2. **API 配置**：填 URL、Key，点「拉取模型」，从下拉选模型；点「测试连接」确认能通。
3. **聊天补全预设**：从下拉选择一个预设。**这个预设本身就是你用来破甲的那个预设**，插件会把它里面所有启用的 prompt 按当前角色的 `prompt_order` 顺序原样拿来作为请求 messages（保留 role），最后追加一条 user 消息（=「总结提示词 + 聊天内容」）一起发出去。
4. **总结提示词**：默认即原 0.4.1 的"凛倾协议 v4 + 10 维度权重"提示词。可改可重置。
5. **目标世界书**：留空 = 自动检测（先聊天绑定，再角色主世界书）；想固定写到某个就显式选。
6. **代理配置**（可选）：跨域被拦时启用，填代理 URL 和密钥（同原脚本，需要自己跑一个 `X-Target-URL` + `X-Proxyauth` 风格的转发服务）。
7. **手动单次总结**：填「起始楼层」「结束楼层」（1-based，含两端），点 **「开始总结」**。任意范围可重复总结；同范围再次总结会覆盖对应条目，不同范围各自独立一条 `小总结-<聊天ID>-起-止`。

## 注意事项

1. **预设下拉是动态的**：你在酒馆里 切预设 / 加预设 / 改预设，本插件监听了 `PRESET_CHANGED` 和 `MAIN_API_CHANGED` 事件会自动刷新；也可以手动点旁边的刷新按钮。
2. **配置存哪**：通过 `extensionSettings['xiao_summary']` 存进 SillyTavern 的 `settings.json`，跟随用户；和原脚本里手写的 `localStorage` 不互通。
3. **不再有自动总结**：哪怕楼层堆到几百也不会自己跑，必须自己填楼层点按钮。
4. **不再有大总结**：如果你之前用过 0.4.1 的 `大总结-` 条目，它们仍会保留在世界书里（本插件不会动它们），只是不再被本插件读写。
5. **生成的世界书条目**：`constant: true`（蓝色常驻）, `position: 0`（角色定义前）, `disable: false`。如果你想改成按关键词触发，去世界书界面手动编辑。
6. **预设里的占位符**（`{{char}}` / `{{user}}` / `{{persona}}` 等）会被 `substituteParams` 替换，**但** `chatHistory` / `worldInfoBefore` 这类 ST 内部 marker 占位符（`marker: true` 且 content 为空）会被自动跳过，避免把空字符串塞进 messages。

## 版本

- **1.1.4** — 保存世界书后强制刷新世界书编辑器 UI（无需再切换角色绑定世界书才看到更新）；加强 prompt 的时间标记规则，要求 AI 在原文无具体日期时按时代背景合理「创造」一个具体到日的日期，禁止「某年某月」「某天」等模糊表述
- **1.1.3** — 改回单条目顺延合并：同一聊天多次总结全部追加到同一条 `小总结-<聊天ID>-起-止` 条目，名字按并集自动扩展；自动迁移 1.1.2 残留的多条碎片
- **1.1.2** — 移除「已总结到 / 待总结」状态追踪（但条目被切碎，已在 1.1.3 修正）
- **1.1.1** — 更新默认总结 prompt（具体时间标记、严禁 Markdown 等）
- **1.1.0** — 手动楼层总结、预设整包发送、CSS 修复
- **1.0.0** — 初版

## 致谢

- **默默 & 萧然** —— 原脚本作者
- **90 & FLOW** —— 0.4.1 代理改造
- **summerpromise** —— 插件化精简
