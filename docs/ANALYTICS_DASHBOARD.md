# Analytics Dashboard Implementation

## Overview
Complete analytics dashboard for UITDEITP application with KPI cards, charts, and CSV export functionality.

## Files Created

### Main Dashboard Page
- **Path:** `/src/app/(admin)/analytics/page.tsx`
- **Purpose:** Main analytics dashboard with all metrics and visualizations
- **Features:**
  - Server-side rendering for optimal performance
  - Real-time data fetching from Supabase
  - Export to CSV functionality
  - Responsive grid layout

### API Endpoints

#### 1. Analytics Stats API
- **Path:** `/src/app/api/analytics/stats/route.ts`
- **Method:** GET
- **Response:**
```typescript
{
  kpis: {
    totalReminders: number,
    smsSent: number,
    deliveryRate: string,
    activeStations: number
  },
  deliveryBreakdown: {
    delivered: number,
    failed: number,
    pending: number
  },
  timeSeriesData: Array<{date: string, count: number}>,
  stationStats: Array<{id: string, name: string, count: number}>
}
```

#### 2. CSV Export API
- **Path:** `/src/app/api/analytics/export/route.ts`
- **Method:** GET
- **Response:** CSV file download with all reminder data
- **Columns:** Plate Number, Type, Expiry Date, Phone, Guest Name, Station, Source, Created At, Status

### Reusable Components

#### 1. KPICard Component
- **Path:** `/src/components/admin/KPICard.tsx`
- **Props:**
  - `title`: Card title
  - `value`: Main metric value
  - `description`: Optional description
  - `icon`: Optional Lucide icon
  - `trend`: Optional trend indicator

#### 2. RemindersChart Component
- **Path:** `/src/components/admin/RemindersChart.tsx`
- **Type:** Line chart showing reminders over last 30 days
- **Library:** Recharts
- **Features:**
  - Responsive design
  - Date formatting
  - Tooltips and legends
  - Custom styling

#### 3. DeliveryPieChart Component
- **Path:** `/src/components/admin/DeliveryPieChart.tsx`
- **Type:** Pie chart for SMS delivery status breakdown
- **Categories:**
  - Delivered (green)
  - Failed (red)
  - Pending (amber)
- **Features:**
  - Percentage labels
  - Color-coded segments
  - Summary statistics below chart

#### 4. StationStatsTable Component
- **Path:** `/src/components/admin/StationStatsTable.tsx`
- **Features:**
  - Sortable station data
  - Total reminders per station
  - Percentage calculations
  - Responsive table layout

## Dashboard Layout

### Top Row - KPI Cards (4 cards)
1. **Total Reminders**
   - Count of active reminders (deleted_at IS NULL)
   - Icon: Bell

2. **SMS Sent**
   - Total SMS notifications sent
   - Icon: Send

3. **Delivery Rate**
   - Percentage of successfully delivered SMS
   - Icon: TrendingUp

4. **Active Stations**
   - Number of active police stations
   - Icon: Building2

### Middle Row - Time Series Chart
- **Title:** "Reminders Over Time (Last 30 Days)"
- **Chart Type:** Line chart
- **Data:** Daily reminder creation counts
- **X-Axis:** Dates (formatted as "Mon DD")
- **Y-Axis:** Count

### Bottom Row - Two Columns
1. **Left Column - SMS Delivery Status**
   - Pie chart with delivery breakdown
   - Summary statistics below

2. **Right Column - Station Activity**
   - Table with station names
   - Total reminders per station
   - Percentage of total

## Data Queries

### Total Reminders
```sql
SELECT COUNT(*) FROM reminders WHERE deleted_at IS NULL
```

### SMS Sent
```sql
SELECT COUNT(*) FROM notification_log WHERE channel = 'sms'
```

### Delivery Stats
```sql
SELECT status, COUNT(*)
FROM notification_log
WHERE channel = 'sms'
GROUP BY status
```

### Active Stations
```sql
SELECT COUNT(*) FROM police_stations WHERE is_active = true
```

### Daily Reminders (Last 30 Days)
```sql
SELECT DATE(created_at) as date, COUNT(*) as count
FROM reminders
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date ASC
```

### Station Statistics
```sql
SELECT
  ps.id,
  ps.station_name,
  COUNT(r.id) as total_reminders
FROM police_stations ps
LEFT JOIN reminders r ON r.police_station_id = ps.id
WHERE r.deleted_at IS NULL
GROUP BY ps.id, ps.station_name
ORDER BY total_reminders DESC
```

## Dependencies Added

### recharts
```bash
npm install recharts
```
- Used for LineChart and PieChart components
- Responsive and customizable
- Accessibility support

### json2csv
```bash
npm install json2csv @types/json2csv
```
- CSV export functionality
- Type definitions included

## Usage

### Accessing the Dashboard
Navigate to `/analytics` in the admin section (requires authentication).

### Exporting Data
Click the "Export CSV" button in the top-right corner to download all reminder data.

### Real-time Updates
The dashboard fetches fresh data on each page load (cache: 'no-store').

## Styling

### Color Scheme
- **Primary:** Blue (#8884d8) - Line chart
- **Success:** Green (#10b981) - Delivered SMS
- **Error:** Red (#ef4444) - Failed SMS
- **Warning:** Amber (#f59e0b) - Pending SMS

### Responsive Breakpoints
- Mobile: 1 column
- Tablet (md): 2 columns
- Desktop (lg): 4 columns for KPIs

## Performance Considerations

1. **Server-Side Rendering**
   - Data fetched on server
   - Faster initial page load
   - Better SEO

2. **Efficient Queries**
   - Use count queries where possible
   - Limit data to last 30 days for time series
   - Index on created_at, deleted_at fields

3. **CSV Generation**
   - Generated on-demand
   - Streamed response
   - No temporary file storage

## Security

1. **Authentication Required**
   - Dashboard protected by admin layout
   - Uses Supabase authentication

2. **Data Access**
   - Server-side Supabase client
   - RLS policies enforced
   - No client-side exposure

## Future Enhancements

1. **Date Range Selector**
   - Allow users to select custom date ranges
   - Update charts dynamically

2. **Real-time Updates**
   - WebSocket integration
   - Live chart updates

3. **More Metrics**
   - Average response time
   - Peak usage hours
   - SMS cost tracking

4. **Filters**
   - Filter by station
   - Filter by reminder type
   - Filter by status

5. **Export Options**
   - Excel format
   - PDF reports
   - Scheduled exports

## Troubleshooting

### Issue: Charts not displaying
**Solution:** Ensure recharts is installed and components are client-side ('use client' directive)

### Issue: No data in dashboard
**Solution:** Check Supabase connection and verify data exists in tables

### Issue: CSV export fails
**Solution:** Verify API route is accessible and Supabase client has proper permissions

### Issue: Build errors with Button component
**Solution:** Use capital 'B' import: `import { Button } from '@/components/ui/Button'`

## Testing Checklist

- [ ] KPI cards display correct values
- [ ] Line chart shows last 30 days of data
- [ ] Pie chart percentages add up to 100%
- [ ] Station table sorts correctly
- [ ] CSV export downloads successfully
- [ ] Responsive design works on mobile
- [ ] Loading states display properly
- [ ] Error states handled gracefully
- [ ] Authentication required
- [ ] Data updates on page refresh

## Maintainance

### Regular Tasks
1. Monitor API performance
2. Check for database query optimization
3. Update chart styling as needed
4. Review and update documentation

### When Adding New Metrics
1. Update API stats route
2. Create new component if needed
3. Add to dashboard layout
4. Update TypeScript types
5. Test thoroughly
6. Update documentation
