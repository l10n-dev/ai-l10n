# Publishing Checklist

Quick guide to test and publish ai-l10n to NPM.

---

## 1️⃣ Pre-Publish Testing

### Build and Test
```bash
npm run build
npm test
```
✅ All tests pass (139+), build succeeds

### Local Installation Test
```bash
# Create test directory
cd ..
mkdir test-install
cd test-install
npm init -y

# Install locally
npm install ../ai-l10n

# Test CLI
npx ai-l10n --version
npx ai-l10n --help

# Test API (create test.js)
node -e "const {AiTranslator} = require('ai-l10n'); console.log('✅ Works')"
```

### Check Package Contents
```bash
cd ../ai-l10n
npm pack --dry-run
```
✅ Only dist/, README.md, LICENSE, package.json included

---

## 2️⃣ Git & GitHub

```bash
# Commit everything
git add .
git commit -m "chore: release v1.0.0"

# Create tag
git tag v1.0.0

# Push (create repo on GitHub first if needed)
git remote add origin https://github.com/AntonovAnton/ai-l10n.git
git push -u origin main --tags
```

---

## 3️⃣ NPM Publishing

### Login to NPM
```bash
npm login
# Enter username, password, email, 2FA code
```

### Publish
```bash
# Dry run first
npm publish --dry-run

# Publish for real
npm publish
```

### Verify
```bash
# Visit https://www.npmjs.com/package/ai-l10n

# Test install from NPM
npm install -g ai-l10n
ai-l10n --version
```

---

## 4️⃣ Post-Publishing

### Create GitHub Release
1. Go to: https://github.com/AntonovAnton/ai-l10n/releases/new
2. Tag: `v1.0.0`
3. Title: `Release v1.0.0`
4. Description: Copy from CHANGELOG.md
5. Publish

### Add NPM Badge to README
```markdown
[![npm version](https://badge.fury.io/js/ai-l10n.svg)](https://www.npmjs.com/package/ai-l10n)
```

---

## 📝 Quick Reference

**Check package size:**
```bash
npm pack
ls -lh ai-l10n-1.0.0.tgz  # Should be < 500KB
```

**Unpublish (within 72 hours only):**
```bash
npm unpublish ai-l10n@1.0.0
```

**Version bumps:**
```bash
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0
```

---

✅ **Ready to publish!**
