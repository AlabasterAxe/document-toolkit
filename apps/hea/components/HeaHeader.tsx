type Party = {
  name: string;
  role: string;
};

export type HeaderProps = {
  inventorName: string;
  applicationNumber: string;
  artUnit: string;
  examinerName: string;
  filingDate: string;
  confirmationNumber: string;
  inventionName: string;
  attorneyDocketNumber: string;
  customerNumber: string;
  documentType: string;
};

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function HeaUsptoResponseHeader(props: HeaderProps) {
  return (
    <div className="hea-uspto-response-header">
      <div className="uspto-header">
        IN THE UNITED STATES PATENT AND TRADEMARK OFFICE
      </div>
      <table className="header-table">
        <tbody>
          <tr>
            <td className="caption-cell inventor-name">
              In re the Application of: {props.inventorName}
            </td>

            <td className="caption-cell art-unit">Art Unit: {props.artUnit}</td>
          </tr>
          <tr>
            <td className="caption-cell application-number">
              Application Number: {props.applicationNumber}
            </td>

            <td className="caption-cell examiner-name">
              Examiner: {props.examinerName}
            </td>
          </tr>
          <tr>
            <td className="caption-cell filing-date">
              Filed: {formatDate(props.filingDate)}
            </td>

            <td className="caption-cell confirmation-number">
              Confirmation Number: {props.confirmationNumber}
            </td>
          </tr>
          <tr>
            <td className="caption-cell invention-name" colSpan={2}>
              For: {props.inventionName}
            </td>
          </tr>
          <tr>
            <td className="caption-cell attorney-docket-number-label">
              Attorney Docket Number:
            </td>

            <td className="caption-cell attorney-docket-number-value">
              {props.attorneyDocketNumber}
            </td>
          </tr>
          <tr>
            <td className="caption-cell customer-number-label">
              Customer Number:
            </td>

            <td className="caption-cell customer-number-value">
              {props.customerNumber}
            </td>
          </tr>
          <tr>
            <td className="caption-cell document-name" colSpan={2}>
              {props.documentType}
            </td>
          </tr>
          <tr>
            <td className="caption-cell">
              <div>Commissioner for Patents</div>
              <div>P.O. Box 1450</div>
              <div>Alexandria, VA 22313-1450</div>
            </td>
            <td
              className="caption-cell"
              style={{ textAlign: "right", verticalAlign: "top" }}
            >
              {formatDate(new Date())}
            </td>
          </tr>
          <tr>
            <td className="caption-cell" colSpan={2}>
              <br />
              Commissioner:
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
