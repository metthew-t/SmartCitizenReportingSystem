/**
 * Official Government Document Export Engine
 * Generates ISO/Public Administration compliant government dossiers
 * in Microsoft Word (.doc), Excel (.csv), and printable PDF formats.
 */

export interface ExportReportData {
  reference_number: string
  title: string
  report_type: string
  level: string
  sender_name: string
  sender_role: string
  department_name: string
  priority: string
  status: string
  executive_summary: string
  findings: string
  recommendations?: string | null
  linked_case_number?: string | null
  linked_report_title?: string | null
  reviewer_name?: string | null
  reviewer_feedback?: string | null
  reviewed_at?: string | null
  created_at: string
}

/**
 * Generates and downloads a Microsoft Word (.doc) document formatted
 * according to Ethiopian & international public administration letterhead standards.
 */
export function exportToWord(report: ExportReportData): void {
  const dateFormatted = new Date(report.created_at).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
  const reviewDateFormatted = report.reviewed_at ? new Date(report.reviewed_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  }) : 'Pending Official Review'

  const htmlContent = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset="utf-8">
<title>${report.reference_number} - ${report.title}</title>
<style>
  @page Section1 {
    size: 21.0cm 29.7cm; /* A4 Standard */
    margin: 2.54cm 2.54cm 2.54cm 2.54cm;
    mso-header-margin: 1.25cm;
    mso-footer-margin: 1.25cm;
    mso-paper-source: 0;
  }
  div.Section1 { page: Section1; }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #111827;
  }
  .header-table {
    width: 100%;
    border-bottom: 3pt double #1e3a8a;
    padding-bottom: 12pt;
    margin-bottom: 16pt;
    text-align: center;
  }
  .republic {
    font-size: 10pt;
    font-weight: bold;
    letter-spacing: 1.5pt;
    color: #1e3a8a;
    text-transform: uppercase;
  }
  .admin-title {
    font-size: 16pt;
    font-weight: bold;
    color: #0f172a;
    margin: 4pt 0;
    letter-spacing: 0.5pt;
  }
  .sub-title {
    font-size: 10pt;
    font-style: italic;
    color: #475569;
  }
  .meta-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 16pt;
    border: 1pt solid #cbd5e1;
  }
  .meta-table td {
    padding: 6pt 10pt;
    border: 1pt solid #cbd5e1;
    font-size: 10pt;
  }
  .meta-label {
    background-color: #f1f5f9;
    font-weight: bold;
    color: #334155;
    width: 25%;
  }
  .subject-block {
    background-color: #f8fafc;
    border-left: 4pt solid #1e3a8a;
    padding: 10pt 14pt;
    margin-bottom: 16pt;
  }
  .subject-label {
    font-size: 9pt;
    font-weight: bold;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 1pt;
  }
  .subject-title {
    font-size: 13pt;
    font-weight: bold;
    color: #0f172a;
    margin-top: 3pt;
  }
  .section-heading {
    font-size: 11pt;
    font-weight: bold;
    text-transform: uppercase;
    color: #1e3a8a;
    border-bottom: 1pt solid #94a3b8;
    padding-bottom: 3pt;
    margin-top: 14pt;
    margin-bottom: 6pt;
  }
  .content-box {
    text-align: justify;
    margin-bottom: 12pt;
    white-space: pre-wrap;
  }
  .signature-table {
    width: 100%;
    margin-top: 24pt;
    border-collapse: collapse;
  }
  .signature-table td {
    width: 50%;
    vertical-align: top;
    padding: 10pt;
  }
  .sig-line {
    border-top: 1pt solid #0f172a;
    margin-top: 40pt;
    padding-top: 4pt;
    font-size: 10pt;
  }
  .stamp-box {
    border: 1.5pt dashed #94a3b8;
    padding: 8pt;
    margin-top: 8pt;
    text-align: center;
    color: #64748b;
    font-size: 9pt;
  }
  .footer-notice {
    margin-top: 30pt;
    border-top: 1pt solid #e2e8f0;
    padding-top: 8pt;
    text-align: center;
    font-size: 8pt;
    color: #64748b;
  }
