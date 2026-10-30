// Site settings. This is the only file you normally need to edit.
window.GANTT_CONFIG = {
  title: "PhD Project Roadmap",
  subtitle: "Short-, medium- and long-term milestones, by theme",

  // Google Sheet published as CSV (File → Share → Publish to web → CSV).
  // Leave empty to use the sample data in data/sample-milestones.csv.
  sheetCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvOfpldrq-7LFFPsQlvHg6Z1fRIwciAG3cJXsQq21Ec2fwWcAoapXqRDi7fjQLBep1tqA_gn3Jt0MG/pub?gid=266668595&single=true&output=csv",

  // Link that collaborators open to edit the sheet (the normal sheet URL).
  // Leave empty to hide the "Edit milestones" button.
  sheetEditUrl: "https://docs.google.com/spreadsheets/d/1DGnfkv9p-y9pYNtpzW6M5LXWg0l9zKyUYdQg-ONxkds/edit?gid=266668595#gid=266668595",

  fallbackCsv: "data/sample-milestones.csv",

  // How to read dates written with slashes, e.g. 03/04/2027.
  // "DMY" = 3 April 2027, "MDY" = 4 March 2027. ISO dates (2027-04-03) always work.
  slashDateOrder: "DMY",

  // Optional fixed colours per theme. Themes not listed get a colour automatically.
  themeColors: {
    "Literature Review": "#2563eb",
    "Methods": "#9333ea",
    "Data Collection": "#16a34a",
    "Analysis": "#0891b2",
    "Writing": "#ea580c",
    "Dissemination": "#db2777",
    "Progress Reviews": "#64748b",
  },

  // Initial zoom: "month", "quarter" or "year".
  defaultZoom: "month",
};
