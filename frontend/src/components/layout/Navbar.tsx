"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { Menu, X, Leaf, LogOut, Shield, BarChart3, PlusCircle, Sparkles, Calculator } from "lucide-react";

export const Navbar: React.FC = () => {
  const { user, loginWithGoogle, logout } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/", icon: BarChart3 },
    { name: "Log Activity", href: "/log", icon: PlusCircle },
    { name: "Calculator", href: "/calculator", icon: Calculator },
    { name: "AI Insights", href: "/insights", icon: Sparkles },
    { name: "Privacy", href: "/privacy", icon: Shield },
  ];

  const handleSignIn = async () => {
    try {
      await loginWithGoogle();
    } catch (e) {
      console.error(e);
    }
  };

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="sticky top-0 z-50 w-full glass-panel border-b border-brand-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-brand-primary">
              <Leaf className="h-6 w-6 text-brand-primary animate-pulse" />
              <span>EcoTrack</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          {user && (
            <div className="hidden md:flex items-center gap-6">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive(item.href)
                        ? "text-brand-primary bg-brand-primary/10"
                        : "text-brand-muted hover:text-brand-text hover:bg-slate-800/40"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Auth Controls */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || "User avatar"}
                      className="h-8 w-8 rounded-full border border-brand-primary/45"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary font-bold text-sm">
                      {user.displayName?.charAt(0) || "U"}
                    </div>
                  )}
                  <span className="text-sm font-medium text-brand-text max-w-[120px] truncate">
                    {user.displayName || "Active User"}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-muted hover:text-brand-error border border-slate-700 hover:border-brand-error/40 rounded-lg transition-all"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-brand-dark bg-brand-primary hover:bg-brand-primary/90 shadow-glass-emerald rounded-lg transition-all"
              >
                Sign In with Google
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-lg text-brand-muted hover:text-brand-text hover:bg-slate-800/60 focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-brand-border bg-brand-dark/95 backdrop-blur-md px-4 py-3 space-y-2">
          {user && (
            <>
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-base font-medium transition-colors ${
                    isActive(item.href)
                      ? "text-brand-primary bg-brand-primary/10"
                      : "text-brand-muted hover:text-brand-text"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </div>
                </Link>
              ))}
              <div className="border-t border-slate-800 my-2 pt-2">
                <div className="flex items-center gap-3 px-3 py-2">
                  {user.photoURL && (
                    <img src={user.photoURL} alt="User Avatar" className="h-9 w-9 rounded-full" />
                  )}
                  <div>
                    <div className="text-sm font-semibold text-brand-text">{user.displayName}</div>
                    <div className="text-xs text-brand-muted">{user.email}</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    logout();
                  }}
                  className="w-full mt-2 flex items-center gap-2 px-3 py-2 text-brand-error font-semibold hover:bg-brand-error/10 rounded-lg text-left"
                >
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </button>
              </div>
            </>
          )}
          {!user && (
            <button
              onClick={() => {
                setIsOpen(false);
                handleSignIn();
              }}
              className="w-full py-2 px-4 text-center font-bold text-brand-dark bg-brand-primary rounded-lg"
            >
              Sign In with Google
            </button>
          )}
        </div>
      )}
    </nav>
  );
};
export default Navbar;