</style>
</head>
<body>
<div class="Section1">
  <!-- Official Government Header -->
  <table class="header-table">
    <tr>
      <td>
        <div class="republic">FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA &bull; OROMIA REGIONAL STATE</div>
        <div class="admin-title">ADAMA CITY ADMINISTRATION</div>
        <div class="sub-title">BULCHIINSA MAGAALAA ADAAMAA &bull; WAAJJIRA BULCHIINSAA</div>
        <div style="font-size: 9pt; color: #1e3a8a; font-weight: bold; margin-top: 4pt; letter-spacing: 1pt;">
          OFFICIAL ADMINISTRATIVE DOSSIER / GABAASA WAAJJIRA MOOTUMMAA
        </div>
      </td>
    </tr>
  </table>

  <!-- Reference & Indexing Table -->
  <table class="meta-table">
    <tr>
      <td class="meta-label">Reference Number:</td>
      <td style="font-weight: bold; font-family: monospace; color: #1e3a8a;">${report.reference_number}</td>
      <td class="meta-label">Date of Filing:</td>
      <td>${dateFormatted}</td>
    </tr>
    <tr>
      <td class="meta-label">Originating Sector:</td>
      <td><strong>${report.department_name}</strong></td>
      <td class="meta-label">Classification / Priority:</td>
      <td style="font-weight: bold; color: ${report.priority === 'CRITICAL' ? '#b91c1c' : '#1e3a8a'};">${report.priority}</td>
    </tr>
    <tr>
      <td class="meta-label">Reporting Official:</td>
      <td>${report.sender_name} (${report.sender_role})</td>
      <td class="meta-label">Dossier Level:</td>
      <td>${report.level === 'OFFICER_TO_MANAGER' ? 'Officer to Department Manager' : 'Department Manager to City Admin'}</td>
    </tr>
    ${report.linked_case_number ? `
    <tr>
      <td class="meta-label">Linked Incident Case:</td>
      <td colspan="3" style="color: #0284c7; font-weight: bold;">
        Case #${report.linked_case_number} &mdash; ${report.linked_report_title || 'Citizen Report'}
      </td>
    </tr>` : ''}
    <tr>
      <td class="meta-label">Review Status:</td>
      <td colspan="3"><strong>${report.status}</strong></td>
    </tr>
  </table>

  <!-- Subject Block -->
  <div class="subject-block">
    <div class="subject-label">Subject / Official Administrative Brief</div>
    <div class="subject-title">${report.title}</div>
  </div>

  <!-- Section 1: Executive Summary -->
  <div class="section-heading">1. Executive Summary / Cuunfaa Gabaasaa</div>
  <div class="content-box">${report.executive_summary}</div>

  <!-- Section 2: Detailed Findings & Evidence -->
  <div class="section-heading">2. Detailed Findings & Field Evidence / Qorannoo fi Ragaalee</div>
  <div class="content-box">${report.findings}</div>

  <!-- Section 3: Recommendations -->
  ${report.recommendations ? `
  <div class="section-heading">3. Administrative Recommendations & Directives / Yaada Furmaataa</div>
  <div class="content-box">${report.recommendations}</div>
  ` : ''}

  <!-- Section 4: Official Review & Endorsement -->
  <div class="section-heading">4. Official Administrative Disposition & Review</div>
  <div class="content-box">
    <strong>Review Disposition:</strong> ${report.status}<br>
    <strong>Endorsed By:</strong> ${report.reviewer_name || 'Designated Administrative Authority'}<br>
    <strong>Review Date:</strong> ${reviewDateFormatted}<br>
    ${report.reviewer_feedback ? `<strong>Official Feedback / Directives:</strong> &ldquo;${report.reviewer_feedback}&rdquo;` : ''}
  </div>

  <!-- Signatures & Official Stamps -->
  <table class="signature-table">
    <tr>
      <td>
        <strong>SUBMITTED BY:</strong>
        <div class="sig-line">
          <strong>Name:</strong> ${report.sender_name}<br>
          <strong>Title / Designation:</strong> ${report.sender_role}<br>
          <strong>Department:</strong> ${report.department_name}<br>
          <strong>Signature:</strong> _______________________<br>
          <strong>Date:</strong> ${dateFormatted}
        </div>
      </td>
      <td>
        <strong>EXECUTIVE ENDORSEMENT / APPROVAL:</strong>
        <div class="sig-line">
          <strong>Name:</strong> ${report.reviewer_name || 'Designated Administrative Reviewer'}<br>
          <strong>Official Status:</strong> ${report.status}<br>
          <strong>Signature:</strong> _______________________<br>
          <strong>Date:</strong> ${reviewDateFormatted}
        </div>
        <div class="stamp-box">
          [ OFFICIAL MUNICIPAL SEAL & STAMP / MALLATTOO FI CHAAРPAA ]
        </div>
      </td>
    </tr>
  </table>

  <!-- Footer Notice -->
  <div class="footer-notice">
    Adama City Administration &bull; Bulchiinsa Magaalaa Adaamaa &bull; P.O. Box 112, Adama, Oromia, Ethiopia<br>
    Document Authenticated via Adama Smart Citizen Reporting & Civil Service Registry System
  </div>
