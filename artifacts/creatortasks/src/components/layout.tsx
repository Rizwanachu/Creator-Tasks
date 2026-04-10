import React from "react";
import { Link } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useWallet } from "@/hooks/use-wallet";

function NavWalletBadge() {
  const { data: wallet } = useWallet();
  if (wallet?.balance == null) return null;
  return (
    <span className="text-xs font-semibold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
      ₹{wallet.balance.toLocaleString()}
    </span>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/60 border-b border-white/[0.06]">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg btn-gradient flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">CT</span>
              </div>
              <span className="text-base font-bold tracking-tight text-white group-hover:opacity-80 transition-opacity">
                CreatorTasks
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              <Link href="/tasks" className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-200">
                Browse Tasks
              </Link>
              <Link href="/create" className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-200">
                Post a Task
              </Link>
              {isSignedIn && (
                <Link href="/dashboard" className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-200">
                  Dashboard
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {isSignedIn ? (
              <div className="flex items-center gap-3">
                <NavWalletBadge />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                      <Avatar className="h-9 w-9 border border-white/10 ring-2 ring-purple-500/20">
                        <AvatarImage src={user?.imageUrl} alt={user?.fullName || ""} />
                        <AvatarFallback className="bg-purple-600 text-white text-sm font-semibold">
                          {user?.firstName?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-[#111217] border-[#1F2228]" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-0.5 leading-none">
                        {user?.fullName && (
                          <p className="font-semibold text-white text-sm">{user.fullName}</p>
                        )}
                        {user?.primaryEmailAddress && (
                          <p className="w-[200px] truncate text-xs text-zinc-500">
                            {user.primaryEmailAddress.emailAddress}
                          </p>
                        )}
                      </div>
                    </div>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="w-full cursor-pointer text-zinc-300 focus:text-white focus:bg-white/5">
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer text-red-500 focus:text-red-400 focus:bg-red-500/10"
                      onSelect={() => signOut()}
                    >
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/sign-in" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                  Sign In
                </Link>
                <Button asChild className="btn-gradient text-white rounded-xl text-sm px-4 py-2 h-auto font-semibold border-0">
                  <Link href="/sign-up">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
