/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

interface AppShellProps {
  children: ReactNode;
  title: string;
}

export default function AppShell({ children, title }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-[#0F172A] text-[#F1F5F9]">
      <Sidebar />
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <Navbar title={title} />
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
