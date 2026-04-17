# Add Report Page

Creates a new report page in Admin with date-range filter, data table, and CSV export. Adds the API endpoint and wires up the menu.

**Usage:** `/add-report <ReportName> [description of what it reports and key filters]`

Examples:
- `/add-report Payments payments by event and date range with status breakdown`
- `/add-report ResourceUsage resource utilization per event with totals`

---

## Reference

Existing report: `apps/admin/src/pages/reports/OrdersReportPage.tsx`

Read it before starting to stay aligned with the current pattern.

---

## Step-by-step

### 1. API Endpoint — `apps/api/src/controllers/reports.controller.ts` (or create new file)

If `reports.controller.ts` doesn't exist, create it. Otherwise append to it.

Pattern:
```ts
export async function get<ReportName>Report(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId } = req.user!
    const { startDate, endDate, eventId } = req.query as Record<string, string>

    // Build where clause — always filter by tenantId
    const where: any = { tenantId }
    if (startDate) where.createdAt = { ...where.createdAt, gte: new Date(startDate) }
    if (endDate)   where.createdAt = { ...where.createdAt, lte: new Date(endDate) }
    if (eventId)   where.eventId = eventId

    const data = await prisma.<model>.findMany({
      where,
      include: { /* relevant relations */ },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ success: true, data })
  } catch (err) { next(err) }
}
```

### 2. Route — `apps/api/src/routes/reports.routes.ts` (create if missing) or add to existing

```ts
import { Router } from 'express'
import { requirePrivilege } from '../middleware/authorize'
import { PRIVILEGES } from '@iventia/shared'
import { get<ReportName>Report } from '../controllers/reports.controller'

const router = Router()
router.get('/<report-name>', requirePrivilege(PRIVILEGES.REPORT_<REPORTNAME>), get<ReportName>Report)
export default router
```

Register in `apps/api/src/routes/index.ts`:
```ts
router.use('/reports', reportsRouter)
```

### 3. Privilege — `packages/shared/src/privileges.ts`

```ts
REPORT_<REPORTNAME>: 'report:<reportname>',
```
Add to ADMIN role list.

### 4. Admin API Client — `apps/admin/src/api/reports.ts` (create or append)

```ts
import { apiClient } from './client'
export const reportsApi = {
  // existing entries...
  <reportName>: (params: { startDate?: string; endDate?: string; eventId?: string }) =>
    apiClient.get('/reports/<report-name>', { params }).then(r => r.data.data),
}
```

### 5. Report Page — `apps/admin/src/pages/reports/<ReportName>ReportPage.tsx`

```tsx
import { useState } from 'react'
import { Card, Table, Space, Button, DatePicker, Select, Typography } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import dayjs, { Dayjs } from 'dayjs'
import { reportsApi } from '../../../api/reports'

const { RangePicker } = DatePicker
const { Text } = Typography

export default function <ReportName>ReportPage() {
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [eventId, setEventId] = useState<string | undefined>()

  const params = {
    startDate: range?.[0].startOf('day').toISOString(),
    endDate:   range?.[1].endOf('day').toISOString(),
    eventId,
  }

  const { data = [], isLoading } = useQuery({
    queryKey: ['report-<reportName>', params],
    queryFn: () => reportsApi.<reportName>(params),
    enabled: !!range,
  })

  // CSV export
  const exportCsv = () => {
    if (!data.length) return
    const headers = Object.keys(data[0]).join(',')
    const rows = data.map((r: any) => Object.values(r).join(','))
    const blob = new Blob([[headers, ...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '<report-name>-report.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const columns = [
    // define columns matching the data shape
  ]

  // Summary stats (totals, counts, etc.)
  const total = data.length

  return (
    <Card
      title="Reporte: <ReportName>"
      extra={
        <Space>
          <RangePicker onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)} />
          {/* optional event selector */}
          <Button icon={<DownloadOutlined />} onClick={exportCsv} disabled={!data.length}>
            Exportar CSV
          </Button>
        </Space>
      }
    >
      {/* Summary row */}
      {data.length > 0 && (
        <Space style={{ marginBottom: 16 }}>
          <Text type="secondary">Total registros: <strong>{total}</strong></Text>
          {/* add totals/sums as needed */}
        </Space>
      )}

      <Table
        dataSource={data}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 50 }}
        size="small"
      />
    </Card>
  )
}
```

### 6. Router — `apps/admin/src/router/index.tsx`

```tsx
import <ReportName>ReportPage from '../pages/reports/<ReportName>ReportPage'
// ...
<Route path="reportes/<report-name>" element={<ReportName>ReportPage />} />
```

### 7. Menu — `apps/admin/src/layouts/MainLayout.tsx`

Add as a top-level item or inside a Reportes submenu:
```ts
{ key: '/reportes/<report-name>', icon: <BarChartOutlined />, label: '<ReportName>', show: hp(PRIVILEGES.REPORT_<REPORTNAME>) },
```

---

## Checklist

- [ ] API endpoint created with tenantId filter + date range + optional filters
- [ ] Route registered
- [ ] Privilege added to shared package and ADMIN role
- [ ] Admin API client method added
- [ ] Report page created with RangePicker filter + Table + CSV export
- [ ] Route added to router
- [ ] Menu item added
- [ ] Offer to run `/deploy` when done
