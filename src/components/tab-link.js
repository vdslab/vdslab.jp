"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TabLink({ children, exact, href, activePath }) {
  const pathname = usePathname();
  const match = exact ? pathname === href : pathname.startsWith(activePath);
  return (
    <li className={match ? "is-active" : ""}>
      <Link href={href} style={{ color: match ? "rgb(32,88,90)" : "white" }}>
        {children}
      </Link>
    </li>
  );
}
