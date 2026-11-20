import {Suspense} from 'react'
import {AdminDashboardPage} from '@/components/admin/admin-dashboard-page'

export default function AdminPage() {
    // The dashboard reads its tab from the URL, which needs a Suspense boundary on a static page.
    return (
        <Suspense>
            <AdminDashboardPage/>
        </Suspense>
    )
}
