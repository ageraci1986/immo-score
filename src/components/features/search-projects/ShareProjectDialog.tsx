'use client';

import { useEffect, useState, useCallback } from 'react';
import { Share2, X, UserPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SharedUser {
  id: string;
  sharedWithUser: {
    id: string;
    email: string;
    name: string | null;
  };
}

interface AvailableUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface ShareProjectDialogProps {
  readonly projectId: string;
  readonly projectName: string;
}

export function ShareProjectDialog({ projectId, projectName }: ShareProjectDialogProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [shares, setShares] = useState<SharedUser[]>([]);
  const [users, setUsers] = useState<AvailableUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sharesRes, usersRes] = await Promise.all([
        fetch(`/api/search-projects/${projectId}/share`),
        fetch('/api/admin/users'),
      ]);
      if (sharesRes.ok) {
        const sharesJson = await sharesRes.json();
        setShares(sharesJson.data ?? []);
      }
      if (usersRes.ok) {
        const usersJson = await usersRes.json();
        setUsers(usersJson.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  const sharedUserIds = new Set(shares.map((s) => s.sharedWithUser.id));
  const availableUsers = users.filter((u) => !sharedUserIds.has(u.id) && u.role !== 'admin');

  const handleAdd = async (): Promise<void> => {
    if (!selectedUserId) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/search-projects/${projectId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId }),
      });
      if (res.ok) {
        setSelectedUserId('');
        fetchData();
      }
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (userId: string): Promise<void> => {
    await fetch(`/api/search-projects/${projectId}/share`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    fetchData();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-1" />
          Partager
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Partager &laquo; {projectName} &raquo;</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Add user */}
            {availableUsers.length > 0 && (
              <div className="flex gap-2">
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Sélectionner un utilisateur" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAdd} disabled={adding || !selectedUserId} size="sm">
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Current shares */}
            {shares.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Partagé avec
                </p>
                {shares.map((share) => (
                  <div
                    key={share.sharedWithUser.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {share.sharedWithUser.name || share.sharedWithUser.email}
                      </p>
                      <p className="text-xs text-slate-500">{share.sharedWithUser.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(share.sharedWithUser.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-slate-500">
                Ce projet n&apos;est partagé avec personne
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
