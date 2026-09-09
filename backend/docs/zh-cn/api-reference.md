# 后端 API 契约

[English](../en-us/api-reference.md) · [学期管理](term-management.md) · [广播操作](broadcasts.md)

根据 2026-09-08 的工作树核验，包括学期管理和广播。生产环境可能落后于此代码。这是供开发者和编码代理使用的契约索引；链接到的控制器、DTO、服务和测试定义详细实现。避免在此处复制完整 DTO。

## 边界和响应结构

这些路径属于由 Next.js 通过 `API_BASE_URL` 配置的 **Spring 后端源站**。它们不是面向浏览器的代理契约。

- `/api/tasks/**` 要求 `Authorization: Bearer <token>`。
- `/api/admin/**` 还要求 ADMIN 权限。非管理员访问当前返回 **401**，而不是 403。
- 注册/登录为公开接口。反馈允许匿名请求。
- JSON 请求体使用 `Content-Type: application/json`。
- 控制器成功响应使用 HTTP **200**，包括创建和入队：

```json
{"code":200,"msg":"success","data":{}}
```

下表描述的是**数据**，不是外层封装。课程/section ID 和学期代码均为字符串；保留前导零。UUID 字段为字符串。本地日期时间不带偏移量；不要假设其为 UTC。可为空的快照字段可能为 null。

请区分以下几组值：座位 `OPEN | WAITLISTED | CLOSED`、学期 `UPCOMING | ACTIVE | EXPIRED`，以及邮件 `OPEN | WAITLIST | WELCOME | FEEDBACK`。

## 身份验证和反馈

| 方法和路径 | 输入 | 响应数据 | 源码 |
| --- | --- | --- | --- |
| `POST /auth/register` | JSON `email`、`password` | `null`；不返回登录令牌 | [AuthController](../../src/main/java/com/jing/monitor/controller/AuthController.java) |
| `POST /auth/login` | JSON `email`、`password` | `{userId, email, token}`；token 是 JWT | [AuthService](../../src/main/java/com/jing/monitor/service/AuthService.java) |
| `POST /api/feedback` | JSON `text`：非空白，会去除首尾空白 | `null`；已入队，不代表已确认送达 | [FeedbackService](../../src/main/java/com/jing/monitor/service/FeedbackService.java) |

## 用户任务

源码：[TaskController](../../src/main/java/com/jing/monitor/controller/TaskController.java)、[TaskService](../../src/main/java/com/jing/monitor/service/TaskService.java)。

| 方法和路径 | 查询参数 | 响应数据 |
| --- | --- | --- |
| `GET /api/tasks` | 无 | [TaskRespDto](../../src/main/java/com/jing/monitor/model/dto/TaskRespDto.java) 数组 |
| `GET /api/tasks/terms` | 无 | [SearchTermRespDto](../../src/main/java/com/jing/monitor/model/dto/SearchTermRespDto.java) 数组：`{code,label,status,isDefault}`，仅非 EXPIRED，按代码降序 |
| `GET /api/tasks/search/courses` | 必需 `courseName`、`termId`；可选 `page=1` | [SearchCourseRespDto](../../src/main/java/com/jing/monitor/model/dto/SearchCourseRespDto.java) 数组 |
| `GET /api/tasks/search/sections` | 必需 `termId`、`subjectId`、`courseId` | TaskRespDto 数组 |
| `POST /api/tasks` | 必需 `docId`；无请求体 | TaskRespDto |
| `DELETE /api/tasks` | 必需 `docId`；无请求体 | `null` |

重要语义：

