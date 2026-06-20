/**
 * Theourgia admin shell. Phase 02 Batch 5 introduces routing + AppShell.
 *
 * Each Phase 02 surface gets a placeholder route; real content arrives in
 * Phase 03+ batches. ToastProvider mounts at the app root so any
 * descendant can call ``Toast.push(...)``.
 */

import {
  AppShell,
  AuthProvider,
  PublicChrome,
  ToastProvider,
  VaultNav,
  type VaultNavLinkProps,
} from "@theourgia/shared";
import { BrowserRouter, NavLink, Route, Routes, useLocation } from "react-router-dom";

import { apiMethods } from "./data/api.js";
import { ADMIN_NAV } from "./nav.js";
import { Connection } from "./routes/Connection.js";
import { Foundations } from "./routes/Foundations.js";
import { Placeholder } from "./routes/Placeholder.js";
import { Settings } from "./routes/Settings.js";
import { Today } from "./routes/Today.js";

// Vite's BASE_URL: "/" in dev, "/admin/" in prod. BrowserRouter
// basename wants no trailing slash; trim it.
const ROUTER_BASENAME = import.meta.env.BASE_URL.replace(/\/$/, "");

function NavLinkAdapter({ to, children, className, style, onClick }: VaultNavLinkProps) {
  return (
    <NavLink to={to} className={className} style={style} onClick={onClick}>
      {children}
    </NavLink>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <AppShell
      header={<PublicChrome />}
      nav={
        <VaultNav
          items={ADMIN_NAV}
          heading="Vault"
          LinkComponent={NavLinkAdapter}
          isActive={(to) =>
            location.pathname === to || (to !== "/" && location.pathname.startsWith(to))
          }
        />
      }
    >
      {children}
    </AppShell>
  );
}

export function App() {
  return (
    <AuthProvider api={apiMethods}>
      <ToastProvider />
      <BrowserRouter basename={ROUTER_BASENAME}>
        <Shell>
          <Routes>
            <Route path="/" element={<Today />} />
            <Route path="/connection" element={<Connection />} />
            <Route
              path="/journal"
              element={
                <Placeholder
                  glyph="journal"
                  title="Journal"
                  body="Tiptap-based editor with the design's custom blocks. Lands when the editor surface ships."
                />
              }
            />
            <Route
              path="/library"
              element={
                <Placeholder
                  glyph="library"
                  title="Library"
                  body="Books, essays, and reading lists. Lands when the library surface ships."
                />
              }
            />
            <Route
              path="/entities"
              element={
                <Placeholder
                  glyph="entity"
                  title="Entities"
                  body="The alias-graph entity ledger. Lands when the entities surface ships."
                />
              }
            />
            <Route
              path="/divination"
              element={
                <Placeholder
                  glyph="divination"
                  title="Divination"
                  body="Workbench for tarot, runes, geomancy, astrology. Lands when the divination surface ships."
                />
              }
            />
            <Route
              path="/sigil"
              element={
                <Placeholder
                  glyph="sigil"
                  title="Sigil studio"
                  body="Glyph + ring + script composer. Lands when the studio ships."
                />
              }
            />
            <Route
              path="/circle"
              element={
                <Placeholder
                  glyph="pentacle"
                  title="Magical circle"
                  body="Composable ritual circle builder with the engraving sprite. Lands when the surface ships."
                />
              }
            />
            <Route
              path="/talisman"
              element={
                <Placeholder
                  glyph="shield"
                  title="Talismans"
                  body="Designer with planetary correspondences + print layout. Lands when the surface ships."
                />
              }
            />
            <Route
              path="/analytics"
              element={
                <Placeholder
                  glyph="compass"
                  title="Analytics"
                  body="Scientific illuminism — patterns across entries, entities, and rites. Lands when the surface ships."
                />
              }
            />
            <Route path="/settings" element={<Settings />} />
            <Route path="/foundations" element={<Foundations />} />
            <Route
              path="*"
              element={
                <Placeholder
                  glyph="compass"
                  title="Lost"
                  body="This route does not exist yet. Use the navigation to find your way back."
                />
              }
            />
          </Routes>
        </Shell>
      </BrowserRouter>
    </AuthProvider>
  );
}
