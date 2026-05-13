"use client";

import * as React from "react";
import { MapPinned, Nut, ScanSearch, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

export type StarterTheme = "plan" | "create" | "search";

const STARTER_THEMES: Record<
  StarterTheme,
  {
    label: string;
    headline: string;
    examples: string[];
    Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  }
> = {
  plan: {
    label: "Plan",
    headline: "Beautiful places to see in Europe.",
    Icon: MapPinned,
    examples: [
      "One-week itinerary: Rome, Florence, and Venice with travel times",
      "Alpine hiking trip in Switzerland and Austria for early summer",
      "Coastal Portugal: Lisbon to the Algarve by train in 10 days",
      "Northern lights: compare Tromsø, Reykjavik, and Finnish Lapland",
    ],
  },
  create: {
    label: "Create",
    headline: "Turn an idea into something concrete.",
    Icon: Sparkles,
    examples: [
      "Outline a blog post on sustainable commuting for city dwellers",
      "Draft a warm outreach email to a potential design collaborator",
      "Write a 300-word bedtime story about a squirrel who learns to sail",
      "Brainstorm 12 social captions for a new plant-based snack launch",
    ],
  },
  search: {
    label: "Search",
    headline: "Dig into sources, comparisons, and trade-offs.",
    Icon: ScanSearch,
    examples: [
      "What changed in React 19 for concurrent rendering and server components?",
      "Summarize key obligations from the EU AI Act for a 20-person SaaS",
      "Compare Postgres full-text search vs Meilisearch for in-app chat",
      "Security checklist before exposing a public REST API to partners",
    ],
  },
};

const THEME_ORDER: StarterTheme[] = ["plan", "create", "search"];

const starterGlassFocus =
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring";

const themeTabBase =
  "relative flex cursor-pointer select-none items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[0.8125rem] font-normal shadow-none outline-none transition-[border-color,box-shadow,background,backdrop-filter,color] duration-200 hover:!translate-y-0 disabled:pointer-events-none disabled:opacity-40";

const examplePromptBase =
  "glass-subtle relative w-full cursor-pointer select-none rounded-2xl px-4 py-3.5 text-left text-sm font-normal leading-relaxed text-foreground/90 shadow-none outline-none transition-[border-color,box-shadow,background,backdrop-filter,color] duration-200 hover:!translate-y-0 disabled:pointer-events-none disabled:opacity-40";

export function EmptyChatStarters({
  onPickPrompt,
  className,
}: {
  onPickPrompt: (text: string) => void;
  className?: string;
}) {
  const [theme, setTheme] = React.useState<StarterTheme>("plan");
  const config = STARTER_THEMES[theme];

  return (
    <section
      className={cn(
        "flex w-full flex-col items-center px-1 py-6 text-center sm:py-10",
        className,
      )}
      aria-label="Conversation starters"
    >
      <h2 className="text-balance text-xl font-medium tracking-tight text-foreground/95 sm:text-3xl">
        How can I help you?
      </h2>
      <p className="mt-1.5 flex items-center justify-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground/80 sm:text-sm">
        <span>Don&apos;t go nuts!</span>
        <Nut
          className="size-3.5 shrink-0 rotate-45 sm:size-4"
          aria-hidden
        />
      </p>

      <div
        className="mt-8 flex flex-wrap items-center justify-center gap-2.5"
        role="tablist"
        aria-label="Starter themes"
      >
        {THEME_ORDER.map((id) => {
          const t = STARTER_THEMES[id];
          const Icon = t.Icon;
          const selected = theme === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={cn(
                themeTabBase,
                starterGlassFocus,
                selected
                  ? "glass-liquid text-primary"
                  : "glass-subtle text-muted-foreground hover:text-foreground/90",
              )}
              onClick={() => setTheme(id)}
            >
              <span className="relative z-10 flex items-center gap-2">
                <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className={cn(
          "mt-10 mx-auto w-full max-w-2xl rounded-2xl bg-muted p-1 ring-1 ring-inset ring-primary/15 sm:p-1.5 dark:ring-primary/10",
        )}
        role="tabpanel"
        aria-labelledby={`starter-theme-${theme}`}
      >
        <div
          className={cn(
            "glass-subtle relative overflow-hidden rounded-xl p-5 text-left shadow-none sm:p-6",
            "ring-1 ring-inset ring-primary/12 dark:ring-primary/10",
            "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit]",
            "before:bg-gradient-to-br before:from-primary/[0.06] before:via-transparent before:to-transparent",
          )}
        >
          <p
            id={`starter-theme-${theme}`}
            className="relative z-10 text-balance text-sm font-normal leading-snug text-foreground/95 sm:text-base"
          >
            {config.headline}
          </p>

          <ul className="relative z-10 mt-5 flex flex-col gap-2.5">
            {config.examples.map((example, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => onPickPrompt(example)}
                  className={cn(examplePromptBase, starterGlassFocus)}
                >
                  <span className="relative z-10">{example}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