- 搜索学期来自 `terms`，包括标签和由操作员维护的 `is_default` 标志。空列表是有效响应。API 不会选择或修复默认学期。普通的已认证用户可以读取此端点；管理员学期端点仍包含已过期学期。搜索请求必须提供 `termId`；Next.js 不再接受 `termKey` 作为替代，也不再使用按学期的环境变量或默认代码回退。
- 搜索要求 termId 已配置、为四位数字且对应 UPCOMING 或 ACTIVE 学期；未知/EXPIRED 学期会被拒绝。课程搜索页码必须至少为 1。其结果是数组，而不是管理员分页封装。
- 课程搜索返回 `{courseDesignation, title, subjectId, courseId}`。将这些 ID 和相同的 termId 传给 section 搜索。section 搜索会持久化快照，但不会创建订阅。
- GET tasks 包含已禁用和历史订阅，按 sectionId 排序。当前 UI 会隐藏已禁用行。TaskRespDto **没有 termCode/termStatus 字段**。其 `meetingInfo` 是 JSON 编码的字符串，不是数组。未订阅的搜索行具有 `id: null, enabled: false`。
- POST 要求 section 之前已同步。它会创建或重新启用调用者的订阅，检查**已存储课程的学期**，并限制每个用户最多 **15 个已启用 section**，其中包括跨学期的 UPCOMING 订阅。只有 ACTIVE 学期会被监控。
- DELETE 会禁用属于调用者的订阅。即使学期已过期，重复禁用也会成功；缺失或不属于调用者的订阅会被拒绝。
- Spring 没有 `GET /api/tasks/search`；该兼容别名只存在于 Next.js 中。

## 管理操作

源码：[AdminController](../../src/main/java/com/jing/monitor/controller/AdminController.java)、[AdminService](../../src/main/java/com/jing/monitor/service/AdminService.java)。所有路由都要求经过身份验证的 ADMIN。

| 方法和路径 | 输入 | 响应数据 |
| --- | --- | --- |
| `GET /api/admin/terms` | 无 | [AcademicTerm](../../src/main/java/com/jing/monitor/model/AcademicTerm.java) 数组，按代码降序 |
| `POST /api/admin/terms` | JSON `code`、`label` | AcademicTerm；始终为 UPCOMING |
| `PATCH /api/admin/terms/{termCode}` | JSON `status` | `{term, disabledSubscriptions}` |
| `GET /api/admin/subscriptions` | 可选查询 `page=1` | [AdminUserSubsRespDto](../../src/main/java/com/jing/monitor/model/dto/AdminUserSubsRespDto.java) 的 PageRespDto |
| `PATCH /api/admin/subscriptions/{subscriptionId}` | 必需查询 `enabled=true` 或 `false`；无请求体 | [AdminSectionSubRespDto](../../src/main/java/com/jing/monitor/model/dto/AdminSectionSubRespDto.java) |
| `GET /api/admin/summary` | 无 | [AdminSummaryRespDto](../../src/main/java/com/jing/monitor/model/dto/AdminSummaryRespDto.java) |
| `GET /api/admin/mail-deliveries` | 可选查询 `page=1` | [AlertDeliveryLogRespDto](../../src/main/java/com/jing/monitor/model/dto/AlertDeliveryLogRespDto.java) 的 PageRespDto |
| `GET /api/admin/dead-letters` | 无 | [AlertDeadLetterRespDto](../../src/main/java/com/jing/monitor/model/dto/AlertDeadLetterRespDto.java) 数组，最新在前 |
| `GET /api/admin/mail-stats` | 无 | [MailDailyStatRespDto](../../src/main/java/com/jing/monitor/model/dto/MailDailyStatRespDto.java) 数组，日期最新在前 |
| `GET /api/admin/scheduler-status` | 无 | [SchedulerStatusRespDto](../../src/main/java/com/jing/monitor/model/dto/SchedulerStatusRespDto.java) |
| `POST /api/admin/test-email` | JSON [AdminTestEmailReqDto](../../src/main/java/com/jing/monitor/model/dto/AdminTestEmailReqDto.java) | `null`；已入队，不代表已确认送达 |
| `GET /api/admin/broadcasts` | 可选查询 `page=1` | BroadcastDtos.View 的 PageRespDto；每页 10 条 |
| `POST /api/admin/broadcasts` | JSON BroadcastDtos.Create | 不可变草稿和收件人数；不会发送 |
| `GET /api/admin/broadcasts/{id}` | Broadcast UUID | 包含送达计数的 BroadcastDtos.View |
| `GET /api/admin/broadcasts/{id}/recipients` | 可选查询 `page=1` | BroadcastDtos.Delivery 的 PageRespDto；每页 50 条 |
| `POST /api/admin/broadcasts/{id}/send` | 无请求体 | BroadcastDtos.View；只将草稿入队一次 |
| `POST /api/admin/broadcasts/{id}/test-email` | JSON `{"recipientEmail":"test@example.com"}`；一个明确的地址 | 用于标识测试事件的 UUID；不改变正式受众/计数 |

