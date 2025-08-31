import type { TemplateProps } from "@document-toolkit/generator";
interface ExampleTemplateProps extends TemplateProps {
    title?: string;
    author?: string;
    date?: string;
}
export declare function ExampleTemplate({ markdownContent, title, author, date }: ExampleTemplateProps): import("react/jsx-runtime.js").JSX.Element;
export {};
