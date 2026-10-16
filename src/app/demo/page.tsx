/**
 * /demo — try the board with no account.
 *
 * All logic is client-side: see components/demo/DemoBoard.tsx. There is no
 * API route behind this page on purpose, so an anonymous visitor has no
 * server write surface to abuse.
 */

import { DemoBoard } from "@/components/demo/DemoBoard";

export default function DemoPage() {
  return <DemoBoard />;
}
