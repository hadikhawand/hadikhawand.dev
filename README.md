# hadikhawand.dev

Personal portfolio of Hadi Khawand. Plain HTML, CSS and JavaScript: no build step, no dependencies.

```
index.html            page content
styles.css            all styling (colors are CSS variables at the top)
script.js             timetable solver demo in the hero
assets/               headshot and project screenshots
Hadi_Khawand_CV.pdf   résumé linked from the page
CNAME                 custom domain for GitHub Pages
```

## Run locally

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Deploy with GitHub Pages (free)

1. Create a public repo on GitHub (for example `hadikhawand.dev`) and push this folder to it.
2. In the repo: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, pick `main` and `/ (root)`, then save.
3. Under **Custom domain**, enter `hadikhawand.dev` (the `CNAME` file already sets it) and save.
4. At your domain registrar, add these DNS records:

   | Type  | Name | Value                  |
   |-------|------|------------------------|
   | A     | @    | 185.199.108.153        |
   | A     | @    | 185.199.109.153        |
   | A     | @    | 185.199.110.153        |
   | A     | @    | 185.199.111.153        |
   | CNAME | www  | hadikhawand.github.io  |

5. Wait for DNS to update (minutes to a few hours), then tick **Enforce HTTPS** in Settings → Pages.
   `.dev` domains only work over HTTPS, so the site will not load until the certificate is issued.

## Updating

- Text: edit `index.html`.
- Accent color: change `--accent` in `styles.css`.
- Résumé: replace `Hadi_Khawand_CV.pdf` with a file of the same name.
