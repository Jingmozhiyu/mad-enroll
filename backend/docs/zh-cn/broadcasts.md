# 广播操作

[English](../en-us/broadcasts.md) · [API 契约](api-reference.md)

## 部署和使用

部署前运行 [20260908_broadcasts.sql](../../migrations/20260908_broadcasts.sql) 和
[20260909_mail_send_claims.sql](../../migrations/20260909_mail_send_claims.sql)。前者创建
`broadcasts` 和 `broadcast_deliveries`；Java 送达实体现在是 `BroadcastDeliveryLog`，而 SQL 表名保持兼容。后者创建 `mail_send_claims`，并按事件 ID 为现有提醒成功记录和死信记录写入初始数据。在写入初始数据并替换旧消费者期间停止旧邮件消费者，使其无法在历史快照和新消费者启动之间发送邮件。基于学期的受众还要求完成学期迁移。这些脚本需要手动执行；GitHub Actions 不会执行它们。

广播复用现有的 RabbitMQ 和 SMTP 连接。持久化队列由 `app.rabbitmq.broadcast-queue` / 可选的 `BROADCAST_QUEUE` 配置（默认值为 `uwtrack.broadcast.queue`）；其独立的死信队列会追加 `.dlq`。不需要额外的前端环境变量。迁移或部署不会发送广播。

在 `/admin` 中打开 **Broadcasts → New broadcast**。选择所有用户，或选择某个学期中的订阅者（包括已禁用订阅），填写主题和纯文本消息，然后保存草稿。检查准确内容、收件人数和分页的邮件列表。**Send test email** 会将已保存内容发送到一个明确的地址，不改变受众、广播状态或任何邮件计数。检查收件箱，然后确认并发送正式广播。

草稿内容和收件人不可变。**Use as new draft** 会将内容复制到新表单；保存时会创建新的受众快照。所有用户受众包括管理员和从未订阅过的用户。学期受众会通过 section/课程连接订阅，包括已禁用订阅和任意学期状态，并对规范化后的地址去重。之后的注册或订阅变更不会改变已有草稿。

## 队列发送与无重试策略

广播状态为 `DRAFT`、`QUEUED` 或 `COMPLETED`。COMPLETED 表示处理完成，不表示每封邮件都发送成功。收件人记录使用 `PENDING`、`SENDING`、`SENT`、`FAILED` 或 `UNKNOWN`。SENT 表示 SMTP 调用成功返回，不表示邮件已送达收件箱或已被阅读。

`POST /send` 只会将草稿变为 QUEUED 一次。该事务提交后，会为每个收件人发布一个持久化 RabbitMQ 事件，并将送达 UUID 作为消息 ID。SMTP 在消费者中、数据库事务外运行。没有定时数据库扫描或重试端点。排队期间，管理员页面每三秒刷新一次送达详情。

在 SMTP 发送前，消费者会原子地将指定送达记录从 PENDING 改为 SENDING 并提交。只有成功获得领取资格的消费者才能发送。并发重复消息，或 ACK/连接失败后的 broker 重投，都会跳过 SMTP。成功后记录 SENT 并 ACK；传输错误记录 FAILED，拒绝消息且不重新放回主队列，由 RabbitMQ 将其路由到广播 DLQ。FAILED 表示报告了异常，但 SMTP 可能已经接受邮件。送达记录不会重置为 PENDING。测试消息有自己的唯一 ID，并使用持久化领取表。

广播行仍会为竞争的管理员发送请求和聚合完成更新持有短锁。收件人领取使用条件更新，而不是广播范围的锁。没有任何行锁会跨越 SMTP。详情请求会将超过五分钟的 SENDING 记录协调为 UNKNOWN；不需要后台轮询。稍后的结果可以解决 UNKNOWN，但不会重新发送。

发布者 NACK、退回消息和同步发布错误会在可能时将仍为 `PENDING` 的收件人标记为 UNKNOWN；这些消息不会再次发布。数据库提交后、发布前发生崩溃，可能留下没有排队事件的 PENDING 行。这是已接受的丢失窗口：没有 outbox 或自动恢复扫描。同样，领取后、SMTP 发送前发生崩溃也可能丢失邮件。该策略优先避免重复尝试，而不是保证送达。对于不确定结果，请检查应用日志、队列状态和 SMTP 记录。

每封邮件只有一个 To 收件人。广播及其 DLQ 不会更新 `email cnt`、每日邮件计数、普通送达历史或普通提醒死信记录。重复测试请求会有意创建独立消息；返回的测试 UUID 表示请求已被接受，不表示 broker 或 SMTP 送达已确认。

## 普通提醒去重

课程、欢迎、反馈和普通测试邮件现在会在发送前提交一次 `mail_send_claims` 主键插入。此前消费者检查 Redis，并且只有在 SMTP 发送后才标记事件，这会留下并发/崩溃窗口，并在 Redis 不可用时开放发送。持久化领取没有 TTL。即使发生发送错误或 ACK 丢失，已有事件 ID 也会跳过 SMTP；数据库失败会阻止发送。旧消息可能返回期间不要删除这些记录。现有提醒资格检查和无重试/死信策略保持不变。

## 验证

[BroadcastTest](../../src/test/java/com/jing/monitor/BroadcastTest.java) 使用真实的 Spring 事务和 H2 仓库，并 mock RabbitMQ 传输和 SMTP。它涵盖受众快照、验证、管理员授权、发布前回滚、发布失败、重复请求/送达、并发领取、中断尝试以及隔离的测试邮件。[TermLifecycleTest](../../src/test/java/com/jing/monitor/TermLifecycleTest.java) 还测试并发持久化领取插入，以及 SMTP/ACK 失败后的普通邮件重投。这些测试不会发送真实邮件，也不能替代 MySQL/RabbitMQ 部署验证。
