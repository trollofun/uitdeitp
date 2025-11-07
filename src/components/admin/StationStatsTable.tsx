'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';

interface StationStats {
  id: string;
  name: string;
  count: number;
}

interface StationStatsTableProps {
  data: StationStats[];
}

export function StationStatsTable({ data }: StationStatsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Station Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Station Name</TableHead>
                <TableHead className="text-right">Total Reminders</TableHead>
                <TableHead className="text-right">Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((station) => {
                const total = data.reduce((sum, s) => sum + s.count, 0);
                const percentage = total > 0 ? ((station.count / total) * 100).toFixed(1) : '0.0';

                return (
                  <TableRow key={station.id}>
                    <TableCell className="font-medium">{station.name}</TableCell>
                    <TableCell className="text-right">{station.count}</TableCell>
                    <TableCell className="text-right">
                      <span className="text-muted-foreground">{percentage}%</span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            No station data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
