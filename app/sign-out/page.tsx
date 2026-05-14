"use client";

import { useClerk } from "@clerk/nextjs";
import { useEffect } from "react";

export default function SignOutPage() {
  const { signOut } = useClerk();

  useEffect(() => {
    void signOut({ redirectUrl: "/" });
  }, [signOut]);

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background p-6 text-muted-foreground text-sm">
      Signing out…
    </main>
  );
}
