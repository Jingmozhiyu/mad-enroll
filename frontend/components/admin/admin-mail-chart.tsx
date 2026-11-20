'use client'

import {Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts'
import type {MailDailyStat} from '@/lib/admin/types'

const CHART_DAYS = 30

type ChartDay = {date: string; label: string; open: number; waitlist: number; welcome: number; dead: number}

/**
 * Lays out the last 30 days ending on `endDate` (YYYY-MM-DD, UTC like the stat days), with zeros
 * for days that sent nothing, so gaps show as gaps instead of being skipped.
 */
function buildChartDays(stats: MailDailyStat[], endDate: string): ChartDay[] {
    const byDate = new Map(stats.map((stat) => [stat.statsDate, stat]))
    const end = new Date(`${endDate}T00:00:00Z`)
    return Array.from({length: CHART_DAYS}, (_, index) => {
        const day = new Date(end)
        day.setUTCDate(end.getUTCDate() - (CHART_DAYS - 1 - index))
        const date = day.toISOString().slice(0, 10)
        const stat = byDate.get(date)
        return {
            date,
            label: `${day.getUTCMonth() + 1}/${day.getUTCDate()}`,
            open: stat?.sentOpen ?? 0,
            waitlist: stat?.sentWaitlist ?? 0,
            welcome: stat?.sentWelcome ?? 0,
            dead: stat?.deadTotal ?? 0,
        }
    })
}

/** Emails sent per day over the last 30 days, stacked by alert type; manual tests count in their type. */
export function AdminMailChart({stats, endDate}: {stats: MailDailyStat[]; endDate: string}) {
    if (!endDate) {
        return null
    }
    const days = buildChartDays(stats, endDate)
    const sentTotal = days.reduce((sum, day) => sum + day.open + day.waitlist + day.welcome, 0)
    const deadTotal = days.reduce((sum, day) => sum + day.dead, 0)

    return (
        <figure className="grid gap-2">
            <figcaption className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-[var(--color-ink-soft)]">
                <span>Emails sent per day, last {CHART_DAYS} days (UTC)</span>
                <span className="tabular-nums">
                    {sentTotal.toLocaleString('en-US')} sent{deadTotal > 0 ? ` · ${deadTotal} failed` : ''}
                </span>
            </figcaption>
            <div className="h-[220px]">
                <ResponsiveContainer height="100%" width="100%">
                    <BarChart data={days} margin={{top: 4, right: 4, bottom: 0, left: -24}}>
                        <CartesianGrid stroke="var(--surface-divider)" vertical={false}/>
                        <XAxis
                            dataKey="label"
                            interval="preserveStartEnd"
                            minTickGap={16}
                            tick={{fill: 'var(--color-ink-soft)', fontSize: 11}}
                            tickLine={false}
                        />
                        <YAxis
                            allowDecimals={false}
                            tick={{fill: 'var(--color-ink-soft)', fontSize: 11}}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            cursor={{fill: 'var(--surface-divider)'}}
                            formatter={(value, name) => [value, name]}
                            labelFormatter={(_, payload) => {
                                const day = payload?.[0]?.payload as ChartDay | undefined
                                return day ? `${day.date}${day.dead > 0 ? ` · ${day.dead} failed` : ''}` : ''
                            }}
                        />
                        <Legend iconSize={10} wrapperStyle={{fontSize: 12}}/>
                        <Bar dataKey="open" fill="var(--color-mmj)" name="Open" stackId="sent"/>
                        <Bar dataKey="waitlist" fill="var(--color-monori)" name="Waitlist" stackId="sent"/>
                        <Bar dataKey="welcome" fill="var(--color-haruka)" name="Welcome" stackId="sent"/>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </figure>
    )
}
