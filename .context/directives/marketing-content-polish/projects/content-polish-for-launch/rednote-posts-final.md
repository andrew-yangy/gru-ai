# RedNote (小红书) Final Posts -- gruAI Launch

6 posts ready for copy-paste publication. Each post has: title/hook, body,
CTA, and hashtags. GitHub repo: `github.com/andrew-yangy/agent-conductor`.
npm package: `gru-ai`.

---

## Post 1: The Pixel-Art Office Reveal

**Platform:** 小红书
**Format:** Carousel (6 images) + GIF cover

### 标题 (Hook)

我的AI员工有自己的像素风办公室，每天走到工位上写代码

### 正文 (Body)

做了一个开源框架叫gruAI，里面有4个AI高管：

Sarah -- CTO，负责架构和代码质量
Morgan -- COO，负责项目规划和排期
Marcus -- CPO，负责产品方向
Priya -- CMO，负责增长策略

他们不是聊天机器人，是有自己「办公室」的AI员工

每个agent有自己的像素小人，走到工位坐下，开始写代码。你给一个指令，他们自己分工、讨论、开发、审查

这个办公室不只是好看 -- 它实时反映系统状态。Sarah在审查代码的时候，你能看到她的小人坐在电脑前；Morgan在规划的时候，她在白板前面

技术栈：React 19 + Canvas 2D + TypeScript
开源MIT协议，npm包名：gru-ai

GitHub仓库：github.com/andrew-yangy/agent-conductor

### CTA

你觉得AI员工应该长什么样？评论区说说你的想法

### Hashtags

#AI智能体 #像素风 #开源项目 #独立开发 #AI自动化 #开发者工具 #程序员日常 #TypeScript

---

## Post 2: Pipeline Walkthrough

**Platform:** 小红书
**Format:** Screencast video (2--3 min) -- body text below is the video description/caption

### 标题 (Hook)

一句话需求，AI自己规划、审计、开发、审查，20分钟交付一个完整功能

### 正文 (Body)

完整演示：从一行指令到交付一个功能

gruAI不是ChatGPT那种问答工具
它是一个完整的AI开发团队：
- COO自己做项目规划
- 工程师自己写代码
- CTO自己做代码审查
- CEO（就是你）只需要确认最终结果

全程20分钟，你只打了一行字

开源免费，MIT协议
GitHub仓库：github.com/andrew-yangy/agent-conductor

### CTA

想看更多AI自动化开发的实战演示吗？关注 + 收藏，每周更新

### Hashtags

#AI智能体 #AI自动化 #开源项目 #AI编程 #开发者工具 #效率工具 #独立开发 #程序员

### 视频旁白参考 (Voiceover Reference)

Scene 1 (0:00--0:15) -- Terminal: typing directive
> 大家好，今天给大家看一下gruAI的完整工作流程。我现在只需要在终端打一行指令，比如"给应用加一个暗黑模式"，然后AI团队就会自己开始工作

Scene 2 (0:15--0:40) -- Terminal: triage step
> 首先是分级阶段。系统会自动判断这个需求的复杂度 -- 简单的直接执行，复杂的会走完整流程。你可以看到它判断这是一个中等复杂度的任务

Scene 3 (0:40--1:10) -- Terminal: COO planning
> 现在COO开始做项目规划。她会分析需求、分配合适的工程师agent、定义验收标准。注意看 -- 她输出的是结构化的JSON，不是一堆文字

Scene 4 (1:10--1:30) -- Browser: pixel-art office
> 切到办公室看一下。你能看到Morgan坐在她的工位上在工作。其他agent还在待命。等一下工程师被分配任务之后，你会看到新的小人出现在办公室

Scene 5 (1:30--2:00) -- Terminal: build + review
> 工程师开始写代码了。写完之后不是直接交付 -- Sarah作为CTO会做代码审查。她看完整个代码改动，检查架构是否合理、有没有安全问题。如果不通过，工程师会收到修改意见然后重做

