"use client"

import type { Components } from "react-markdown"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "@/lib/utils"

export type AssistantMarkdownProps = {
  content: string
  className?: string
}

const markdownComponents: Components = {
  a({ href, children, ...props }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline decoration-primary/35 underline-offset-2 transition-colors hover:decoration-primary"
        {...props}
      >
        {children}
      </a>
    )
  },
  pre({ children }) {
    return (
      <pre className="my-4 max-h-[min(24rem,50vh)] overflow-x-auto overflow-y-auto rounded-xl border border-border bg-muted/50 p-4 text-[0.875rem] leading-relaxed shadow-inner dark:bg-muted/40">
        {children}
      </pre>
    )
  },
  code({ className, children, ...props }) {
    const isBlock = className?.includes("language-")
    if (isBlock) {
      return (
        <code className={cn("font-mono text-[0.875rem]", className)} {...props}>
          {children}
        </code>
      )
    }
    return (
      <code
        className="rounded-md bg-muted/90 px-1.5 py-0.5 font-mono text-[0.85em] font-medium text-foreground dark:bg-muted/70"
        {...props}
      >
        {children}
      </code>
    )
  },
  blockquote({ children }) {
    return (
      <blockquote className="not-prose my-4 border-l-[3px] border-primary/45 py-1 ps-5 text-[0.98em] text-foreground/90 italic leading-[1.75]">
        {children}
      </blockquote>
    )
  },
  hr() {
    return (
      <hr className="not-prose my-8 border-0 border-t border-border/80" />
    )
  },
  table({ children }) {
    return (
      <div className="not-prose my-5 overflow-x-auto rounded-lg border border-border/80">
        <table className="w-full min-w-[16rem] border-collapse text-left text-[0.9375rem] [&_tbody_tr:last-child_td]:border-b-0">
          {children}
        </table>
      </div>
    )
  },
  thead({ children }) {
    return (
      <thead className="border-b border-border bg-muted/50 dark:bg-muted/30">
        {children}
      </thead>
    )
  },
  th({ children }) {
    return (
      <th className="px-3 py-2.5 font-semibold text-foreground first:rounded-tl-lg last:rounded-tr-lg">
        {children}
      </th>
    )
  },
  td({ children }) {
    return <td className="border-b border-border/60 px-3 py-2.5 align-top">{children}</td>
  },
  tr({ children }) {
    return (
      <tr className="transition-colors hover:bg-muted/25">{children}</tr>
    )
  },
}

/**
 * Renders model output as GFM markdown with typography tuned to the chat pane.
 */
export function AssistantMarkdown({
  content,
  className,
}: AssistantMarkdownProps) {
  return (
    <div
      className={cn(
        "prose prose-neutral max-w-none text-foreground antialiased",
        "prose-p:mb-4 prose-p:text-base prose-p:leading-[1.75] prose-p:first-of-type:text-pretty prose-p:last:mb-0",
        "prose-headings:scroll-mt-4 prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground",
        "prose-h2:mb-3 prose-h2:mt-8 prose-h2:border-b prose-h2:border-border/70 prose-h2:pb-2 prose-h2:text-lg first:prose-h2:mt-0",
        "prose-h3:mb-2 prose-h3:mt-6 prose-h3:text-base",
        "prose-strong:font-semibold prose-strong:text-foreground",
        "prose-ul:my-4 prose-ul:ps-5 prose-ol:my-4 prose-ol:ps-6",
        "prose-li:my-2 prose-li:leading-[1.75] prose-li:marker:font-medium prose-li:marker:text-primary/65",
        /* Links: base layer; custom <a> adds underline */
        "prose-a:text-primary prose-a:font-medium",
        "prose-img:my-4 prose-img:rounded-lg prose-img:border prose-img:border-border/60 prose-img:shadow-sm",
        "dark:prose-invert dark:prose-strong:text-foreground",
        className,
      )}
    >
      <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </Markdown>
    </div>
  )
}
