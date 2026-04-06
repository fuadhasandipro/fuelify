'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Camera, Clock } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const items = [
    { href: '/dashboard', label: 'হোম', icon: LayoutDashboard },
    { href: '/scan', label: 'স্ক্যান', icon: Camera }
  ];

  return (
    <nav className="bottom-nav">
      {items.map(({ href, label, icon: Icon }) => {
        const isActive =
          href === '/dashboard'
            ? pathname === '/dashboard' && !pathname.includes('history')
            : pathname.startsWith(href.split('?')[0]);

        return (
          <Link
            key={href}
            href={href}
            className={`nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={22} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
