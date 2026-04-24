/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode } from "react";

interface PageShellProps {
  children: ReactNode;
}

/**
 * PageShell — the single source of truth for all page layout.
 * Every page in the app must wrap its content in this component.
 * Never add ml-*, bg-*, min-h-screen, or overflow classes directly
 * inside a page file. Add them here once and all pages inherit them.
 */
export default function PageShell({ children }: PageShellProps) {
  return (
    <div className="ml-0 bg-[#f4f5f7] min-h-screen overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 pt-14 pb-10">
        {children}
      </div>
    </div>
  );
}
