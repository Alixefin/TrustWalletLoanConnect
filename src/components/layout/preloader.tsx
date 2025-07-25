"use client";

import Image from "next/image";
import { useAppContext } from "@/context/AppContext";
import { cn } from "@/lib/utils";

export default function Preloader() {
  const { loading } = useAppContext();

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-500",
        loading ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <div className="flex flex-col items-center">
        <Image
          src="https://trustwallet.com/assets/images/media/assets/TWT.png"
          alt="Trust Wallet Logo"
          width={128}
          height={128}
          className="animate-pulse"
        />
        <p className="mt-4 text-primary font-semibold text-lg">Loading Secure Wallet...</p>
      </div>
    </div>
  );
}
