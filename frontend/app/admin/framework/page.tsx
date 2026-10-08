import type {Metadata} from 'next'
import {AdminFrameworkPage} from '@/components/admin/framework/admin-framework-page'

export const metadata: Metadata = {
    title: 'Admin Preview | MadEnroll',
}

export default function AdminFrameworkPreview() {
    return <AdminFrameworkPage/>
}
