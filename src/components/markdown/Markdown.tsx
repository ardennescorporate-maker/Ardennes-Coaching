import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { cx } from "@/lib/cx";

/** Markdown with GitHub tables/lists and KaTeX maths ($...$ and $$...$$). Raw HTML is not rendered. */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cx("md", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: true }]]} rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: "ignore" }]]}>
        {normaliseMath(children)}
      </ReactMarkdown>
    </div>
  );
}

/** Accept \( \) and \[ \] delimiters too, which models sometimes use. */
function normaliseMath(s: string) {
  return s.replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => `$$${m}$$`).replace(/\\\(([\s\S]+?)\\\)/g, (_, m) => `$${m}$`);
}
