# PhD Project Roadmap

An interactive Gantt chart of project milestones. Bars are coloured by **theme** and styled by **horizon**:

| Horizon | Bar style |
|---|---|
| Short-term | solid |
| Medium-term | striped |
| Long-term | outlined |

A milestone with no end date (or the same start and end) is shown as a ◆ diamond.

The site is static (plain HTML/CSS/JS, no build step) and is hosted on GitHub Pages. Milestones live in a **Google Sheet**, so collaborators can edit them without touching the code. Changes appear on the site within a few minutes.

## Connect the Google Sheet

1. Create a new Google Sheet and import `data/sample-milestones.csv` (File → Import → Upload → *Replace current sheet*). That gives you the right columns and some example rows.
2. Select the `start` and `end` columns, then choose **Format → Number → Custom date and time** and set it to `yyyy-mm-dd`. Alternatively, choose **Format → Number → Plain text**.
3. **File → Share → Publish to web**. Pick the sheet tab, choose **Comma-separated values (.csv)**, and click *Publish*. Copy the URL, which ends in `output=csv`.
4. Open `config.js`:
   - paste that URL into `sheetCsvUrl`
   - paste the normal sheet URL (from the browser address bar) into `sheetEditUrl`. This adds an "Edit milestones" button to the site.
5. **Share** the sheet with collaborators as *Editor*, or set "Anyone with the link" to *Editor* if you want it fully open.
6. Commit and push. Done.

> Google caches published sheets, so edits can take around 5 minutes to show up. Use the site's ↻ Reload button after that.

## Columns

| Column | Required | Example | Notes |
|---|---|---|---|
| `title` | yes | Ethics approval | |
| `theme` | yes | Methods | Any text. New themes get a colour automatically. |
| `horizon` | | short / medium / long | Defaults to medium. |
| `start` | yes | 2027-03-01 | `YYYY-MM-DD`, `YYYY-MM`, or `DD/MM/YYYY` (see `slashDateOrder` in config.js) |
| `end` | | 2027-07-15 | Leave empty for a single-date milestone (◆). |
| `owner` | | Student | |
| `status` | | planned / in progress / done / delayed | |
| `notes` | | Submit by early March | Shown when you click a milestone. |

If a row can't be read (for example a bad date), the site shows a warning naming that row.

## Customise

All settings are in `config.js`: title, subtitle, theme colours, the default zoom, and the date format.

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

(Opening `index.html` directly from disk won't work, because browsers block loading the data file that way.)
