'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Shield, User as UserIcon, Mail, Phone, MapPin } from 'lucide-react';
import { EditUserDialog } from './EditUserDialog';

interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  city?: string;
  country?: string;
  role: 'admin' | 'station_manager' | 'user';
  active: boolean;
  created_at: string;
  reminders_count: number;
}

interface UsersTableProps {
  users: User[];
  currentUserId: string;
}

export function UsersTable({ users, currentUserId }: UsersTableProps) {
  const router = useRouter();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const handleDelete = async (userId: string) => {
    if (userId === currentUserId) {
      alert('Nu îți poți șterge propriul cont!');
      return;
    }

    if (!confirm('Sigur vrei să dezactivezi acest utilizator? Toate reminder-ele vor fi păstrate.')) {
      return;
    }

    setLoading(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Eroare la dezactivare utilizator');
        return;
      }

      router.refresh();
    } catch (error) {
      console.error('Delete user error:', error);
      alert('Eroare la dezactivare utilizator');
    } finally {
      setLoading(null);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300';
      case 'station_manager':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4" />;
      case 'station_manager':
        return <MapPin className="w-4 h-4" />;
      default:
        return <UserIcon className="w-4 h-4" />;
    }
  };

  if (users.length === 0) {
    return (
      <div className="p-12 text-center">
        <UserIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
        <p className="text-muted-foreground">Nu există utilizatori</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-4 font-semibold text-sm">Utilizator</th>
              <th className="text-left p-4 font-semibold text-sm">Contact</th>
              <th className="text-left p-4 font-semibold text-sm">Rol</th>
              <th className="text-left p-4 font-semibold text-sm">Reminder-e</th>
              <th className="text-left p-4 font-semibold text-sm">Status</th>
              <th className="text-left p-4 font-semibold text-sm">Înregistrat</th>
              <th className="text-right p-4 font-semibold text-sm">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t hover:bg-muted/20">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getRoleBadgeColor(user.role)}`}>
                      {getRoleIcon(user.role)}
                    </div>
                    <div>
                      <p className="font-medium">{user.full_name || 'N/A'}</p>
                      {user.id === currentUserId && (
                        <span className="text-xs text-primary font-medium">(Tu)</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-3 h-3 text-muted-foreground" />
                      <span className="text-muted-foreground">{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">{user.phone}</span>
                      </div>
                    )}
                    {user.city && user.country && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {user.city}, {user.country}
                        </span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="p-4">
                  <span className="font-medium">{user.reminders_count}</span>
                  <span className="text-xs text-muted-foreground ml-1">active</span>
                </td>
                <td className="p-4">
                  <span
                    className={`px-3 py-1 text-xs font-medium rounded-full ${
                      user.active
                        ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {user.active ? 'Activ' : 'Inactiv'}
                  </span>
                </td>
                <td className="p-4 text-sm text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString('ro-RO')}
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingUser(user)}
                      disabled={loading === user.id}
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Editează
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(user.id)}
                      disabled={loading === user.id || user.id === currentUserId || !user.active}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {loading === user.id ? 'Se procesează...' : 'Dezactivează'}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <EditUserDialog
          user={editingUser}
          open={!!editingUser}
          onClose={() => setEditingUser(null)}
          onUpdate={() => {
            router.refresh();
            setEditingUser(null);
          }}
          currentUserId={currentUserId}
        />
      )}
    </>
  );
}
