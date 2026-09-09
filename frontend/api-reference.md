# API documentation / API 文档

This entry point links to the maintained contracts. The frontend routes use session cookies
and return unwrapped data; the Spring backend uses Bearer tokens and `{code,msg,data}`.

此入口指向统一维护的接口契约。前端代理使用会话 cookie，并直接返回 data；Spring 后端使用
Bearer token 和 `{code,msg,data}` 响应包装。请按调用的服务选择文档。

| Contract / 契约 | English | 简体中文 |
| --- | --- | --- |
| Next.js frontend proxy / 前端代理 | Contract below | 见下文 |
| Spring backend / 后端 | [Reference](../backend/docs/en-us/api-reference.md) | [接口说明](../backend/docs/zh-cn/api-reference.md) |

Broadcast proxy routes preserve the backend paths: list/create, detail, recipients, `POST /send`
and `POST /test-email`. Test mail takes `{"recipientEmail":"test@example.com"}` and returns the
event UUID as a JSON string. It uses the saved broadcast content without changing its audience
or counts. Requests use the session cookie; the proxy supplies the Bearer token and unwraps
`data`. Unknown actions, including the removed `/retry`, return 404. Source:
[proxy actions](app/api/admin/broadcasts/[id]/[action]/route.ts).

广播代理沿用后端路径：列表/创建、详情、收件人、`POST /send` 和 `POST /test-email`。
测试邮件接受 `{"recipientEmail":"test@example.com"}`，以 JSON 字符串返回事件 UUID；
使用已保存的广播正文，不改变正式收件人或计数。请求使用会话 cookie，代理补充 Bearer token
并解包 `data`。未知操作（包括已移除的 `/retry`）返回 404。
