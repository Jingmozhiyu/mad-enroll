import Image from 'next/image'
import styles from './page.module.css'

function Chart({name, caption}: {name: string; caption: string}) {
    return (
        <figure className={styles.figure}>
            <div className={styles.chartScroll} role="region" aria-label={caption} tabIndex={0}>
                <Image
                    className={styles.chart}
                    src={`/news/fall-2026-report/${name}.svg`}
                    alt={caption}
                    width={1200}
                    height={560}
                    unoptimized
                />
            </div>
            <figcaption>{caption}</figcaption>
        </figure>
    )
}

export function Fall2026Report({isChinese}: {isChinese: boolean}) {
    return (
        <div className={styles.body}>
            {isChinese ? (
                <p>MadEnroll自4月初上线，持续提供着选课监控服务。
                     我们关注了<strong> 137 门课程</strong>， 管理着<strong> 603 条订阅</strong>，并发出了<strong> 1,883 封邮件提醒</strong>。</p>
            ) : (
                <p>Since launching in early April, MadEnroll has continued to provide course monitoring. We followed <strong>137 courses</strong>, managed <strong>603 subscriptions</strong>, and sent <strong>1,883 email reminders</strong>.</p>
            )}

            <section className={styles.entry} id="courses">
                <h2>{isChinese ? '哪些课程最受关注？' : 'Which courses were most popular?'}</h2>
                {isChinese ? (
                    <p><strong>BIOCHEM 104</strong> 最受关注，共有 7 位用户订阅；CHEM 343、COMP SCI 640、E M A 307 和 MATH 320 各有 5 位用户。按学科看，<strong>COMP SCI</strong> 以 48 条课程订阅位居榜首，其次是 MATH（19 条）。</p>
                ) : (
                    <p><strong>BIOCHEM 104</strong> was the most followed course, with 7 subscribers. CHEM 343, COMP SCI 640, E M A 307, and MATH 320 each had 5. Across subjects, <strong>COMP SCI</strong> led with 48 course subscriptions, followed by MATH (19).</p>
                )}
                <Chart name="01-courses" caption={isChinese ? '订阅最多的十门课程，按用户数合计。' : 'The ten most followed courses. Each user counts once per course.'}/>
                <Chart name="02-subjects" caption={isChinese ? '订阅最多的十个学科，按课程订阅合计。' : 'The ten most followed subjects, by total course subscriptions.'}/>
            </section>

            <section className={styles.entry} id="alerts">
                <h2>{isChinese ? '一天中邮件提醒的分布' : 'When were alerts sent?'}</h2>
                {isChinese ? (
                    <p>本学期共发送，<strong>1,200 封</strong> 课位开放的邮件提醒，以及 <strong>559 封</strong> waitlist开放的邮件提醒。整体来看， <strong>8–11 时</strong> 发送的邮件最多，即出现空位的频率最高。</p>
                ) : (
                    <p>This semester, we sent <strong>1,200</strong> email reminders for open seats and <strong>559</strong> for waitlist openings. Overall, the most emails were sent between <strong>8 and 11 a.m.</strong>, when openings occurred most frequently.</p>
                )}
                <Chart name="03-hourly-emails" caption={isChinese ? '按发送时间统计的每小时课程提醒数量。' : 'Course alerts by hour of sending.'}/>
            </section>

            <section className={styles.entry} id="season">
                <h2>{isChinese ? '关键时刻 -- Add/Drop Week & SOAR' : 'Key moments -- Add/Drop Week & SOAR'}</h2>
                {isChinese ? (
                    <p>8.31 - 9.11，我们发出了 <strong>566 封邮件</strong>，占总量的 <strong>30.1%</strong>。此外，7-8 月的每周一到周五，SOAR 的举办周期性地带来新开放的座位。</p>
                ) : (
                    <p>From August 31 through September 11, we sent <strong>566 emails</strong>, accounting for <strong>30.1%</strong> of the total. During July and August, SOAR sessions held Monday through Friday also brought recurring waves of newly available seats.</p>
                )}
                <Chart name="04-operations" caption={isChinese ? '每日邮件发送量。' : 'Daily emails sent.'}/>
            </section>

            <section className={styles.entry} id="monitoring">
                <h2>{isChinese ? '提醒的时效性' : 'About alert speed'}</h2>
                {isChinese ? (
                    <p>MadEnroll 使用动态轮询优化监控效率。8-18 时的检测间隔为 1000 ms，根据日志，负载最高的 Add/Drop Week 期间，轮询队列的大小约为 56 门课程。假设单个轮询间隔内，每一时刻出现课位的概率均匀分布，可估算出平均的检测延迟约为 <strong>28 秒</strong>。</p>
                ) : (
                    <p>MadEnroll uses dynamic polling to make monitoring more efficient. Between 8 a.m. and 6 p.m., it checks a course every 1,000 ms. Logs show that during Add/Drop Week, when demand was highest, roughly 56 courses were in the polling queue. Assuming an opening is equally likely to occur at any point between checks, the estimated average detection delay is <strong>28 seconds</strong>.</p>
                )}
            </section>

            <section className={styles.entry} id="thanks">
                <h2>{isChinese ? '持续发展' : 'Continuing to grow'}</h2>
                {isChinese ? (
                    <p>项目的生命力源于持续的维护和迭代。MadEnroll 会长期运营下去，致力于成为继 Madgrades 之后的，下一个 UW-Madison 学生的选课基础设施。</p>
                ) : (
                    <p>A decent project depends on continued maintenance and improvement. MadEnroll will keep operating for the long term, with the goal of becoming the next essential course-planning tool for UW–Madison students, following Madgrades.</p>
                )}
            </section>
        </div>
    )
}
