# Epson Print Hub (PWA)

A Progressive Web App for printing to Epson printers using:

1. **Local Wi-Fi** – system print dialog (AirPrint / Mopria / installed drivers)
2. **Email Print** – Epson Connect cloud email address (works over Wi-Fi or mobile data)
3. **Epson Connect API** – developer mode with configuration storage (requires official license)

**PWA features:** installable on phone & desktop, offline UI (service worker caches the app shell), standalone display, custom icons & theme color.

## Quick start

Serve the folder over **HTTP** (required for service workers and install prompts):

```bash
cd epson-print-app
python -m http.server 8080
# or: npx serve .
```

Then open **http://localhost:8080**

### Install as an app

- **Chrome / Edge (desktop or Android):** look for the install icon in the address bar, or the “Install App” button that appears in the header.
- **Safari (iOS):** Share → Add to Home Screen.
- **Samsung Internet / other:** use the browser’s “Add to Home screen / Install” option.

Once installed it opens in standalone mode (no browser chrome).

## Features

| Mode              | How it works                                      | Internet needed? | Best for                  |
|-------------------|---------------------------------------------------|------------------|---------------------------|
| Local Wi-Fi       | Browser print dialog → system printer             | No (same LAN)    | Home / office same network|
| Email Print       | mailto to printer’s Epson Connect address         | Yes              | Anywhere (mobile data OK) |
| Epson Connect API | OAuth2 + job create / upload / execute            | Yes              | Apps & automation         |

## Using Email Print

1. Register your Epson printer with Epson Connect (via Smart Panel app or epsonconnect.com).
2. Note the unique email address assigned to the printer (e.g. `myprinter@print.epsonconnect.com`).
3. In the app, choose **Email Print**, paste the address, select a file and click **Send via Email Print**.
4. Attach the file in your email client and send. The printer will pull the job from the cloud.

## Using the Epson Connect API (real integration)

Epson requires a free developer license:

1. Go to https://developer.epsonconnect.com
2. Create an account → create an App → obtain **Client ID**, **Client Secret**, **API Key**.
3. Register the physical printer with Epson Connect and note its device ID / email.

Because of CORS and secret handling, API calls must go through a backend.  
See `api-example.js` (Node.js) and the Python snippet below.

### Official flow (API v2)

1. Authenticate (OAuth2) → get device access token  
2. Create print job (`POST /api/2/printing/jobs`) with settings  
3. Upload the file to the returned `uploadUri`  
4. Execute the job (`POST .../jobs/{jobId}/print`)

Libraries that already wrap this:

- Python: `pip install epson-connect` → https://pypi.org/project/epson-connect/
- JavaScript: https://github.com/chriscarrollsmith/epson-connect-js (archived, still useful reference)

## Python quick example (backend)

```python
# Requires: pip install epson-connect  (or implement the 4-step flow yourself)
from epson_connect import Client

ec = Client(
    printer_email="yourprinter@print.epsonconnect.com",
    client_id="YOUR_CLIENT_ID",
    client_secret="YOUR_CLIENT_SECRET",
)

job_id = ec.printer.print("./document.pdf")
print("Job submitted:", job_id)
```

## Project structure

```
epson-print-app/
├── index.html              # UI + PWA meta tags + SW registration
├── styles.css              # Dark modern theme
├── app.js                  # Frontend logic
├── sw.js                   # Service Worker (offline caching)
├── manifest.json           # Web App Manifest
├── api-example.js          # Node.js backend skeleton for Epson Connect API
├── icons/
│   ├── icon-192.svg
│   ├── icon-512.svg
│   ├── icon-maskable-192.svg
│   └── icon-maskable-512.svg
└── README.md
```

## Notes & limitations

- This is a **prototype / learning tool**, not an official Epson product.
- Browser security prevents automatic file attachment in mailto links – users must attach the file themselves.
- Real Epson Connect API calls need a server-side proxy (see `api-example.js`).
- Service worker caches the UI for offline use; actual printing (Email Print / API) still needs network.
- For production mobile apps you can also use the official Epson Smart Panel SDK or the Connect API with proper OAuth.

## Next steps you can take

- Add a simple Express/FastAPI backend that proxies the four API steps.
- Integrate with Zapier / Make.com using the official Epson Connect Zapier app.
- Add QR-code scanning to quickly capture the printer’s Email Print address.
- Add push notifications for print job status (requires backend).

---

Created as a companion to the Epson Wi-Fi / Data / Web printing design discussion.
