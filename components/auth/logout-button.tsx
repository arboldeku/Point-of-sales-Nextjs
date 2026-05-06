'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full justify-start gap-3"
      onClick={handleLogout}
    >
      <LogOut className="h-4 w-4" />
      <span>Logout</span>
    </Button>
  );
}
