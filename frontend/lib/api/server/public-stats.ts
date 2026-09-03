import 'server-only'

import {backendRequest} from '@/lib/api/server/http'
import type {MailAlertTotal} from '@/lib/public-stats/types'

export async function backendFetchMailAlertTotal() {
    return backendRequest<MailAlertTotal>(
        '/api/public/stats/mail-alerts/total',
        {method: 'GET'},
    )
}
