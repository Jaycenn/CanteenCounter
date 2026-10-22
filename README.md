# CanteenCounter

A two-tap checkout system and local database built for extreme speed in a fast-paced food
service environment. Made for **John Cen's Kitchenette**: tap the dish, tap **CONFIRM ORDER**,
done. No typing, ever.

## How it works

- **Register (`/`)** — a single screen: a huge live total on top, a grid of big colored dish
  buttons in the middle, **UNDO** and **CONFIRM ORDER** pinned to the bottom. Tapping a dish
  flashes the button, bumps its ×N badge, and updates the total instantly. UNDO removes the
  last tap. CONFIRM saves the order and flashes **SAVED ✓**.
- **Admin (`/#/admin`)** — hidden end-of-day page. Unlocked with a tap-only 4-digit PIN pad,
  it shows the cash expected in the drawer, the order count, and how many of each dish sold.
- **Server** — small Express API over a local SQLite file (`server/data/canteen.db`), using
  Node's built-in `node:sqlite` module (no native compilation, installs cleanly everywhere).
  Prices are always taken from the database, so the client can never send a wrong total.
- **Offline-safe** — if the wifi drops, confirmed orders queue in the browser and sync
  automatically once the server is reachable again. A "N to sync" chip shows in the header.

## Quick start

Requires Node 22.5 or newer (the current LTS from nodejs.org is fine).

```bash
npm install    # installs root, server, and client dependencies
npm run dev    # starts the API (:4000) and the register UI (:5173)
```

Open http://localhost:5173 — or open `http://<your-computer-ip>:5173` from a tablet on the
same wifi.

### Production (one process)

```bash
npm run start  # builds the client, then Express serves UI + API on :4000
```

## Opening the admin page

Two ways, both invisible to staff during service:

1. Go to `/#/admin` directly, or
2. Press and hold the "John Cen's Kitchenette" name at the top for 1.5 seconds.

Default PIN is **1234**. Change it by starting the server with an `ADMIN_PIN`
environment variable:

```bash
ADMIN_PIN=7391 npm run dev
```

The PIN is verified on the server for every admin request. This app is meant to run on your
own machine/LAN — don't expose it to the internet as-is.

## Changing the daily menu

Edit `server/menu.json` (names, prices in pesos, button colors), then:

```bash
npm run reseed
```

Dishes removed from the file are deactivated, not deleted, so past sales reports stay intact.

## Project structure

```
CanteenCounter/
├── package.json              # root scripts: dev / build / start / reseed
├── server/
│   ├── index.js              # Express API + static hosting of the built client
│   ├── db.js                 # SQLite connection + schema (built-in node:sqlite)
│   ├── seed.js               # seeds/reseeds dishes from menu.json
│   ├── menu.json             # the daily menu — edit me
│   └── data/canteen.db       # created on first run (gitignored)
└── client/
    ├── index.html            # kiosk viewport, PWA manifest
    ├── vite.config.js        # dev proxy /api → :4000, LAN host enabled
    ├── public/               # icon + web manifest ("Add to Home Screen")
    └── src/
        ├── main.jsx
        ├── App.jsx           # hash routing: "/" register, "#/admin" admin
        ├── api.js            # fetch helpers + offline order queue
        ├── money.js          # ₱ formatting
        ├── styles.css        # all kiosk styling
        └── components/
            ├── Register.jsx  # the main two-tap register screen
            ├── DishButton.jsx
            ├── Admin.jsx     # PIN gate + end-of-day dashboard
            └── PinPad.jsx

```

## API

| Method | Path                 | Description                                          |
| ------ | -------------------- | ---------------------------------------------------- |
| GET    | `/api/dishes`        | Active dishes for the register grid                  |
| POST   | `/api/orders`        | `{ items: [{ dishId, qty }] }` — prices from the DB  |
| GET    | `/api/admin/summary` | Day totals; needs `x-admin-pin` header, `?date=` opt |
