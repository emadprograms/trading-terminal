# Cloudflared Installation Debug Log

## Goal
Install `cloudflared` in a GitHub Actions Ubuntu runner to establish a tunnel for the Auth Proxy.

## Summary of Attempts

### Attempt 1: Debian Package (.deb)
**Method:**
```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb
```
**Result:** ❌ Failed
**Error:** `dpkg-deb: error: 'cloudflared.deb' is not a Debian format archive`
**Analysis:** The downloaded file was only 92 bytes, indicating that `curl` captured an HTML error page (likely a 404 or redirect) instead of the actual package.

---

### Attempt 2: Standalone Binary
**Method:**
```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/
```
**Result:** ❌ Failed
**Error:** `/usr/local/bin/cloudflared: 1: Syntax error: redirection unexpected`
**Analysis:** Similar to Attempt 1, the binary downloaded was actually an HTML text file. When the shell attempted to execute it as a binary, it failed with a syntax error because it was reading HTML tags.

---

### Attempt 3: Official Installer Script
**Method:**
```bash
curl -L https://pkg.cloudflare.com/cloudflared-installer.sh | sudo sh
```
**Result:** ❌ Failed
**Error:** `sh: 2: Syntax error: newline unexpected`
**Analysis:** The pipe to `sh` failed. This suggests that either the script was not downloaded completely or, again, an HTML error page was returned by the server and passed to the shell.

## Root Cause Hypothesis
The GitHub Actions runner environment is consistently receiving HTML responses (error pages or redirects) instead of the requested files from both `github.com` and `pkg.cloudflare.com`. This could be due to:
1.  **URL Changes:** The "latest" download links may be redirecting in a way that `curl -L` isn't handling as expected in this specific shell environment.
2.  **Network/Proxy Interception:** A proxy or firewall within the runner environment might be intercepting the requests and returning custom HTML error pages.
3.  **Asset Naming:** The naming convention for the latest assets might have changed, causing the generic "latest" URL to fail.

## Recommendations for Next Steps
- Use `curl -v` to inspect the HTTP headers and see exactly what the server is returning.
- Try downloading a specific version (e.g., `2024.x.x`) instead of `latest` to rule out redirect issues.
- Use `wget` as an alternative to `curl` to see if it handles the redirects differently.
- Check the content of the downloaded "binary" using `head -n 5` to confirm if it's HTML.

## Final Resolution
**Method Applied:**
Switched to a pinned version (2026.5.2) and used `wget` with a direct download link for the Debian package.

```yaml
      - name: Install cloudflared
        run: |
          VERSION="2026.5.2"
          wget -q https://github.com/cloudflare/cloudflared/releases/download/${VERSION}/cloudflared-linux-amd64.deb
          sudo dpkg -i cloudflared-linux-amd64.deb
          rm cloudflared-linux-amd64.deb
```

**Reasoning:**
Pinned versions bypass the unreliable `releases/latest/download` redirect which was consistently returning HTML error pages or landing pages instead of the actual binary. `wget` is also often more robust in handling redirects in CI environments than `curl` when piped directly to a shell.

**Result:** ✅ Resolved. The installation now completes successfully in the GitHub Actions runner.
