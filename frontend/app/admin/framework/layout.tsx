import type {ReactNode} from 'react'
import {AntdRegistry} from '@ant-design/nextjs-registry'

export default function FrameworkLayout({children}: {children: ReactNode}) {
    return <AntdRegistry>{children}</AntdRegistry>
}
