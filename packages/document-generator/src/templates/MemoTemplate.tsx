import * as React from "react";

export interface MemoTemplateProps {
  from?: string;
  to?: string;
  re?: string;
  date?: string;
  markdownContent?: string;
  styles?: string;
  children?: React.ReactNode;
}

export const MemoTemplate: React.FC<MemoTemplateProps> = ({
  from,
  to,
  re,
  date,
  markdownContent,
  styles,
  children,
}) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>{re ? `Memo: ${re}` : "Memo"}</title>
        {styles && <style dangerouslySetInnerHTML={{ __html: styles }} />}
      </head>
      <body>
        <div className="memo-header">
          <div className="memo-fields">
            {to && (
              <div className="memo-field">
                <span className="memo-field-label">To:</span>
                <span className="memo-field-value">{to}</span>
              </div>
            )}
            {from && (
              <div className="memo-field">
                <span className="memo-field-label">From:</span>
                <span className="memo-field-value">{from}</span>
              </div>
            )}
            {date && (
              <div className="memo-field">
                <span className="memo-field-label">Date:</span>
                <span className="memo-field-value">{date}</span>
              </div>
            )}
            {re && (
              <div className="memo-field">
                <span className="memo-field-label">Re:</span>
                <span className="memo-field-value">{re}</span>
              </div>
            )}
          </div>

          <div className="memo-divider"></div>
        </div>

        <div className="memo-content">
          {markdownContent && (
            <div dangerouslySetInnerHTML={{ __html: markdownContent }} />
          )}
          {children}
        </div>
      </body>
    </html>
  );
};

export default MemoTemplate;
