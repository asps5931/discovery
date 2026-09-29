declare module "markdown-it" {
  interface MarkdownItOptions {
    html?: boolean;
    xhtmlOut?: boolean;
    breaks?: boolean;
    langPrefix?: string;
    linkify?: boolean;
    typographer?: boolean;
    quotes?: string | string[];
    highlight?: ((str: string, lang: string) => string) | null;
    maxNesting?: number;
  }

  type Plugin = (md: MarkdownIt, ...params: any[]) => void;

  class MarkdownIt {
    constructor(options?: MarkdownItOptions);
    constructor(presetName: string, options?: MarkdownItOptions);
    use(plugin: Plugin, ...params: any[]): this;
    render(src: string, env?: any): string;
    renderInline(src: string, env?: any): string;
    parse(src: string, env?: any): any[];
  }

  export default MarkdownIt;
}

declare module "markdown-it-front-matter" {
  import MarkdownIt from "markdown-it";

  type FrontMatterCallback = (rawMeta: string) => void;

  const frontMatter: (
    md: MarkdownIt,
    cb: FrontMatterCallback
  ) => void;

  export default frontMatter;
}
