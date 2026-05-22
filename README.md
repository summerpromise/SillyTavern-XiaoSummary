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
3. **聊天补全预设**：从下拉选择一个预设。**这个预设本身就是你用来破甲的那个预设**，插件会把它里面所有启用的 prompt 按当前角色的 `prompt_order` 顺序原样拿来作为请求 messages（保留 role），最后追加一条 user 消息（=「总结提示词 + 待总结聊天内容」）一起发出去。
4. **总结提示词**：默认即原 0.4.1 的"凛倾协议 v4 + 10 维度权重"提示词。可改可重置。
5. **目标世界书**：留空 = 自动检测（先聊天绑定，再角色主世界书）；想固定写到某个就显式选。
6. **代理配置**（可选）：跨域被拦时启用，填代理 URL 和密钥（同原脚本，需要自己跑一个 `X-Target-URL` + `X-Proxyauth` 风格的转发服务）。
7. **手动单次总结**：填「起始楼层」「结束楼层」（1-based，含两端），点 **「开始总结」**。结果写入 `小总结-<聊天ID>-起-止` 条目（首次创建会自动加上"剧情总结"引导文本，之后是 `--- [起-止] ---` 分隔追加到同一条目）。
8. **状态行**：当前聊天、目标世界书、总楼层、已总结到第几楼、剩余未总结楼数。

## 注意事项

1. **预设下拉是动态的**：你在酒馆里 切预设 / 加预设 / 改预设，本插件监听了 `PRESET_CHANGED` 和 `MAIN_API_CHANGED` 事件会自动刷新；也可以手动点旁边的刷新按钮。
2. **配置存哪**：通过 `extensionSettings['xiao_summary']` 存进 SillyTavern 的 `settings.json`，跟随用户；和原脚本里手写的 `localStorage` 不互通。
3. **不再有自动总结**：哪怕楼层堆到几百也不会自己跑，必须自己填楼层点按钮。
4. **不再有大总结**：如果你之前用过 0.4.1 的 `大总结-` 条目，它们仍会保留在世界书里（本插件不会动它们），只是不再被本插件读写。
5. **生成的世界书条目**：`constant: true`（蓝色常驻）, `position: 0`（角色定义前）, `disable: false`。如果你想改成按关键词触发，去世界书界面手动编辑。
6. **预设里的占位符**（`{{char}}` / `{{user}}` / `{{persona}}` 等）会被 `substituteParams` 替换，**但** `chatHistory` / `worldInfoBefore` 这类 ST 内部 marker 占位符（`marker: true` 且 content 为空）会被自动跳过，避免把空字符串塞进 messages。

## 版本

- **1.1.0** — 按需求重写
  - 修复按钮文字竖排错乱（CSS）
  - 把"自动取下一段"按钮换成「起始楼层 / 结束楼层 / 开始总结」手动单次模式
  - 预设不再只抽 `role=system`，而是按 `prompt_order` 完整拼成 messages（保留各条 role），最后追加一条 user 消息
- **1.0.0** — 初版

## 致谢

- **默默 & 萧然** —— 原脚本作者
- **90 & FLOW** —— 0.4.1 代理改造
- **summerpromise** —— 插件化精简
