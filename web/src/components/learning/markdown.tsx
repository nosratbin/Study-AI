"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import clsx from "clsx";

// Raw HTML in markdown is not rendered (react-markdown's default), so lesson content and AI replies can't inject markup.
const components: Components = {
  h1: ({ children }) => <h2 className="mt-8 mb-3 text-2xl font-bold tracking-tight first:mt-0">{children}</h2>,
  h2: ({ children }) => <h2 className="mt-8 mb-3 text-xl font-bold tracking-tight first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-6 mb-2 text-lg font-semibold first:mt-0">{children}</h3>,
  h4: ({ children }) => <h4 className="mt-4 mb-2 font-semibold first:mt-0">{children}</h4>,
  p: ({ children }) => <p className="my-3 leading-7 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-3 list-disc space-y-1.5 pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="my-3 list-decimal space-y-1.5 pl-6">{children}</ol>,
  li: ({ children }) => <li className="leading-7">{children}</li>,
  a: ({ href, children }) => {
    const safe = href && /^(https?:|mailto:|\/|#)/i.test(href) ? href : undefined;
    const external = safe?.startsWith("http");
    return (
      <a href={safe} className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700" {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {children}
      </a>
    );
  },
  blockquote: ({ children }) => <blockquote className="my-4 border-l-4 border-brand-200 bg-brand-50/60 py-2 pl-4 pr-3 text-ink/90">{children}</blockquote>,
  hr: () => <hr className="my-6 border-line" />,
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-xl border border-line">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border-b border-line bg-surface px-3 py-2 font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-b border-line px-3 py-2 last:border-0">{children}</td>,
  pre: ({ children }) => <pre className="my-4 overflow-x-auto rounded-xl bg-[#0f172a] p-4 text-[13px] leading-6 text-slate-100">{children}</pre>,
  code: ({ className, children }) => {
    const block = /language-/.test(className ?? "") || String(children).includes("\n");
    return block ? (
      <code className={clsx("font-mono", className)}>{children}</code>
    ) : (
      <code className="rounded-md bg-surface px-1.5 py-0.5 font-mono text-[0.9em] text-brand-700">{children}</code>
    );
  },
};

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={clsx("text-[15px] text-ink", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