</div>
</body>
</html>
  `

  const blob = new Blob(['\uFEFF' + htmlContent], { type: 'application/msword;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Official_Dossier_${report.reference_number}.doc`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Exports a single official report dossier as an Excel/CSV spreadsheet.
 */
export function exportToExcel(report: ExportReportData): void {
  const rows = [
    ['ADAMA CITY ADMINISTRATION - OFFICIAL REPORT DOSSIER'],
    ['FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA - OROMIA REGIONAL STATE'],
    [''],
    ['Reference Number', report.reference_number],
    ['Date of Submission', new Date(report.created_at).toLocaleString()],
    ['Report Title', report.title],
    ['Report Type', report.report_type],
    ['Reporting Level', report.level],
    ['Priority / Classification', report.priority],
    ['Review Status', report.status],
    ['Originating Department', report.department_name],
    ['Reporting Official', `${report.sender_name} (${report.sender_role})`],
    ['Linked Citizen Case', report.linked_case_number ? `Case #${report.linked_case_number} - ${report.linked_report_title || ''}` : 'N/A'],
    ['Reviewed By', report.reviewer_name || 'Pending Review'],
    ['Reviewed At', report.reviewed_at ? new Date(report.reviewed_at).toLocaleString() : 'N/A'],
    ['Reviewer Remarks', report.reviewer_feedback || 'N/A'],
    [''],
    ['EXECUTIVE SUMMARY', report.executive_summary],
    ['DETAILED FINDINGS', report.findings],
    ['RECOMMENDATIONS', report.recommendations || 'None provided'],
  ]

  const csvContent = '\uFEFF' + rows.map(r => r.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Official_Report_${report.reference_number}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Batch exports all official reports to an Excel/CSV spreadsheet.
 */
export function exportAllReportsToExcel(reports: ExportReportData[]): void {
  if (reports.length === 0) return

  const headers = [
    'Reference Number',
    'Date Submitted',
    'Subject Title',
    'Type',
    'Level',
    'Department',
    'Reporting Official',
    'Priority',
    'Status',
    'Linked Case #',
    'Executive Summary',
    'Findings & Evidence',
    'Recommendations',
    'Reviewer',
    'Review Date',
    'Review Feedback'
  ]

  const rows = reports.map(r => [
    r.reference_number,
    new Date(r.created_at).toLocaleString(),
    r.title,
    r.report_type,
    r.level,
    r.department_name,
    `${r.sender_name} (${r.sender_role})`,
    r.priority,
    r.status,
    r.linked_case_number || 'N/A',
    r.executive_summary,
    r.findings,
    r.recommendations || '',
    r.reviewer_name || '',
    r.reviewed_at ? new Date(r.reviewed_at).toLocaleString() : '',
    r.reviewer_feedback || ''
  ])

  const csvContent = '\uFEFF' + [
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Adama_Official_Reports_Registry_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

