import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useWallet } from "@/hooks/use-wallet";
import { Menu, X, LayoutDashboard, ListTodo, PlusCircle, Sun, Moon } from "lucide-react";

function NavWalletBadge() {
  const { data: wallet } = useWallet();
  if (wallet?.balance == null) return null;
  return (
    <span className="text-xs font-semibold text-purple-600 dark:text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full tabular-nums">
      ₹{wallet.balance.toLocaleString()}
    </span>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      aria-label="Toggle theme"
    >
      {resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  React.useEffect(() => { setMobileOpen(false); }, [location]);

  const navLinks = [
    { href: "/tasks", label: "Browse Tasks", icon: ListTodo },
    { href: "/create", label: "Post a Task", icon: PlusCircle },
    ...(isSignedIn ? [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] : []),
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Left: Logo + desktop nav */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group shrink-0">
              <div className="w-7 h-7 rounded-lg btn-gradient flex items-center justify-center">
                <span className="text-white text-xs font-bold">CT</span>
              </div>
              <span className="text-base font-bold tracking-tight text-foreground group-hover:opacity-80 transition-opacity">
                CreatorTasks
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right: auth + theme toggle + hamburger */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {isSignedIn ? (
              <div className="flex items-center gap-2">
                <NavWalletBadge />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                      <Avatar className="h-9 w-9 border border-border ring-2 ring-primary/20">
                        <AvatarImage src={user?.imageUrl} alt={user?.fullName || ""} />
                        <AvatarFallback className="bg-purple-600 text-white text-sm font-semibold">
                          {user?.firstName?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-card border-border" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-0.5 leading-none">
                        {user?.fullName && (
                          <p className="font-semibold text-foreground text-sm">{user.fullName}</p>
                        )}
                        {user?.primaryEmailAddress && (
                          <p className="w-[200px] truncate text-xs text-muted-foreground">
                            {user.primaryEmailAddress.emailAddress}
                          </p>
                        )}
                      </div>
                    </div>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="w-full cursor-pointer text-foreground/80 focus:text-foreground focus:bg-muted">
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
              <div className="hidden md:flex items-center gap-3">
                <Link href="/sign-in" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Sign In
                </Link>
                <Button asChild className="btn-gradient text-white rounded-xl text-sm px-4 py-2 h-auto font-semibold border-0">
                  <Link href="/sign-up">Sign Up</Link>
                </Button>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 top-16">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative bg-card border-b border-border shadow-2xl animate-fade-up">
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-1">
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-foreground/80 hover:text-foreground hover:bg-muted transition-all duration-200 text-[15px] font-medium"
                >
                  <Icon size={18} className="text-muted-foreground" />
                  {label}
                </Link>
              ))}
              <div className="mt-3 pt-3 border-t border-border">
                {isSignedIn ? (
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border border-border">
                        <AvatarImage src={user?.imageUrl} />
                        <AvatarFallback className="bg-purple-600 text-white text-xs">
                          {user?.firstName?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{user?.firstName}</p>
                        <NavWalletBadge />
                      </div>
                    </div>
                    <button
                      onClick={() => signOut()}
                      className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 px-2">
                    <Button asChild variant="ghost" className="w-full justify-center text-foreground/80 hover:text-foreground">
                      <Link href="/sign-in">Sign In</Link>
                    </Button>
                    <Button asChild className="w-full btn-gradient text-white rounded-xl font-semibold border-0">
                      <Link href="/sign-up">Sign Up Free</Link>
                    </Button>
                  </div>
                )}
              </div>
            </nav>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
