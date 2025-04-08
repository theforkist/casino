import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Menu, User, History, Dice1, TrendingUp, PenTool, Home, LogOut } from "lucide-react";

export function Navbar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <nav className="bg-dark-secondary py-4 px-6 md:px-8 sticky top-0 z-50 border-b border-gray-800">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/">
            <a className="text-2xl font-bold font-sans text-white mr-8">
              JOHNSPROPERTY<span className="text-accent-green">CASINO</span>
            </a>
          </Link>
          <div className="hidden md:flex space-x-6">
            <NavLinks />
          </div>
        </div>
        
        <div className="flex space-x-3 items-center">
          {user ? (
            <>
              <div className="hidden md:block mr-2 text-muted-foreground">
                Balance: <span className="font-semibold text-white">${parseFloat(user.balance).toFixed(2)}</span>
              </div>
              <UserMenu user={user} onLogout={handleLogout} />
            </>
          ) : (
            <>
              <Link href="/auth">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link href="/auth">
                <Button className="bg-accent-green hover:bg-accent-green/90">Sign Up</Button>
              </Link>
            </>
          )}
          
          <MobileMenu user={user} onLogout={handleLogout} />
        </div>
      </div>
    </nav>
  );
}

function NavLinks() {
  return (
    <>
      <Link href="/">
        <a className="text-muted-foreground hover:text-white transition">
          Home
        </a>
      </Link>
      <Link href="/dice">
        <a className="text-muted-foreground hover:text-white transition">
          Dice
        </a>
      </Link>
      <Link href="/crash">
        <a className="text-muted-foreground hover:text-white transition">
          Crash
        </a>
      </Link>
      <Link href="/poker">
        <a className="text-muted-foreground hover:text-white transition">
          Poker
        </a>
      </Link>
    </>
  );
}

function UserMenu({ user, onLogout }: { user: any; onLogout: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <User className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-0.5 leading-none">
            <p className="font-medium text-sm">{user.username}</p>
            <p className="text-xs text-muted-foreground">
              Balance: ${parseFloat(user.balance).toFixed(2)}
            </p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <Link href="/dashboard">
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </DropdownMenuItem>
        </Link>
        <Link href="/history">
          <DropdownMenuItem>
            <History className="mr-2 h-4 w-4" />
            <span>Game History</span>
          </DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileMenu({ user, onLogout }: { user: any; onLogout: () => void }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="bg-dark-secondary">
        <div className="flex flex-col h-full">
          {user && (
            <div className="py-4 border-b border-gray-800">
              <p className="font-medium">{user.username}</p>
              <p className="text-sm text-muted-foreground">
                Balance: ${parseFloat(user.balance).toFixed(2)}
              </p>
            </div>
          )}
          
          <nav className="flex flex-col gap-4 py-6">
            <SheetClose asChild>
              <Link href="/">
                <Button variant="ghost" className="justify-start">
                  <Home className="mr-2 h-5 w-5" />
                  Home
                </Button>
              </Link>
            </SheetClose>
            
            {user ? (
              <>
                <SheetClose asChild>
                  <Link href="/dashboard">
                    <Button variant="ghost" className="justify-start">
                      <User className="mr-2 h-5 w-5" />
                      Dashboard
                    </Button>
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link href="/dice">
                    <Button variant="ghost" className="justify-start">
                      <Dice1 className="mr-2 h-5 w-5" />
                      Dice
                    </Button>
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link href="/crash">
                    <Button variant="ghost" className="justify-start">
                      <TrendingUp className="mr-2 h-5 w-5" />
                      Crash
                    </Button>
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link href="/poker">
                    <Button variant="ghost" className="justify-start">
                      <PenTool className="mr-2 h-5 w-5" />
                      Poker
                    </Button>
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link href="/history">
                    <Button variant="ghost" className="justify-start">
                      <History className="mr-2 h-5 w-5" />
                      Game History
                    </Button>
                  </Link>
                </SheetClose>
                <Button
                  variant="ghost"
                  className="justify-start"
                  onClick={onLogout}
                >
                  <LogOut className="mr-2 h-5 w-5" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <SheetClose asChild>
                  <Link href="/auth">
                    <Button variant="ghost" className="justify-start w-full">
                      Login
                    </Button>
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link href="/auth">
                    <Button className="justify-start w-full bg-accent-green hover:bg-accent-green/90">
                      Sign Up
                    </Button>
                  </Link>
                </SheetClose>
              </>
            )}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
