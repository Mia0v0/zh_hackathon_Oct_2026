# CampusGo

CampusGo is a campus delivery board prototype for students and staff. Community members can post pickup requests, choose who can see them, offer a delivery fee, and accept nearby requests to earn credits. The interface uses white with blue and warm accents in light mode, black with yellow in dark mode, and a personal accent selector with named, high-contrast choices.

## Run locally

Requires Node.js 20.10 or later.

```sh
npm start
```

Open `http://localhost:3000`.

## Current scope

This version is a front-end prototype. Profile details, requests, and credits are stored in the browser's local storage. Sign-in is a demo flow; it does not verify university identities or share data between devices. A production campus service will need university authentication and a shared backend.

## Zenith preview

The root `Dockerfile` and `zenith-compose.yml` are configured for Zenith. Run `zenith up` to create a temporary preview.
