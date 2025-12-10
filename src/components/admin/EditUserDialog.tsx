'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  city?: string;
  country?: string;
  role: 'admin' | 'station_manager' | 'user';
  active: boolean;
}

interface EditUserDialogProps {
  user: User;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
  currentUserId: string;
}

export function EditUserDialog({ user, open, onClose, onUpdate, currentUserId }: EditUserDialogProps) {
  const [formData, setFormData] = useState({
    full_name: user.full_name || '',
    phone: user.phone || '',
    city: user.city || '',
    country: user.country || '',
    role: user.role,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setFormData({
        full_name: user.full_name || '',
        phone: user.phone || '',
        city: user.city || '',
        country: user.country || '',
        role: user.role,
      });
      setError('');
    }
  }, [open, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Eroare la actualizare utilizator');
        setLoading(false);
        return;
      }

      onUpdate();
    } catch (error) {
      console.error('Update user error:', error);
      setError('Eroare la actualizare utilizator');
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg">Editează Utilizator</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="text"
              value={user.email}
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Email-ul nu poate fi modificat
            </p>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Nume Complet</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ex: Ion Popescu"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium mb-1">Telefon</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ex: 0712345678"
            />
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium mb-1">Oraș</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ex: București"
            />
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium mb-1">Țară</label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ex: România"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium mb-1">Rol</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              disabled={user.id === currentUserId}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:cursor-not-allowed"
            >
              <option value="user">User (Utilizator standard)</option>
              <option value="station_manager">Station Manager (Manager stație)</option>
              <option value="admin">Admin (Administrator)</option>
            </select>
            {user.id === currentUserId && (
              <p className="text-xs text-muted-foreground mt-1">
                Nu îți poți modifica propriul rol
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Se salvează...' : 'Salvează'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Anulează
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
