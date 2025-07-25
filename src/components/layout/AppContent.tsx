"use client";

import { useAppContext } from "@/context/AppContext";
import { ReactNode } from "react";

export default function AppContent({ children }: { children: ReactNode }) {
  const { loading } = useAppContext();

  if (loading) {
    return null; // Don't render children when loader is active
  }

  return <>{children}</>;
}
