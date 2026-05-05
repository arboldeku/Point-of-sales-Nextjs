import {
  ScanLine,
  ShoppingBag,
  Layers,
  ClipboardList,
  Settings,
} from 'lucide-react';
import { NavItem } from '@/types/Navbar';

export const NAVBAR_ITEMS: NavItem[] = [
  {
    title: 'Prisma-Scan',
    path: '/pos',
    icon: <ScanLine className="h-4 w-4" />,
  },
  {
    title: 'Orders',
    path: '/orders',
    icon: <ShoppingBag className="h-4 w-4" />,
  },
  {
    title: 'Inventory',
    path: '/product',
    icon: <Layers className="h-4 w-4" />,
  },
  {
    title: 'Records',
    path: '/records',
    icon: <ClipboardList className="h-4 w-4" />,
  },
  {
    title: 'Admin',
    path: '/settings',
    icon: <Settings className="h-4 w-4" />,
  },
];
