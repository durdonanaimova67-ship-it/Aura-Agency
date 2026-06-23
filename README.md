# AuraMedia

Static marketing site for AuraMedia (`aura-agency.uz`), built on a customized
KlientBoost page mirror and localized to Uzbek.

## Structure

```
klientboost-site/
  www.klientboost.com/   # the deployed homepage + assets (web root)
    index.html           # main page
    durdona-images/      # AuraMedia media (logos, videos, graphics)
    static/ icons/ ...    # page assets
  klientboost.com/       # secondary pages referenced via cross-links
```

The deployed web root is `www.klientboost.com`. Vercel serves `/` from
`www.klientboost.com/index.html` and maps all other paths into that folder
(see `vercel.json`).

## Local preview

```bash
node serve.js          # serves the site at http://localhost:8080/
```

## Deploy (Vercel)

This is a no-build static site. `vercel.json` sets the output directory and
routing — just import the repo in Vercel and deploy (no build command needed).

## Media

Videos under `durdona-images/` are web-optimized H.264 MP4s. The original
uncompressed files are kept locally in `_media-originals/` (git-ignored) and in
`durdona-images/.../*` backups, and are not part of the repo.
