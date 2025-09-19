import * as React from "react";
import { Caption } from "../../project-templates/components/Caption";
import { SignatureBlock } from "../../project-templates/components/SignatureBlock";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const caseInfo = JSON.parse(
  readFileSync(
    join(__dirname, "..", "..", "project-templates", "case-info.json"),
    "utf-8"
  )
);

interface DocumentSection {
  title: string;
  paragraphs: string[];
}

interface CountSection {
  title: string;
  subtitle: string;
  paragraphs: string[];
}

/**
 * Amended Complaint with structured sections and automatic paragraph numbering
 */
export default function AmendedComplaint() {
  // Define all document sections with their paragraphs
  const sections: DocumentSection[] = [
    {
      title: "PARTIES",
      paragraphs: [
        "Plaintiff Matthew E. Keller is a resident of Queens County, New York.",
        "Upon information and belief, Defendant St. John's University (hereinafter referred to as \"St. John's\") is a university formed under the laws of the State of New York residing in Queens County, New York.",
        'Upon information and belief, Defendant RSC Insurance Brokerage, Inc. (hereinafter referred to as "Risk Strategies") is a corporation formed under the laws of the State of Delaware, licensed to do business in the State of New York.',
        'Upon information and belief, Defendant Aetna Student Health Agency Inc. (hereinafter referred to as "Aetna Student Health") is a corporation formed under the laws of the State of Massachusetts, licensed to do business in the State of New York.',
        'Upon information and belief, Defendant Aetna Life Insurance Company (hereinafter referred to as "Aetna") is a corporation formed under the laws of the State of Connecticut, licensed to do business in the State of New York.',
        'Upon information and belief, Risk Strategies offers student health insurance plans under the "University Health Plans" brand.',
        "Upon information and belief, St. John's retained Risk Strategies to offer and administer its student health insurance plan (a copy of St. John's student health insurance informational website is attached as Exhibit \"I\").",
        "Upon information and belief, Aetna Student Health offers health insurance products to universities on behalf of Aetna Life Insurance Company.",
        'Upon information and belief, Aetna Life Insurance Company was the underwriter of St. John\'s Student Health Insurance Plan for the 2024-2025 academic year and continues to be the underwriter for the 2025-2026 academic year (see Exhibit "B", p. 2; Exhibit "D", p. 2).',
      ],
    },
    {
      title: "JURISDICTION AND VENUE",
      paragraphs: [
        "This Court has subject matter jurisdiction over this action pursuant to NY CLS Const Art VI, § 7, as the New York Supreme Court has general original jurisdiction in law and equity.",
        "This Court has general personal jurisdiction over St. John's pursuant to NY CLS CPLR § 301 because it is a not-for-profit corporation with its principal place of business in Queens County, New York.",
        "This Court has personal jurisdiction over Risk Strategies pursuant to NY CLS CPLR § 302 because it is a corporation that does business in Queens County, New York.",
        "This Court has personal jurisdiction over Aetna Student Health pursuant to NY CLS CPLR § 302 because it is a corporation that does business in Queens County, New York.",
        "This Court has personal jurisdiction over Aetna pursuant to NY CLS CPLR § 302 because it is a corporation that does business in Queens County, New York.",
        "Venue is proper in this Court pursuant to NY CLS CPLR § 503, as Plaintiff resides in Queens County, New York.",
      ],
    },
    {
      title: "STATEMENT OF FACTS",
      paragraphs: [
        "Plaintiff Matthew E. Keller is a student at St. John's University School of Law. (St. John's enrollment certificate attached hereto as Exhibit \"A\")",
        'Upon information and belief, at all times hereinafter mentioned, St. John\'s has offered a student health insurance plan (SHIP). Students living on St. John\'s campuses are automatically enrolled in SHIP and have the option to waive if they have comparable insurance (hereinafter referred to as the "resident group"). Off-campus students may opt into SHIP. (hereinafter referred to as the "non-resident group") (A copy of the 2024-25 St. John\'s SHIP plan summary is attached hereto as Exhibit "B")',
        'For the 2024-2025 academic year defendants offered SHIP to all registered undergraduate and graduate students actively taking classes with annual premiums of $3,942. (Exhibit "B", p. 2)',
        "Plaintiff enrolled in St. John's SHIP program for the 2024-2025 academic year. (A copy of Plaintiff's receipt for enrolling in SHIP for the 2024-25 academic year is attached hereto as Exhibit \"C\")",
        'For the 2025-2026 academic year, the defendants split the SHIP program offering the same benefits at different premiums for resident and non-resident students. Resident students have annual premiums of $3,544. (A copy of the 2025-26 St. John\'s SHIP plan summary is attached hereto as Exhibit "D") Non-resident students have annual premiums of $11,862. (Exhibit "D", p. 3) This is a difference of $8,318 between the premiums charged to resident students and non-resident students. This amounts to non-resident students paying 235% more than resident students.',
        "On July 29th, 2025, Plaintiff enrolled in St. John's off-campus student health insurance plan at a cost of $11,862. (A copy of Plaintiff's receipt for enrolling in SHIP for the 2025-26 academic year is attached hereto as Exhibit \"E\")",
        "Upon information and belief, the utilization of the median student between the resident group and non-resident group is not significantly different and the utilization of the non-resident group is mostly explained by a small number of outliers that have a utilization rate that is not characteristic of the group.",
        "Upon information and belief, the decision to split the SHIP program was not the result of an actuarially justified risk classification.",
      ],
    },
  ];

  // Define counts with specialized handling
  const counts: CountSection[] = [
    {
      title: "COUNT ONE",
      subtitle:
        "Unfair Discrimination in Violation of NY CLS Ins. § 4224(b)(1)\n(against all defendants)",
      paragraphs: [
        "Given that the utilization rate of the median member of the resident group and non-resident group are not significantly different, the members of the non-resident group and the members of the resident group are members of a single class, defined by their eligibility to participate in St. John's SHIP Program.",
        "The tremendous increase and incredible disparity in premiums constitute unfair discrimination in premiums of members of the same class in violation of New York Insurance Law § 4224(b)(1).",
        "Given that Plaintiff is a non-resident member of St. John's SHIP program, Plaintiff suffered harm from being denied access to SHIP at the same rate as resident students as a direct and proximate result of the defendants' unlawful discriminatory practices.",
      ],
    },
    {
      title: "COUNT TWO",
      subtitle:
        "Unfair Discrimination in Violation of NY CLS Ins. § 4224(b)(1)\n(against all defendants)",
      paragraphs: [
        "Given that Defendant St. John's treated all students as a single class in the 2024-25 academic year and the decision to split the SHIP program was not actuarially justified, the members of the non-resident group and the members of the resident group are members of the same class as described in 4224(b)(1).",
        "Given the tremendous increase and incredible disparity in premiums, the splitting of the single 2024-25 class into non-resident and resident groups constitutes unfair discrimination in premiums against non-resident members of the single 2024-25 class in violation of New York Insurance Law § 4224(b)(1).",
        "Given that Plaintiff was a non-resident member of the single 2024-25 class, Plaintiff suffered harm from being denied access to SHIP at the same rate as resident students as a direct and proximate result of the defendants' unlawful discriminatory practices.",
      ],
    },
  ];

  // Calculate paragraph numbers automatically
  let paragraphNumber = 1;
  const getSectionWithNumbers = (section: DocumentSection) => {
    const startNumber = paragraphNumber;
    paragraphNumber += section.paragraphs.length;
    return { ...section, startNumber };
  };

  const getCountWithNumbers = (
    count: CountSection,
    factualParagraphsCount: number
  ) => {
    const startNumber = paragraphNumber;
    const incorporationParagraph = `Plaintiff repeats and realleges the allegations set forth in paragraphs 1 through ${factualParagraphsCount} as if fully set forth herein.`;
    paragraphNumber += 1 + count.paragraphs.length; // +1 for incorporation paragraph
    return { ...count, startNumber, incorporationParagraph };
  };

  // Calculate section numbers
  const numberedSections = sections.map(getSectionWithNumbers);
  const factualParagraphsCount = numberedSections.reduce(
    (total, section) => total + section.paragraphs.length,
    0
  );
  const numberedCounts = counts.map((count) =>
    getCountWithNumbers(count, factualParagraphsCount)
  );

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>Amended Complaint</title>
        <link rel="stylesheet" href="legal-style.css" />
        <style>{`
          .count-subtitle {
            text-align: center;
            font-weight: normal;
            margin-bottom: 1em;
            white-space: pre-line;
          }
        `}</style>
      </head>
      <body>
        <Caption {...caseInfo} documentType="VERIFIED AMENDED COMPLAINT" />

        <main>
          <p>
            Plaintiff Matthew E. Keller, pro se, by way of Complaint, upon
            information and belief, alleges as follows:
          </p>

          {/* Render main sections with automatic numbering */}
          {numberedSections.map((section) => (
            <React.Fragment key={section.title}>
              <h1>{section.title}</h1>
              <ol start={section.startNumber}>
                {section.paragraphs.map((paragraph, index) => (
                  <li key={index}>{paragraph}</li>
                ))}
              </ol>
            </React.Fragment>
          ))}

          {/* Render counts with specialized formatting */}
          {numberedCounts.map((count) => (
            <React.Fragment key={count.title}>
              <h1>{count.title}</h1>
              <div className="count-subtitle">({count.subtitle})</div>
              <ol start={count.startNumber}>
                <li>{count.incorporationParagraph}</li>
                {count.paragraphs.map((paragraph, index) => (
                  <li key={index}>{paragraph}</li>
                ))}
              </ol>
            </React.Fragment>
          ))}

          {/* Prayer for relief */}
          <p>
            <strong>WHEREFORE</strong>, by reason of the foregoing, plaintiff
            Matthew E. Keller hereby respectfully requests the following relief:
          </p>
          <div style={{ marginLeft: "2em" }}>
            <p>
              a. A permanent injunction enjoining the defendants from charging
              different health insurance premiums to classes that are not
              actuarially justified.
            </p>
            <p>
              b. Compensatory damages in the amount of $8,318 against Defendant.
            </p>
            <p>c. Such other relief as the Court deems just and proper.</p>
          </div>

          {/* Jury demand */}
          <h1>JURY DEMAND</h1>
          <p>Plaintiff demands a trial by jury on all issues so triable.</p>
        </main>

        <SignatureBlock />
      </body>
    </html>
  );
}
