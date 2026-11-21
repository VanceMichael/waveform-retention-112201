# 来源接口

`GET /triggers` 给出已发的预触发，`line/boot` 确定控制器周期。区间统一为左闭右开。质量复核工单的优先级数字越小越优先。时钟均用现场秒数。
`GET /quality` 返回复核单与报工。复核单给出目标工单、优先级、发生时间窗和状态，报工按 `cycle` 标识加工次。`GET /tooling` 给出工装所在工位与时钟对应。每条时钟记录给出一个启动周期内 `sequence` 对应的全场起始秒 `factoryStart`，每序号一秒。
向 `POST /tickets` 发送 `line,boot,first,last` 可领短期票据，范围受现存触发段限制，每次最多四个序号。所有设备共用两个活动票据位。`DELETE /tickets/{id}` 释放一位。`GET /tickets/{id}?first=&last=` 按 NDJSON 返回各点，`X-Sequence-Until` 记载本次最后已发序号的下一位，活跃票据支持补读。过期返回 410，票据位不足为 429。
