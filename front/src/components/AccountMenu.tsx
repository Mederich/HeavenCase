import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ChevronDownIcon, LayoutGridIcon, LogOutIcon, PackageIcon, ReceiptTextIcon } from 'lucide-react'
import type { CurrentUser } from '@/auth/context'
import { useAuth } from '@/auth/useAuth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toastError } from '@/lib/api'
import { UserAvatar } from './UserAvatar'

export function AccountMenu({ user }: { user: CurrentUser }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  const onLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
      navigate('/')
    } catch (err) {
      toastError(err, 'Déconnexion impossible.')
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-10 items-center gap-2 rounded-lg px-1.5 text-sm transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-[state=open]:bg-accent sm:pr-2.5"
        aria-label={`Compte de ${user.username}`}
      >
        <UserAvatar username={user.username} />
        <span className="hidden max-w-32 truncate font-medium md:inline">{user.username}</span>
        <ChevronDownIcon className="hidden size-4 text-muted-foreground sm:block" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-60">
        <DropdownMenuLabel className="flex items-center gap-3 py-2 font-normal">
          <UserAvatar username={user.username} className="size-9" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{user.username}</p>
            {user.email && user.email !== user.username && (
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild className="sm:hidden">
            <Link to="/cases">
              <LayoutGridIcon />
              Caisses
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/profile">
              <PackageIcon />
              Inventaire
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/profile?tab=history">
              <ReceiptTextIcon />
              Transactions
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={loggingOut} onSelect={() => void onLogout()}>
          <LogOutIcon />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
