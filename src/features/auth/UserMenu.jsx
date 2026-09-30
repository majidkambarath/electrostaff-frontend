import { useNavigate } from 'react-router-dom';
import { KeyRound, LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { Avatar } from '@/shared/components/Avatar';
import { useConfirm } from '@/shared/components/ConfirmDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

const ROLE = { owner: 'Owner', admin: 'Admin', staff: 'Staff', platform: 'Developer' };

// Signed-in person with account actions. `settingsPath` points to where the password form lives.
export function UserMenu({ settingsPath }) {
  const { principal, logout } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();

  const signOut = async () => {
    if (await confirm({ title: 'Sign out of ElectroStaff?', confirmLabel: 'Sign out' })) logout();
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="Account" className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar name={principal?.name} className="h-10 w-10 bg-primary/10 text-primary sm:h-9 sm:w-9" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-52">
        <DropdownMenuLabel className="text-sm text-foreground">
          {principal?.name}
          <span className="block text-xs font-normal text-muted-foreground">
            {ROLE[principal?.role]} · {principal?.phone || principal?.username}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {settingsPath && (
          <DropdownMenuItem onSelect={() => navigate(settingsPath)}>
            {settingsPath.includes('profile') ? <KeyRound /> : <Settings />} {settingsPath.includes('profile') ? 'Profile & password' : 'Settings & password'}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem destructive onSelect={signOut}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
