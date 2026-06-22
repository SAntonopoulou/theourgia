/**
 * Theourgia admin shell.
 *
 * Composes the design's chrome: VaultNav on the left, route content on the
 * right. The per-route topbar (route title/subtitle, search, theme cycler,
 * mode toggle) lands in a follow-up batch. Until then, PublicChrome holds
 * the spot. Each surface route renders its body content; the AppShell
 * primitive owns scroll convention.
 *
 * Route → NavKey mapping is derived from ``location.pathname`` and fed to
 * ``<VaultNav active=…>`` so the design's inset-accent highlight follows.
 */

import {
  ACTING_AS_DEFAULT_ID,
  ActingAsProvider,
  ActingAsSwitcher,
  AppShell,
  AuthProvider,
  DEMO_IDENTITIES,
  I18nProvider,
  type NavKey,
  ToastProvider,
  TopbarProvider,
  VaultNav,
  type VaultNavLinkProps,
  VaultTopbar,
} from "@theourgia/shared";
import {
  BrowserRouter,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { apiMethods } from "./data/api.js";
import { Analytics } from "./routes/Analytics.js";
import { CircleBuilder } from "./routes/CircleBuilder.js";
import { Connection } from "./routes/Connection.js";
import { DailyPracticeRoute } from "./routes/DailyPracticeRoute.js";
import { Divination } from "./routes/Divination.js";
import { IChingRoute } from "./routes/IChingRoute.js";
import { TarotRoute } from "./routes/TarotRoute.js";
import { Entities } from "./routes/Entities.js";
import { Foundations } from "./routes/Foundations.js";
import { Hubs } from "./routes/Hubs.js";
import { Account } from "./routes/Account.js";
import { Agents } from "./routes/Agents.js";
import { BookPreview } from "./routes/BookPreview.js";
import { BundleInstall } from "./routes/BundleInstall.js";
import { Bundles } from "./routes/Bundles.js";
import { Capture } from "./routes/Capture.js";
import { Editor } from "./routes/Editor.js";
import { Federation } from "./routes/Federation.js";
import { Health } from "./routes/Health.js";
import { Identities } from "./routes/Identities.js";
import { LineageAdmin } from "./routes/LineageAdmin.js";
import { Membership } from "./routes/Membership.js";
import { NewsletterComposer } from "./routes/NewsletterComposer.js";
import { Oracle } from "./routes/Oracle.js";
import { Permissions } from "./routes/Permissions.js";
import { Sandbox } from "./routes/Sandbox.js";
import { Scheduler } from "./routes/Scheduler.js";
import { Templates } from "./routes/Templates.js";
import { Transliterate } from "./routes/Transliterate.js";
import { Wellbeing } from "./routes/Wellbeing.js";
import { Workshop } from "./routes/Workshop.js";
import { Journal } from "./routes/Journal.js";
import { Library } from "./routes/Library.js";
import { Placeholder } from "./routes/Placeholder.js";
import { RitualFeed } from "./routes/RitualFeed.js";
import { Settings } from "./routes/Settings.js";
import { SigilStudio } from "./routes/SigilStudio.js";
import { Talismans } from "./routes/Talismans.js";
import { Synchronicities } from "./routes/Synchronicities.js";
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

/** Map the current ``location.pathname`` to the active VaultNav key. */
function navKeyForPath(pathname: string): NavKey | undefined {
  if (pathname === "/" || pathname === "") return "today";
  if (pathname.startsWith("/journal")) return "journal";
  if (pathname.startsWith("/synchronicities")) return "synchronicities";
  if (pathname.startsWith("/daily-practice")) return "dailypractice";
  if (pathname.startsWith("/practice-logs")) return "practicelogs";
  if (pathname.startsWith("/entities")) return "entities";
  if (pathname.startsWith("/library")) return "library";
  if (pathname.startsWith("/calendar")) return "calendar";
  if (pathname.startsWith("/divination")) return "divination";
  if (pathname.startsWith("/sigil")) return "sigil";
  if (pathname.startsWith("/circle")) return "circle";
  if (pathname.startsWith("/talisman")) return "talismans";
  if (pathname.startsWith("/analytics")) return "analytics";
  if (pathname.startsWith("/feed")) return "feed";
  if (pathname.startsWith("/hubs")) return "hubs";
  return undefined;
}

function Shell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const active = navKeyForPath(location.pathname);
  return (
    <AppShell
      topbar={
        <VaultTopbar
          actingAs={
            <ActingAsSwitcher
              identities={DEMO_IDENTITIES}
              onManage={() => navigate("/identities")}
            />
          }
        />
      }
      nav={
        <VaultNav
          active={active}
          LinkComponent={NavLinkAdapter}
          onSettings={() => navigate("/settings")}
        />
      }
    >
      {children}
    </AppShell>
  );
}

/**
 * Inside-the-shell routes: every surface that renders within VaultNav +
 * VaultTopbar. The quick-capture route lives outside this (and outside
 * `<Shell>`) so the PWA start_url opens straight into a full-viewport
 * compose field without the chrome.
 */
function ShellRoutes() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/connection" element={<Connection />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/library" element={<Library />} />
        <Route path="/synchronicities" element={<Synchronicities />} />
        <Route path="/daily-practice" element={<DailyPracticeRoute />} />
        <Route path="/entities" element={<Entities />} />
        <Route
          path="/calendar"
          element={
            <Placeholder
              glyph="moon"
              title="Calendar"
              body="Multi-tradition calendar — feasts, planetary days, lunation arc. The dedicated .dc.html for this surface hasn't shipped from the design hand-off yet; Scheduler covers content publishing, not the magickal calendar."
            />
          }
        />
        <Route path="/divination" element={<Divination />} />
        <Route path="/divination/tarot" element={<TarotRoute />} />
        <Route path="/divination/iching" element={<IChingRoute />} />
        <Route path="/sigil" element={<SigilStudio />} />
        <Route path="/circle" element={<CircleBuilder />} />
        <Route path="/talismans" element={<Talismans />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/feed" element={<RitualFeed />} />
        <Route path="/hubs" element={<Hubs />} />
        <Route path="/identities" element={<Identities />} />
        <Route path="/lineage" element={<LineageAdmin />} />
        <Route path="/membership" element={<Membership />} />
        <Route path="/permissions" element={<Permissions />} />
        <Route path="/account" element={<Account />} />
        <Route path="/wellbeing" element={<Wellbeing />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/bundles" element={<Bundles />} />
        <Route path="/bundles/install" element={<BundleInstall />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/book/preview" element={<BookPreview />} />
        <Route path="/newsletter/compose" element={<NewsletterComposer />} />
        <Route path="/scheduler" element={<Scheduler />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/federation" element={<Federation />} />
        <Route path="/health" element={<Health />} />
        <Route path="/workshop" element={<Workshop />} />
        <Route path="/sandbox" element={<Sandbox />} />
        <Route path="/oracle" element={<Oracle />} />
        <Route path="/transliterate" element={<Transliterate />} />
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
  );
}

export function App() {
  return (
    <I18nProvider>
      <AuthProvider api={apiMethods}>
        <ActingAsProvider initial={ACTING_AS_DEFAULT_ID}>
          <ToastProvider />
          <BrowserRouter basename={ROUTER_BASENAME}>
            <TopbarProvider>
              <Routes>
                {/* Full-viewport routes — no chrome. */}
                <Route path="/capture" element={<Capture />} />
                {/* Everything else renders inside the AppShell. */}
                <Route path="*" element={<ShellRoutes />} />
              </Routes>
            </TopbarProvider>
          </BrowserRouter>
        </ActingAsProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
