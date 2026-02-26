$ErrorActionPreference='Stop';
$root='C:\Users\emanu\Documents\progetti\adottaungatto-it';
$webDir=Join-Path $root 'apps/web';
$shotDir=Join-Path $root 'tmp/visual-check';
New-Item -ItemType Directory -Force -Path $shotDir | Out-Null;
$server = Start-Process -FilePath 'pnpm' -ArgumentList 'exec','next','dev','-p','3200' -WorkingDirectory $webDir -PassThru;
try {
  $ready=$false;
  for($i=0; $i -lt 60; $i++){
    try {
      $resp=Invoke-WebRequest -Uri 'http://localhost:3200' -UseBasicParsing -TimeoutSec 2;
      if($resp.StatusCode -ge 200){ $ready=$true; break }
    } catch {}
    Start-Sleep -Seconds 2;
  }
  if(-not $ready){ throw 'Server non pronto su :3200' }

  $script = @'
const { chromium } = require("@playwright/test");
const fs = require("fs");
(async () => {
  const outDir = "C:/Users/emanu/Documents/progetti/adottaungatto-it/tmp/visual-check";
  fs.mkdirSync(outDir, { recursive: true });
  const routes = ["/", "/cerca", "/annunci/mock-milo-torino-001"];
  const viewports = [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ];
  const browser = await chromium.launch({ headless: true });
  try {
    for (const vp of viewports) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();
      for (const route of routes) {
        const safe = route === "/" ? "home" : route.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
        const url = `http://localhost:3200${route}`;
        await page.goto(url, { waitUntil: "networkidle" });
        await page.waitForTimeout(600);
        const path = `${outDir}/${vp.name}-${safe}.png`;
        await page.screenshot({ path, fullPage: true });
        console.log(path);
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
})();
'@;
  $script | pnpm exec node -;
  Get-ChildItem -Path $shotDir -File | Select-Object -ExpandProperty FullName;
}
finally {
  if($server -and -not $server.HasExited){ Stop-Process -Id $server.Id -Force }
}
