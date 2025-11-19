# GitHub Repository Setup Guide

## Step 1: Create the Repository on GitHub

1. Go to [GitHub](https://github.com) and sign in
2. Click the **"+"** icon in the top right → **"New repository"**
3. Repository name: **`adam-sports-project`**
4. Description: **"The Bloomberg Terminal for Sports News & Scores"**
5. Choose **Public** or **Private** (your choice)
6. **DO NOT** initialize with README, .gitignore, or license (we already have these)
7. Click **"Create repository"**

## Step 2: Initialize Git and Push to GitHub

Open your terminal in the project directory and run:

```bash
# Initialize git (if not already initialized)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Adam Sports Project - Bloomberg Terminal for Sports"

# Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/adam-sports-project.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

## Step 3: Verify Upload

1. Go to your repository on GitHub: `https://github.com/YOUR_USERNAME/adam-sports-project`
2. Verify all files are present:
   - ✅ README.md
   - ✅ LICENSE
   - ✅ .gitignore
   - ✅ server/ directory
   - ✅ client/ directory
   - ✅ shared/ directory
   - ✅ package.json
   - ✅ API_DOCUMENTATION.md

## Step 4: Add Repository Topics (Optional)

On your GitHub repository page:
1. Click the gear icon ⚙️ next to "About"
2. Add topics: `sports`, `api`, `news`, `scores`, `typescript`, `express`, `react`

## Step 5: Set Up GitHub Actions (Optional)

Create `.github/workflows/ci.yml` for automated testing:

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
    - run: npm install
    - run: npm run check
```

## Troubleshooting

### If you get "remote origin already exists":
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/adam-sports-project.git
```

### If you need to update the remote URL:
```bash
git remote set-url origin https://github.com/YOUR_USERNAME/adam-sports-project.git
```

### If you get authentication errors:
- Use GitHub CLI: `gh auth login`
- Or use SSH: `git remote set-url origin git@github.com:YOUR_USERNAME/adam-sports-project.git`

## Next Steps

1. ✅ Repository created and code pushed
2. 📝 Update README.md with your GitHub username if needed
3. 🚀 Consider setting up GitHub Pages for documentation
4. 🔒 Add secrets for API keys (Settings → Secrets) if deploying

---

**Your Adam Sports Project is now on GitHub! 🎉**

