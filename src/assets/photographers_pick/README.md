# photographer's pick

Drop the photos you want to appear on the reveal screen into this folder.

They render in **alphabetical filename order** — the simplest way to control
the sequence is to prefix filenames with a number, e.g.:

```
01-favourite.jpg
02-second-choice.png
03-third-pick.jpg
```

Supported formats: `.jpg`, `.jpeg`, `.png`, `.webp`.

If this folder is empty, the reveal falls back to showing the same nine
photos from `src/assets/alexandra_bw/` in their natural alphabetical order.

The photos in this folder can be:
- The same files as in `alexandra_bw/` (re-uploaded so ordering is
  independent),
- A subset (e.g. only your top three),
- A completely different set — whatever you want the reveal to be.

After changing anything in this folder, `git commit && git push`. Vercel
rebuilds and the reveal updates.
