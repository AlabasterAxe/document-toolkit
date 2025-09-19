import * as React from "react";

type Party = {
  name: string;
  role: string;
};

type CaptionProps = {
  court: string;
  county: string;
  indexNumber: string;
  plaintiffs: Party[];
  defendants: Party[];
  documentType?: string;
};

export function Caption(props: CaptionProps) {
  return (
    <div className="caption-container">
      <div className="court-header">
        <div>{props.court.toUpperCase()}</div>
        <div>COUNTY OF {props.county.toUpperCase()}</div>
      </div>
      <table className="caption-table">
        <tbody>
          <tr>
            <td className="caption-cell parties">
              <div style={{ marginTop: "1em" }}>
                {props.plaintiffs.map((p, i) => (
                  <div key={i}>{p.name},</div>
                ))}
                <div className="party-role">
                  <em>Plaintiff,</em>
                </div>
              </div>
              <div className="caption-vs">- against -</div>
              <div>
                {props.defendants.map((d, i) => (
                  <div key={i}>{d.name},</div>
                ))}
                <div className="party-role">
                  <em>Defendant.</em>
                </div>
              </div>
            </td>
            <td className="caption-cell metadata">
              <div className="index-no">Index No. {props.indexNumber}</div>
              {props.documentType && (
                <div className="document-type">{props.documentType}</div>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
