# Testing Geolocation on Real Mobile Devices (HTTPS Tunnel)

Modern mobile browsers (Chrome on Android, Safari on iOS) strictly enforce the W3C secure context requirement: `navigator.geolocation` only works on `localhost` or via **HTTPS**. If you open `http://<local-ip>:3000` on your mobile phone, the browser will block geolocation with an `insecure_context` error.

To test SafetyLayer's live GPS, accuracy circle, and reporting flow on a real smartphone, use one of the free HTTPS tunneling solutions below:

---

## Option 1: Cloudflare Tunnel (Recommended - Zero Installation / Account Needed)

Run Next.js on your computer:
```bash
npm run dev
```

In a second terminal, run `cloudflared`:
```bash
npx --yes cloudflared tunnel --url http://localhost:3000
```
`cloudflared` will generate a free, temporary HTTPS link (e.g., `https://random-word-abc.trycloudflare.com`).
1. Open this link on your smartphone's browser.
2. Tap **"Locate me"** or **"Allow Location"**.
3. Your mobile phone will prompt for location permission over HTTPS, showing the blue dot with your real GPS accuracy circle!

---

## Option 2: Localtunnel

```bash
npx localtunnel --port 3000
```
Copy the `https://...loca.lt` URL into your phone's browser.

---

## Option 3: ngrok

```bash
ngrok http 3000
```
Open the generated `https://...ngrok-free.app` URL on your phone.

---

## Option 4: Local Certificate (mkcert)

If you prefer local Wi-Fi without tunneling:
```bash
npm install -g mkcert
mkcert create-ca
mkcert create-cert
```
Configure `next dev --experimental-https` to serve over local HTTPS.

---

## Privacy Note
SafetyLayer never stores your precise location on server page loads. Coordinates are held in browser memory only for route origin calculations and user-initiated reports.
