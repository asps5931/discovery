import React from "react";
import { MDXProvider } from "@mdx-js/react";
import { slugifyHeading } from "./TableOfContents";

function headingText(children: React.ReactNode): string {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(headingText).join("");
  }
  if (React.isValidElement(children)) {
    return headingText((children.props as { children?: React.ReactNode }).children);
  }
  return "";
}

function Heading({
  as: Tag,
  className,
  children,
  id: idProp,
  ...props
}: {
  as: "h1" | "h2" | "h3";
  className: string;
  children?: React.ReactNode;
  id?: string;
}) {
  const text = headingText(children);
  const id = idProp || (text ? slugifyHeading(text) : undefined);
  return (
    <Tag className={className} id={id} {...props}>
      {children}
    </Tag>
  );
}

const mdxComponents = {
  h1: (props: any) => (
    <Heading as="h1" className="text-3xl font-bold mb-6 text-ink-50 scroll-mt-8" {...props} />
  ),
  h2: (props: any) => (
    <Heading as="h2" className="text-2xl font-semibold mt-10 mb-4 text-ink-50 scroll-mt-8" {...props} />
  ),
  h3: (props: any) => (
    <Heading as="h3" className="text-xl font-semibold mt-6 mb-3 text-ink-100 scroll-mt-8" {...props} />
  ),
  p: (props: any) => <p className="text-ink-200 mb-4 leading-7" {...props} />,
  ul: (props: any) => <ul className="list-disc list-outside mb-4 space-y-2 text-ink-200 pl-5" {...props} />,
  ol: (props: any) => <ol className="list-decimal list-outside mb-4 space-y-2 text-ink-200 pl-5" {...props} />,
  li: (props: any) => <li className="leading-7" {...props} />,
  strong: (props: any) => <strong className="text-ink-50 font-semibold" {...props} />,
  a: (props: any) => (
    <a
      className="text-accent-700 dark:text-accent-400 underline underline-offset-2 hover:text-accent-800 dark:hover:text-accent-300 transition-colors"
      {...props}
    />
  ),
  code: (props: any) => {
    const { className } = props;
    if (typeof props.children === "string" && !className) {
      return (
        <code
          className="font-mono text-sm text-accent-800 dark:text-accent-300 bg-ink-800 px-1.5 py-0.5 rounded"
          {...props}
        />
      );
    }
    return <code {...props} />;
  },
  pre: (props: any) => (
    <pre className="bg-ink-900 border border-ink-700 rounded-lg p-4 mb-4 overflow-x-auto" {...props} />
  ),
  blockquote: (props: any) => (
    <blockquote className="border-l-2 border-accent-500 pl-4 italic text-ink-300 mb-4" {...props} />
  ),
  table: (props: any) => <table className="w-full text-sm mb-4 border-collapse" {...props} />,
  th: (props: any) => (
    <th className="text-left font-semibold text-ink-50 border-b border-ink-600 pb-2 pt-2 px-3" {...props} />
  ),
  td: (props: any) => <td className="border-b border-ink-700 py-2 px-3 text-ink-200" {...props} />,
  hr: (props: any) => <hr className="border-ink-700 my-8" {...props} />,
};

export function DocMDXProvider({ children }: { children: React.ReactNode }) {
  return <MDXProvider components={mdxComponents as any}>{children}</MDXProvider>;
}
