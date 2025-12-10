'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MoreHorizontal, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';

interface Station {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  station_phone: string | null;
  station_address: string | null;
  is_active: boolean;
  created_at: string;
  reminder_count: number;
}

interface StationsTableProps {
  stations: Station[];
}

export function StationsTable({ stations }: StationsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter stations by search term
  const filteredStations = stations.filter((station) =>
    station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    station.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Caută după nume sau slug..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Logo</TableHead>
              <TableHead>Nume</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-right">Reminder-uri</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'Nu s-au găsit stații' : 'Nu există stații'}
                </TableCell>
              </TableRow>
            ) : (
              filteredStations.map((station) => (
                <TableRow key={station.id}>
                  <TableCell>
                    <div
                      className="h-12 w-12 rounded-lg flex items-center justify-center overflow-hidden"
                      style={{ backgroundColor: station.primary_color }}
                    >
                      {station.logo_url ? (
                        <Image
                          src={station.logo_url}
                          alt={station.name}
                          width={48}
                          height={48}
                          className="object-contain"
                        />
                      ) : (
                        <span className="text-white text-lg font-bold">
                          {station.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{station.name}</TableCell>
                  <TableCell>
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {station.slug}
                    </code>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-medium">{station.reminder_count}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={station.is_active ? 'default' : 'secondary'}>
                      {station.is_active ? 'Activ' : 'Inactiv'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/kiosk/${station.slug}`} target="_blank">
                        <Button variant="ghost" size="icon" title="Vizualizare kiosk">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/admin/stations/${station.id}`}>
                        <Button variant="ghost" size="icon" title="Editează">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
