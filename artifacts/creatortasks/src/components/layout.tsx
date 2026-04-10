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

export function Layout({ children }: { children: React.ReactNode }) {
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-black/40 border-b border-white/5">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold tracking-tight text-white hover:opacity-80 transition-opacity">
              CreatorTasks
            </Link>
            
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
              <Link href="/tasks" className="hover:text-white transition-colors">
                Browse Tasks
              </Link>
              <Link href="/create" className="hover:text-white transition-colors">
                Post a Task
              </Link>
              {isSignedIn && (
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  Dashboard
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {isSignedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9 border border-white/10">
                      <AvatarImage src={user?.imageUrl} alt={user?.fullName || ""} />
                      <AvatarFallback>{user?.firstName?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      {user?.fullName && (
                        <p className="font-medium">{user.fullName}</p>
                      )}
                      {user?.primaryEmailAddress && (
                        <p className="w-[200px] truncate text-sm text-zinc-400">
                          {user.primaryEmailAddress.emailAddress}
                        </p>
                      )}
                    </div>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="w-full cursor-pointer">
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer text-red-500 focus:text-red-500"
                    onSelect={() => signOut()}
                  >
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-4">
                <Link href="/sign-in" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                  Sign In
                </Link>
                <Button asChild className="bg-primary hover:bg-primary/90 text-white rounded-xl">
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