### 广播

源码：[BroadcastController](../../src/main/java/com/jing/monitor/controller/BroadcastController.java)、[BroadcastService](../../src/main/java/com/jing/monitor/service/BroadcastService.java)、[BroadcastDtos](../../src/main/java/com/jing/monitor/model/dto/BroadcastDtos.java)。

全部六个端点都会在服务中检查 ADMIN。部署、送达保证和无重试策略参见[广播操作](broadcasts.md)。Next.js 暴露相同路径，读取 session cookie 并解包 `data`；其动态 action 路由只接受 `send`、`test-email` 和 `recipients` 及其匹配的方法。

创建要求 `subject`（1–200 个字符，单行）、纯文本 `body`（1–20000 个字符）和 `audience`：`ALL_USERS` 或 `TERM_SUBSCRIBERS`。后者要求配置 `termCode`，包括 UPCOMING/EXPIRED 学期；ALL_USERS 拒绝非空 term code。地址会在创建时规范化、去重并固定，包括已禁用订阅记录。正文可以包含报告 URL；不会渲染 HTML 和 Markdown。空受众可以保存，但不能发送。草稿不能编辑；管理员 UI 可以将其复制到新草稿中。广播分页会拒绝非正页码；Next.js 会将无效页码规范化为 1。广播不会计入课程提醒计数、普通邮件历史或死信行。事务提交后，每个收件人发布一个 RabbitMQ 事件。每个送达 ID 只允许一次 SMTP 尝试；失败或未确认的尝试永远不会自动再次发送。没有重试端点。测试邮件使用已保存的主题/正文，并要求一个不带显示名称或地址列表的单一纯文本电子邮件地址。返回的 UUID 只确认请求已接收，不代表 SMTP 或 broker 已接收。重复测试请求会创建新的测试事件。

### 学期和订阅更新

创建请求体：`{"code":"1272","label":"Fall 2026"}`。代码必须为四位数字；标签会被修剪空白，长度限制为 1–80 个字符。重复创建会被拒绝。更新要求学期已存在；这些端点不能编辑代码和标签。AcademicTerm 为 `{code, label, status, isDefault}`。新学期的 `isDefault=false`，默认标记由操作员直接在数据库中维护，不影响监控或订阅权限。

PATCH 请求体：`{"status":"EXPIRED"}`。响应**数据**示例：

```json
{"term":{"code":"1272","label":"Fall 2026","status":"EXPIRED","isDefault":false},"disabledSubscriptions":12}
```

ACTIVE/UPCOMING 只更改学期状态。EXPIRED 还会在同一事务中禁用该学期已启用的订阅。计数表示新近禁用的行数；重复过期通常返回 0。重新开放不会恢复订阅。允许多个 ACTIVE 学期。添加/启用订阅和过期操作共享学期行锁；参见[学期管理](term-management.md)。

