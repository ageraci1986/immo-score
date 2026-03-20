'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users, UserPlus, Shield, Pencil, Trash2 } from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { UserRole } from '@/lib/permissions';

interface UserItem {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
}

const ROLE_CONFIG: Record<UserRole, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; className: string }> = {
  admin: { label: 'Administrateur', variant: 'default', className: 'bg-purple-100 text-purple-800 hover:bg-purple-100' },
  advanced: { label: 'Avancé', variant: 'default', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
  user_basic: { label: 'Utilisateur', variant: 'default', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
  viewer: { label: 'Lecteur', variant: 'default', className: 'bg-slate-100 text-slate-600 hover:bg-slate-100' },
};

function RoleBadge({ role }: { role: string }): JSX.Element {
  const config = ROLE_CONFIG[role as UserRole] ?? ROLE_CONFIG.user_basic;
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}

export default function AdminUsersPage(): JSX.Element {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('user_basic');

  // Edit dialog
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('user_basic');
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteUser, setDeleteUser] = useState<UserItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.status === 403) {
        setError('Accès refusé. Seuls les administrateurs peuvent gérer les utilisateurs.');
        return;
      }
      if (!res.ok) throw new Error('Erreur lors du chargement');
      const json = await res.json();
      setUsers(json.data ?? []);
    } catch {
      setError('Impossible de charger les utilisateurs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleInvite = async (): Promise<void> => {
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(false);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, name: inviteName, role: inviteRole }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? 'Erreur');
      }
      setInviteSuccess(true);
      setInviteName('');
      setInviteEmail('');
      setInviteRole('user_basic');
      fetchUsers();
      setTimeout(() => {
        setInviteOpen(false);
        setInviteSuccess(false);
      }, 1500);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setInviting(false);
    }
  };

  const openEdit = (user: UserItem): void => {
    setEditUser(user);
    setEditName(user.name || '');
    setEditEmail(user.email);
    setEditRole(user.role as UserRole);
  };

  const handleSaveEdit = async (): Promise<void> => {
    if (!editUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, email: editEmail, role: editRole }),
      });
      if (!res.ok) throw new Error('Erreur');
      setEditUser(null);
      fetchUsers();
    } catch {
      // keep dialog open on error
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteUser.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? 'Erreur');
      }
      setDeleteUser(null);
      fetchUsers();
    } catch {
      // keep dialog open on error
    } finally {
      setDeleting(false);
    }
  };

  const content = (): JSX.Element => {
    if (loading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      );
    }

    return (
      <>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Gestion des utilisateurs</h1>
              <p className="text-sm text-slate-500">{users.length} utilisateur{users.length > 1 ? 's' : ''}</p>
            </div>
          </div>

          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="w-4 h-4" />
                Inviter un utilisateur
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Inviter un utilisateur</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label htmlFor="invite-name">Nom complet</Label>
                  <Input
                    id="invite-name"
                    placeholder="Jean Dupont"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="jean@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Rôle</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as UserRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="advanced">Avancé — Accès complet sauf admin</SelectItem>
                      <SelectItem value="user_basic">Utilisateur — Analyse par lien uniquement</SelectItem>
                      <SelectItem value="viewer">Lecteur — Consultation des projets partagés</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {inviteError && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{inviteError}</div>
                )}
                {inviteSuccess && (
                  <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                    Invitation envoyée avec succès !
                  </div>
                )}

                <Button
                  onClick={handleInvite}
                  disabled={inviting || !inviteName || !inviteEmail}
                  className="w-full"
                >
                  {inviting ? 'Envoi...' : "Envoyer l'invitation"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Permissions legend */}
        <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-medium text-slate-700">Niveaux de permission</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
            <div><RoleBadge role="admin" /> Accès complet + gestion utilisateurs</div>
            <div><RoleBadge role="advanced" /> Accès complet sauf admin et prompts</div>
            <div><RoleBadge role="user_basic" /> Analyse par lien uniquement</div>
            <div><RoleBadge role="viewer" /> Lecture des projets partagés uniquement</div>
          </div>
        </div>

        {/* Users list */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-[1fr_1.5fr_130px_100px_80px] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500 uppercase tracking-wider">
            <span>Nom</span>
            <span>Email</span>
            <span>Rôle</span>
            <span>Inscrit le</span>
            <span className="text-right">Actions</span>
          </div>
          {users.map((user) => (
            <div
              key={user.id}
              className="grid grid-cols-[1fr_1.5fr_130px_100px_80px] gap-4 px-6 py-4 border-b border-slate-100 last:border-b-0 items-center hover:bg-slate-50 transition-colors"
            >
              <span className="text-sm font-medium text-slate-900 truncate">
                {user.name || '—'}
              </span>
              <span className="text-sm text-slate-600 truncate">{user.email}</span>
              <div>
                <RoleBadge role={user.role} />
              </div>
              <span className="text-xs text-slate-400">
                {new Date(user.createdAt).toLocaleDateString('fr-FR')}
              </span>
              <div className="flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
                  onClick={() => openEdit(user)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                  onClick={() => setDeleteUser(user)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              Aucun utilisateur pour le moment
            </div>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={editUser !== null} onOpenChange={(open) => { if (!open) setEditUser(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier l&apos;utilisateur</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label htmlFor="edit-name">Nom complet</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>
              <div>
                <Label>Rôle</Label>
                <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrateur</SelectItem>
                    <SelectItem value="advanced">Avancé</SelectItem>
                    <SelectItem value="user_basic">Utilisateur</SelectItem>
                    <SelectItem value="viewer">Lecteur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSaveEdit} disabled={saving || !editName || !editEmail} className="w-full">
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteUser !== null} onOpenChange={(open) => { if (!open) setDeleteUser(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cet utilisateur ?</AlertDialogTitle>
              <AlertDialogDescription>
                L&apos;utilisateur <strong>{deleteUser?.name || deleteUser?.email}</strong> sera définitivement supprimé.
                Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting ? 'Suppression...' : 'Supprimer'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {content()}
        </div>
      </main>
    </div>
  );
}
