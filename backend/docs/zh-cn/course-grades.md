# 课程成绩页面

课程页面使用可读标识，例如 `/courses/COMPSCI_300` 和
`/courses/COMPSCI_ECE_354`。学科缩写内部的空格会被删除，字母转为大写；
跨学科课程的学科按 UW 学科代码排序。有意义的标点使用 URL 编码，例如
`C&ESOC 140` 对应 `/courses/C%26ESOC_140`。

现有 Madgrades UUID 地址会永久重定向到可读地址，并保留查询参数。
跨学科课程的单学科别名在能唯一匹配时，也会重定向到完整标识。
解析会精确核对课程号与学科，不会合并存在歧义的历史课程身份。
页面的 canonical 地址不包含交互筛选参数。

## HTML 与图表

默认响应包含服务端渲染的课程信息、成绩数量、字母成绩比例、逐学期统计、
覆盖范围。HTML 页面不展示独立的非字母成绩表和计算方法区块；计算细节保留在 API
参考和本文档中。阅读表格不需要 JavaScript。低调的 **Interactive
charts** 下划线链接打开 `?view=charts`，加载原有教师与学期比较界面。
图表视图没有数据页切换按钮，也没有新增的解释文字；canonical 仍为不含参数的课程地址。

搜索结果和自动补全直接打开图表地址，保持原有搜索流程。教师、学期筛选会保留
可读课程路径中的 `view=charts`。结果和分页使用普通链接，并保留原有外观。

页脚提供 `/course` 数据目录入口。目录说明数据性质，并链接至交互课程搜索和
选课监控。学科入口及分页课程列表链接至 HTML 数据页，无需 JavaScript 即可逐级遍历。

## 公开成绩 API

页脚右侧低调放置 **Grade Dataset** 与 **API Reference**，课程更新时间和
GitHub 链接仍居中。`/openapi` 提供服务端渲染的接口及参数表、计算口径、错误码
和响应结构。`/openapi.json` 发布对应的 OpenAPI 3.1 定义；HTML head 和成功的
API 响应通过 `service-desc` 链接指向该定义。接口无需登录或 API key。

- `GET /api/grades/subjects` 返回完整学科目录。
- `GET /api/grades/courses?subjectId=266&page=1` 每页返回最多 100 门课程及
  `nextPageUrl`，跟随该地址直到 null。学科 ID 来自学科目录接口。
- `GET /api/grades/courses/COMPSCI_300` 返回课程身份、可引用的 canonical HTML
  地址、MadEnroll 服务提供方信息、覆盖范围、累计及逐学期成绩。可唯一匹配的别名和旧 UUID
  会在响应中解析为规范课程代码。没有字母成绩时 `gpa` 和 `aPercent` 为 null；
  `aPercent` 使用 0–100 百分比，`uCount` 表示 U 成绩。

API 复用 HTML 页面的上游缓存加载及计算函数，成功的 JSON 响应最多可缓存一小时。
非法参数返回 400，未知记录或页码返回 404，课程身份歧义返回 409，数据暂不可用
返回 503。错误仅包含安全的 `message`，不缓存。未引入替代数据集、新存储或上游
更新计划。

## 数据与计算

成绩数据来源为 Madgrades。课程详情、精确标识查询、学科目录及成绩响应缓存
24 小时；自由文本搜索不缓存。这是请求缓存，不是另一份数据集。
成绩覆盖范围根据已有成绩学期计算，与当前课程目录所属学期分开呈现。
Madgrades 未提供记录更新时间。

GPA 按 A、AB、B、BC、C、D、F 的记录数加权计算，对应绩点分别为
4、3.5、3、2.5、2、1、0。字母成绩比例也使用这七类成绩合计作为分母。
包括 U 在内的其他已报告成绩单独列出。没有字母成绩时，GPA 和比例显示为
不可用，不显示为零。数量代表成绩记录，不是独立学生人数，也不是按学生实际
学分加权的 GPA。历史成绩不能衡量工作量。

优先使用上游提供的汇总；缺少汇总时，使用可取得的下级记录计算。
共同授课的 section 不会在计算课程总数时重复累计。未知课程返回 404；
上游故障和身份歧义显示错误，不会生成请求成功的空成绩页面。
页面不会展示上游错误响应正文。

## 搜索发现与元数据

`/robots.txt` 开放公开 HTML、静态资源和 `/api/grades/`，排除 `/admin` 及其他
`/api/` 操作，并声明 `/sitemap.xml`。该索引通过 `/sitemap.xml?section=pages`
和 `/sitemap.xml?subject=266` 链接公开页面及各学科的完整 sitemap，遍历上游
所有目录分页。跨学科课程仅在首个 UW 学科中出现一次，存在歧义的历史代码不收录。
仅列规范 HTML 课程地址，不列 UUID 别名或图表、筛选参数；XML 转义特殊字符，
不编造修改日期。目录请求失败返回 503，不输出部分目录或备用 sitemap。

首页搜索标题和描述位于 `frontend/lib/seo.ts` 的 `SITE_TITLE`、`SITE_DESCRIPTION`，
与首页 Open Graph、Twitter 和 WebSite 结构化数据共用。首页简短的可见服务说明位于
`frontend/components/home/welcome-hero.tsx`。其他页面描述位于对应 `app/**/page.tsx`
的 metadata 导出中。公开页面提供 canonical；筛选后的搜索页使用参数规范化后的自身
canonical 和 `noindex, follow`，默认搜索页可索引。课程数据页另提供标注 MadEnroll 为提供方及公开
JSON 地址的 Dataset 结构化数据，管理页面不索引。Google 仍可能根据查询选择页面
正文作为摘要，而不是使用提供的描述。

监控页的搜索标题和描述同样位于 `frontend/lib/seo.ts`，分别为 `MONITOR_TITLE`
与 `MONITOR_DESCRIPTION`，与该页面的 Open Graph、Twitter 元数据共用。
描述覆盖 seat alerts、course monitor、course sniper 和 seat status tracker，
界面仍统一使用 **Seat Alerts** / **alerts**，内部记录继续使用 **subscription**。
这些搜索用词不增加隐藏正文、爬虫专属内容或仅承载关键词的路由；不使用
`enroll alert`。元数据可能出现在浏览器标签、搜索摘要和链接预览中。

默认 `/search` 列表由 `frontend/app/search/page.tsx` 中的 `FEATURED_COURSES`
指定，依次为 ANTHRO 104、BIOCHEM 104、CURRIC 277、L I S 202、NUTR SCI 132。
按精确课程身份读取数据，默认不显示分页。搜索词、筛选、显式排序和后续页
保留原搜索行为；清空表单回到推荐列表。没有替代的本地数据集或随机结果回退。

## 验证

使用 Node.js 24，在 `frontend/` 执行 `npm run lint` 和 `npm run build`，直接检查
生产 HTML、元数据、robots、XML sitemap、公开 JSON 和搜索交互。本轮课程及 SEO
工作不保留固定测试套件或文本断言，微调文案无需同步修改测试数据。
