'use client';

import { useState, useSyncExternalStore } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { Heart, LayoutGrid, LogOut, Settings, ShoppingBag, User, Package, X } from 'lucide-react';

import AuthModal from '@/components/AuthModal';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const emptySubscribe = () => () => {};

export default function NavbarDesktopAccountControl({ navActionButtonClass = '' }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [loadedAvatarSrc, setLoadedAvatarSrc] = useState('');
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [isNavigating, setIsNavigating] = useState(false);


  if (!mounted || status === 'loading' || !session) {
    return (
      <div className="hidden md:block">
        <Button
          variant="ghost"
          size="icon"
          disabled={isNavigating}
          onClick={() => {
            if (!mounted || session || isNavigating) return;
            setIsNavigating(true);
            setIsAuthModalOpen(true);
          }}
          className={cn("size-9 rounded-none text-[#121212] hover:bg-black/5 transition-colors", navActionButtonClass)}
          title="Sign In / Account"
        >
          {isNavigating ? <Spinner className="size-4" /> : <User strokeWidth={1.8} className="size-4.5" />}
        </Button>
        {mounted && isAuthModalOpen ? <AuthModal open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} /> : null}
      </div>
    );
  }

  return (
    <div className="hidden md:block">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("size-9 rounded-none text-[#121212] hover:bg-black/5 transition-colors", navActionButtonClass)}
            title={`Account (${session.user?.name || 'User'})`}
          >
            <User strokeWidth={1.8} className="size-4.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-[#FAF9F6] border border-[#E8E5DF] shadow-lg rounded-none" align="end" sideOffset={8}>
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{session.user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{session.user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/track-order')}>
              <Package className="mr-2 h-4 w-4 text-[#A67C52]" />
              <span>Track Your Order</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/wishlist')}>
              <Heart className="mr-2 h-4 w-4" />
              <span>Wishlist</span>
            </DropdownMenuItem>
            {session.user?.isAdmin ? (
              <DropdownMenuItem onClick={() => router.push('/admin')}>
                <LayoutGrid className="mr-2 h-4 w-4" />
                <span>Admin Panel</span>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Account Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setLogoutConfirmOpen(true)}
              className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <AlertDialogContent className="max-w-[320px] p-5 rounded-2xl gap-4" showCloseButton={false}>
          <div className="flex justify-between items-start">
            <AlertDialogHeader className="text-left space-y-1">
              <AlertDialogTitle className="text-base font-semibold text-foreground">Log out of your account?</AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                You will need to sign in again to access your account and orders.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded-md -mt-1 -mr-1 text-muted-foreground hover:bg-muted"
              onClick={() => setLogoutConfirmOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
          <AlertDialogFooter className="mt-1 flex-row gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLogoutConfirmOpen(false)}
              className="flex-1 rounded-lg text-xs h-9 font-medium"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setLogoutConfirmOpen(false);
                signOut();
              }}
              className="flex-1 rounded-lg text-xs h-9 font-semibold bg-red-600 hover:bg-red-700 text-white"
            >
              Log Out
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
