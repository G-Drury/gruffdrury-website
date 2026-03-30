# gruffdrury.website

Portfolio site for Griff Drury — Designer & Maker.

## File structure

```
gruffdrury-site/
├── index.html       ← Homepage
├── archive.html     ← Full work archive (two-axis navigation)
├── about.html       ← About page (placeholder)
├── contact.html     ← Contact page (placeholder)
├── css/
│   └── main.css     ← Shared design system
└── images/          ← Add your images here (create this folder)
    ├── escape-01.jpg
    ├── ripe-01.jpg
    └── ...
```

## Adding images

Replace placeholder colour classes in the HTML with actual image paths.
In archive.html, find the `PROJ` data object and update the `imgs` arrays.

Example — change:
```js
imgs: ['c1', 'c1', 'c1']
```
To:
```js
imgs: ['images/escape-01.jpg', 'images/escape-02.jpg', 'images/escape-03.jpg']
```

Then in the `projHTML` function, update the `.proj-img` divs to use
`background-image` instead of the placeholder class.

## Deploying to GitHub Pages (free hosting)

### Step 1 — Create a GitHub account
Go to github.com and sign up if you don't have an account.

### Step 2 — Create a new repository
- Click the + icon → New repository
- Name it: `gruffdrury-website` (or anything you like)
- Set it to Public
- Click Create repository

### Step 3 — Upload your files
Option A (easiest — drag and drop in browser):
- On the repository page, click "uploading an existing file"
- Drag the entire contents of this folder into the upload area
- Important: upload the css/ folder too, keeping the folder structure
- Click Commit changes

Option B (using Git command line):
```bash
cd gruffdrury-site
git init
git add .
git commit -m "Initial site"
git remote add origin https://github.com/YOURUSERNAME/gruffdrury-website.git
git push -u origin main
```

### Step 4 — Enable GitHub Pages
- Go to your repository → Settings → Pages
- Under Source, select: Deploy from branch
- Branch: main, folder: / (root)
- Click Save
- Wait ~60 seconds, then your site is live at:
  https://YOURUSERNAME.github.io/gruffdrury-website/

### Step 5 — Connect your custom domain (gruffdrury.website)

In GitHub:
- Repository → Settings → Pages → Custom domain
- Type: gruffdrury.website
- Click Save

In your domain registrar (wherever you bought gruffdrury.website):
Add these DNS records:

Type: A — Name: @ — Value: 185.199.108.153
Type: A — Name: @ — Value: 185.199.109.153
Type: A — Name: @ — Value: 185.199.110.153
Type: A — Name: @ — Value: 185.199.111.153
Type: CNAME — Name: www — Value: YOURUSERNAME.github.io

DNS changes can take up to 24 hours to propagate, but usually under 1 hour.
GitHub will automatically provision an SSL certificate (https) once DNS resolves.

## Updating the site after changes

Every time you update files:

Option A (drag and drop):
- Go to the file in your GitHub repository
- Click the pencil edit icon or re-upload

Option B (command line — faster):
```bash
git add .
git commit -m "Update description here"
git push
```
The site updates within ~60 seconds of pushing.

## Adding a new discipline section

In archive.html, find the DISCS array and add a new entry:
```js
{ id:'newSection', label:'New Section Name', visible:true },
```

Then add the projects to the PROJ object:
```js
newSection: [
  { id:'project1', title:'Project Name', year:'2025', tags:[...], desc:'...', imgs:[...] },
]
```

To hide a section temporarily, set visible:false.
