/**
 * CreateChannelDialog — Dialog for creating a new chat channel.
 *
 * Per ADMIN_PORTAL_SCREENS.md §14:
 * - Channel type selector (branch, role, announcement, custom, direct)
 * - Bilingual name (en / ar)
 * - Optional description
 * - Member picker (search staff by name/role)
 */

import { useState, useMemo } from 'react';
import { Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Badge,
} from '@dento/ui';
import { useCreateChannel } from './useChat.js';
import type { ChannelType, CreateChannelInput } from './useChat.js';
import { useUserList } from '@/features/users/hooks/useUsers.js';
import type { StaffUser } from '@/features/users/hooks/useUsers.js';
import { useSupportedLanguages } from '@/hooks/useSupportedLanguages.js';

const CHANNEL_TYPES: { value: ChannelType; label: string }[] = [
  { value: 'custom', label: 'Custom' },
  { value: 'branch', label: 'Branch' },
  { value: 'role', label: 'Role' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'direct', label: 'Direct Message' },
];

interface CreateChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChannelCreated?: (channelId: string) => void;
}

export function CreateChannelDialog({
  open,
  onOpenChange,
  onChannelCreated,
}: CreateChannelDialogProps) {
  const [type, setType] = useState<ChannelType>('custom');
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<StaffUser[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

  const { isMultiLang } = useSupportedLanguages();

  const createChannel = useCreateChannel();

  // Fetch users for member picker
  const { data: userData } = useUserList({ limit: 100, status: 'active' });
  const allUsers = userData?.items ?? [];

  const filteredUsers = useMemo(() => {
    if (!memberSearch.trim()) return allUsers;
    const q = memberSearch.toLowerCase();
    return allUsers.filter((u) => {
      const name = `${u.profile.firstName?.en ?? ''} ${u.profile.lastName?.en ?? ''}`.toLowerCase();
      return (
        name.includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q)
      );
    });
  }, [allUsers, memberSearch]);

  const toggleMember = (user: StaffUser) => {
    setSelectedMembers((prev) =>
      prev.some((m) => m._id === user._id)
        ? prev.filter((m) => m._id !== user._id)
        : [...prev, user],
    );
  };

  const resetForm = () => {
    setType('custom');
    setNameEn('');
    setNameAr('');
    setDescription('');
    setSelectedMembers([]);
    setMemberSearch('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input: CreateChannelInput = {
      type,
      name: { en: nameEn, ar: nameAr || nameEn },
      description: description || undefined,
      memberIds: selectedMembers.length > 0 ? selectedMembers.map((m) => m._id) : undefined,
    };
    createChannel.mutate(input, {
      onSuccess: (res) => {
        onOpenChange(false);
        resetForm();
        const id = (res as any)?.data?.channel?._id;
        if (id && onChannelCreated) onChannelCreated(id);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Channel</DialogTitle>
            <DialogDescription>Create a new chat channel for your team.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="channel-type">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as ChannelType)}>
                <SelectTrigger id="channel-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNEL_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel-name-en">Name (English)</Label>
              <Input
                id="channel-name-en"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. General Discussion"
                required
              />
            </div>

            {isMultiLang && (
              <div className="space-y-2">
                <Label htmlFor="channel-name-ar">Name (Arabic)</Label>
                <Input
                  id="channel-name-ar"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="اسم القناة"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="channel-description">Description</Label>
              <Input
                id="channel-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>

            {/* Member Picker */}
            <div className="space-y-2">
              <Label>Members</Label>
              {/* Selected members */}
              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedMembers.map((u) => (
                    <Badge key={u._id} variant="secondary" className="gap-1 pe-1 text-xs">
                      {u.profile.firstName?.en} {u.profile.lastName?.en}
                      <button
                        type="button"
                        onClick={() => toggleMember(u)}
                        className="hover:bg-muted rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              {/* Search input */}
              <Input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search staff by name, email, or role…"
                className="h-8 text-xs"
              />
              {/* User dropdown list */}
              <div className="max-h-36 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700">
                {filteredUsers.length === 0 && (
                  <p className="px-3 py-2 text-xs text-gray-400">No users found</p>
                )}
                {filteredUsers.map((user) => {
                  const isSelected = selectedMembers.some((m) => m._id === user._id);
                  return (
                    <button
                      key={user._id}
                      type="button"
                      onClick={() => toggleMember(user)}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-start text-xs transition-colors ${
                        isSelected
                          ? 'bg-brand-50 dark:bg-brand-500/10'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 text-brand-600 flex-shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <span className="font-medium">
                          {user.profile.firstName?.en} {user.profile.lastName?.en}
                        </span>
                        <span className="ms-1.5 text-gray-400">({user.role})</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!nameEn.trim() || createChannel.isPending}>
              {createChannel.isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
