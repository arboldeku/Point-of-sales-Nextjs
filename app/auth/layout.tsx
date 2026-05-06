import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - Point Of Sales',
  description: 'Login to Point Of Sales System',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
