"use client";

import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function ChatClerkHeaderAuth() {
  return (
    <>
      <Show when="signed-out">
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs" asChild>
            <Link href="/sign-up">Sign up</Link>
          </Button>
        </div>
      </Show>
      <Show when="signed-in">
        <UserButton
          appearance={{
            elements: {
              avatarBox: "size-8",
            },
          }}
        />
      </Show>
    </>
  );
}
