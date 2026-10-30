# PhD Project Timeline

An interactive Gantt chart of project milestones. Bars are coloured by **theme** and styled by **horizon**:

| Horizon | Bar style |
|---|---|
| Short-term | solid |
| Medium-term | striped |
| Long-term | outlined |

A milestone with no end date (or the same start and end) is shown as a ◆ diamond.

The site is static (plain HTML/CSS/JS, no build step) and is hosted on GitHub Pages. Milestones live in a **Google Sheet**, so collaborators can edit them without touching the code. Changes appear on the site within a few minutes.

## Publish your own copy on GitHub Pages

You can set up your own timeline in about 10 minutes, entirely in the browser. You need a free [GitHub account](https://github.com/signup) and a Google account (for the sheet). No software to install.

### 1. Copy the repository

Pick one of these:

- **Use this template** (recommended): on this repository's GitHub page, click the green **Use this template → Create a new repository** button. This gives you a clean copy with no link back to the original.
- **Fork**: click **Fork** at the top right. This works too, but your copy stays linked to the original (handy if you want to pull in future updates).
- **Upload manually**: download the code (**Code → Download ZIP**), unzip it, create a new empty repository on GitHub, and choose **uploading an existing file** on its start page. Drag in *all* the files and the `data` folder, then click **Commit changes**.

When creating the repository:

- **Repository name** becomes part of your site's address. For example, `phd-timeline` gives you `https://<your-username>.github.io/phd-timeline/`.
- **Visibility** must be **Public** on a free GitHub account. (GitHub Pages for private repositories needs a paid plan.) Note that a public site can be seen by anyone with the link, and so can a public Google Sheet link.

### 2. Turn on GitHub Pages

1. In your new repository, open **Settings** (the tab with the gear icon).
2. In the left sidebar, click **Pages** (under *Code and automation*).
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Under **Branch**, choose `main` and the folder `/ (root)`, then click **Save**.
5. Wait 1–2 minutes and refresh the page. A box appears at the top saying **"Your site is live at https://&lt;your-username&gt;.github.io/&lt;repo-name&gt;/"**. Click **Visit site**.

You can follow the deployment in the **Actions** tab: each push triggers a *pages build and deployment* run, and the site updates when it turns green.

Tip: copy the site address into the **About** box on the repository's main page (gear icon → *Website*) so it's easy to find.

### 3. Make it yours

Edit `config.js`. You can do this on GitHub directly: open the file, click the ✏️ pencil icon, make changes, then **Commit changes**.

- Set `title`, `subtitle` and `description`.
- **Clear `sheetCsvUrl` and `sheetEditUrl`** (set them to `""`). Otherwise your copy will show the original author's milestones. With both empty the site shows the sample data until you connect your own sheet.
- Adjust `themeColors` to match your own themes, and `defaultZoom` if you like.

Then follow [Connect the Google Sheet](#connect-the-google-sheet) below to plug in your own milestones.

Every commit to `main` redeploys the site automatically within a minute or two. Edits to the Google Sheet don't need a commit at all.

### 4. (Optional) Use a custom domain

If you own a domain, go to **Settings → Pages → Custom domain**, enter it (e.g. `timeline.example.org`), and follow GitHub's [custom domain guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site) to add the DNS record at your domain provider. Tick **Enforce HTTPS** once it becomes available.

### Troubleshooting

| Problem | Fix |
|---|---|
| **404 "There isn't a GitHub Pages site here"** | Pages isn't enabled yet, or the first deployment is still running. Check **Settings → Pages** and the **Actions** tab. Make sure `index.html` is at the top level of the repository, not inside a subfolder. |
| **No Pages option / "Upgrade" message** | The repository is private on a free account. Make it public under **Settings → General → Danger Zone → Change visibility**. |
| **Site shows the original author's milestones** | You haven't cleared `sheetCsvUrl` in `config.js` yet (see step 3). |
| **Site shows sample data and a warning** | The sheet URL is wrong or the sheet isn't published to the web. The URL must be the *Publish to web* CSV link ending in `output=csv`, not the normal editing link. |
| **Changes don't appear** | Commits take 1–2 minutes to deploy; sheet edits can take ~5 minutes because Google caches published sheets. Then hard-refresh the page (Ctrl+Shift+R / Cmd+Shift+R). |
| **Page loads unstyled or blank** | A file is missing. Compare your repository with this one: you need `index.html`, `app.js`, `config.js`, `style.css`, `.nojekyll` and the `data` folder. Hidden files like `.nojekyll` are easy to miss when uploading manually; if it's missing, create an empty file with that name (**Add file → Create new file**). |

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
