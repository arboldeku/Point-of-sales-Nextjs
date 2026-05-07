'use client';
import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { NAVBAR_ITEMS } from '@/constant/navbarMenu';
import { ScrollAreaDemo } from '../scrollarea/scrollarea';
import { LogoutButton } from '@/components/auth/logout-button';

function Navbar() {
  // Get the current pathname from Next.js router
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <>
      <div className="flex-1 flex flex-col">
        {/* User info section */}
        {user && (
          <div className="px-2 py-4 lg:px-4 border-b border-border">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-sm font-semibold text-foreground">{user.username}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {user.role === 'Admin' && '👑 Admin'}
                {user.role === 'Member' && '👤 Member'}
                {user.role === 'User' && '👁️ User'}
              </p>
            </div>
          </div>
        )}

        {/* Navigation bar container */}
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          {/* Map through NAVBAR_ITEMS to create navigation links */}
          {NAVBAR_ITEMS.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                pathname === item.path
                  ? 'bg-muted text-foreground' // Apply active styles if current path matches item path
                  : 'text-muted-foreground hover:text-foreground' // Apply default styles otherwise
              } transition-all hover:text-primary`}
            >
              {/* Render the icon and title for each navigation item */}
              {item.icon}
              {item.title}
            </Link>
          ))}
          {/* Include ScrollAreaDemo component */}
          <ScrollAreaDemo />
        </nav>
        {/* Logout button at the bottom */}
        <div className="mt-auto px-2 pb-4 lg:px-4">
          <LogoutButton />
        </div>
      </div>
    </>
  );
}

export default Navbar;
