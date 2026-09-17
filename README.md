# WhoFights - Web UI

React + TypeScript frontend for [WhoFights](https://github.com/T3mon/whofights-api). Fetches events from the API and plots them on a calendar, with checkboxes to filter by promotion.

See the [project wiki](https://github.com/T3mon/whofights-api/wiki) for the full system architecture and new-contributor onboarding guide. This README covers only what's specific to this repo.

## Tech stack

- [Vite](https://vite.dev) + React + TypeScript
- [Bootstrap](https://getbootstrap.com) for styling
- Custom year-at-a-glance calendar (`src/YearCalendar.tsx`), built on `date-fns` - all 12 months fit one screen with no scrolling and no month/week toggle by design. Off-the-shelf calendar libraries were evaluated first: FullCalendar is built for scrolling/interactive scheduling rather than a fixed year view, and SVAR gates its Year view behind a paid PRO tier - a purpose-built component gave more control for less effort than fighting either

## Local development

Prerequisites: [Node.js](https://nodejs.org), and the [whofights-api](https://github.com/T3mon/whofights-api) running locally (see that repo's README).

```bash
git clone https://github.com/T3mon/whofights-web-ui.git
cd whofights-web-ui
npm install
cp .env.example .env   # defaults to http://localhost:5080, the local API
npm run dev
```

Visit `http://localhost:5173`.

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL of the WhoFights API | `http://localhost:5080` |
