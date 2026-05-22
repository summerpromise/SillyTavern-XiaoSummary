/**
 * SillyTavern 小总结助手 (XiaoSummary)
 *
 * 仅保留「小总结」一条链路：
 *   - 砍掉自动触发 / 大总结 / 手动指定起止楼层
 *   - 破甲提示词改为从酒馆「聊天补全预设 (Chat Completion Preset)」下拉选择
 *   - 总结结果写入当前角色的世界书 (Lorebook)，条目名前缀「小总结-」
 *
 * 原作: 默默 & 萧然 / 代理改造: 90 & FLOW / 插件化精简: summerpromise
 */

(function () {
    'use strict';

    /* =========================================================
     *  常量与默认值
     * ========================================================= */

    const MODULE_NAME = 'xiao_summary';
    const SETTINGS_KEY = 'xiao_summary';
    const PANEL_ID = 'xiao_summary_panel';
    const SUMMARY_PREFIX = '小总结-';

    const DEFAULT_SUMMARY_PROMPT = `你的任务是接收用户提供的原文，对其进行深入分析和理解。你需要
1.  将原文内容分解为一系列独立的，按发生顺序排列的关键事件。
2.  对每个独立事件，在内部参照下文定义的10个权重评估维度，逐一进行分析和评分。
3.  对于每个维度，如果该事件表现出相应特征，则为此维度贡献一个介于0.05和0.15之间的分数，具体分数取决于该特征在该事件中的显著程度。如果某个维度不适用于当前事件，则该维度对此事件的贡献为0。
4.  将一个事件在所有10个维度上获得的贡献分数进行累加。如果累加总和超过1.0，则将该事件的最终权重值封顶为1.0。如果累加总和为0（即没有任何维度适用或贡献分数），则最终权重为0.0。
5.  严格按照指定的行文本格式输出总结结果，仅包含事件序号，事件描述和计算出的最终权重值。所有用于权重计算的内部维度分析及各维度的具体得分均不得出现在最终输出中。

内容客观性与权重生成依据
事件描述（输出格式中的xx部分）必须基于原文进行客观，中立的概括，严格遵循下文的<wording_standard>。
最终输出的权重值（输出格式中的0.9这类数字）是你根据本协议定义的10个维度及其评分规则，在内部进行综合计算得出的，其目的是为了量化评估事件对剧情的潜在影响和信息密度。

内部思考指导权重计算的10个评估维度及评分细则
在为每个事件计算其最终输出的权重值时，你需要在内部针对以下10个维度进行评估。对于每个维度，如果事件符合其描述，你需要根据符合的程度，为该维度贡献一个介于0.05（轻微符合一般重要）和0.15（高度符合非常重要）之间的分数。如果某个维度完全不适用，则该维度贡献0分。

1.  核心主角行动与直接影响 (维度贡献. 0.05 - 0.15).
    内部评估。事件是否由故事的核心主角主动发起，或者事件是否对核心主角的处境，目标，心理状态产生了直接且显著的影响？
2.  关键配角深度参与 (维度贡献. 0.05 - 0.10).
    内部评估。事件是否涉及对剧情有重要推动作用的关键配角（非路人角色）的主动行为或使其状态发生重要改变？
3.  重大决策制定或关键转折点 (维度贡献. 0.10 - 0.15).
    内部评估。事件中是否包含角色（尤其是核心角色）做出了影响后续剧情走向的重大决策，或者事件本身是否构成了某个情境，关系或冲突的关键转折点？
4.  主要冲突的发生/升级/解决 (维度贡献. 0.10 - 0.15).
    内部评估。事件是否明确描绘了一个主要冲突（物理，言语，心理或阵营间）的爆发，显著升级（例如引入新变量或加剧紧张态势）或阶段性解决/终结？
5.  核心信息/秘密的揭露与获取 (维度贡献. 0.10 - 0.15).
    内部评估。事件中是否有对理解剧情背景，角色动机或推动后续行动至关重要的信息，秘密，线索被揭露，发现或被关键角色获取？
6.  重要世界观/背景设定的阐释或扩展 (维度贡献. 0.05 - 0.10).
    内部评估。事件是否引入，解释或显著扩展了关于故事世界的核心规则，历史，文化，特殊能力或地理环境等重要背景设定？
7.  全新关键元素的引入 (维度贡献. 0.05 - 0.15).
    内部评估。事件中是否首次引入了一个对后续剧情发展具有潜在重要影响的全新角色（非龙套），关键物品/道具，重要地点或核心概念/谜团？
8.  角色显著成长或关系重大变动 (维度贡献. 0.05 - 0.15).
    内部评估。事件是否清晰展现了某个主要角色在性格，能力，认知上的显著成长或转变，或者导致了关键角色之间关系（如信任，敌对，爱慕等）的建立或发生质的改变？
9.  强烈情感表达或高风险情境 (维度贡献. 0.05 - 0.15).
    内部评估。事件是否包含原文明确描写的，达到峰值的强烈情感（如极度喜悦，深切悲痛，强烈恐惧，滔天愤怒等），或者角色是否面临高风险，高赌注的关键情境？
10. 主线剧情推进或目标关键进展/受阻 (维度贡献. 0.05 - 0.15).
    内部评估。事件是否直接推动了故事主线情节的发展，或者标志着某个已确立的主要角色目标或剧情目标取得了关键性进展或遭遇了重大挫折？

权重汇总与封顶
对每个事件，将其在上述10个维度中获得的贡献分数（每个维度0到0.15分）进行累加。
如果累加得到的总分超过1.0，则该事件的最终输出权重为1.0。
如果没有任何维度适用，则最终权重为0.0。
请力求权重分布合理，能够体现出事件重要性的层次差异。

输出格式规范 (严格执行)
1.  整体输出为多行文本，每行代表一个独立事件。尽量不要省略任何事件，但字数要保持精简。
2.  每行文本的格式严格为
    数字序号（从1开始，连续递增）中文冒号 事件的客观描述（此描述需遵循<wording_standard>，并建议控制在40-60中文字符以内）一个空格 英文左圆括号 根据上述原则计算出的最终权重值（0.0至1.0之间的一位或两位小数）英文右圆括号 换行符。
3.  输出内容限制。除了上述格式定义的序号，描述和括号内的权重值，任何其他信息（例如您在内部用于分析的各维度的具体得分，分类标签，具体的时间戳等）都不得出现在最终输出中。
4.  时间标记。必须标记一个明确的、影响后续一组事件的宏观时间转变，您必须输出一行单独的时间标记文本，格式为 时间描述文本，例如 7月1日、2023年8月15日、2023年8月15日到18日等这种具体的时间描述，不得模糊（某天、次日等）。此标记行不带序号和权重。脚本处理时可以自行决定如何使用这些时间标记。

输出格式正确示例（严格参考此格式）
2013年1月12日 深夜
1.陈皮皮趁程小月装睡，对其侵犯并从后面插入。(0.95)
2.陈皮皮感受紧致，内心兴奋罪恶感交织，动作更凶狠。(0.60)
3.程小月身体紧绷，发出低哑哀求，身体却迎合。(0.50)
4.陈皮皮言语羞辱，程小月痉挛并达到高潮。(1.0)


---


禁止事项
输出的事件描述中，严格禁止使用任何与摘要任务无关的额外内容，评论或建议。不应使用第一人称代词指代自身（如我，beilu认为等），除非是直接引用原文作为描述的一部分。
重申。最终输出的每一行只包含序号，事件描述和括号括起来的最终权重值（以及可选的独立时间标记行），不得有任何其他附加字符或内部使用的分析标签。
严禁事项：
1. 严禁使用 Markdown 标题（如 # 摘要、## 核心事件）和#号。
2. 严禁使用加粗（如 **文字**）。
3. 严禁输出任何“总结”、“分析”、“下一步方向”等额外废话。
你必须严格遵守输出格式。

<wording_standard>
(此部分保持不变)
避用陈腔滥调与模糊量词避免使用一丝，一抹，仿佛，不容置疑的，不易察觉的，指节泛白，眼底闪过等空泛或滥用表达。应以具体，可观察的细节（如肌肉变化，动作延迟，语调偏移）来构建画面。
应用Show, Dont Tell的写作技巧禁止使用她知道他意识到她能看到她听见她感觉到等直接陈述性语句。通过人物的行为，表情和周围环境来揭示人物的情感和想法，而不是直接陈述。
避免翻译腔剔除诸如.完毕，她甚至能.，哦天哪等英式逻辑的中文直译表达，改以地道，自然的汉语写法。
拒绝生硬的时间强调不要使用瞬间，突然，这一刻，就在这时等用来强行制造戏剧性的时间转折，应使情节推进顺滑，自然。
清除滥用神态动作模板诸如眼中闪烁/闪过情绪/光芒，嘴角勾起表情，露出一截身体部位，形容词却坚定（如温柔却坚定）等俗套句式，建议直接描写具体行为或语义动作。
杜绝内心比喻模板禁止使用内心泛起涟漪，在心湖投入一颗石子，情绪在心底荡开等比喻心境的滥用意象。应描写真实的生理反应，语言变化或行为举动来表现内心波动。
剔除程序化句式与无意义总结如几乎没.，没有立刻.而是.，仿佛.从未发生过，做完这一切.，整个过程.等程序句式应当删去，用更具体的动作或状态取代。
杜绝英语表达结构堆砌避免.，.的.，带着.和.，混合着.和.等英语并列结构在中文中生硬堆砌形容词或名词，应精炼描写，只保留最有表现力的核心元素。
描述生动精确慎用沙哑，很轻，很慢，笨拙等模糊或泛用词语，取而代之应使用具体动作，感官描写，或结构合理的隐喻。
限制省略号使用避免滥用.表达停顿，可改为动作描写，沉默行为或使用破折号（）增强语气表现力。
删除不地道表达避免使用从英文直译过来的词汇，如生理性的泪水，灭顶高潮等应当转换为更符合中文语感的表达方式。
</wording_standard>`;

    const INTRODUCTORY_TEXT_FOR_LOREBOOK = `# 剧情总结
每条事件描述后附带一个权重值，例如"("0.85")"，范围从 0.0（背景信息）到 1.0（重大剧情）。

权重含义：
* 高权重（0.7–1.0）：核心事件，如关键转折、重大秘密揭露或强烈情感爆发。
* 中权重（0.4–0.6）：实质性事件，如配角行动、世界观阐释或次要冲突。
* 低权重（0.0–0.3）：细节或氛围，如背景补充或次要情节。

---
以下是剧情总结正文：
---`;

    const DEFAULT_SETTINGS = Object.freeze({
        // API
        apiUrl: '',
        apiKey: '',
        apiModel: '',
        modelList: [],

        // 代理（继承自 0.4.1）
        proxyEnabled: false,
        proxyUrl: 'http://localhost:8888/proxy',
        proxyAuthKey: '',

        // 选中的 Chat Completion 预设名（该预设的全部 prompt 会按 prompt_order 拼成请求 messages）
        selectedPresetName: '',

        // 总结提示词（用户可改）
        summaryPrompt: DEFAULT_SUMMARY_PROMPT,

        // 目标世界书：空字符串 = 自动取当前角色的主世界书
        targetLorebook: '',

        // 上次填的起止楼层（方便下次打开复用）
        lastStartFloor: '',
        lastEndFloor: '',

        // 调试
        debug: false,
    });

    /* =========================================================
     *  日志
     * ========================================================= */

    const log = (...args) => console.log(`[${MODULE_NAME}]`, ...args);
    const warn = (...args) => console.warn(`[${MODULE_NAME}]`, ...args);
    const err = (...args) => console.error(`[${MODULE_NAME}]`, ...args);
    const dbg = (...args) => { if (getSettings().debug) console.log(`[${MODULE_NAME}][dbg]`, ...args); };

    /* =========================================================
     *  设置持久化
     * ========================================================= */

    function getSettings() {
        const ctx = SillyTavern.getContext();
        if (!ctx.extensionSettings[SETTINGS_KEY]) {
            ctx.extensionSettings[SETTINGS_KEY] = structuredClone(DEFAULT_SETTINGS);
        }
        // 向前兼容：补齐新字段
        for (const key of Object.keys(DEFAULT_SETTINGS)) {
            if (!Object.hasOwn(ctx.extensionSettings[SETTINGS_KEY], key)) {
                ctx.extensionSettings[SETTINGS_KEY][key] = DEFAULT_SETTINGS[key];
            }
        }
        return ctx.extensionSettings[SETTINGS_KEY];
    }

    function persist() {
        SillyTavern.getContext().saveSettingsDebounced();
    }

    /* =========================================================
     *  Toast
     * ========================================================= */

    function toast(type, message) {
        try {
            if (typeof toastr !== 'undefined' && toastr[type]) {
                toastr[type](message, '小总结助手');
            } else {
                log(`[${type}]`, message);
            }
        } catch (e) { log(`[${type}]`, message); }
    }

    /* =========================================================
     *  代理 fetch（继承自 0.4.1）
     * ========================================================= */

    async function proxyFetch(url, options = {}) {
        const s = getSettings();
        if (!s.proxyEnabled) return fetch(url, options);
        if (!s.proxyUrl) {
            warn('代理已启用但 URL 为空，回退到直连');
            return fetch(url, options);
        }
        try {
            const headers = new Headers(options.headers || {});
            headers.set('X-Target-URL', url);
            if (s.proxyAuthKey) headers.set('X-Proxyauth', s.proxyAuthKey);
            dbg('proxyFetch →', s.proxyUrl, 'target=', url);
            return await fetch(s.proxyUrl, { ...options, headers });
        } catch (e) {
            err('proxyFetch 失败，回退到直连', e);
            return fetch(url, options);
        }
    }

    /* =========================================================
     *  预设读取与破甲拼接
     * ========================================================= */

    /**
     * 列出当前 Chat Completion 下所有预设名
     */
    function listCompletionPresetNames() {
        try {
            const ctx = SillyTavern.getContext();
            const pm = ctx.getPresetManager('openai');
            if (!pm) return [];
            const list = pm.getAllPresets();
            return Array.isArray(list) ? list.filter(n => typeof n === 'string') : [];
        } catch (e) {
            err('读取预设列表失败', e);
            return [];
        }
    }

    /**
     * 根据所选预设构造请求用的 messages 数组（按预设原本的 prompt_order 顺序、保留每条 prompt 的 role）
     * 然后在末尾追加一条 user 消息（=「总结提示词 + 聊天上下文」）
     *
     * @param {string} presetName 预设名（可为空，空时就只发总结提示词 + 聊天上下文）
     * @param {string} summaryPrompt 总结提示词正文
     * @param {string} chatHistory  本次要总结的聊天上下文字符串
     * @returns {Array<{role:string,content:string}>}
     */
    function buildMessagesFromPreset(presetName, summaryPrompt, chatHistory) {
        const ctx = SillyTavern.getContext();
        const messages = [];

        if (presetName) {
            try {
                const pm = ctx.getPresetManager('openai');
                const preset = pm && pm.getCompletionPresetByName(presetName);
                if (preset && Array.isArray(preset.prompts)) {
                    // 找当前角色对应的 prompt_order；找不到就用默认条目 (character_id=100001)
                    const characterId = ctx.characterId;
                    let orderEntry = null;
                    if (Array.isArray(preset.prompt_order)) {
                        if (characterId !== undefined && characterId !== null) {
                            orderEntry = preset.prompt_order.find(o => Number(o.character_id) === Number(characterId));
                        }
                        if (!orderEntry) {
                            orderEntry = preset.prompt_order.find(o => Number(o.character_id) === 100001)
                                || preset.prompt_order[0];
                        }
                    }

                    let orderedIds;
                    if (orderEntry && Array.isArray(orderEntry.order)) {
                        orderedIds = orderEntry.order.filter(o => o.enabled !== false).map(o => o.identifier);
                    } else {
                        orderedIds = preset.prompts.map(p => p.identifier);
                    }

                    const promptsById = new Map(preset.prompts.map(p => [p.identifier, p]));
                    const substitute = (text) => {
                        try { return ctx.substituteParams(String(text)); } catch (_) { return String(text); }
                    };

                    for (const id of orderedIds) {
                        const p = promptsById.get(id);
                        if (!p) continue;
                        if (p.enabled === false) continue;
                        // 跳过 ST 内部 marker prompt（chatHistory、worldInfoBefore、dialogueExamples 等占位符）
                        if (p.marker === true) continue;
                        if (!p.content || !String(p.content).trim()) continue;

                        let role = p.role;
                        if (role !== 'user' && role !== 'assistant' && role !== 'system') role = 'system';
                        messages.push({ role, content: substitute(p.content) });
                    }
                } else {
                    warn('未能加载预设：', presetName);
                }
            } catch (e) {
                err('构造预设 messages 失败', e);
            }
        }

        // 末尾：把总结提示词 + 聊天上下文一起放进一条 user 消息
        const userContent =
            (summaryPrompt ? `${summaryPrompt}\n\n` : '') +
            `聊天记录上下文如下（请严格对这部分内容进行摘要）：\n\n${chatHistory}\n\n请对以上内容进行摘要：`;
        messages.push({ role: 'user', content: userContent });
        return messages;
    }

    /* =========================================================
     *  当前聊天 & 当前世界书
     * ========================================================= */

    function getChatFileId() {
        const ctx = SillyTavern.getContext();
        const raw = ctx.getCurrentChatId();
        if (!raw) return null;
        // 清理掉文件名里的非法字符，避免世界书条目名出问题
        return String(raw).replace(/[\\/:*?"<>|]/g, '_').trim();
    }

    /**
     * 自动检测当前应该写入的世界书名：
     *   1) 用户在设置里手动指定 → 优先用
     *   2) chat_metadata.world_info → 聊天专属世界书
     *   3) 当前角色的主世界书 (character.data.extensions.world)
     */
    function resolveTargetLorebookName() {
        const ctx = SillyTavern.getContext();
        const s = getSettings();
        if (s.targetLorebook && s.targetLorebook.trim()) return s.targetLorebook.trim();

        try {
            const cm = ctx.chatMetadata || {};
            if (cm.world_info && typeof cm.world_info === 'string') return cm.world_info;
        } catch (_) {}

        try {
            const character = ctx.characters?.[ctx.characterId];
            const w = character?.data?.extensions?.world;
            if (w && typeof w === 'string') return w;
        } catch (_) {}

        return null;
    }

    /* =========================================================
     *  世界书读写
     * ========================================================= */

    async function upsertSummaryEntry(lorebookName, chatId, startIdx0, endIdx0, summaryText) {
        const ctx = SillyTavern.getContext();
        const wi = await ctx.loadWorldInfo(lorebookName);
        if (!wi || typeof wi !== 'object') throw new Error(`无法加载世界书：${lorebookName}`);
        if (!wi.entries || typeof wi.entries !== 'object') wi.entries = {};

        const entries = wi.entries;
        const start1 = startIdx0 + 1;
        const end1 = endIdx0 + 1;
        const entryName = `${SUMMARY_PREFIX}${chatId}-${start1}-${end1}`;

        let existing = null;
        for (const uid of Object.keys(entries)) {
            const e = entries[uid];
            if (!e) continue;
            if ((e.comment || '').trim() === entryName && e.disable !== true) {
                existing = e;
                break;
            }
        }

        const bodyContent = INTRODUCTORY_TEXT_FOR_LOREBOOK + '\n\n' + summaryText;

        if (existing) {
            existing.content = bodyContent;
            existing.disable = false;
            log(`覆盖小总结 → ${entryName} (UID ${existing.uid})`);
        } else {
            const newUid = nextEntryUid(entries);
            entries[newUid] = {
                uid: newUid,
                key: [],
                keysecondary: [],
                comment: entryName,
                content: bodyContent,
                constant: true,
                vectorized: false,
                selective: true,
                selectiveLogic: 0,
                addMemo: true,
                order: Date.now() % 100000,
                position: 0, // 角色定义前
                disable: false,
                excludeRecursion: false,
                preventRecursion: false,
                delayUntilRecursion: false,
                probability: 100,
                useProbability: false,
                depth: 4,
                group: '',
                groupOverride: false,
                groupWeight: 100,
                scanDepth: null,
                caseSensitive: null,
                matchWholeWords: null,
                useGroupScoring: null,
                automationId: '',
                role: null,
                sticky: 0,
                cooldown: 0,
                delay: 0,
            };
            log(`新建小总结 → ${entryName} (UID ${newUid})`);
        }

        await ctx.saveWorldInfo(lorebookName, wi, true);
        try { ctx.eventSource.emit(ctx.eventTypes.WORLDINFO_UPDATED, lorebookName, wi); } catch (_) {}
    }

    function nextEntryUid(entries) {
        let max = -1;
        for (const uid of Object.keys(entries)) {
            const n = parseInt(uid, 10);
            if (!isNaN(n) && n > max) max = n;
        }
        return max + 1;
    }

    /* =========================================================
     *  API 调用
     * ========================================================= */

    function normalizeChatCompletionsUrl(url) {
        let u = (url || '').trim();
        if (!u) return '';
        if (u.includes('generativelanguage.googleapis.com')) {
            if (!u.endsWith('/')) u += '/';
            if (!u.endsWith('chat/completions')) u += 'chat/completions';
            return u;
        }
        if (u.includes('/chat/completions')) return u;
        if (u.includes('/v1')) {
            if (!u.endsWith('/')) u += '/';
            return u + 'chat/completions';
        }
        if (!u.endsWith('/')) u += '/';
        return u + 'v1/chat/completions';
    }

    function normalizeModelsUrl(url) {
        let u = (url || '').trim();
        if (!u) return '';
        if (u.includes('/v1')) {
            if (!u.endsWith('/')) u += '/';
            if (u.endsWith('chat/completions')) u = u.replace(/chat\/completions$/, '');
            if (!u.endsWith('/')) u += '/';
            return u + 'models';
        }
        if (!u.endsWith('/')) u += '/';
        return u + 'v1/models';
    }

    async function callChatCompletion(messages) {
        const s = getSettings();
        if (!s.apiUrl || !s.apiModel) throw new Error('API URL 或模型未配置');
        if (!Array.isArray(messages) || messages.length === 0) throw new Error('messages 不能为空');
        const url = normalizeChatCompletionsUrl(s.apiUrl);
        const headers = { 'Content-Type': 'application/json' };
        if (s.apiKey) headers['Authorization'] = `Bearer ${s.apiKey}`;
        const body = JSON.stringify({
            model: s.apiModel,
            messages: messages,
            stream: false,
        });
        dbg('callChatCompletion', url, 'model=', s.apiModel, 'messages=', messages.length);
        const resp = await proxyFetch(url, { method: 'POST', headers, body });
        if (!resp.ok) {
            const text = await resp.text().catch(() => '');
            throw new Error(`API 请求失败：${resp.status} ${resp.statusText} ${text}`);
        }
        const data = await resp.json();
        if (data?.choices?.[0]?.message?.content) return String(data.choices[0].message.content).trim();
        if (data?.choices?.[0]?.text) return String(data.choices[0].text).trim();
        if (data?.content) return String(data.content).trim();
        if (data?.message) return String(data.message).trim();
        throw new Error('API 响应中未找到内容');
    }

    async function fetchModels() {
        const s = getSettings();
        if (!s.apiUrl) throw new Error('请先填写 API URL');
        const url = normalizeModelsUrl(s.apiUrl);
        const headers = {};
        if (s.apiKey) headers['Authorization'] = `Bearer ${s.apiKey}`;
        const resp = await proxyFetch(url, { method: 'GET', headers });
        if (!resp.ok) {
            const text = await resp.text().catch(() => '');
            throw new Error(`拉取模型失败：${resp.status} ${resp.statusText} ${text}`);
        }
        const data = await resp.json();
        let names = [];
        if (Array.isArray(data?.data)) {
            names = data.data.map(m => m?.id).filter(x => typeof x === 'string');
        } else if (Array.isArray(data?.models)) {
            names = data.models.map(m => (typeof m === 'string' ? m : (m?.id || m?.name))).filter(Boolean);
        } else if (Array.isArray(data)) {
            names = data.map(m => (typeof m === 'string' ? m : (m?.id || m?.name))).filter(Boolean);
        }
        return [...new Set(names)].sort();
    }

    /* =========================================================
     *  主流程：手动指定起止楼层执行一次小总结
     * ========================================================= */

    let isRunning = false;

    /**
     * @param {number} startFloor1Based 起始楼层（1-based，含）
     * @param {number} endFloor1Based   结束楼层（1-based，含）
     */
    async function doManualRangeSummary(startFloor1Based, endFloor1Based) {
        if (isRunning) {
            toast('info', '已有一次小总结在进行中，请稍候');
            return;
        }
        const $btn = $(`#${PANEL_ID} .xs-run-btn`);
        const originalLabel = $btn.html();
        isRunning = true;
        $btn.prop('disabled', true).text('总结中…');
        try {
            const ctx = SillyTavern.getContext();
            const s = getSettings();
            if (!s.apiUrl || !s.apiModel) {
                toast('warning', '请先在「API 配置」里填好 URL 与模型');
                return;
            }
            const chatId = getChatFileId();
            if (!chatId) {
                toast('warning', '当前没有打开的聊天');
                return;
            }
            const lorebookName = resolveTargetLorebookName();
            if (!lorebookName) {
                toast('warning', '未找到当前角色绑定的世界书，请在面板里手动指定「目标世界书」');
                return;
            }
            const chat = Array.isArray(ctx.chat) ? ctx.chat : [];
            if (chat.length === 0) {
                toast('info', '聊天为空，没有内容可总结');
                return;
            }

            // 参数校验
            const totalFloors = chat.length;
            const start = Math.floor(Number(startFloor1Based));
            const end = Math.floor(Number(endFloor1Based));
            if (!Number.isFinite(start) || !Number.isFinite(end)) {
                toast('warning', '请填写有效的起止楼层数字');
                return;
            }
            if (start < 1 || end < 1) {
                toast('warning', '楼层从 1 开始');
                return;
            }
            if (start > end) {
                toast('warning', '起始楼层不能大于结束楼层');
                return;
            }
            if (end > totalFloors) {
                toast('warning', `结束楼层 ${end} 超过当前聊天总楼层 ${totalFloors}`);
                return;
            }

            // 1-based → 0-based
            const startIdx0 = start - 1;
            const endIdx0 = end - 1;

            // 拼聊天上下文
            const lines = [];
            for (let i = startIdx0; i <= endIdx0; i++) {
                const m = chat[i];
                if (!m) continue;
                const speaker = m.is_user ? (ctx.name1 || '用户') : (m.name || ctx.name2 || '角色');
                const mes = m.mes ?? '';
                lines.push(`${speaker}: ${mes}`);
            }
            const chatHistory = lines.join('\n\n');

            // 用「选中的预设 + 总结提示词」构造完整 messages 数组
            const messages = buildMessagesFromPreset(s.selectedPresetName, s.summaryPrompt, chatHistory);

            const floorRange = `楼 ${start} - ${end}`;
            toast('info', `开始总结 (${floorRange}) …`);

            const summary = await callChatCompletion(messages);
            if (!summary || !summary.trim()) throw new Error('AI 返回空内容');

            await upsertSummaryEntry(lorebookName, chatId, startIdx0, endIdx0, summary);
            toast('success', `总结完成 (${floorRange}) → 已写入「${lorebookName}」`);

            // 记住这次起止，下次打开自动填上
            s.lastStartFloor = String(start);
            s.lastEndFloor = String(end);
            persist();
        } catch (e) {
            err('小总结失败', e);
            toast('error', '总结失败：' + (e.message || e));
        } finally {
            isRunning = false;
            $btn.prop('disabled', false).html(originalLabel);
        }
    }

    /* =========================================================
     *  UI 注入
     * ========================================================= */

    function refreshPresetDropdown() {
        const $sel = $(`#${PANEL_ID} .xs-preset-select`);
        if (!$sel.length) return;
        const s = getSettings();
        const names = listCompletionPresetNames();
        $sel.empty();
        $sel.append('<option value="">— 不使用预设（仅发总结提示词 + 聊天上下文）—</option>');
        for (const n of names) {
            const opt = $('<option></option>').val(n).text(n);
            if (n === s.selectedPresetName) opt.attr('selected', 'selected');
            $sel.append(opt);
        }
    }

    function refreshLorebookDropdown() {
        const $sel = $(`#${PANEL_ID} .xs-lorebook-select`);
        if (!$sel.length) return;
        const s = getSettings();
        const ctx = SillyTavern.getContext();
        const names = typeof ctx.getWorldInfoNames === 'function' ? ctx.getWorldInfoNames() : [];
        $sel.empty();
        $sel.append('<option value="">— 自动检测（角色主世界书 / 聊天绑定世界书）—</option>');
        for (const n of names) {
            const opt = $('<option></option>').val(n).text(n);
            if (n === s.targetLorebook) opt.attr('selected', 'selected');
            $sel.append(opt);
        }
    }

    function refreshModelDropdown() {
        const $sel = $(`#${PANEL_ID} .xs-model-select`);
        if (!$sel.length) return;
        const s = getSettings();
        $sel.empty();
        if (!s.modelList || s.modelList.length === 0) {
            $sel.append('<option value="">— 先点「拉取模型」—</option>');
            if (s.apiModel) {
                $sel.append($('<option></option>').val(s.apiModel).text(s.apiModel).attr('selected', 'selected'));
            }
            return;
        }
        for (const m of s.modelList) {
            const opt = $('<option></option>').val(m).text(m);
            if (m === s.apiModel) opt.attr('selected', 'selected');
            $sel.append(opt);
        }
    }

    function buildPanelHtml() {
        return `
<div id="${PANEL_ID}" class="xs-root">
    <div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header">
            <b>小总结助手 (XiaoSummary)</b>
            <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content">

            <div class="xs-section">
                <div class="xs-section-title">手动单次总结（指定楼层范围）</div>
                <div class="xs-range-row">
                    <div class="xs-range-col">
                        <label>起始楼层</label>
                        <input type="number" class="text_pole xs-start-floor" min="1" placeholder="例如：1" />
                    </div>
                    <div class="xs-range-col">
                        <label>结束楼层</label>
                        <input type="number" class="text_pole xs-end-floor" min="1" placeholder="例如：50" />
                    </div>
                </div>
                <div class="xs-hint">范围包含起始与结束两端；起始楼层需小于等于结束楼层。任意楼层范围均可重复总结；同范围再次总结会覆盖对应「小总结-&lt;聊天ID&gt;-起-止」条目，不同范围则各自独立一条。</div>
                <div class="xs-action-row">
                    <button class="menu_button xs-run-btn"><i class="fa-solid fa-bolt"></i> 开始总结</button>
                </div>
            </div>

            <div class="xs-section">
                <div class="xs-section-title">聊天补全预设</div>
                <div class="xs-row">
                    <select class="text_pole xs-preset-select"></select>
                    <button class="menu_button xs-preset-refresh-btn" title="刷新预设列表">
                        <i class="fa-solid fa-arrows-rotate"></i>
                    </button>
                </div>
                <div class="xs-hint">选中的预设里所有启用的 prompt 会按其 prompt_order（针对当前角色）原样作为请求 messages 发出，role 保留原值。最后追加一条 user 消息：「总结提示词 + 聊天内容」。</div>
            </div>

            <div class="xs-section">
                <div class="xs-section-title">总结提示词</div>
                <textarea class="text_pole xs-summary-prompt" rows="8"></textarea>
                <div class="xs-action-row">
                    <button class="menu_button xs-save-prompt-btn"><i class="fa-solid fa-floppy-disk"></i> 保存</button>
                    <button class="menu_button xs-reset-prompt-btn"><i class="fa-solid fa-rotate-left"></i> 重置默认</button>
                </div>
            </div>

            <div class="xs-section">
                <div class="xs-section-title">目标世界书</div>
                <div class="xs-row">
                    <select class="text_pole xs-lorebook-select"></select>
                </div>
                <div class="xs-hint">留空 = 自动检测（聊天绑定 → 角色主世界书）。</div>
            </div>

            <div class="xs-section">
                <div class="xs-section-title">API 配置</div>
                <div class="xs-row">
                    <label>URL</label>
                    <input type="text" class="text_pole xs-api-url" placeholder="https://api.openai.com" />
                </div>
                <div class="xs-row">
                    <label>Key</label>
                    <input type="password" class="text_pole xs-api-key" placeholder="sk-…" />
                </div>
                <div class="xs-row">
                    <label>模型</label>
                    <select class="text_pole xs-model-select"></select>
                </div>
                <div class="xs-action-row">
                    <button class="menu_button xs-fetch-models-btn">
                        <i class="fa-solid fa-cloud-arrow-down"></i> 拉取模型
                    </button>
                    <button class="menu_button xs-test-conn-btn">
                        <i class="fa-solid fa-plug"></i> 测试连接
                    </button>
                </div>
            </div>

            <div class="xs-section">
                <div class="xs-section-title">代理配置（可选，解决 CORS）</div>
                <label class="checkbox_label">
                    <input type="checkbox" class="xs-proxy-enabled" />
                    启用代理
                </label>
                <div class="xs-row">
                    <label>代理 URL</label>
                    <input type="text" class="text_pole xs-proxy-url" placeholder="http://localhost:8888/proxy" />
                </div>
                <div class="xs-row">
                    <label>鉴权密钥</label>
                    <input type="password" class="text_pole xs-proxy-auth" />
                </div>
            </div>

            <div class="xs-section">
                <label class="checkbox_label">
                    <input type="checkbox" class="xs-debug" />
                    调试模式（控制台打印更多日志）
                </label>
            </div>

        </div>
    </div>
</div>
        `.trim();
    }

    function bindEvents() {
        const $root = $(`#${PANEL_ID}`);
        if (!$root.length) return;
        const s = getSettings();

        // 手动总结
        $root.on('click', '.xs-run-btn', () => {
            const start = $root.find('.xs-start-floor').val();
            const end = $root.find('.xs-end-floor').val();
            doManualRangeSummary(start, end);
        });

        // 起止楼层输入：实时存
        $root.on('change input', '.xs-start-floor', function () {
            getSettings().lastStartFloor = String($(this).val() || '');
            persist();
        });
        $root.on('change input', '.xs-end-floor', function () {
            getSettings().lastEndFloor = String($(this).val() || '');
            persist();
        });

        // 预设
        $root.on('change', '.xs-preset-select', function () {
            getSettings().selectedPresetName = String($(this).val() || '');
            persist();
        });
        $root.on('click', '.xs-preset-refresh-btn', () => refreshPresetDropdown());

        // 总结提示词
        $root.on('click', '.xs-save-prompt-btn', () => {
            const v = String($root.find('.xs-summary-prompt').val() || '');
            getSettings().summaryPrompt = v;
            persist();
            toast('success', '总结提示词已保存');
        });
        $root.on('click', '.xs-reset-prompt-btn', () => {
            getSettings().summaryPrompt = DEFAULT_SUMMARY_PROMPT;
            persist();
            $root.find('.xs-summary-prompt').val(DEFAULT_SUMMARY_PROMPT);
            toast('info', '总结提示词已重置为默认');
        });

        // 目标世界书
        $root.on('change', '.xs-lorebook-select', function () {
            getSettings().targetLorebook = String($(this).val() || '');
            persist();
        });

        // API
        $root.on('change', '.xs-api-url', function () {
            getSettings().apiUrl = String($(this).val() || '').trim();
            persist();
        });
        $root.on('change', '.xs-api-key', function () {
            getSettings().apiKey = String($(this).val() || '');
            persist();
        });
        $root.on('change', '.xs-model-select', function () {
            getSettings().apiModel = String($(this).val() || '');
            persist();
        });
        $root.on('click', '.xs-fetch-models-btn', async function () {
            const $btn = $(this);
            $btn.prop('disabled', true).find('i').addClass('fa-spin');
            try {
                const names = await fetchModels();
                getSettings().modelList = names;
                persist();
                refreshModelDropdown();
                toast('success', `已拉到 ${names.length} 个模型`);
            } catch (e) {
                err('拉取模型失败', e);
                toast('error', '拉取模型失败：' + (e.message || e));
            } finally {
                $btn.prop('disabled', false).find('i').removeClass('fa-spin');
            }
        });
        $root.on('click', '.xs-test-conn-btn', async function () {
            const $btn = $(this);
            $btn.prop('disabled', true);
            try {
                const out = await callChatCompletion([
                    { role: 'system', content: '你是一个测试助手。' },
                    { role: 'user', content: '回复一个简短的"pong"。' },
                ]);
                toast('success', '连接成功：' + (out.slice(0, 80) || '(空)'));
            } catch (e) {
                err('测试连接失败', e);
                toast('error', '连接失败：' + (e.message || e));
            } finally {
                $btn.prop('disabled', false);
            }
        });

        // 代理
        $root.on('change', '.xs-proxy-enabled', function () {
            getSettings().proxyEnabled = !!$(this).prop('checked');
            persist();
        });
        $root.on('change', '.xs-proxy-url', function () {
            getSettings().proxyUrl = String($(this).val() || '').trim();
            persist();
        });
        $root.on('change', '.xs-proxy-auth', function () {
            getSettings().proxyAuthKey = String($(this).val() || '');
            persist();
        });

        // 调试
        $root.on('change', '.xs-debug', function () {
            getSettings().debug = !!$(this).prop('checked');
            persist();
        });
    }

    function loadValuesIntoUi() {
        const $root = $(`#${PANEL_ID}`);
        if (!$root.length) return;
        const s = getSettings();
        $root.find('.xs-summary-prompt').val(s.summaryPrompt || DEFAULT_SUMMARY_PROMPT);
        $root.find('.xs-start-floor').val(s.lastStartFloor || '');
        $root.find('.xs-end-floor').val(s.lastEndFloor || '');
        $root.find('.xs-api-url').val(s.apiUrl);
        $root.find('.xs-api-key').val(s.apiKey);
        $root.find('.xs-proxy-enabled').prop('checked', !!s.proxyEnabled);
        $root.find('.xs-proxy-url').val(s.proxyUrl);
        $root.find('.xs-proxy-auth').val(s.proxyAuthKey);
        $root.find('.xs-debug').prop('checked', !!s.debug);

        refreshPresetDropdown();
        refreshLorebookDropdown();
        refreshModelDropdown();
    }

    function injectPanel() {
        if (document.getElementById(PANEL_ID)) return; // 避免重复注入
        const $host = $('#extensions_settings2');
        if (!$host.length) {
            warn('找不到 #extensions_settings2，UI 注入失败');
            return;
        }
        $host.append(buildPanelHtml());
        bindEvents();
        loadValuesIntoUi();
    }

    /* =========================================================
     *  初始化
     * ========================================================= */

    let inited = false;
    function init() {
        if (inited) {
            // 二次触发时只补一下 UI（防止首次 DOM 还没准备好）
            if (!document.getElementById(PANEL_ID)) injectPanel();
            return;
        }
        inited = true;
        const ctx = SillyTavern.getContext();
        log('init');
        injectPanel();

        // 事件
        try {
            ctx.eventSource.on(ctx.eventTypes.PRESET_CHANGED, () => refreshPresetDropdown());
            ctx.eventSource.on(ctx.eventTypes.MAIN_API_CHANGED, () => refreshPresetDropdown());
        } catch (e) {
            warn('事件监听绑定失败', e);
        }
    }

    // 等 SillyTavern 全局存在 + jQuery 就绪后再启动
    function bootstrap() {
        if (typeof window.SillyTavern === 'undefined' || typeof window.SillyTavern.getContext !== 'function') {
            return setTimeout(bootstrap, 200);
        }
        if (typeof window.jQuery === 'undefined') {
            return setTimeout(bootstrap, 200);
        }
        const ctx = window.SillyTavern.getContext();
        try {
            if (ctx.eventSource && ctx.eventTypes?.APP_READY) {
                ctx.eventSource.on(ctx.eventTypes.APP_READY, init);
                // 万一 APP_READY 已经派发过 —— 立即也跑一次（事件源支持自动重放，但保险起见）
                setTimeout(() => {
                    if (!document.getElementById(PANEL_ID)) init();
                }, 500);
            } else {
                init();
            }
        } catch (_) {
            setTimeout(init, 500);
        }
    }

    bootstrap();
})();