Scene 6 (2:00--2:20) -- Terminal: completion
> 审查通过了。现在系统会让我确认完成。我看一下改动 -- 暗黑模式加上了，CSS变量用对了，组件也更新了。确认完成

Scene 7 (2:20--2:40) -- Wrap up
> 从指令到交付，整个过程大概20分钟。我只打了一行字，然后最后确认了一下。中间的规划、开发、审查全部自动完成。这就是gruAI -- 你的AI开发团队。GitHub链接在主页，开源免费

---

## Post 3: gruAI vs Manual Development

**Platform:** 小红书
**Format:** Carousel (7 slides)

### 标题 (Hook)

同样的功能，手动写4小时，AI团队20分钟搞定

### 正文 (Body)

同样的功能，差距在哪？

手动开发一个中等功能：
1. 理解需求 -- 15分钟
2. 查文档找方案 -- 30分钟
3. 写代码 -- 2小时
4. 自测 -- 30分钟
5. 找人代码审查 -- 等1天
6. 改审查意见 -- 30分钟
总计：4小时 + 等待时间

gruAI开发同一个功能：
1. 写一句指令 -- 10秒
2. AI自动规划 -- 2分钟
3. AI自动开发 -- 10分钟
4. AI自动代码审查 -- 5分钟
5. CEO确认完成 -- 1分钟
总计：约20分钟，零等待

不是"AI帮你写代码"
是"AI团队帮你完成整个项目"

区别在哪？
- ChatGPT：你问一句，它答一句，你还得自己组装
- Copilot：帮你补全代码，但不管规划和审查
- gruAI：从需求到交付，全流程自动化

"AI写的代码质量行吗？"
gruAI内置代码审查流程
CTO agent会检查：架构合理性、安全问题、代码规范
不通过就打回重做

适合什么人？
- 独立开发者：一个人 = 一个团队
- 小团队：把重复性工作交给AI
- 想学AI agent的开发者：开源代码值得研究

GitHub仓库：github.com/andrew-yangy/agent-conductor

### CTA

你平时开发最耗时间的环节是什么？评论区聊聊，看AI能不能帮你解决

### Hashtags

#AI编程 #效率工具 #开发者工具 #AI智能体 #独立开发 #开源项目 #技术分享 #ChatGPT

---

## Post 4: Agent Personalities

**Platform:** 小红书
**Format:** Screencast video (2 min) -- body text below is the video description/caption

### 标题 (Hook)

我的AI CTO打回了我的方案，原因是架构不合理

### 正文 (Body)

不是所有AI工具都会说"不"

gruAI的agent有challenge mode：
- Sarah (CTO) 会因为架构问题打回方案
- Morgan (COO) 会因为排期不合理提出修改
- 他们给的不是模糊的反对，是具体的改进建议

AI不应该只会执行，也应该会质疑

有时候被打回确实有点烦
但代码质量确实提高了

开源MIT协议
GitHub仓库：github.com/andrew-yangy/agent-conductor

### CTA

你希望AI会对你说"不"吗？还是更喜欢无脑执行？评论区投票

### Hashtags

#AI智能体 #开源项目 #AI自动化 #开发者工具 #程序员日常 #技术分享 #Claude #独立开发

### 视频旁白参考 (Voiceover Reference)

Scene 1 (0:00--0:15) -- Office overview
> gruAI的C-suite不是没有个性的工具。每个agent都有自己的性格。今天给大家看看他们是怎么互相"吵架"的

Scene 2 (0:15--0:35) -- Terminal: CEO directive
> 我给了一个指令，想加一个新功能。按照流程，会先到challenge阶段 -- 就是其他agent可以反对你的方案

Scene 3 (0:35--1:00) -- Terminal: Sarah's challenge
> 看，Sarah，我们的CTO，直接打回了。她说"这个方案改动范围太大，涉及3个以上的模块，应该拆成两个独立项目"。而且她给了具体的拆分建议

Scene 4 (1:00--1:20) -- Office: Sarah at whiteboard
> 切到办公室 -- 你能看到Sarah在白板前面，这代表她在做架构分析。旁边Morgan在等待，准备接收最终的规划方案

