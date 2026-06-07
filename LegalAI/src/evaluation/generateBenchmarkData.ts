/*
 * generateBenchmarkData.ts — Code generator for the 40 additional benchmark documents
 * and their corresponding questions.
 *
 * RUNNING THIS:
 *   npx tsx src/evaluation/generateBenchmarkData.ts
 */

import fs from 'fs';
import path from 'path';

interface DocConfig {
  filename: string;
  docType: string;
  partyA: string;
  partyB: string;
  scope: string;
  payment: string;
  term: string;
  notice: string;
  governingLaw: string;
  forum: string;
  extraDetail: string;
}

// Chunker function identical to retrievalBenchmark.ts
const splitIntoChunks = (text: string, chunkSize: number = 1000): string[] => {
  if (text.length <= chunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let currentPosition = 0;

  while (currentPosition < text.length) {
    let chunk = text.substring(currentPosition, currentPosition + chunkSize);

    if (currentPosition + chunkSize < text.length) {
      const paragraphBreak = chunk.lastIndexOf('\n\n');
      const lineBreak = chunk.lastIndexOf('\n');
      const sentenceEnd = chunk.lastIndexOf('. ');

      if (paragraphBreak > chunkSize * 0.5) {
        chunk = chunk.substring(0, paragraphBreak);
      } else if (lineBreak > chunkSize * 0.5) {
        chunk = chunk.substring(0, lineBreak);
      } else if (sentenceEnd > chunkSize * 0.5) {
        chunk = chunk.substring(0, sentenceEnd + 1);
      }
    }

    chunks.push(chunk.trim());
    currentPosition += chunk.length;

    while (currentPosition < text.length && text[currentPosition] === '\n') {
      currentPosition++;
    }
  }

  return chunks;
};

// 40 unique document configurations
const configs: DocConfig[] = [
  // 1. IP & Tech
  {
    filename: 'SoftwareLicenseAgreement.txt',
    docType: 'Proprietary Software License Agreement',
    partyA: 'NovaCore Systems Ltd',
    partyB: 'Vertex Manufacturing Corp',
    scope: 'desktop license key installation of the NovaCore CAD designer tools suite',
    payment: 'one-time licensing charge of $15,000 per workstation key',
    term: 'perpetual with annual maintenance options',
    notice: 'sixty (60) days advance notice',
    governingLaw: 'State of Texas',
    forum: 'Dallas County, Dallas',
    extraDetail: 'The software license is strictly restricted to fifty maximum installations.'
  },
  {
    filename: 'PatentLicenseAgreement.txt',
    docType: 'Exclusive Patent License Agreement',
    partyA: 'BioGen Research Institute',
    partyB: 'AstraPharma Enterprises',
    scope: 'use of the patented high-speed chemical synthesis technology described in Patent US-99281',
    payment: 'running royalty fee of 3.5% of all net commercial product sales',
    term: 'until the expiration date of the patent rights',
    notice: 'ninety (90) days notice of patent breach',
    governingLaw: 'State of Massachusetts',
    forum: 'Suffolk County, Boston',
    extraDetail: 'The license includes all child continuation-in-part patent claims.'
  },
  {
    filename: 'TrademarkAssignment.txt',
    docType: 'Trademark Assignment and Transfer Deed',
    partyA: 'Legacy Brands Corp',
    partyB: 'Modern Goods Holding Inc',
    scope: 'assignment of the registered logo trademark registration number TR-4429',
    payment: 'total purchase consideration of $75,000 paid at execution',
    term: 'unconditional permanent transfer',
    notice: 'ten (10) days notice to register the transfer',
    governingLaw: 'State of New York',
    forum: 'New York County, Manhattan',
    extraDetail: 'The assignment transfers all goodwill and international registration extensions.'
  },
  {
    filename: 'SaaSAgreement.txt',
    docType: 'Software-as-a-Service (SaaS) Terms of Service',
    partyA: 'CloudMetrics Inc',
    partyB: 'RetailPulse Logistics',
    scope: 'enterprise web access to the cloud analytics forecasting engines dashboard',
    payment: 'monthly subscription of $1,800 due on the first day of each month',
    term: 'initial duration of twenty-four (24) months',
    notice: 'thirty (30) days prior cancellation notice',
    governingLaw: 'State of California',
    forum: 'Santa Clara County, San Jose',
    extraDetail: 'The service guarantee guarantees 99.9% uptime exclusion of planned maintenance.'
  },
  {
    filename: 'EULAAgreement.txt',
    docType: 'End User License Agreement (EULA)',
    partyA: 'PixelPlay Games Ltd',
    partyB: 'Individual End User Participant',
    scope: 'personal interactive non-commercial installation of the virtual multiplayer platform application',
    payment: 'in-app transaction tokens purchase options',
    term: 'active until account deletion or terms violation',
    notice: 'immediate termination notice for cheating',
    governingLaw: 'State of Washington',
    forum: 'King County, Seattle',
    extraDetail: 'Any cheating, modding, or bot script injection results in immediate ban.'
  },
  {
    filename: 'WebsiteTermsOfService.txt',
    docType: 'Website Terms of Service and Access Conditions',
    partyA: 'Global Forums Network',
    partyB: 'Anonymous Site Visitor User',
    scope: 'temporary browser viewing and community post publishing rights on the forum web pages',
    payment: 'free site access funded by advertising banners',
    term: 'applicable to every individual site visit session',
    notice: 'discretionary immediate posting ban',
    governingLaw: 'State of Oregon',
    forum: 'Multnomah County, Portland',
    extraDetail: 'Users must be at least thirteen years old to register an active profile.'
  },
  {
    filename: 'PrivacyPolicy.txt',
    docType: 'Customer Information Privacy Policy Statement',
    partyA: 'Safeguard Fintech',
    partyB: 'Registered Bank App User',
    scope: 'collection, encryption, profiling, and sharing of consumer credit ratings and tracking cookies',
    payment: 'no fee policy for privacy statement disclosures',
    term: 'valid during account registration lifecycle',
    notice: 'thirty (30) days notice of policy updates',
    governingLaw: 'State of Virginia',
    forum: 'Fairfax County, Fairfax',
    extraDetail: 'The app encrypts all personal identification numbers using AES-256 protocols.'
  },
  {
    filename: 'DataProcessingAddendum.txt',
    docType: 'Data Processing Addendum (DPA) GDPR Annex',
    partyA: 'EuroCloud Storage',
    partyB: 'German Health Systems AG',
    scope: 'handling and secure cloud storage of European Union patient biometric details',
    payment: 'included inside the master platform services fees schedule',
    term: 'co-terminus with the primary cloud storage agreement',
    notice: 'forty-eight (48) hours data breach notice',
    governingLaw: 'Federal Republic of Germany',
    forum: 'Frankfurt District Court',
    extraDetail: 'The processor must notify the controller of sub-processor changes within 10 days.'
  },
  // 2. Corporate & Business
  {
    filename: 'PartnershipDeed.txt',
    docType: 'General Business Partnership Deed',
    partyA: 'David Miller (Partner A)',
    partyB: 'Michael Chang (Partner B)',
    scope: 'joint operation and asset management of the downtown bakery outlet storefront business',
    payment: 'equal fifty percent profit distribution split after tax deductions',
    term: 'ten (10) years fixed duration',
    notice: 'ninety (90) days dissolution notice requirement',
    governingLaw: 'State of Illinois',
    forum: 'Cook County, Chicago',
    extraDetail: 'Initial capital investment of $50,000 is contributed equally by each partner.'
  },
  {
    filename: 'ShareholdersAgreement.txt',
    docType: 'Corporate Shareholders Voting and Equity Agreement',
    partyA: 'Founders Syndicate Group',
    partyB: 'Beacon Venture Fund IV',
    scope: 'regulation of board seat selections and right of first refusal stock transfer restrictions',
    payment: 'pro-rata dividend payouts based on class A common stock holdings',
    term: 'valid until public stock market listing IPO launch',
    notice: 'fifteen (15) days board meeting notice',
    governingLaw: 'State of Delaware',
    forum: 'Chancery Court of Wilmington',
    extraDetail: 'Drag-along rights are activated if seventy-five percent of shareholders agree.'
  },
  {
    filename: 'ArticlesOfAssociation.txt',
    docType: 'Articles of Association of Private Limited Company',
    partyA: 'Registrar of Joint Stock Companies',
    partyB: 'Apex Logistics Private Limited',
    scope: 'internal governance rules for share allocation, director borrowing powers, and auditing audits',
    payment: 'authorized share capital of Rs. 10 Lakhs split into 1 Lakh shares',
    term: 'perpetual corporate existence until winding up',
    notice: 'twenty-one (21) days annual general meeting notice',
    governingLaw: 'Republic of India',
    forum: 'National Company Law Tribunal (NCLT) Delhi Bench',
    extraDetail: 'The maximum number of shareholders is capped at two hundred members.'
  },
  {
    filename: 'JointVentureAgreement.txt',
    docType: 'International Joint Venture and Collaboration Agreement',
    partyA: 'Pacific Motors Japan',
    partyB: 'Hindustan Assembly India',
    scope: 'joint establishment of an electric vehicle production facility in Chennai',
    payment: 'equity investment split of sixty-forty ratio by the joint venturers',
    term: 'initial operational duration of fifteen (15) years',
    notice: 'one hundred and eighty (180) days exit notice',
    governingLaw: 'laws of Singapore',
    forum: 'Singapore International Arbitration Centre (SIAC)',
    extraDetail: 'The venture targets manufacturing forty thousand units annually by year three.'
  },
  {
    filename: 'AssetPurchaseAgreement.txt',
    docType: 'Business Asset Purchase and Sale Contract',
    partyA: 'Gourmet Foods Retailers',
    partyB: 'Sunrise Bakeries Holding',
    scope: 'conveyance of kitchen machinery, ovens, supply contracts, and recipes list inventory',
    payment: 'total purchase transaction cost of $350,000 paid via wire transfer',
    term: 'closed immediately at the completion date',
    notice: 'five (5) business days escrow release notice',
    governingLaw: 'State of Ohio',
    forum: 'Franklin County, Columbus',
    extraDetail: 'The seller agrees to a three-year non-compete within a fifty-mile radius.'
  },
  {
    filename: 'FranchiseAgreement.txt',
    docType: 'Fast Food Outlet Franchise License Agreement',
    partyA: 'Burger Palace Franchising Ltd',
    partyB: 'Local Eats Franchisee Inc',
    scope: 'operation of a standardized quick service restaurant and proprietary brand menu access',
    payment: 'ongoing royalty commission of 6% of weekly gross sales figures',
    term: 'fixed duration of ten (10) years with renewal options',
    notice: 'thirty (30) days default remedy notice',
    governingLaw: 'State of Georgia',
    forum: 'Fulton County, Atlanta',
    extraDetail: 'The franchisee must purchase all secret sauces and breads from the franchisor.'
  },
  {
    filename: 'ConsultingAgreement.txt',
    docType: 'Professional Management Consulting Services Agreement',
    partyA: 'Vanguard Strategy Group',
    partyB: 'Horizon Shipping Corporation',
    scope: 'supply of logistics optimization advice and executive training seminars',
    payment: 'day rate of $2,500 plus approved business travel costs',
    term: 'six (6) months contract period',
    notice: 'fourteen (14) days early termination notice',
    governingLaw: 'State of New Jersey',
    forum: 'Essex County, Newark',
    extraDetail: 'Consultant is prohibited from lobbying competing shipping firms during term.'
  },
  {
    filename: 'SubcontractorAgreement.txt',
    docType: 'Construction Site Subcontractor Engagement Contract',
    partyA: 'Pinnacle Builders Corp',
    partyB: 'Standard Electrical Contractors',
    scope: 'complete rewiring, cable layout, and lighting installation at Phase 2 Office Park Complex',
    payment: 'total project fee of $120,000 payable upon milestones achievement',
    term: 'valid until electrical inspectors certificate issuance',
    notice: 'seven (7) days written cure notice',
    governingLaw: 'State of Florida',
    forum: 'Orange County, Orlando',
    extraDetail: 'Subcontractor must carry two million dollars in general liability insurance.'
  },
  // 3. Financial & Banking
  {
    filename: 'LoanAgreement.txt',
    docType: 'Secured Commercial Loan and Finance Agreement',
    partyA: 'Evergreen Savings Bank',
    partyB: 'Apex Warehouse Facilities LLC',
    scope: 'advance of five hundred thousand dollars principal loan amount',
    payment: 'fixed annual interest rate of 7.25% payable monthly',
    term: 'maturity term period of sixty (60) months total',
    notice: 'three (3) days event of default notice',
    governingLaw: 'State of Colorado',
    forum: 'Denver County Court, Denver',
    extraDetail: 'The loan is secured by a first lien on the warehouse property asset.'
  },
  {
    filename: 'PromissoryNote.txt',
    docType: 'Unsecured Promissory Note Agreement',
    partyA: 'Charles Henderson (Borrower)',
    partyB: 'Margaret Vance (Lender)',
    scope: 'written promise to pay thirty thousand dollars for school tuition fees',
    payment: 'accrued simple interest rate of 4% per year paid in full at maturity',
    term: 'payable in a single lump sum on December 31, 2027',
    notice: 'five (5) days default cure period',
    governingLaw: 'State of Utah',
    forum: 'Salt Lake County, Salt Lake City',
    extraDetail: 'Prepayment without penalty is permitted at any time during the term.'
  },
  {
    filename: 'MortgageDeed.txt',
    docType: 'Real Estate Mortgage and Trust Deed',
    partyA: 'First Mutual Lending LLC',
    partyB: 'Thomas Brown (Property Owner)',
    scope: 'pledge of the real estate residential property located at 54 Oak Lane',
    payment: 'monthly principal and interest payment of $1,750',
    term: 'thirty (30) years amortization schedule',
    notice: 'thirty (30) days acceleration and foreclosure notice',
    governingLaw: 'State of North Carolina',
    forum: 'Wake County, Raleigh',
    extraDetail: 'Failure to pay property taxes counts as a material default under the mortgage.'
  },
  {
    filename: 'EscrowAgreement.txt',
    docType: 'Tripartite Escrow Services Agreement',
    partyA: 'SafeGuard Escrow Trust Ltd',
    partyB: 'Buyer Group & Seller Group Co-Parties',
    scope: 'holding and release of transaction funds pending software code delivery confirmation',
    payment: 'flat escrow administration fee of $2,000 split between buyer and seller',
    term: 'terminated upon successful disbursement of all escrow funds',
    notice: 'five (5) days dispute filing window',
    governingLaw: 'State of Nevada',
    forum: 'Clark County, Las Vegas',
    extraDetail: 'The escrow agent is a passive depository only and has no fiduciary duties.'
  },
  {
    filename: 'GuarantyAgreement.txt',
    docType: 'Unconditional Personal Guaranty Contract',
    partyA: 'Venture Capital Partners (Lender)',
    partyB: 'Robert Jenkins (Guarantor)',
    scope: 'personal guarantee of all debt and payment obligations of Jenkins Tech Group',
    payment: 'unlimited secondary liability for all unpaid outstanding credit lines',
    term: 'survives until the corporate loan balance is fully paid',
    notice: 'immediate written demand for payment',
    governingLaw: 'State of Michigan',
    forum: 'Wayne County, Detroit',
    extraDetail: 'The guarantor waives all defenses of notice of acceptance or non-payment.'
  },
  {
    filename: 'EquipmentLeaseAgreement.txt',
    docType: 'Industrial Heavy Equipment Lease Contract',
    partyA: 'United Machinery Rental Corp',
    partyB: 'BuildFast Infrastructure Projects',
    scope: 'lease and supply of three CAT-320 hydraulic excavator machines',
    payment: 'rental fee of $4,500 per machine per calendar month',
    term: 'fixed lease duration of eighteen (18) months',
    notice: 'ten (10) days maintenance request notice',
    governingLaw: 'State of Arizona',
    forum: 'Maricopa County, Phoenix',
    extraDetail: 'The lessee is responsible for all routine oil changes and track repairs.'
  },
  // 4. Indian Law & Litigation
  {
    filename: 'LegalNoticeBreach.txt',
    docType: 'Legal Notice for Breach of Business Contract',
    partyA: 'Advocate Anil Mishra on behalf of clients',
    partyB: 'Metro Real Estate Developers Limited',
    scope: 'demand to cure construction delays and hand over flat possession within 30 days',
    payment: 'demand for refund of booking amount of Rs. 15 Lakhs with interest',
    term: 'active warning period before lawsuit filing',
    notice: 'fifteen (15) days statutory reply window',
    governingLaw: 'Section 80 of the Code of Civil Procedure (CPC)',
    forum: 'District Consumer Commission, Pune, Maharashtra',
    extraDetail: 'Failure to reply within 15 days will result in immediate civil court filing.'
  },
  {
    filename: 'WritPetition.txt',
    docType: 'Writ Petition under Article 226 of the Constitution of India',
    partyA: 'Resident Welfare Association Sector 5',
    partyB: 'State of Uttar Pradesh & Municipal Board',
    scope: 'plea to issue Writ of Mandamus directing cleanup of illegal garbage dump yard',
    payment: 'nominal court fee of Rs. 250 paid at filing registry',
    term: 'active litigation until final order/judgment',
    notice: 'fourteen (14) days notice to opposite government parties',
    governingLaw: 'Article 226 of the Constitution of India',
    forum: 'Honorable High Court of Judicature at Allahabad',
    extraDetail: 'The dump yard violates Article 21 rights to a clean and healthy environment.'
  },
  {
    filename: 'BailApplication.txt',
    docType: 'Bail Application under Section 439 of the CrPC / Section 482 of the BNSS',
    partyA: 'Sunil Gupta (Accused Applicant)',
    partyB: 'State (NCT of Delhi) Prosecution',
    scope: 'request for grant of regular bail in connection with FIR 054/2026',
    payment: 'personal surety bond of Rs. 50,000 with one local solvent surety',
    term: 'valid during the pendency of the criminal trial',
    notice: 'three (3) days notice to the public prosecutor',
    governingLaw: 'Section 439 of the Code of Criminal Procedure',
    forum: 'Court of the Sessions Judge, Patiala House Courts, New Delhi',
    extraDetail: 'The applicant is a respectable businessman with no prior criminal records.'
  },
  {
    filename: 'InjunctionApplication.txt',
    docType: 'Application for Temporary Injunction under Order 39 Rules 1 & 2 of CPC',
    partyA: 'Harish Mehta (Plaintiff Owner)',
    partyB: 'Suresh Patel (Defendant Encroacher)',
    scope: 'plea to restrain defendant from constructing a wall on the agricultural boundary line',
    payment: 'standard civil court fees paid as per the Court Fees Act',
    term: 'valid until final disposal of the main property suit',
    notice: 'immediate ad-interim ex-parte hearing request',
    governingLaw: 'Order 39 of the Code of Civil Procedure (CPC)',
    forum: 'Senior Civil Judge, Vadodara Court, Gujarat',
    extraDetail: 'The plaintiff has a strong prima facie case and balance of convenience is in his favor.'
  },
  {
    filename: 'PlaintCivilSuit.txt',
    docType: 'Civil Plaint for Recovery of Outstanding Business Debts',
    partyA: 'Krishna Trading Agency (Plaintiff)',
    partyB: 'Radhe Textiles Limited (Defendant)',
    scope: 'recovery of Rs. 8,50,000 due for supply of raw cotton materials fabric',
    payment: 'claim of Rs. 8.5 Lakhs principal plus 18% compound interest per annum',
    term: 'active litigation civil recovery proceeding',
    notice: 'thirty (30) days summons reply requirement',
    governingLaw: 'Order 7 Rule 1 of the Code of Civil Procedure (CPC)',
    forum: 'Honorable City Civil Court, Hyderabad, Telangana',
    extraDetail: 'The defendant failed to clear unpaid invoices despite multiple reminders.'
  },
  {
    filename: 'WrittenStatementDefense.txt',
    docType: 'Written Statement of Defense by Defendant',
    partyA: 'Radhe Textiles Limited (Defendant)',
    partyB: 'Krishna Trading Agency (Plaintiff)',
    scope: 'para-wise denial of plaint allegations and statement that goods delivered were defective',
    payment: 'counter-claim for refund of shipping charges of Rs. 50,000',
    term: 'pending trial adjudication stage',
    notice: 'thirty (30) days filing deadline extension requests',
    governingLaw: 'Order 8 Rule 1 of the Code of Civil Procedure (CPC)',
    forum: 'Honorable City Civil Court, Hyderabad, Telangana',
    extraDetail: 'The plaintiff delivered cotton with moisture content exceeding acceptable limits.'
  },
  {
    filename: 'GiftDeed.txt',
    docType: 'Registered Gift Deed for Residential Property',
    partyA: 'Ramesh Chawla (Donor Father)',
    partyB: 'Sanjay Chawla (Donee Son)',
    scope: 'unconditional transfer of residential house located at 12 Mall Road, Shimla',
    payment: 'transfer made out of natural love and affection without cash consideration',
    term: 'irrevocable permanent property conveyance',
    notice: 'immediate registration at sub-registrar office',
    governingLaw: 'Section 122 of the Transfer of Property Act, 1882',
    forum: 'Office of the Sub-Registrar, Shimla, Himachal Pradesh',
    extraDetail: 'The stamp duty has been paid in full based on the local circle rates.'
  },
  {
    filename: 'WillAndTestament.txt',
    docType: 'Last Will and Testament of Assets Distribution',
    partyA: 'Gopal Krishna Sen (Testator)',
    partyB: 'Beneficiary Children and Family',
    scope: 'bequeathing of bank balance, gold ornaments, and ancestral land property',
    payment: 'no financial consideration applies to testamentary gifts',
    term: 'takes effect solely upon the demise of the Testator',
    notice: 'no requirement of registration during lifetime',
    governingLaw: 'Indian Succession Act, 1925',
    forum: 'District Courts of Alipore, Kolkata, West Bengal',
    extraDetail: 'The Testator appoints his trusted friend Ashok Bose as the Sole Executor.'
  },
  {
    filename: 'LeaseDeedCommercial.txt',
    docType: 'Commercial Lease Deed for Office Space',
    partyA: 'DLF CyberParks Limited (Lessor)',
    partyB: 'TechGlobal Solutions Private Limited (Lessee)',
    scope: 'lease of 5,000 square feet office space in Tower B, DLF Cyber City, Gurgaon',
    payment: 'monthly rent of Rs. 4,50,000 with a mandatory 15% increase every three years',
    term: 'lease term of nine (9) years with five years lock-in period',
    notice: 'ninety (90) days termination notice period',
    governingLaw: 'Transfer of Property Act, 1882',
    forum: 'District Courts of Gurgaon, Haryana',
    extraDetail: 'The Lessee shall pay six months rent as interest-free security deposit.'
  },
  {
    filename: 'PartitionDeed.txt',
    docType: 'Deed of Partition among Co-Parceners',
    partyA: 'Devendra Sharma (Brother A)',
    partyB: 'Rajendra Sharma (Brother B)',
    scope: 'division of undivided ancestral agricultural land measuring 10 acres in Rohtak',
    payment: 'equal partition into two plots of 5 acres each marked as Plot A and Plot B',
    term: 'permanent division of joint family property',
    notice: 'immediate mutation of land records registry',
    governingLaw: 'Hindu Succession Act, 1956',
    forum: 'Tehsildar Office, Rohtak District, Haryana',
    extraDetail: 'The brothers declare that they no longer hold any joint interest in the land.'
  },
  {
    filename: 'SaleDeedProperty.txt',
    docType: 'Absolute Sale Deed for Residential Plot',
    partyA: 'Karan Malhotra (Vendor Seller)',
    partyB: 'Vijay Mehra (Vendee Buyer)',
    scope: 'sale and transfer of plot number 456, Sector 15, Faridabad, Haryana',
    payment: 'total sale consideration of Rs. 55 Lakhs paid via bank demand draft',
    term: 'permanent conveyance of clear title and possession',
    notice: 'immediate registration at registrar office within thirty days',
    governingLaw: 'Section 54 of the Transfer of Property Act, 1882',
    forum: 'Registrar Office, Faridabad, Haryana',
    extraDetail: 'The Vendor warrants that the property is free from all mortgages and liens.'
  },
  {
    filename: 'IndemnityBond.txt',
    docType: 'Indemnity Bond for Issuance of Duplicate Share Certificate',
    partyA: 'Suresh Chand (Indemnifier Shareholder)',
    partyB: 'Reliance Industries Limited (Company)',
    scope: 'indemnifying the company against losses from issuing duplicate certificates for 100 shares',
    payment: 'bond executed on Rs. 200 non-judicial stamp paper',
    term: 'remains valid indefinitely protecting company interests',
    notice: 'immediate notice of recovery of original certificates',
    governingLaw: 'Indian Contract Act, 1872',
    forum: 'City Civil Court, Mumbai, Maharashtra',
    extraDetail: 'The original share certificates were lost during relocation on March 10.'
  },
  // 5. Consumer, Labor & Misc
  {
    filename: 'EmploymentOfferLetter.txt',
    docType: 'Formal Employment Offer and Appointment Letter',
    partyA: 'Trident Tech Labs Private Limited',
    partyB: 'Kunal Verma (Candidate)',
    scope: 'appointment as Lead Data Analyst based out of Bangalore office',
    payment: 'total annual Cost to Company package of Rs. 18,00,000',
    term: 'continuous employment subject to probationary review',
    notice: 'three (3) months notice period or equivalent basic salary',
    governingLaw: 'Karnataka Shops and Commercial Establishments Act',
    forum: 'Labor Commissioner Court, Bangalore, Karnataka',
    extraDetail: 'The candidate must join the organization on or before July 1, 2026.'
  },
  {
    filename: 'NonCompeteAgreement.txt',
    docType: 'Employee Non-Compete and Restrictive Covenant',
    partyA: 'CyberSecurity Solutions Inc',
    partyB: 'Marcus Fletcher (Security Architect)',
    scope: 'restriction from employment with competing cyber intelligence companies',
    payment: 'special consideration fee of $10,000 paid upon departure',
    term: 'valid for twelve (12) months after employment termination',
    notice: 'thirty (30) days compliance review notice',
    governingLaw: 'State of Virginia',
    forum: 'Fairfax County Court, Fairfax',
    extraDetail: 'The restriction applies strictly within a geographical radius of 100 miles.'
  },
  {
    filename: 'SeveranceAgreement.txt',
    docType: 'Mutual Severance and General Liability Release',
    partyA: 'Nexa Media Group LLC',
    partyB: 'Linda Collins (Outgoing Director)',
    scope: 'mutual separation of employment, waiver of claims, and return of company laptop',
    payment: 'lump sum severance package payment of $45,000 less tax withholdings',
    term: 'final separation agreement effective June 30, 2026',
    notice: 'twenty-one (21) days review and consideration period',
    governingLaw: 'State of New York',
    forum: 'New York County, New York',
    extraDetail: 'The employee releases the company from all age and gender discrimination claims.'
  },
  {
    filename: 'ArbitrationAgreement.txt',
    docType: 'Standalone Dispute Resolution and Arbitration Agreement',
    partyA: 'Omega FinServ Corp',
    partyB: 'Apex Wealth Investors',
    scope: 'resolution of all future financial disputes through binding private arbitration',
    payment: 'arbitrator fees split equally between the contesting parties',
    term: 'survives expiration or termination of the master agreement',
    notice: 'thirty (30) days notice to initiate arbitration',
    governingLaw: 'Federal Arbitration Act (FAA)',
    forum: 'American Arbitration Association (AAA) in New York',
    extraDetail: 'The arbitration panel shall consist of three retired federal judges.'
  },
  {
    filename: 'MedicalMalpracticeComplaint.txt',
    docType: 'Civil Complaint for Medical Malpractice and Negligence',
    partyA: 'Alice Higgins (Plaintiff patient)',
    partyB: 'St. Jude Community Hospital (Defendant)',
    scope: 'suit for failure to diagnose internal bleeding following abdominal surgery',
    payment: 'demand for compensatory damages of $1.2 Million for medical costs',
    term: 'pending trial civil court lawsuit',
    notice: 'ninety (90) days intent to sue notice served',
    governingLaw: 'State of Florida',
    forum: 'Broward County Circuit Court, Fort Lauderdale',
    extraDetail: 'The operating surgeon failed to order standard post-operative blood counts.'
  },
  {
    filename: 'InsuranceClaimAffidavit.txt',
    docType: 'Affidavit in Support of Fire Insurance Claim',
    partyA: 'Harsimran Singh (Policyholder)',
    partyB: 'National Insurance Company Limited',
    scope: 'statement of inventory lost during warehouse fire incident on April 15, 2026',
    payment: 'claim value of Rs. 35,00,000 for destroyed cotton stocks',
    term: 'active claim processing assessment phase',
    notice: 'seven (7) days notice of fire incident served',
    governingLaw: 'Insurance Act, 1938',
    forum: 'National Consumer Disputes Redressal Commission (NCDRC), Delhi',
    extraDetail: 'The fire survey report confirms electrical short circuit as the root cause.'
  }
];

// Helper to generate a realistic text document from config parameters
const generateDocumentText = (c: DocConfig): string => {
  return `${c.docType.toUpperCase()}

This ${c.docType} ("Agreement") is executed on this day, by and between:
1. ${c.partyA} ("First Party" / "Disclosing Party" / "Grantor"), and
2. ${c.partyB} ("Second Party" / "Receiving Party" / "Grantee").

1. SCOPE AND CORE OBLIGATIONS
The primary scope of work and services governed by this agreement includes the ${c.scope}. The parties agree to perform their respective roles with due diligence and in accordance with standard industry practices. ${c.extraDetail}

2. CONSIDERATION AND PAYMENT TERMS
In consideration of the rights and services granted herein, the parties agree to the payment schedule consisting of: ${c.payment}. Payment shall be disbursed in full compliance with the invoices submitted. All invoices must be cleared in accordance with the billing cycle terms.

3. DURATION AND TERMINATION
The contract term shall remain in force for the ${c.term}. Either party may terminate this agreement early by providing ${c.notice} to the other party. Upon termination, all outstanding payments must be cleared immediately.

4. GOVERNING LAW AND COURT JURISDICTION
This agreement shall be governed by, and interpreted in accordance with, the ${c.governingLaw}. Any disputes, differences, or legal actions arising out of or related to this agreement shall be brought exclusively before the courts located in ${c.forum}.
`;
};

const runGenerator = () => {
  console.log('Generating 40 benchmark documents and corresponding questions...\n');

  const targetDocsDir = path.join(__dirname, 'benchmarkDocuments');
  const targetQuestionsPath = path.join(__dirname, 'benchmarkQuestions.json');

  // Verify benchmarkQuestions.json exists to preserve manual questions
  if (!fs.existsSync(targetQuestionsPath)) {
    console.error(`Error: Questions file not found at ${targetQuestionsPath}`);
    process.exit(1);
  }

  // Load the current questions (which should be the 50 manual ones)
  const manualQuestions = JSON.parse(fs.readFileSync(targetQuestionsPath, 'utf8'));
  console.log(`Loaded ${manualQuestions.length} existing manual questions.`);

  // Filter out any previously generated questions (to support re-running cleanly)
  // We keep questions with id matching q1 to q50 (our manual ones)
  const preservedQuestions = manualQuestions.filter((q: any) => {
    const numericId = parseInt(q.id.replace('q', ''), 10);
    return numericId <= 50;
  });
  console.log(`Preserved ${preservedQuestions.length} manual questions (q1-q50).`);

  const generatedQuestions: any[] = [];
  let questionCounter = 51;

  for (const c of configs) {
    // Generate text and write to document file
    const docText = generateDocumentText(c);
    const docPath = path.join(targetDocsDir, c.filename);
    fs.writeFileSync(docPath, docText, 'utf8');

    // Run chunking to find exact chunk indices for questions
    const chunks = splitIntoChunks(docText);

    // Create 5 questions for this document
    const questionsForDoc = [
      {
        id: `q${questionCounter++}`,
        documentName: c.filename,
        query: `What are the names of the First Party and Second Party in this agreement?`,
        expectedText: c.partyA,
        expectedChunkIndex: -1 // to be populated
      },
      {
        id: `q${questionCounter++}`,
        documentName: c.filename,
        query: `What is the scope of work and core obligations under section 1 of this agreement?`,
        expectedText: c.scope,
        expectedChunkIndex: -1
      },
      {
        id: `q${questionCounter++}`,
        documentName: c.filename,
        query: `What are the consideration and payment terms under section 2 of this agreement?`,
        expectedText: c.payment,
        expectedChunkIndex: -1
      },
      {
        id: `q${questionCounter++}`,
        documentName: c.filename,
        query: `What is the duration, termination notice, and contract term under section 3 of this agreement?`,
        expectedText: c.notice,
        expectedChunkIndex: -1
      },
      {
        id: `q${questionCounter++}`,
        documentName: c.filename,
        query: `What is the governing law and court jurisdiction under section 4 of this agreement?`,
        expectedText: c.governingLaw,
        expectedChunkIndex: -1
      }
    ];

    // Find expected chunk index for each question based on chunk text match
    for (const q of questionsForDoc) {
      let foundIndex = 0;
      for (let i = 0; i < chunks.length; i++) {
        if (chunks[i].toLowerCase().includes(q.expectedText.toLowerCase())) {
          foundIndex = i;
          break;
        }
      }
      q.expectedChunkIndex = foundIndex;
      generatedQuestions.push(q);
    }
  }

  // Combine and write back
  const allQuestions = [...preservedQuestions, ...generatedQuestions];
  fs.writeFileSync(targetQuestionsPath, JSON.stringify(allQuestions, null, 2), 'utf8');

  console.log(`Generated 40 documents in ${targetDocsDir}`);
  console.log(`Added ${generatedQuestions.length} generated questions to ${targetQuestionsPath}`);
  console.log(`Total questions in dataset: ${allQuestions.length}`);
};

runGenerator();
