'use client'

import '@ant-design/v5-patch-for-react-19'
import dynamic from 'next/dynamic'
import {useEffect, useState} from 'react'
import {
    DashboardOutlined, MailOutlined, TeamOutlined, CalendarOutlined,
    WarningOutlined, ReloadOutlined, ArrowLeftOutlined,
} from '@ant-design/icons'
import {PageContainer, ProCard, ProTable, type ProColumns} from '@ant-design/pro-components'
import {Alert, Button, ConfigProvider, Descriptions, Empty, Result, Segmented, Skeleton, Space, Statistic, Tag, type ThemeConfig} from 'antd'
import enUS from 'antd/locale/en_US'
import {CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts'
import {useAuth} from '@/components/providers'
import {formatDateTime} from '@/lib/course/format'
import {getErrorMessage} from '@/lib/api/client/http'
import {
    fetchAdminSummary, fetchAdminMailStats, fetchAdminSchedulerStatus,
    fetchAdminSubscriptions, fetchAdminMailDeliveries, fetchAdminTerms, fetchAdminDeadLetters,
} from '@/lib/api/client/admin'
import type {AcademicTerm, AdminSubscription, AdminUserSubscriptions, AlertDeadLetter, AlertDeliveryLog, MailDailyStat} from '@/lib/admin/types'
import {getSubscriptionState, getUserSubscriptionCounts, formatSnapshotTime} from '@/components/admin/admin-helpers'
import {demoUsers, demoStats, demoSummary, demoSnapshot, demoDeliveries, demoTerms, demoDeadLetters, demoPage} from './demo-data'
import styles from './admin-framework-page.module.css'

// ProLayout derives its responsive class from the browser viewport.
const ProLayout = dynamic(() => import('@ant-design/pro-components').then(module => module.ProLayout), {
    ssr: false,
    loading: () => <ProCard bordered><Skeleton active paragraph={{rows: 8}}/></ProCard>,
})

type Mode = 'demo' | 'live'
type Overview = {summary: typeof demoSummary; stats: MailDailyStat[]; snapshot: typeof demoSnapshot | null}

const palette = {
    primary: '#159889', ink: '#17313c', muted: '#5d747c', line: '#e3ece9',
    open: '#6ccb20', waitlist: '#ffcdac', closed: '#ffa9cc', disabled: '#99cdff', chart: '#33ccbb',
}

const theme: ThemeConfig = {
    token: {
        colorPrimary: palette.primary,
        colorText: palette.ink,
        colorTextSecondary: palette.muted,
        colorTextDescription: palette.muted,
        colorTextTertiary: palette.muted,
        colorTextPlaceholder: palette.muted,
        colorBorder: palette.line,
        colorBorderSecondary: palette.line,
        colorBgLayout: '#f5f8f7',
        colorBgContainer: '#ffffff',
        colorSuccess: palette.open,
        colorWarning: '#d17822',
        colorError: '#d84f88',
        colorInfo: palette.disabled,
        borderRadius: 8,
        fontFamily: 'inherit',
        fontSize: 14,
        boxShadow: 'none',
        boxShadowSecondary: 'none',
    },
    components: {
        Menu: {itemSelectedBg: '#e5faf6', itemSelectedColor: palette.primary},
        Table: {headerBg: '#f8faf9', headerColor: palette.ink, rowHoverBg: '#eefcf9'},
        Statistic: {contentFontSize: 28},
    },
}

const sections = [
    {path: '/overview', name: 'Overview', icon: <DashboardOutlined/>},
    {path: '/users', name: 'Users', icon: <TeamOutlined/>},
    {path: '/deliveries', name: 'Mail history', icon: <MailOutlined/>},
    {path: '/terms', name: 'Terms', icon: <CalendarOutlined/>},
    {path: '/dead-letters', name: 'Dead letters', icon: <WarningOutlined/>},
]

function StateTag({state}: {state: string}) {
    const normalized = state.toLowerCase()
    const color = normalized === 'open' || normalized === 'active' ? palette.open
        : normalized === 'waitlist' || normalized === 'upcoming' ? palette.waitlist
            : normalized === 'closed' ? palette.closed : palette.disabled
    return <Tag color={color} style={{color: palette.ink}}>{normalized.charAt(0).toUpperCase() + normalized.slice(1)}</Tag>
}

const subscriptionColumns: ProColumns<AdminSubscription>[] = [
    {title: 'Course', dataIndex: 'courseDisplayName'},
    {title: 'Section', dataIndex: 'sectionId'},
    {title: 'Term', dataIndex: 'termCode'},
    {title: 'State', key: 'state', render: (_, row) => <StateTag state={getSubscriptionState(row)}/>},
]

const userColumns: ProColumns<AdminUserSubscriptions>[] = [
    {title: 'Email', dataIndex: 'email', ellipsis: true},
    {title: 'Role', dataIndex: 'role', width: 90},
    {title: 'Enabled', key: 'enabled', width: 90, render: (_, row) => `${row.subscriptions.filter(item => item.enabled).length}/${row.subscriptions.length}`},
    ...(['open', 'waitlist', 'closed', 'disabled'] as const).map(state => ({
        title: <span style={{color: state === 'waitlist' ? '#a25f2c' : state === 'closed' ? '#ad4470' : state === 'disabled' ? '#3f8fdb' : '#39870d'}}>{state.charAt(0).toUpperCase() + state.slice(1)}</span>,
        key: state,
        width: 80,
        render: (_: unknown, row: AdminUserSubscriptions) => getUserSubscriptionCounts(row.subscriptions)[state],
    })),
]

const statColumns: ProColumns<MailDailyStat>[] = [
    {title: 'Date', dataIndex: 'statsDate', width: 110, sorter: (a, b) => a.statsDate.localeCompare(b.statsDate)},
    {title: 'Total', dataIndex: 'sentTotal', width: 80},
    {title: 'Open', dataIndex: 'sentOpen', width: 80},
    {title: 'Waitlist', dataIndex: 'sentWaitlist', width: 90},
    {title: 'Welcome', dataIndex: 'sentWelcome', width: 90},
    {title: 'Failed', dataIndex: 'deadTotal', width: 80},
]

const deliveryColumns: ProColumns<AlertDeliveryLog>[] = [
    {title: 'Course', dataIndex: 'courseDisplayName', width: 160},
    {title: 'Type', dataIndex: 'alertType', width: 110, render: (_, row) => <StateTag state={row.alertType}/>},
    {title: 'Recipient', dataIndex: 'recipientEmail', ellipsis: true, width: 220},
    {title: 'Sent', dataIndex: 'sentAt', width: 180, render: (_, row) => formatDateTime(row.sentAt)},
    {title: 'Test', dataIndex: 'manualTest', width: 70, render: (_, row) => row.manualTest ? 'Yes' : '—'},
]

const termColumns: ProColumns<AcademicTerm>[] = [
    {title: 'Term', dataIndex: 'label'},
    {title: 'Code', dataIndex: 'code'},
    {title: 'Status', dataIndex: 'status', filters: true, onFilter: true,
        valueEnum: {ACTIVE: 'Active', UPCOMING: 'Upcoming', EXPIRED: 'Expired'},
        render: (_, row) => <StateTag state={row.status}/>},
]

const deadColumns: ProColumns<AlertDeadLetter>[] = [
    {title: 'Course', dataIndex: 'courseDisplayName', width: 150},
    {title: 'Recipient', dataIndex: 'recipientEmail', width: 220, ellipsis: true},
    {title: 'Reason', dataIndex: 'deadLetterReason', width: 240, ellipsis: true},
    {title: 'Failed', dataIndex: 'failedAt', width: 180,
        render: (_, row) => row.failedAt ? formatDateTime(row.failedAt) : '—'},
]

function OverviewPanels({data, loading}: {data: Overview | null; loading: boolean}) {
    if (!data) {
        return <ProCard bordered><Skeleton active paragraph={{rows: 8}}/></ProCard>
    }

    const {summary, snapshot} = data
    const stats = [...data.stats].sort((a, b) => a.statsDate.localeCompare(b.statsDate)).slice(-14)
    const metrics = [
        {title: 'Users', value: summary.totalUsers},
        {title: 'Subscriptions', value: summary.totalSubscriptions},
        {title: 'Deliveries', value: summary.totalDeliveries},
        {title: 'Dead letters', value: summary.totalDeadLetters},
    ]

    return (
        <div className={styles.panels}>
            <ProCard gutter={[16, 16]} wrap ghost>
                {metrics.map(metric => (
                    <ProCard key={metric.title} colSpan={{xs: 12, lg: 6}} bordered>
                        <Statistic title={metric.title} value={metric.value}/>
                    </ProCard>
                ))}
            </ProCard>
            <ProCard gutter={[16, 16]} wrap ghost>
                <ProCard title="Daily emails" colSpan={{xs: 24, xl: 14}} bordered>
                    {stats.length === 0 ? <Empty description="No daily stats"/> : (
                        <div className={styles.chart} role="img" aria-label="Daily email delivery totals for the last fourteen recorded days">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{width: 440, height: 260}}>
                                <LineChart data={stats} margin={{top: 10, right: 8, left: -24, bottom: 0}}>
                                    <CartesianGrid stroke={palette.line} vertical={false}/>
                                    <XAxis dataKey="statsDate" tickFormatter={value => String(value).slice(5)} stroke={palette.muted} tickLine={false} axisLine={false}/>
                                    <YAxis stroke={palette.muted} tickLine={false} axisLine={false} allowDecimals={false}/>
                                    <Tooltip labelFormatter={label => String(label)}/>
                                    <Line name="Emails" type="linear" dataKey="sentTotal" stroke={palette.chart} strokeWidth={2.5} dot={false} isAnimationActive={false}/>
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </ProCard>
                <ProCard title="Scheduler" colSpan={{xs: 24, xl: 10}} bordered>
                    {snapshot ? (
                        <Descriptions column={2} items={[
                            {key: 'active', label: 'Active courses', children: snapshot.activeCourseCount},
                            {key: 'queue', label: 'Queue', children: snapshot.queueSize},
                            {key: 'due', label: 'Due', children: snapshot.dueCourseCount},
                            {key: 'interval', label: 'Fetch interval', children: `${snapshot.fetchIntervalMs} ms`},
                            {key: 'course', label: 'Last course', children: snapshot.lastFetchedCourseId},
                            {key: 'observed', label: 'Observed', children: formatSnapshotTime(snapshot.observedAt)},
                        ]}/>
                    ) : <Empty description="No scheduler snapshot"/>}
                </ProCard>
            </ProCard>
            <ProTable<MailDailyStat>
                headerTitle="Daily stats" rowKey="id" search={false} loading={loading}
                columns={statColumns} dataSource={[...data.stats].sort((a, b) => b.statsDate.localeCompare(a.statsDate))}
                options={{reload: false, density: true, setting: true}}
                pagination={{pageSize: 7, showSizeChanger: false}} scroll={{x: 600}}
            />
        </div>
    )
}

function FrameworkContent({mode, section, revision, onBusyChange}: {mode: Mode; section: string; revision: number; onBusyChange: (busy: boolean) => void}) {
    const [data, setData] = useState<Overview | null>(mode === 'demo' ? {summary: demoSummary, stats: demoStats, snapshot: demoSnapshot} : null)
    const [loading, setLoading] = useState(mode === 'live')
    const [error, setError] = useState('')
    const [authorized, setAuthorized] = useState(mode === 'demo')

    useEffect(() => {
        if (mode === 'demo') return
        let active = true
        async function load() {
            setLoading(true)
            onBusyChange(true)
            setError('')
            try {
                const summary = await fetchAdminSummary()
                if (!active) return
                setAuthorized(true)
                const [stats, snapshot] = await Promise.allSettled([fetchAdminMailStats(), fetchAdminSchedulerStatus()])
                if (!active) return
                setData({summary, stats: stats.status === 'fulfilled' ? stats.value : [], snapshot: snapshot.status === 'fulfilled' ? snapshot.value : null})
                if (stats.status === 'rejected' || snapshot.status === 'rejected') {
                    setError('Some data could not be loaded. Refresh to retry.')
                }
            } catch (error) {
                if (active) {
                    setAuthorized(false)
                    setData(null)
                    setError(getErrorMessage(error, 'Admin data could not be loaded.'))
                }
            } finally {
                if (active) {
                    setLoading(false)
                    onBusyChange(false)
                }
            }
        }
        void load()
        return () => { active = false }
    }, [mode, revision, onBusyChange])

    const tableProps = {
        search: false as const,
        options: {reload: true, density: true, setting: true},
        onRequestError: (error: Error) => setError(getErrorMessage(error, 'Data could not be loaded.')),
    }

    if (!authorized) {
        return loading ? <ProCard bordered><Skeleton active paragraph={{rows: 8}}/></ProCard>
            : <Result status="403" title="Admin access required" subTitle={error}/>
    }

    return (
        <>
            {error ? <Alert className={styles.error} type="error" showIcon message={error} closable onClose={() => setError('')}/> : null}
            {section === '/overview' ? <OverviewPanels data={data} loading={loading}/> : null}
            {section === '/users' ? (
                <ProTable<AdminUserSubscriptions>
                    {...tableProps} key={`users-${revision}`} rowKey="userId" columns={userColumns} scroll={{x: 700}}
                    pagination={{pageSize: 20, showSizeChanger: false}}
                    request={async ({current = 1}) => {
                        const result = mode === 'demo' ? demoPage(demoUsers, current, 20) : await fetchAdminSubscriptions(current)
                        return {data: result.items, total: result.totalItems, success: true}
                    }}
                    expandable={{expandedRowRender: row => (
                        <ProTable<AdminSubscription> rowKey="subscriptionId" columns={subscriptionColumns}
                            dataSource={row.subscriptions} search={false} options={false} pagination={false}
                            toolBarRender={false} size="small" scroll={{x: 500}}/>
                    )}}
                />
            ) : null}
            {section === '/deliveries' ? (
                <ProTable<AlertDeliveryLog>
                    {...tableProps} key={`deliveries-${revision}`} rowKey="id" columns={deliveryColumns} scroll={{x: 780}}
                    pagination={{pageSize: 3, showSizeChanger: false}}
                    request={async ({current = 1}) => {
                        const result = mode === 'demo' ? demoPage(demoDeliveries, current, 3) : await fetchAdminMailDeliveries(current)
                        return {data: result.items, total: result.totalItems, success: true}
                    }}/>
            ) : null}
            {section === '/terms' ? (
                <ProTable<AcademicTerm> {...tableProps} key={`terms-${revision}`} rowKey="code" columns={termColumns}
                    pagination={false} request={async () => ({data: mode === 'demo' ? demoTerms : await fetchAdminTerms(), success: true})}/>
            ) : null}
            {section === '/dead-letters' ? (
                <ProTable<AlertDeadLetter> {...tableProps} key={`dead-${revision}`}
                    rowKey={row => String(row.id ?? row.eventId ?? `${row.recipientEmail}-${row.failedAt}`)}
                    columns={deadColumns} scroll={{x: 790}} pagination={{pageSize: 10, showSizeChanger: false}}
                    request={async () => ({data: mode === 'demo' ? demoDeadLetters : await fetchAdminDeadLetters(), success: true})}/>
            ) : null}
        </>
    )
}

export function AdminFrameworkPage() {
    const {ready, isLoggedIn} = useAuth()
    const [mode, setMode] = useState<Mode>('demo')
    const [section, setSection] = useState('/overview')
    const [revision, setRevision] = useState(0)
    const [busy, setBusy] = useState(false)
    const [collapsed, setCollapsed] = useState<boolean>()

    return (
        <ConfigProvider locale={enUS} theme={theme}>
            <div className={styles.root}>
                <ProLayout
                    title={false} logo={false} headerRender={(props, header) => props.isMobile ? header : null} menuHeaderRender={false}
                    layout="side" siderWidth={176} fixSiderbar={false} fixedHeader={false}
                    collapsed={collapsed} onCollapse={setCollapsed}
                    locale="en-US" pageTitleRender={false} breadcrumbRender={false} footerRender={false}
                    route={{routes: sections}} location={{pathname: section}} contentStyle={{padding: 0}}
                    token={{sider: {colorMenuBackground: '#ffffff', colorTextMenu: palette.muted, colorTextMenuSelected: palette.primary, colorBgMenuItemSelected: '#e5faf6'}}}
                    menuItemRender={(_, dom) => dom}
                    menuProps={{onClick: ({key}) => {
                        setSection(key)
                        if (window.matchMedia('(max-width: 767px)').matches) setCollapsed(true)
                    }}}
                    menuFooterRender={() => <Button type="text" href="/admin" icon={<ArrowLeftOutlined/>}>Original dashboard</Button>}
                >
                    <PageContainer title={sections.find(item => item.path === section)?.name} breadcrumb={{items: []}}
                        extra={<Space wrap size={8}>
                            <Segmented key="mode" aria-label="Data source" value={mode} options={[{label: 'Demo', value: 'demo'}, {label: 'Live data', value: 'live'}]}
                                onChange={value => { setMode(value as Mode); setRevision(0); setBusy(false) }}/>
                            <Tag key="read-only">Read only</Tag>
                            <Button key="refresh" loading={busy} icon={<ReloadOutlined/>} onClick={() => setRevision(value => value + 1)}>Refresh</Button>
                        </Space>}
                    >
                        {mode === 'live' && !ready ? <Skeleton active/> : mode === 'live' && !isLoggedIn ? (
                            <Result status="403" title="Admin login required" extra={<Button type="primary" href="/monitor">Sign in</Button>}/>
                        ) : <FrameworkContent key={mode} mode={mode} section={section} revision={revision} onBusyChange={setBusy}/>}
                    </PageContainer>
                </ProLayout>
            </div>
        </ConfigProvider>
    )
}
