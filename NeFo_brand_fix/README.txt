NeFo app icon and name fix

1. Extract this ZIP.
2. Open PowerShell in the extracted folder.
3. Run:

   Set-ExecutionPolicy -Scope Process Bypass
   .\apply-nefo-brand.ps1

The script:
- creates official Capacitor icon source assets
- generates Android launcher icons
- changes the display name to NeFo
- rebuilds the web app
- syncs Android
- creates a fresh debug APK

After the build:
1. Uninstall the old Nefo app from the phone.
2. Install:
   C:\Users\Admin\Desktop\App\android\app\build\outputs\apk\debug\app-debug.apk

If using ADB:
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" uninstall com.nefo.app
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install "C:\Users\Admin\Desktop\App\android\app\build\outputs\apk\debug\app-debug.apk"
