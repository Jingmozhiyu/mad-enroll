'use client'

import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'
import type {GradeDistribution} from '@/lib/madgrades/types'
import {calculateGpa, formatGpa, toTermName} from '@/lib/madgrades/utils'

type GpaChartProps = {
    title?: string
    primary: GradeDistribution[]
    secondary?: GradeDistribution[]
    primaryLabel: string
    secondaryLabel?: string
    primaryColor?: string
    secondaryColor?: string
    domainSource?: GradeDistribution[]
    highlightTermCode?: number
    highlightSeries?: 'primary' | 'secondary'
    showLegend?: boolean
    heightClassName?: string
}

export function GpaChart({
                             title,
                             primary,
                             secondary = [],
                             primaryLabel,
                             secondaryLabel,
                             primaryColor = '#9aeede',
                             secondaryColor = '#ffcdac',
                             domainSource,
                             highlightTermCode,
                             highlightSeries = 'primary',
                             showLegend = Boolean(secondary.length > 0),
                             heightClassName = 'h-[220px]',
                         }: GpaChartProps) {
    const table = new Map<
        number,
        {
            termCode: number
            termName: string
            primary?: number
            secondary?: number
            highlight?: number
        }
    >()

    primary.forEach((distribution) => {
        const termCode = distribution.termCode ?? 0
        const value = calculateGpa(distribution)
        table.set(termCode, {
            termCode,
            termName: toTermName(termCode),
            primary: value,
            secondary: table.get(termCode)?.secondary,
            highlight:
                highlightSeries === 'primary' && highlightTermCode === termCode ? value : undefined,
        })
    })

    secondary.forEach((distribution) => {
        const termCode = distribution.termCode ?? 0
        const value = calculateGpa(distribution)
        table.set(termCode, {
            termCode,
            termName: toTermName(termCode),
            primary: table.get(termCode)?.primary,
            secondary: value,
            highlight:
                highlightSeries === 'secondary' && highlightTermCode === termCode ? value : table.get(termCode)?.highlight,
        })
    })

    const data = [...table.values()].sort((left, right) => left.termCode - right.termCode)
    const domainSeries = (domainSource ?? primary)
        .map((distribution) => calculateGpa(distribution))
        .filter((value): value is number => !Number.isNaN(value))
    const primaryValues = domainSeries.length > 0
        ? domainSeries
        : data
            .map((item) => item.primary)
            .filter((value): value is number => typeof value === 'number' && !Number.isNaN(value))
    const minPrimary = primaryValues.length > 0 ? Math.min(...primaryValues) : 0
    const maxPrimary = primaryValues.length > 0 ? Math.max(...primaryValues) : 4
    const useQuarterSteps = minPrimary >= 3 && maxPrimary <= 4
    const yMin = useQuarterSteps ? 3 : 2
    const yMax = 4
    const ticks = useQuarterSteps ? [3, 3.25, 3.5, 3.75, 4] : [2, 2.5, 3, 3.5, 4]
    const highlightColor = highlightSeries === 'secondary' ? secondaryColor : primaryColor

    return (
        <div className="min-w-0 w-full">
            {title ? (
                <div className="mb-4">
                    <p className="eyebrow">Average GPA</p>
                    <h3 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">{title}</h3>
                </div>
            ) : null}

            <div className={`${heightClassName} min-w-0 w-full`}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <LineChart data={data} margin={{top: 10, right: 20, bottom: 2, left: 0}}>
                        <CartesianGrid stroke="rgba(154,238,222,0.22)" vertical={false}/>
                        <XAxis
                            dataKey="termName"
                            tick={{fill: '#4f6c76', fontSize: 12}}
                            tickLine={false}
                            axisLine={{stroke: 'rgba(154,238,222,0.22)'}}
                            angle={-32}
                            textAnchor="end"
                            height={60}
                        />
                        <YAxis
                            domain={[yMin, yMax]}
                            ticks={ticks}
                            tick={{fill: '#4f6c76', fontSize: 12}}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            formatter={(value) => {
                                const numericValue =
                                    typeof value === 'number'
                                        ? value
                                        : typeof value === 'string'
                                            ? Number(value)
                                            : NaN
                                return formatGpa(numericValue)
                            }}
                            contentStyle={{
                                borderRadius: 16,
                                border: '1px solid rgba(154,238,222,0.25)',
                                background: 'rgba(255,255,255,0.94)',
                            }}
                        />
                        {showLegend ? <Legend wrapperStyle={{paddingTop: 14}}/> : null}
                        <Line
                            type="monotone"
                            dataKey="primary"
                            name={primaryLabel}
                            stroke={primaryColor}
                            strokeWidth={3}
                            dot={{r: 4, fill: primaryColor}}
                            activeDot={{r: 5}}
                            connectNulls
                        />
                        {secondary.length > 0 ? (
                            <Line
                                type="monotone"
                                dataKey="secondary"
                                name={secondaryLabel}
                                stroke={secondaryColor}
                                strokeWidth={3}
                                dot={{r: 4, fill: secondaryColor}}
                                activeDot={{r: 5}}
                                connectNulls
                            />
                        ) : null}
                        {highlightTermCode ? (
                            <Line
                                type="monotone"
                                dataKey="highlight"
                                name="Selected semester"
                                stroke="transparent"
                                strokeWidth={0}
                                dot={{r: 6, fill: highlightColor, stroke: '#ffffff', strokeWidth: 2}}
                                activeDot={{r: 7}}
                                connectNulls={false}
                            />
                        ) : null}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
