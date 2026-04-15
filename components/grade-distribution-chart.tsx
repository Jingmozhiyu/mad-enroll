'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { GradeDistribution } from '@/lib/madgrades/types'
import { getGradeLabel, numberWithCommas } from '@/lib/madgrades/utils'

const GRADE_KEYS = [
  'aCount',
  'abCount',
  'bCount',
  'bcCount',
  'cCount',
  'dCount',
  'fCount',
] as const

export type GradeDistributionChartProps = {
  title?: string
  primary: GradeDistribution | null
  primaryLabel: string
  secondary?: GradeDistribution | null
  secondaryLabel?: string
  primaryColor?: string
  secondaryColor?: string
  xAxisLabel?: string
  showLegend?: boolean
  heightClassName?: string
  primaryBarSize?: number
  secondaryBarSize?: number
  sharpBars?: boolean
  barCategoryGap?: number | string
  barGap?: number | string
  percentFontSize?: number
  countFontSize?: number
  labelYOffset?: number
}

type DistributionLabelProps = {
  x?: number | string
  y?: number | string
  width?: number | string
  value?: unknown
  index?: number
  countKey: 'primaryCount' | 'secondaryCount'
  percentFontSize: number
  countFontSize: number
  labelYOffset: number
  rows: Array<{
      primaryCount: number
      secondaryCount: number
  }>
}

function DistributionLabel({
  x = 0,
  y = 0,
  width = 0,
  value,
  index = 0,
  countKey,
  percentFontSize,
  countFontSize,
  labelYOffset,
  rows,
}: DistributionLabelProps) {
  const numericX = typeof x === 'number' ? x : Number(x ?? 0)
  const numericY = typeof y === 'number' ? y : Number(y ?? 0)
  const numericWidth = typeof width === 'number' ? width : Number(width ?? 0)
  const numericValue =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : 0
  const count = rows[index]?.[countKey] ?? 0

  return (
    <text x={numericX + numericWidth / 2} y={numericY - labelYOffset} textAnchor="middle">
      <tspan
        x={numericX + numericWidth / 2}
        dy="0"
        fill="var(--chart-label-strong)"
        fontSize={percentFontSize}
        fontWeight="700"
      >
        {numericValue.toFixed(1)}%
      </tspan>
      <tspan
        x={numericX + numericWidth / 2}
        dy="12"
        fill="var(--chart-label-soft)"
        fontSize={countFontSize}
        fontWeight="500"
      >
        {numberWithCommas(count)}
      </tspan>
    </text>
  )
}

export function GradeDistributionChart({
  title,
  primary,
  primaryLabel,
  secondary,
  secondaryLabel,
  primaryColor = 'var(--color-haruka)',
  secondaryColor = 'var(--color-airi)',
  xAxisLabel,
  showLegend = Boolean(secondary),
  heightClassName = 'h-[255px]',
  primaryBarSize,
  secondaryBarSize,
  sharpBars = false,
  barCategoryGap = secondary ? '22%' : '38%',
  barGap = 6,
  percentFontSize = 12,
  countFontSize = 10,
  labelYOffset = 18,
}: GradeDistributionChartProps) {
  const data = GRADE_KEYS.map((key) => {
    const primaryCount = primary?.[key] ?? 0
    const primaryPercent = primary ? (primaryCount / Math.max(primary.total, 1)) * 100 : 0
    const secondaryCount = secondary?.[key] ?? 0
    const secondaryPercent = secondary
      ? (secondaryCount / Math.max(secondary.total, 1)) * 100
      : 0

    return {
      grade: getGradeLabel(key),
      primaryPercent: Number(primaryPercent.toFixed(1)),
      primaryCount,
      secondaryPercent: Number(secondaryPercent.toFixed(1)),
      secondaryCount,
    }
  })

  return (
    <div className="min-w-0 w-full">
      {title ? (
        <div className="mb-4">
          <p className="eyebrow">Grade Distribution</p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">{title}</h3>
        </div>
      ) : null}

      <div className={`${heightClassName} min-w-0 w-full`}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart
            barCategoryGap={barCategoryGap}
            barGap={barGap}
            data={data}
            margin={{ top: 36, right: 20, bottom: 0, left: 0 }}
          >
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="grade"
              label={
                xAxisLabel
                  ? {
                      value: xAxisLabel,
                      position: 'insideBottom',
                      offset: -8,
                      fill: 'var(--chart-axis)',
                      fontSize: 12,
                    }
                  : undefined
              }
              tick={{ fill: 'var(--chart-axis)', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--chart-grid)' }}
            />
            <YAxis
              domain={[0, 100]}
              label={{
                value: 'Students (%)',
                angle: -90,
                position: 'insideLeft',
                fill: 'var(--chart-axis)',
                fontSize: 12,
                offset: 8,
              }}
              tickFormatter={(value) => `${value}%`}
              tick={{ fill: 'var(--chart-axis)', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={false}
              formatter={(value, name, item) => {
                const payload = item.payload as {
                  primaryCount: number
                  secondaryCount: number
                }
                const numericValue =
                  typeof value === 'number'
                    ? value
                    : typeof value === 'string'
                      ? Number(value)
                      : 0
                if (name === primaryLabel) {
                  return [`${numericValue}% · ${numberWithCommas(payload.primaryCount)}`, name]
                }
                return [`${numericValue}% · ${numberWithCommas(payload.secondaryCount)}`, name]
              }}
              contentStyle={{
                borderRadius: 16,
                border: '1px solid var(--tooltip-border)',
                background: 'var(--tooltip-background)',
              }}
            />
            {showLegend ? <Legend wrapperStyle={{ paddingTop: 14, color: 'var(--color-ink-soft)' }} /> : null}
            <Bar
              activeBar={false}
              barSize={primaryBarSize}
              dataKey="primaryPercent"
              name={primaryLabel}
              fill={primaryColor}
              radius={sharpBars ? [2, 2, 0, 0] : [10, 10, 0, 0]}
            >
              <LabelList
                content={(props) => (
                  <DistributionLabel
                    {...props}
                    countKey="primaryCount"
                    countFontSize={countFontSize}
                    labelYOffset={labelYOffset}
                    percentFontSize={percentFontSize}
                    rows={data}
                  />
                )}
                dataKey="primaryPercent"
              />
            </Bar>
            {secondary ? (
              <Bar
                activeBar={false}
                barSize={secondaryBarSize}
                dataKey="secondaryPercent"
                name={secondaryLabel}
                fill={secondaryColor}
                radius={sharpBars ? [2, 2, 0, 0] : [10, 10, 0, 0]}
              >
                <LabelList
                  content={(props) => (
                    <DistributionLabel
                      {...props}
                      countKey="secondaryCount"
                      countFontSize={countFontSize}
                      labelYOffset={labelYOffset}
                      percentFontSize={percentFontSize}
                      rows={data}
                    />
                  )}
                  dataKey="secondaryPercent"
                />
              </Bar>
            ) : null}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
