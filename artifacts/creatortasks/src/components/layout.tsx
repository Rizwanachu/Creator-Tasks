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
import { useNotifications } from "@/hooks/use-notifications";
import { Menu, X, LayoutDashboard, ListTodo, PlusCircle, Sun, Moon, Bell, Trophy } from "lucide-react";

function NavWalletBadge() {
  const { data: wallet } = useWallet();
  if (wallet?.balance == null) return null;
  return (
    <span className="text-xs font-semibold text-purple-600 dark:text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full tabular-nums">
      ₹{wallet.balance.toLocaleString()}
    </span>
  );
}

function NotificationBell() {
  const { data } = useNotifications();
  const unread = data?.unreadCount ?? 0;

  return (
    <Link href="/notifications">
      <button
        className="relative w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </Link>
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

function Logo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="CreatorTasks logo"
      className={`rounded-xl ${className}`}
      draggable={false}
    />
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
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { href: "/create", label: "Post a Task", icon: PlusCircle },
    ...(isSignedIn ? [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] : []),
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <Logo className="w-8 h-8" />
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

          <div className="flex items-center gap-2">
            <ThemeToggle />

            {isSignedIn ? (
              <div className="flex items-center gap-2">
                <NavWalletBadge />
                <NotificationBell />
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
                    <DropdownMenuItem asChild>
                      <Link href={`/profile/${user?.id}`} className="w-full cursor-pointer text-foreground/80 focus:text-foreground focus:bg-muted">
                        My Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile/edit" className="w-full cursor-pointer text-foreground/80 focus:text-foreground focus:bg-muted">
                        Edit Profile
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
              {isSignedIn && (
                <Link
                  href="/notifications"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-foreground/80 hover:text-foreground hover:bg-muted transition-all duration-200 text-[15px] font-medium"
                >
                  <Bell size={18} className="text-muted-foreground" />
                  Notifications
                </Link>
              )}
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

      <footer className="border-t border-border bg-card/50 mt-auto">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
            <div className="col-span-2 flex flex-col gap-4">
              <Link href="/" className="flex items-center gap-2.5 group w-fit">
                <Logo className="w-9 h-9" />
                <span className="text-lg font-bold tracking-tight text-foreground group-hover:opacity-80 transition-opacity">
                  CreatorTasks
                </span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                The curated marketplace for AI content creators. Apply to tasks, get hired by top creators, and earn with secure Razorpay payouts.
              </p>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-full px-3 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                  Powered by Razorpay
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1">
                  Escrow protected
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-semibold text-foreground tracking-wide uppercase">Platform</h4>
              <ul className="flex flex-col gap-2">
                {[
                  { href: "/tasks", label: "Browse Tasks" },
                  { href: "/leaderboard", label: "Leaderboard" },
                  { href: "/create", label: "Post a Task" },
                  { href: "/dashboard", label: "Dashboard" },
                  { href: "/notifications", label: "Notifications" },
                  { href: "/sign-up", label: "Sign Up Free" },
                ].map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-semibold text-foreground tracking-wide uppercase">Categories</h4>
              <ul className="flex flex-col gap-2">
                {[
                  { href: "/tasks?category=reels", label: "Reels" },
                  { href: "/tasks?category=hooks", label: "Hooks" },
                  { href: "/tasks?category=thumbnails", label: "Thumbnails" },
                  { href: "/tasks?category=other", label: "Other Content" },
                ].map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-semibold text-foreground tracking-wide uppercase">For Creators</h4>
              <ul className="flex flex-col gap-2">
                {[
                  { href: "/tasks", label: "Apply to Tasks" },
                  { href: "/dashboard?tab=invitations", label: "My Invitations" },
                  { href: "/dashboard?tab=transactions", label: "Wallet & Earnings" },
                  { href: "/dashboard?tab=referral", label: "Referral Program" },
                ].map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} CreatorTasks. All rights reserved.
            </p>
            <div className="flex items-center gap-4 flex-wrap justify-center">
              <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link>
              <span className="text-muted-foreground/30">·</span>
              <Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
              <span className="text-muted-foreground/30">·</span>
              <Link href="/refund-policy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Refund Policy</Link>
              <span className="text-muted-foreground/30">·</span>
              <Link href="/contact" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Contact Us</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
