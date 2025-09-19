import * as React from "react";

// Footnote counter for Paged.js
let footnoteCounter = 0;

export const resetFootnoteCounter = () => {
  footnoteCounter = 0;
};

// For Paged.js, we use CSS-based footnotes with float: footnote
export function Footnote({ children }: { children: React.ReactNode }) {
  footnoteCounter++;
  return (
    <>
      <sup className="footnote-ref">{footnoteCounter}</sup>
      <span className="footnote-content">
        <span className="footnote-number">{footnoteCounter}. </span>
        {children}
      </span>
    </>
  );
}

// FootnoteList is not needed with Paged.js as it handles footnote placement automatically
export function FootnoteList() {
  return null;
}