管理端启用订阅同样会拒绝 EXPIRED/未知学期，并执行每个用户最多启用 15 个 section 的限制。用户和管理端启用都会获取学期共享锁，然后获取订阅所有者 `users` 行的排他锁，再加载订阅状态并计数。READ_COMMITTED 确保等待锁后读取到已提交的变更，即使竞争中的启用属于不同学期。管理端代码最初只读取所有者和学期的标量标识符，避免使用锁前缓存的订阅实体。这可以防止两个并发请求同时占用第 15 个名额。禁用只会减少计数，不需要此容量保护；管理端禁用不会永久阻止用户重新启用。禁用不要求学期处于 active 状态。AdminSectionSubRespDto 使用 `subscriptionId` 而不是任务的 `id`，增加 **termCode**，并包含 `onlineOnly` 和 `meetingInfo`。

### 分页和诊断详情

[PageRespDto](../../src/main/java/com/jing/monitor/model/dto/PageRespDto.java) 是对象而不是数组：

```json
{"items":[],"page":1,"pageSize":20,"totalItems":0,"totalPages":0}
```

- 订阅：**每页 20 个用户**，按 email 再按 ID 升序排列。包含没有订阅的用户以及跨学期的已禁用订阅。totalItems 统计用户数，而不是订阅数。
- 送达记录：**每页 3 条记录**，按 sentAt 再按 ID 降序排列。
- 两者都使用从 1 开始的页码；小于 1 的值会限制为 1；超出末页时返回空 items。页大小固定；数据集为空时 totalPages 为 0。
- 汇总字段是数据库计数：totalUsers、totalSubscriptions、enabledSubscriptions、totalDeliveries、totalDeadLetters。enabled 包括 UPCOMING，不是受监控课程数。
- 调度器的 queuedCourseIds 和 lastFetchedCourseId 使用 **`termCode:courseId`**，例如 `1272:011630`。activeCourseCount 要求存在已启用订阅和 ACTIVE 学期；dueCourseCount 还要求已到下次轮询时间。旧的排队项目可能一直保留到出队时被丢弃。最近时间戳和 lastFetchedCourseId 可能为 null。抓取间隔取决于时间/配置。
- 死信字段使用 **reason / createdAt**，而不是 deadLetterReason / failedAt。payloadJson 是字符串。
- 邮件统计是持久化快照。手动测试计数与邮件类型计数重叠；不要再次将其相加到总数中。FEEDBACK 会计入总数，但没有专用 DTO 计数器。

测试邮件要求四位数字的 termId；学期不必为 ACTIVE/已配置。默认值为：recipientEmail = 当前管理员邮箱，alertType = OPEN，sectionId = 99999，courseDisplayName = TEST COURSE。recipientEmail/sectionId/courseDisplayName 为空白时也使用这些默认值；省略 alertType 时默认为 OPEN。座位提醒测试使用 OPEN 或 WAITLIST。DTO 也接受 WELCOME/FEEDBACK，但不提供 feedback sender/body 字段。手动测试绕过订阅和学期检查。此端点不会广播。

## 错误和验证

| HTTP 状态 | 当前含义 |
| --- | --- |
| 400 | 输入无效、缺失/不属于调用者的订阅、未知/EXPIRED 学期、重复学期、订阅数量上限、课程不存在 |
| 401 | 身份验证失败，或非管理员调用管理操作 |
| 429 | 速率限制；后端提供 Retry-After 秒数 |
| 5xx | 基础设施/未处理失败；某些运行时失败当前会映射为 400 |

[GlobalExceptionHandler](../../src/main/java/com/jing/monitor/common/GlobalExceptionHandler.java) 将 RuntimeException 封装为 `{code,msg,data}`（`Unauthorized` 返回 401，否则返回 400）。框架绑定/枚举错误或上游失败可能使用其他响应体。并非每个错误都保证使用该封装。参见 [RateLimitFilter](../../src/main/java/com/jing/monitor/security/RateLimitFilter.java)。

[TermLifecycleTest](../../src/test/java/com/jing/monitor/TermLifecycleTest.java) 覆盖学期 API、授权、回滚和并发过期。测试用于验证行为；此手工维护的索引不是生成的 schema，也不能替代检查变更后的代码。
