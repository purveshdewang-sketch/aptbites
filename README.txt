NeFo new-logo replacement assets

Copy the included assets folder into your project root and allow Windows to replace
the existing files.

Project destination:
C:\Users\Admin\Desktop\App\assets

Important:
- Replace the files in assets\icons.
- Also replace icon-only.png, icon-foreground.png, and icon-background.png.
  Otherwise `npx capacitor-assets generate` may regenerate the previous logo.

After copying, run from the project root:

npm run build
npx capacitor-assets generate --android
npx cap sync android

For the website/PWA, clear the browser/site cache or uninstall the installed PWA
before checking because icon files with the same names can remain cached.
