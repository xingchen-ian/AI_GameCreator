# ADR-0020：独立审查模型与可复现实验元数据

- 状态：Accepted
- 日期：2026-10-19
- 决策者：产品负责人
- 关联：[ADR-0018](0018-research-data-logging.md)

## 背景

全局 Design State 审查此前复用 `DASHSCOPE_GDD_MODEL`，线上为 Flash，并且所有模型调用都关闭 thinking。`model_calls` 虽然记录模型、耗时、token 和结果，但没有记录当时的 Prompt、Schema、应用代码和采样参数版本。研究导出也没有跨项目稳定的参与者编号，因此无法精确比较不同版本的实验结果。

## 决定

1. 新增独立的 `review` 模型角色。`DASHSCOPE_REVIEW_MODEL` 默认使用 `qwen3.8-27b`；Design State 初次扫描、修改验证和单项冲突讨论都走该角色。聊天与 GDD 的模型路由不变。（原决定同时开启 thinking，已修订，见下方“修订记录”。）
2. 每个结构化模型调用必须在代码中显式声明 `promptVersion` 和 `schemaVersion`。类型系统把这两个字段设为必填，避免新增调用时漏记版本。
3. `model_calls` 新增 `app_version`、`prompt_version`、`schema_version`、`temperature` 和 `thinking_enabled`。其中 `app_version` 来自部署环境变量 `APP_COMMIT`；本地未配置时明确记录为 `local-dev`。
4. 新增 `research_participants`，为每个登录账号生成一个形如 `P-XXXXXXXXXXXX` 的随机稳定编号。内部表保存账号到编号的映射，研究 JSON 只导出匿名编号，不导出账号 ID 或邮箱。
5. 研究导出格式升级到 v2，并带出以上全部模型调用字段。旧调用无法恢复的值由迁移标记为 `unknown`、`legacy`、`0` 和 `false`，不得假装是当时的真实配置。

## 原因

- 全局一致性审查比单题对话更需要推理能力，应与低成本教练对话解耦；
- Prompt、Schema、代码版本和关键推理参数共同决定模型输出，仅记录模型名无法复现实验；
- 匿名稳定编号可以跨项目聚合同一参与者的数据，同时避免在导出中暴露登录身份；
- 显式版本字符串比对 Prompt 文本做哈希更容易解释，也允许纯措辞改动与语义版本由研究者主动区分。

## 后果

- 审查调用会比 Flash 非思考模式更慢，但聊天和 GDD 成本不受影响；
- 修改 Prompt 或 Schema 时，开发者必须同步递增对应版本字符串；
- 部署成功后必须把 `APP_COMMIT` 更新为该部署对应的 Git commit，否则线上调用会留下过期代码版本；
- 参与者编号是研究用伪匿名标识，不是账号认证信息，也不进入产品界面。

## 验证方式

- 全局审查产生的 `model_calls.role` 为 `review`，模型为环境配置值，`thinking_enabled=false`；
- 教练对话仍为 `chat` 且 `thinking_enabled=false`；
- 每条新模型调用都有非 legacy 的 Prompt/Schema 版本和准确温度；
- 同一账号导出不同项目时 `participant.id` 相同，不同账号不同；
- 研究导出 `formatVersion=2`，且不包含 owner ID 或邮箱。

## 回退方式

模型角色可以暂时把 `DASHSCOPE_REVIEW_MODEL` 指向 Flash，但保留独立路由和元数据字段。数据库新增字段和参与者表应保留，避免破坏历史导出。

## 修订记录

### 2026-10-20：审查角色关闭 thinking

原决定让 `review` 角色开启 thinking。百炼[错误码文档](https://help.aliyun.com/zh/model-studio/error-code)明确列出两条 400 InvalidParameter：`Json mode response is not supported when enable_thinking is true`，以及 `parameter.enable_thinking must be set to false for non-streaming calls`。本应用所有结构化请求都是非流式并带 `response_format`，开启 thinking 会使严格请求和 JSON Object 降级请求都失败，进而让全局审查和其后的 GDD 生成无法进行。

因此所有角色统一关闭 thinking，审查仍使用独立的 27B 模型。`thinking_enabled` 字段保留，如实记录为 `false`。若以后需要审查推理，应改为流式调用并在本地做 Schema 校验，而不是重新打开当前非流式路径的 thinking。
