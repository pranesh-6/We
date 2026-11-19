# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

## WeatherAI chat API

The AI Chatbot menu view provides an outlook and answers questions about the selected city's current conditions and forecast through the local Node server. Weather advice and chat are shown in the AI Chatbot view, not on the Dashboard. Keep the API key on the server; do not put it in React code or a `VITE_` variable.

Create `frontend\.env` from `frontend\.env.example`, replace the placeholder with your API key, and start the app from the repository root:

```powershell
Copy-Item frontend\.env.example frontend\.env
npm run dev
```

The server listens on port 3000 by default. Set `PORT` to change it. For production, build the frontend with `npm run build`, set `DEPLOY_API_KEY` in the hosting environment (or provide a local `.env` file), and run `npm start`.

## Deploy

Use Node.js 22.12 or newer (or Node.js 24). From the project root, configure the deployment build command as:

```sh
npm --prefix frontend ci && npm run build
```

Set the start command to `npm start` and configure `DEPLOY_API_KEY` as a secret environment variable in the hosting provider. Do not include your local `frontend/.env` file in the deployment bundle.

For Vercel, set the project root directory to the repository root. The root `vercel.json` configures the build and static output, and `api/chat.js` serves the chat endpoint; no start command is needed. Add `DEPLOY_API_KEY` in the Vercel project settings.

If `DEPLOY_API_KEY` is not set or the AI service fails, the dashboard displays the error and keeps its built-in temperature-, rain-, and wind-based suggestions available.

Search for a city to load its current conditions and seven-day forecast. The dashboard's clothing, outdoor activity, and weather advice recommendations adjust to the selected city's temperature and forecast.

The sidebar switches between the dashboard, favourite cities, and the AI Chatbot. Search for a city before chatting; the chatbot uses that city's weather and forecast. Add or remove a favourite from the dashboard; favourites are saved in the browser.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
