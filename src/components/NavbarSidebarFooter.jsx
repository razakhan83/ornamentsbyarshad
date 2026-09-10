'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { LayoutGrid, LogOut, Settings, X } from 'lucide-react';

import GoogleSignInButton from '@/components/GoogleSignInButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function NavbarSidebarFooter({ mobileMenuButtonClass = '', onCloseSidebar, onOpenAuth }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  if (!session) {
    return (
      <GoogleSignInButton
        onClick={() => {
          onCloseSidebar();
          onOpenAuth();
        }}
        className="h-9 min-h-9 w-full rounded-lg px-3 py-1.5 shadow-none text-[14px]"
      />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setLogoutConfirmOpen(true)}
              className="h-8.5 min-h-8.5 w-full justify-center rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-200 active:scale-[0.98] text-red-600 hover:text-red-700 hover:bg-red-500/10 dark:text-red-400 shadow-none cursor-pointer"
            >
              <LogOut className="mr-2 size-3.5 text-red-500 dark:text-red-400" />
              Logout
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>

      <AlertDialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <AlertDialogContent className="max-w-[320px] p-5 rounded-2xl gap-4" showCloseButton={false}>
          <div className="flex justify-between items-start">
            <AlertDialogHeader className="text-left space-y-1">
              <AlertDialogTitle className="text-base font-semibold text-foreground">Log out of your account?</AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                You will need to sign in again to access your account.
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
                onCloseSidebar?.();
                signOut();
              }}
              className="flex-1 rounded-lg text-xs h-9 font-semibold bg-red-600 hover:bg-red-700 text-white"
            >
              Log Out
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
