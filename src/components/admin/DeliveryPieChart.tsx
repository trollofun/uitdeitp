'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';

interface DeliveryBreakdown {
  delivered: number;
  failed: number;
  pending: number;
}

interface DeliveryPieChartProps {
  data: DeliveryBreakdown;
}

const COLORS = {
  delivered: '#10b981', // green
  failed: '#ef4444',    // red
  pending: '#f59e0b',   // amber
};

export function DeliveryPieChart({ data }: DeliveryPieChartProps) {
  const chartData = [
    { name: 'Delivered', value: data.delivered, color: COLORS.delivered },
    { name: 'Failed', value: data.failed, color: COLORS.failed },
    { name: 'Pending', value: data.pending, color: COLORS.pending },
  ].filter(item => item.value > 0);

  const total = data.delivered + data.failed + data.pending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>SMS Delivery Status</CardTitle>
      </CardHeader>
      <CardContent>
        {total > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={((props: any) => {
                    const { name, percent } = props;
                    return `${name}: ${(percent * 100).toFixed(0)}%`;
                  }) as any}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <p className="text-muted-foreground">Delivered</p>
                <p className="text-lg font-bold text-green-600">{data.delivered}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Failed</p>
                <p className="text-lg font-bold text-red-600">{data.failed}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Pending</p>
                <p className="text-lg font-bold text-amber-600">{data.pending}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No SMS data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
