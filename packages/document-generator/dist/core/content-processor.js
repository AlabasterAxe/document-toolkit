import * as React from "react";
export class DocumentContentProcessor {
    /**
     * Process markdown content with footnotes and page breaks
     */
    static processFootnotes(htmlContent) {
        // First process page breaks - handle them being wrapped in paragraph tags
        let content = htmlContent.replace(/<p>\{\{PAGE_BREAK\}\}<\/p>/g, '<div style="page-break-before: always;"></div>');
        content = content.replace(/\{\{PAGE_BREAK\}\}/g, '<div style="page-break-before: always;"></div>');
        // Then process footnotes - this will need to be overridden by consuming projects
        // to provide their own footnote component
        const parts = content.split(/\{\{FOOTNOTE:(.*?)\}\}/g);
        return parts.map((part, index) => {
            if (index % 2 === 1) {
                // This is footnote content - consuming project should provide footnote component
                return React.createElement('span', {
                    key: index,
                    className: 'footnote-placeholder',
                    'data-footnote-text': part
                }, `[FOOTNOTE: ${part}]`);
            }
            else {
                // This is regular text, so we need to render it as HTML
                return React.createElement('span', {
                    key: index,
                    dangerouslySetInnerHTML: { __html: part }
                });
            }
        });
    }
    /**
     * Basic footnote processing that can be overridden
     */
    static createFootnoteProcessor(FootnoteComponent) {
        return function processFootnotesWithComponent(htmlContent) {
            // First process page breaks
            let content = htmlContent.replace(/<p>\{\{PAGE_BREAK\}\}<\/p>/g, '<div style="page-break-before: always;"></div>');
            content = content.replace(/\{\{PAGE_BREAK\}\}/g, '<div style="page-break-before: always;"></div>');
            const parts = content.split(/\{\{FOOTNOTE:(.*?)\}\}/g);
            return parts.map((part, index) => {
                if (index % 2 === 1) {
                    // This is footnote content
                    return React.createElement(FootnoteComponent, { key: index }, part);
                }
                else {
                    // This is regular text
                    return React.createElement('span', {
                        key: index,
                        dangerouslySetInnerHTML: { __html: part }
                    });
                }
            });
        };
    }
}
