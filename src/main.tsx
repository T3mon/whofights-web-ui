import { type ComponentType, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n.ts'
import App from './App.tsx'
import ConfirmEmailPage from './ConfirmEmailPage.tsx'
import UnsubscribePage from './UnsubscribePage.tsx'
import { faviconHref } from './envTheme.ts'
import { applyTheme, getInitialTheme } from './theme.ts'

const faviconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
if (faviconLink) {
  faviconLink.href = faviconHref
}

// Runs before the first paint - index.html hardcodes data-bs-theme="dark"
// as the no-JS/no-flash fallback, this corrects it synchronously for
// anyone who has actually chosen (or whose OS prefers) light.
applyTheme(getInitialTheme())

// Two static link-target routes (from the confirmation and digest emails)
// don't earn a router dependency - the whole app is otherwise one page.
// Event deep links (/e/{slug}) are handled inside App, since they need
// the calendar itself.
const STANDALONE_PAGES: Record<string, ComponentType> = {
  '/confirm-email': ConfirmEmailPage,
  '/unsubscribe': UnsubscribePage,
}
const Page = STANDALONE_PAGES[window.location.pathname] ?? App

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
)