Scene 5 (1:20--1:45) -- Terminal: revised plan
> 根据Sarah的建议，Morgan重新规划了项目。这次拆成了两个小项目，每个都有独立的验收标准和审查人员。这就是challenge mode -- agent不是yes-man，他们会真正地提出反对意见

Scene 6 (1:45--2:00) -- Wrap up
> 这种互相挑战的机制是gruAI和其他AI工具最大的区别。不是一个AI无脑执行你的指令，而是一个团队在帮你把关

---

## Post 5: The CEO's Week

**Platform:** 小红书
**Format:** Carousel (6 slides) with pixel-art illustrations

### 标题 (Hook)

我当CEO一周只工作45分钟，其他时间AI团队自己干

### 正文 (Body)

一个AI公司CEO的真实一周

【周一：15分钟】
打开/scout报告

AI团队周末自己调研了：
- 竞品有什么新动作
- 技术栈有什么安全更新
- 用户社区在讨论什么

我只需要花15分钟看报告，批准几个提案

【周二到周四：0分钟】
AI团队自动执行被批准的项目

Morgan排期 -> 工程师开发 -> Sarah审查

我不需要介入
办公室里能看到他们在忙

【周五：20分钟】
看周报

AI生成的dashboard：
- 本周完成了哪些项目
- 代码质量指标
- 下周计划

花20分钟确认，提几个方向

【月度：10分钟】
每月一次健康检查

Sarah自动扫描代码库：
- 安全漏洞
- 过时的依赖
- 技术债务

低风险的自动修复，高风险的报告给我

CEO总投入：每周约45分钟
其他时间？做自己想做的事

gruAI -- 你的AI开发团队
GitHub仓库：github.com/andrew-yangy/agent-conductor

### CTA

收藏这篇，下次有人问"AI能不能替代程序员"的时候发给他看

### Hashtags

#AI智能体 #像素风 #效率工具 #AI自动化 #独立开发 #开源项目 #副业 #AI创业 #程序员日常

---

## Post 6: Quick Start Guide

**Platform:** 小红书
**Format:** Carousel (5 slides) -- practical reference card

### 标题 (Hook)

3分钟上手gruAI -- AI开发团队配置指南（收藏用）

### 正文 (Body)

gruAI 3分钟上手指南
收藏 = 随时查看

【第一步：安装】

打开终端：
npm install -g gru-ai

需要：
- Node.js 18+
- Claude API key
- 5分钟

【第二步：初始化项目】

在你的项目目录下运行初始化命令
系统会自动创建 .context/ 目录结构

这个目录就是AI团队的"公司章程"：
- vision.md -- 项目愿景
- directives/ -- 所有任务
- lessons/ -- AI学到的经验

【第三步：下达第一个指令】

运行你的第一个directive
比如："给README加一个快速上手部分"

然后AI团队就开始工作了：
分级 -> 规划 -> 开发 -> 审查 -> 交付

你只需要最后确认

【更多资源】

GitHub完整文档：github.com/andrew-yangy/agent-conductor
MIT开源，随便用

### CTA

装完了来评论区打个卡，我帮你看看配置有没有问题

### Hashtags

#AI智能体 #开源项目 #开发者工具 #AI编程 #效率工具 #独立开发 #技术分享 #程序员日常 #AI自动化

---

## Post Summary

| # | Title | Pillar | CTA Style | GitHub URL |
|---|-------|--------|-----------|------------|
| 1 | Pixel-Art Office Reveal | B | Question (评论区) | Correct |
| 2 | Pipeline Walkthrough | A | Follow + Save | Correct |
| 3 | gruAI vs Manual | C | Question (评论区) | Correct |
| 4 | Agent Personalities | A+B | Poll (评论区投票) | Correct |
| 5 | CEO's Week | B+C | Save + Share | Correct |
| 6 | Quick Start Guide | C | Action (装完打卡) | Correct |

All 6 posts use `github.com/andrew-yangy/agent-conductor` for the repo URL
and `gru-ai` for the npm package name.
