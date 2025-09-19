import * as React from "react";

export function SignatureBlock() {
  // Get current date and format it as "Month Day, Year"
  const currentDate = new Date();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const month = monthNames[currentDate.getMonth()];
  const day = currentDate.getDate();
  const year = currentDate.getFullYear();
  const formattedDate = `${month} ${day}, ${year}`;

  return (
    <div className="signature-block">
      <div className="signature-date">
        <div>Dated: Sunnyside, New York</div>
        <div className="current-date">{formattedDate}</div>
      </div>
      
      <div className="signature-section">
        <div className="signature-by">By:</div>
        <div className="signature-line"></div>
        <div className="signer-name">Matthew E. Keller</div>
        <div className="signer-title">Plaintiff, pro se</div>
        <div className="signer-address">38-27 52nd Street, 2 FL</div>
        <div className="signer-address">Sunnyside, New York 11104</div>
        <div className="signer-phone">(551) 206-0953</div>
      </div>
    </div>
  );
}