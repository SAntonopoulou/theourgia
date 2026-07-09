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
  ActingAsProvider,
  ActingAsSwitcher,
  AppShell,
  AuthProvider,
  I18nProvider,
  type NavKey,
  ToastProvider,
  TopbarProvider,
  useAuth,
  VaultNav,
  type VaultNavLinkProps,
  VaultTopbar,
} from "@theourgia/shared";
import { QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { apiMethods } from "./data/api.js";
import { queryClient } from "./lib/queryClient.js";
import { SurfaceSkeleton } from "./lib/SurfaceSkeleton.js";

// Eager: home route (/), auth surface, and PWA start_url. Flashing a
// spinner on any of these three would hurt UX; everything else is
// lazy-loaded so Vite can code-split each route into its own chunk
// (b108-2ge — follow-up to the vendor-chunk split in b108-2cp).
import { Capture } from "./routes/Capture.js";
import { SignInRoute } from "./routes/SignInRoute.js";
import { SetupWizardRoute } from "./routes/SetupWizardRoute.js";
import { Today } from "./routes/Today.js";

// Lazy: every other surface. Route modules use NAMED exports, so the
// `.then((m) => ({ default: m.RouteName }))` shim adapts them to
// React.lazy's default-export contract.
const Connection = lazy(() =>
  import("./routes/Connection.js").then((m) => ({ default: m.Connection })),
);
const DailyPracticeRoute = lazy(() =>
  import("./routes/DailyPracticeRoute.js").then((m) => ({
    default: m.DailyPracticeRoute,
  })),
);
const CommentModerationRoute = lazy(() =>
  import("./routes/CommentModerationRoute.js").then((m) => ({
    default: m.CommentModerationRoute,
  })),
);
const GematriaCalculatorRoute = lazy(() =>
  import("./routes/GematriaCalculatorRoute.js").then((m) => ({
    default: m.GematriaCalculatorRoute,
  })),
);
const NewsletterEditorRoute = lazy(() =>
  import("./routes/NewsletterEditorRoute.js").then((m) => ({
    default: m.NewsletterEditorRoute,
  })),
);
const PricingDistributionRoute = lazy(() =>
  import("./routes/PricingDistributionRoute.js").then((m) => ({
    default: m.PricingDistributionRoute,
  })),
);
const PublicationEditorRoute = lazy(() =>
  import("./routes/PublicationEditorRoute.js").then((m) => ({
    default: m.PublicationEditorRoute,
  })),
);
const PublicationPrintPreviewRoute = lazy(() =>
  import("./routes/PublicationPrintPreviewRoute.js").then((m) => ({
    default: m.PublicationPrintPreviewRoute,
  })),
);
const PublicationSettingsRoute = lazy(() =>
  import("./routes/PublicationSettingsRoute.js").then((m) => ({
    default: m.PublicationSettingsRoute,
  })),
);
const PublicationsRoute = lazy(() =>
  import("./routes/PublicationsRoute.js").then((m) => ({
    default: m.PublicationsRoute,
  })),
);
const SubscribersRoute = lazy(() =>
  import("./routes/SubscribersRoute.js").then((m) => ({
    default: m.SubscribersRoute,
  })),
);
const SubscriptionTiersRoute = lazy(() =>
  import("./routes/SubscriptionTiersRoute.js").then((m) => ({
    default: m.SubscriptionTiersRoute,
  })),
);
const VocesLibraryRoute = lazy(() =>
  import("./routes/VocesLibraryRoute.js").then((m) => ({
    default: m.VocesLibraryRoute,
  })),
);
const Divination = lazy(() =>
  import("./routes/Divination.js").then((m) => ({ default: m.Divination })),
);
const DivinationMiscRoute = lazy(() =>
  import("./routes/DivinationMiscRoute.js").then((m) => ({
    default: m.DivinationMiscRoute,
  })),
);
const GeomancyRoute = lazy(() =>
  import("./routes/GeomancyRoute.js").then((m) => ({
    default: m.GeomancyRoute,
  })),
);
const IChingRoute = lazy(() =>
  import("./routes/IChingRoute.js").then((m) => ({ default: m.IChingRoute })),
);
const RunesRoute = lazy(() =>
  import("./routes/RunesRoute.js").then((m) => ({ default: m.RunesRoute })),
);
const TarotRoute = lazy(() =>
  import("./routes/TarotRoute.js").then((m) => ({ default: m.TarotRoute })),
);
const Entities = lazy(() =>
  import("./routes/Entities.js").then((m) => ({ default: m.Entities })),
);
const FamilyTreeRoute = lazy(() =>
  import("./routes/FamilyTreeRoute.js").then((m) => ({
    default: m.FamilyTreeRoute,
  })),
);
const DeckDesignerRoute = lazy(() =>
  import("./routes/DeckDesignerRoute.js").then((m) => ({
    default: m.DeckDesignerRoute,
  })),
);
const RecipesRoute = lazy(() =>
  import("./routes/RecipesRoute.js").then((m) => ({
    default: m.RecipesRoute,
  })),
);
const PilgrimageRoutesRoute = lazy(() =>
  import("./routes/PilgrimageRoutesRoute.js").then((m) => ({
    default: m.PilgrimageRoutesRoute,
  })),
);
const MemorialModeRoute = lazy(() =>
  import("./routes/MemorialModeRoute.js").then((m) => ({
    default: m.MemorialModeRoute,
  })),
);
const AccountPasswordRoute = lazy(() =>
  import("./routes/AccountPasswordRoute.js").then((m) => ({
    default: m.AccountPasswordRoute,
  })),
);
const Foundations = lazy(() =>
  import("./routes/Foundations.js").then((m) => ({ default: m.Foundations })),
);
const GroupRitualCoordination = lazy(() =>
  import("./routes/GroupRitualCoordination.js").then((m) => ({
    default: m.GroupRitualCoordination,
  })),
);
const GroupRitualPostMortem = lazy(() =>
  import("./routes/GroupRitualPostMortem.js").then((m) => ({
    default: m.GroupRitualPostMortem,
  })),
);
const GroupRitualScheduler = lazy(() =>
  import("./routes/GroupRitualScheduler.js").then((m) => ({
    default: m.GroupRitualScheduler,
  })),
);
const HubAdminDashboard = lazy(() =>
  import("./routes/HubAdminDashboard.js").then((m) => ({
    default: m.HubAdminDashboard,
  })),
);
const HubDiscovery = lazy(() =>
  import("./routes/HubDiscovery.js").then((m) => ({
    default: m.HubDiscovery,
  })),
);
const HubMemberDashboard = lazy(() =>
  import("./routes/HubMemberDashboard.js").then((m) => ({
    default: m.HubMemberDashboard,
  })),
);
const HubNewsletterComposer = lazy(() =>
  import("./routes/HubNewsletterComposer.js").then((m) => ({
    default: m.HubNewsletterComposer,
  })),
);
const HubPublicFace = lazy(() =>
  import("./routes/HubPublicFace.js").then((m) => ({
    default: m.HubPublicFace,
  })),
);
const MyNetworks = lazy(() =>
  import("./routes/MyNetworks.js").then((m) => ({ default: m.MyNetworks })),
);
const NetworkBrowser = lazy(() =>
  import("./routes/NetworkBrowser.js").then((m) => ({
    default: m.NetworkBrowser,
  })),
);
const PrivateViewers = lazy(() =>
  import("./routes/PrivateViewers.js").then((m) => ({
    default: m.PrivateViewers,
  })),
);
const RolesPermissionsEditor = lazy(() =>
  import("./routes/RolesPermissionsEditor.js").then((m) => ({
    default: m.RolesPermissionsEditor,
  })),
);
const FederationAuditLog = lazy(() =>
  import("./routes/FederationAuditLog.js").then((m) => ({
    default: m.FederationAuditLog,
  })),
);
const ActivityPubSettings = lazy(() =>
  import("./routes/ActivityPubSettings.js").then((m) => ({
    default: m.ActivityPubSettings,
  })),
);
const Followers = lazy(() =>
  import("./routes/Followers.js").then((m) => ({ default: m.Followers })),
);
const WebFingerVerify = lazy(() =>
  import("./routes/WebFingerVerify.js").then((m) => ({
    default: m.WebFingerVerify,
  })),
);
const InstalledPlugins = lazy(() =>
  import("./routes/InstalledPlugins.js").then((m) => ({
    default: m.InstalledPlugins,
  })),
);
const PluginDetail = lazy(() =>
  import("./routes/PluginDetail.js").then((m) => ({
    default: m.PluginDetail,
  })),
);
const PluginConfiguration = lazy(() =>
  import("./routes/PluginConfiguration.js").then((m) => ({
    default: m.PluginConfiguration,
  })),
);
const PluginStatus = lazy(() =>
  import("./routes/PluginStatus.js").then((m) => ({
    default: m.PluginStatus,
  })),
);
const RegistryBrowserRoute = lazy(() =>
  import("./routes/RegistryBrowser.js").then((m) => ({
    default: m.RegistryBrowser,
  })),
);
const RegistryPluginDetail = lazy(() =>
  import("./routes/RegistryPluginDetail.js").then((m) => ({
    default: m.RegistryPluginDetail,
  })),
);
const PluginAuthorProfile = lazy(() =>
  import("./routes/PluginAuthorProfile.js").then((m) => ({
    default: m.PluginAuthorProfile,
  })),
);
const BundleLibrary = lazy(() =>
  import("./routes/BundleLibrary.js").then((m) => ({
    default: m.BundleLibrary,
  })),
);
const BundleDetail = lazy(() =>
  import("./routes/BundleDetail.js").then((m) => ({
    default: m.BundleDetail,
  })),
);
const SandboxBrowserRoute = lazy(() =>
  import("./routes/SandboxBrowser.js").then((m) => ({
    default: m.SandboxBrowser,
  })),
);
const SandboxDetail = lazy(() =>
  import("./routes/SandboxDetail.js").then((m) => ({
    default: m.SandboxDetail,
  })),
);
const AgentsHomeRoute = lazy(() =>
  import("./routes/AgentsHomeRoute.js").then((m) => ({
    default: m.AgentsHomeRoute,
  })),
);
const AgentRunMonitorRoute = lazy(() =>
  import("./routes/AgentRunMonitorRoute.js").then((m) => ({
    default: m.AgentRunMonitorRoute,
  })),
);
const AgentActivityLogRoute = lazy(() =>
  import("./routes/AgentActivityLogRoute.js").then((m) => ({
    default: m.AgentActivityLogRoute,
  })),
);
const AgentCostDashboardRoute = lazy(() =>
  import("./routes/AgentCostDashboardRoute.js").then((m) => ({
    default: m.AgentCostDashboardRoute,
  })),
);
const AgentTaskComposerRoute = lazy(() =>
  import("./routes/AgentTaskComposerRoute.js").then((m) => ({
    default: m.AgentTaskComposerRoute,
  })),
);
const AgentTranscriptViewerRoute = lazy(() =>
  import("./routes/AgentTranscriptViewerRoute.js").then((m) => ({
    default: m.AgentTranscriptViewerRoute,
  })),
);
const AgentMarketplaceRoute = lazy(() =>
  import("./routes/AgentMarketplaceRoute.js").then((m) => ({
    default: m.AgentMarketplaceRoute,
  })),
);
const RegistryPublicHomeRoute = lazy(() =>
  import("./routes/RegistryPublicHomeRoute.js").then((m) => ({
    default: m.RegistryPublicHomeRoute,
  })),
);
const AgentInstallRoute = lazy(() =>
  import("./routes/AgentInstallRoute.js").then((m) => ({
    default: m.AgentInstallRoute,
  })),
);
const AgentTrustReviewRoute = lazy(() =>
  import("./routes/AgentTrustReviewRoute.js").then((m) => ({
    default: m.AgentTrustReviewRoute,
  })),
);
const AgentCapabilityReviewRoute = lazy(() =>
  import("./routes/AgentCapabilityReviewRoute.js").then((m) => ({
    default: m.AgentCapabilityReviewRoute,
  })),
);
const AgentByoKeySettingsRoute = lazy(() =>
  import("./routes/AgentByoKeySettingsRoute.js").then((m) => ({
    default: m.AgentByoKeySettingsRoute,
  })),
);
const AgentMemoryReaderRoute = lazy(() =>
  import("./routes/AgentMemoryReaderRoute.js").then((m) => ({
    default: m.AgentMemoryReaderRoute,
  })),
);
const PluginSubmissionFormRoute = lazy(() =>
  import("./routes/PluginSubmissionFormRoute.js").then((m) => ({
    default: m.PluginSubmissionFormRoute,
  })),
);
const PluginSubmissionListRoute = lazy(() =>
  import("./routes/PluginSubmissionListRoute.js").then((m) => ({
    default: m.PluginSubmissionListRoute,
  })),
);
const PluginSubmissionDetailRoute = lazy(() =>
  import("./routes/PluginSubmissionDetailRoute.js").then((m) => ({
    default: m.PluginSubmissionDetailRoute,
  })),
);
const RegistryReviewQueueRoute = lazy(() =>
  import("./routes/RegistryReviewQueueRoute.js").then((m) => ({
    default: m.RegistryReviewQueueRoute,
  })),
);
const RegistryReviewDetailRoute = lazy(() =>
  import("./routes/RegistryReviewDetailRoute.js").then((m) => ({
    default: m.RegistryReviewDetailRoute,
  })),
);
const TierPromotionRoute = lazy(() =>
  import("./routes/TierPromotionRoute.js").then((m) => ({
    default: m.TierPromotionRoute,
  })),
);
const VulnerabilityAdvisorySubmitRoute = lazy(() =>
  import("./routes/VulnerabilityAdvisorySubmitRoute.js").then((m) => ({
    default: m.VulnerabilityAdvisorySubmitRoute,
  })),
);
const Editor = lazy(() =>
  import("./routes/Editor.js").then((m) => ({ default: m.Editor })),
);
const Health = lazy(() =>
  import("./routes/Health.js").then((m) => ({ default: m.Health })),
);
const Identities = lazy(() =>
  import("./routes/Identities.js").then((m) => ({ default: m.Identities })),
);
const LineageAdmin = lazy(() =>
  import("./routes/LineageAdmin.js").then((m) => ({
    default: m.LineageAdmin,
  })),
);
const Oracle = lazy(() =>
  import("./routes/Oracle.js").then((m) => ({ default: m.Oracle })),
);
const Templates = lazy(() =>
  import("./routes/Templates.js").then((m) => ({ default: m.Templates })),
);
const Wellbeing = lazy(() =>
  import("./routes/Wellbeing.js").then((m) => ({ default: m.Wellbeing })),
);
const Workshop = lazy(() =>
  import("./routes/Workshop.js").then((m) => ({ default: m.Workshop })),
);
const Journal = lazy(() =>
  import("./routes/Journal.js").then((m) => ({ default: m.Journal })),
);
const Library = lazy(() =>
  import("./routes/Library.js").then((m) => ({ default: m.Library })),
);
const MagicalCircleRoute = lazy(() =>
  import("./routes/MagicalCircleRoute.js").then((m) => ({
    default: m.MagicalCircleRoute,
  })),
);
const MagicSquaresRoute = lazy(() =>
  import("./routes/MagicSquaresRoute.js").then((m) => ({
    default: m.MagicSquaresRoute,
  })),
);
const AnalyticsDashboardRoute = lazy(() =>
  import("./routes/AnalyticsDashboardRoute.js").then((m) => ({
    default: m.AnalyticsDashboardRoute,
  })),
);
const AudioLibraryRoute = lazy(() =>
  import("./routes/AudioLibraryRoute.js").then((m) => ({
    default: m.AudioLibraryRoute,
  })),
);
const CrossJournalSearchRoute = lazy(() =>
  import("./routes/CrossJournalSearchRoute.js").then((m) => ({
    default: m.CrossJournalSearchRoute,
  })),
);
const PerStudyPageRoute = lazy(() =>
  import("./routes/PerStudyPageRoute.js").then((m) => ({
    default: m.PerStudyPageRoute,
  })),
);
const QueryBuilderRoute = lazy(() =>
  import("./routes/QueryBuilderRoute.js").then((m) => ({
    default: m.QueryBuilderRoute,
  })),
);
const StudiesIndexRoute = lazy(() =>
  import("./routes/StudiesIndexRoute.js").then((m) => ({
    default: m.StudiesIndexRoute,
  })),
);
const SynchronicityLogRoute = lazy(() =>
  import("./routes/SynchronicityLogRoute.js").then((m) => ({
    default: m.SynchronicityLogRoute,
  })),
);
const TransliterationUtilityRoute = lazy(() =>
  import("./routes/TransliterationUtilityRoute.js").then((m) => ({
    default: m.TransliterationUtilityRoute,
  })),
);
const ICalFeedRoute = lazy(() =>
  import("./routes/ICalFeedRoute.js").then((m) => ({
    default: m.ICalFeedRoute,
  })),
);
const MediaDetailRoute = lazy(() =>
  import("./routes/MediaDetailRoute.js").then((m) => ({
    default: m.MediaDetailRoute,
  })),
);
const MediaLibraryRoute = lazy(() =>
  import("./routes/MediaLibraryRoute.js").then((m) => ({
    default: m.MediaLibraryRoute,
  })),
);
const PilgrimageMapRoute = lazy(() =>
  import("./routes/PilgrimageMapRoute.js").then((m) => ({
    default: m.PilgrimageMapRoute,
  })),
);
const TalismanDesignerRoute = lazy(() =>
  import("./routes/TalismanDesignerRoute.js").then((m) => ({
    default: m.TalismanDesignerRoute,
  })),
);
const ToolRegistryRoute = lazy(() =>
  import("./routes/ToolRegistryRoute.js").then((m) => ({
    default: m.ToolRegistryRoute,
  })),
);
const VocesMagicaeRoute = lazy(() =>
  import("./routes/VocesMagicaeRoute.js").then((m) => ({
    default: m.VocesMagicaeRoute,
  })),
);
const Placeholder = lazy(() =>
  import("./routes/Placeholder.js").then((m) => ({ default: m.Placeholder })),
);
const PracticeLogsRoute = lazy(() =>
  import("./routes/PracticeLogsRoute.js").then((m) => ({
    default: m.PracticeLogsRoute,
  })),
);
const SigilGeneratorRoute = lazy(() =>
  import("./routes/SigilGeneratorRoute.js").then((m) => ({
    default: m.SigilGeneratorRoute,
  })),
);
const RitualFeed = lazy(() =>
  import("./routes/RitualFeed.js").then((m) => ({ default: m.RitualFeed })),
);
const Settings = lazy(() =>
  import("./routes/Settings.js").then((m) => ({ default: m.Settings })),
);
const AccountSettingsRoute = lazy(() =>
  import("./routes/AccountSettingsRoute.js").then((m) => ({
    default: m.AccountSettingsRoute,
  })),
);
const DataExportRequestRoute = lazy(() =>
  import("./routes/DataExportRequestRoute.js").then((m) => ({
    default: m.DataExportRequestRoute,
  })),
);
const AccountDeletionRoute = lazy(() =>
  import("./routes/AccountDeletionRoute.js").then((m) => ({
    default: m.AccountDeletionRoute,
  })),
);
const PerUserAuditLogRoute = lazy(() =>
  import("./routes/PerUserAuditLogRoute.js").then((m) => ({
    default: m.PerUserAuditLogRoute,
  })),
);
const SessionsAndDevicesRoute = lazy(() =>
  import("./routes/SessionsAndDevicesRoute.js").then((m) => ({
    default: m.SessionsAndDevicesRoute,
  })),
);
const AccessibilityAndMotionRoute = lazy(() =>
  import("./routes/AccessibilityAndMotionRoute.js").then((m) => ({
    default: m.AccessibilityAndMotionRoute,
  })),
);
const WebAuthnEnrollmentRoute = lazy(() =>
  import("./routes/WebAuthnEnrollmentRoute.js").then((m) => ({
    default: m.WebAuthnEnrollmentRoute,
  })),
);
const TotpEnrollmentRoute = lazy(() =>
  import("./routes/TotpEnrollmentRoute.js").then((m) => ({
    default: m.TotpEnrollmentRoute,
  })),
);
const KeyRotationRoute = lazy(() =>
  import("./routes/KeyRotationRoute.js").then((m) => ({
    default: m.KeyRotationRoute,
  })),
);

// Vite's BASE_URL: "/" in dev, "/app/" in prod. BrowserRouter
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
  if (pathname.startsWith("/sigils") || pathname.startsWith("/sigil"))
    return "sigils";
  if (pathname.startsWith("/magic-squares")) return "magicsquares";
  if (pathname.startsWith("/circles") || pathname.startsWith("/circle"))
    return "circles";
  if (pathname.startsWith("/talisman")) return "talismans";
  if (pathname.startsWith("/tools")) return "tools";
  if (pathname.startsWith("/voces")) return "voces";
  if (pathname.startsWith("/audio")) return "audio";
  if (pathname.startsWith("/icalfeed")) return "icalfeed";
  if (pathname.startsWith("/media")) return "media";
  if (pathname.startsWith("/pilgrimage")) return "pilgrimage";
  if (pathname.startsWith("/analytics")) return "analytics";
  if (pathname.startsWith("/feed")) return "feed";
  // H08: the Network section gains three keys.
  if (pathname.startsWith("/networks")) return "networks";
  if (pathname.startsWith("/followers")) return "followers";
  if (pathname.startsWith("/private-viewers")) return "privateviewers";
  // H09 — Platform section
  if (pathname.startsWith("/plugins")) return "plugins";
  if (pathname.startsWith("/bundles")) return "bundles";
  if (pathname.startsWith("/sandbox")) return "sandbox";
  return undefined;
}

function Shell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const active = navKeyForPath(location.pathname);

  async function handleSignOut(): Promise<void> {
    try {
      await auth.signOut();
    } finally {
      navigate("/signin", { replace: true });
    }
  }

  // Identity shown in the VaultNav footer + medallion. Falls back to a
  // neutral "This vault / Practitioner" pair when there's no session
  // (SignIn / Connection pre-auth screens).
  const navIdentity = auth.session
    ? {
        name:
          auth.session.magickal_name ||
          auth.session.display_name ||
          "Practitioner",
        role: "Practitioner",
      }
    : { name: "Practitioner", role: "This vault" };

  // Real single-identity list for the topbar acting-as switcher. The
  // Persona table (Phase 02/03) will grow this into a real multi-
  // identity list; until then we render a single identity built from
  // the current session, not the fabricated DEMO_IDENTITIES.
  const actingIdentities = auth.session
    ? [
        {
          id: auth.session.user_id,
          vaultId: auth.session.vault_id ?? auth.session.user_id,
          name:
            auth.session.magickal_name ||
            auth.session.display_name ||
            "Practitioner",
          bio: "",
          glyph: undefined,
          glyphTone: "accent" as const,
          avatarUrl: null,
          signing: {
            algo: "ed25519" as const,
            publicKey: "",
            createdAt: new Date().toISOString(),
          },
          signingEnabled: false,
          archived: false,
          defaultsBySurface: {},
          displayName: auth.session.display_name || undefined,
        },
      ]
    : [];

  return (
    <AppShell
      topbar={
        <VaultTopbar
          actingAs={
            <ActingAsSwitcher
              identities={actingIdentities}
              onManage={() => navigate("/identities")}
              onSignOut={() => void handleSignOut()}
            />
          }
        />
      }
      nav={
        <VaultNav
          active={active}
          LinkComponent={NavLinkAdapter}
          identity={navIdentity}
          onSettings={() => navigate("/settings")}
        />
      }
    >
      {children}
    </AppShell>
  );
}

/**
 * Session gate. The public `/signin` route stays reachable; every other
 * route requires an authenticated session. Belt + suspenders vs. the
 * backend 401 sweep — if the API is compromised, the shell still won't
 * render owned data to a stranger.
 */
function RequireSession({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === "idle" || status === "checking") {
    return <SurfaceSkeleton rowCount={4} />;
  }
  if (status === "unauthenticated") {
    return (
      <Navigate
        to="/signin"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }
  return <>{children}</>;
}

/**
 * Inside-the-shell routes: every surface that renders within VaultNav +
 * VaultTopbar. The quick-capture route lives outside this (and outside
 * `<Shell>`) so the PWA start_url opens straight into a full-viewport
 * compose field without the chrome.
 */
function ShellRoutes() {
  const location = useLocation();
  // `/signin` renders without the shell chrome so a signed-out visitor
  // sees the sign-in surface directly. Every other route requires a
  // real session — see RequireSession.
  if (location.pathname === "/signin") {
    return (
      <Suspense fallback={<SurfaceSkeleton rowCount={4} />}>
        <Routes>
          <Route path="/signin" element={<SignInRoute />} />
        </Routes>
      </Suspense>
    );
  }
  if (location.pathname === "/setup") {
    return (
      <Suspense fallback={<SurfaceSkeleton rowCount={4} />}>
        <Routes>
          <Route path="/setup" element={<SetupWizardRoute />} />
        </Routes>
      </Suspense>
    );
  }
  return (
    <RequireSession>
      <Shell>
        <Suspense fallback={<SurfaceSkeleton rowCount={4} />}>
          <Routes>
            <Route path="/" element={<Today />} />
          <Route path="/connection" element={<Connection />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/library" element={<Library />} />
          <Route path="/synchronicities" element={<SynchronicityLogRoute />} />
          <Route path="/daily-practice" element={<DailyPracticeRoute />} />
          <Route path="/practice-logs" element={<PracticeLogsRoute />} />
          <Route path="/entities" element={<Entities />} />
          <Route path="/family-tree" element={<FamilyTreeRoute />} />
          <Route path="/deck-designer" element={<DeckDesignerRoute />} />
          <Route path="/recipes" element={<RecipesRoute />} />
          <Route path="/pilgrimage-routes" element={<PilgrimageRoutesRoute />} />
          <Route path="/memorial-mode" element={<MemorialModeRoute />} />
          <Route path="/settings/password" element={<AccountPasswordRoute />} />
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
          <Route path="/divination/geomancy" element={<GeomancyRoute />} />
          <Route path="/divination/runes" element={<RunesRoute />} />
          <Route path="/divination/more" element={<DivinationMiscRoute />} />
          <Route path="/sigils" element={<SigilGeneratorRoute />} />
          <Route path="/magic-squares" element={<MagicSquaresRoute />} />
          <Route path="/circles" element={<MagicalCircleRoute />} />
          <Route path="/talismans" element={<TalismanDesignerRoute />} />
          <Route path="/tools" element={<ToolRegistryRoute />} />
          <Route path="/voces" element={<VocesMagicaeRoute />} />
          <Route path="/gematria" element={<GematriaCalculatorRoute />} />
          <Route
            path="/gematria/search"
            element={<CrossJournalSearchRoute />}
          />
          <Route path="/studies" element={<StudiesIndexRoute />} />
          <Route path="/studies/:id" element={<PerStudyPageRoute />} />
          <Route path="/query" element={<QueryBuilderRoute />} />
          <Route path="/voces-library" element={<VocesLibraryRoute />} />
          <Route path="/publications" element={<PublicationsRoute />} />
          <Route
            path="/publications/:id/edit"
            element={<PublicationEditorRoute />}
          />
          <Route path="/publication-editor" element={<PublicationEditorRoute />} />
          <Route
            path="/publications/:id/settings"
            element={<PublicationSettingsRoute />}
          />
          <Route
            path="/publication-settings"
            element={<PublicationSettingsRoute />}
          />
          <Route
            path="/publications/:id/print-preview"
            element={<PublicationPrintPreviewRoute />}
          />
          <Route
            path="/publications/:id/pricing"
            element={<PricingDistributionRoute />}
          />
          <Route
            path="/pricing-distribution"
            element={<PricingDistributionRoute />}
          />
          <Route
            path="/subscription-tiers"
            element={<SubscriptionTiersRoute />}
          />
          <Route path="/subscribers" element={<SubscribersRoute />} />
          <Route
            path="/newsletter-editor"
            element={<NewsletterEditorRoute />}
          />
          <Route
            path="/newsletters/:id/edit"
            element={<NewsletterEditorRoute />}
          />
          <Route path="/audio" element={<AudioLibraryRoute />} />
          <Route path="/icalfeed" element={<ICalFeedRoute />} />
          <Route path="/pilgrimage" element={<PilgrimageMapRoute />} />
          <Route path="/media" element={<MediaLibraryRoute />} />
          <Route path="/media/:id" element={<MediaDetailRoute />} />
          <Route path="/analytics" element={<AnalyticsDashboardRoute />} />
          <Route path="/feed" element={<RitualFeed />} />
          {/* H08 — Network section routes. Cluster A surfaces land one per
              batch; My Networks is in. The legacy `/hubs` URL still
              resolves (now to the same surface) so any external bookmarks
              stay alive while the rest of Cluster A ships. */}
          <Route path="/networks" element={<MyNetworks />} />
          <Route path="/networks/peers" element={<NetworkBrowser />} />
          <Route path="/networks/discover" element={<HubDiscovery />} />
          <Route path="/hubs" element={<MyNetworks />} />
          <Route
            path="/hubs/:hubId/admin"
            element={<HubAdminDashboard />}
          />
          <Route
            path="/hubs/:hubId/admin/roles"
            element={<RolesPermissionsEditor />}
          />
          <Route
            path="/hubs/:hubId/admin/audit"
            element={<FederationAuditLog />}
          />
          <Route
            path="/hubs/:hubId/newsletter"
            element={<HubNewsletterComposer />}
          />
          <Route
            path="/hubs/:hubId"
            element={<HubMemberDashboard />}
          />
          <Route path="/hub/:slug" element={<HubPublicFace />} />
          <Route path="/private-viewers" element={<PrivateViewers />} />
          <Route
            path="/settings/activitypub"
            element={<ActivityPubSettings />}
          />
          <Route path="/followers" element={<Followers />} />
          <Route path="/verify" element={<WebFingerVerify />} />
          {/* H09 — Platform section */}
          <Route path="/plugins" element={<InstalledPlugins />} />
          <Route path="/plugins/status" element={<PluginStatus />} />
          <Route
            path="/plugins/registry"
            element={<RegistryBrowserRoute />}
          />
          <Route
            path="/plugins/registry/:id"
            element={<RegistryPluginDetail />}
          />
          <Route
            path="/plugins/authors/:did"
            element={<PluginAuthorProfile />}
          />
          <Route
            path="/plugins/:id/configure"
            element={<PluginConfiguration />}
          />
          <Route path="/plugins/:id" element={<PluginDetail />} />
          <Route path="/bundles" element={<BundleLibrary />} />
          <Route path="/bundles/:id" element={<BundleDetail />} />
          <Route path="/sandbox" element={<SandboxBrowserRoute />} />
          <Route path="/sandbox/:id" element={<SandboxDetail />} />
          <Route
            path="/group-rituals/:id/run"
            element={<GroupRitualCoordination />}
          />
          <Route
            path="/group-rituals/new"
            element={<GroupRitualScheduler />}
          />
          <Route
            path="/group-rituals/:id"
            element={<GroupRitualPostMortem />}
          />
          <Route path="/identities" element={<Identities />} />
          <Route path="/lineage" element={<LineageAdmin />} />
          <Route path="/wellbeing" element={<Wellbeing />} />
          <Route path="/agents-home" element={<AgentsHomeRoute />} />
          <Route path="/agents/runs/:runId" element={<AgentRunMonitorRoute />} />
          <Route path="/agents-activity" element={<AgentActivityLogRoute />} />
          <Route path="/agents-cost" element={<AgentCostDashboardRoute />} />
          <Route path="/agents/:installId/compose" element={<AgentTaskComposerRoute />} />
          <Route path="/agents/runs/:runId/transcript" element={<AgentTranscriptViewerRoute />} />
          <Route path="/agents-marketplace" element={<AgentMarketplaceRoute />} />
          <Route path="/registry" element={<RegistryPublicHomeRoute />} />
          <Route path="/agents-marketplace/:agentSlug" element={<AgentInstallRoute />} />
          <Route path="/agents/:installId/trust" element={<AgentTrustReviewRoute />} />
          <Route path="/agents/:installId/capabilities" element={<AgentCapabilityReviewRoute />} />
          <Route path="/agents-keys" element={<AgentByoKeySettingsRoute />} />
          <Route path="/agents/:installId/memory" element={<AgentMemoryReaderRoute />} />
          <Route path="/registry/submit" element={<PluginSubmissionFormRoute />} />
          <Route path="/registry/submissions" element={<PluginSubmissionListRoute />} />
          <Route path="/registry/submissions/:submissionId" element={<PluginSubmissionDetailRoute />} />
          <Route path="/registry/review" element={<RegistryReviewQueueRoute />} />
          <Route path="/registry/review/:submissionId" element={<RegistryReviewDetailRoute />} />
          <Route path="/registry/promote/:pluginId" element={<TierPromotionRoute />} />
          <Route path="/registry/advisory" element={<VulnerabilityAdvisorySubmitRoute />} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/editor/:id" element={<Editor />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/health" element={<Health />} />
          <Route path="/workshop" element={<Workshop />} />
          <Route path="/oracle" element={<Oracle />} />
          <Route path="/transliterations" element={<TransliterationUtilityRoute />} />
          <Route path="/settings" element={<AccountSettingsRoute />} />
          <Route path="/settings/data-export" element={<DataExportRequestRoute />} />
          <Route path="/settings/delete-account" element={<AccountDeletionRoute />} />
          <Route path="/settings/audit" element={<PerUserAuditLogRoute />} />
          <Route path="/settings/sessions" element={<SessionsAndDevicesRoute />} />
          <Route path="/settings/accessibility" element={<AccessibilityAndMotionRoute />} />
          <Route path="/settings/preferences" element={<Settings />} />
          <Route path="/comments-moderation" element={<CommentModerationRoute />} />
          <Route path="/settings/keys" element={<KeyRotationRoute />} />
          <Route path="/settings/webauthn" element={<WebAuthnEnrollmentRoute />} />
          <Route path="/settings/totp" element={<TotpEnrollmentRoute />} />
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
        </Suspense>
      </Shell>
    </RequireSession>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider api={apiMethods}>
          {/* No `initial` prop — the fabricated "aspasia" default from
              ACTING_AS_DEFAULT_ID never matched a real identity; the
              ActingAsSwitcher falls back to the first authorable
              identity (built from the current session) when acting
              is null. */}
          <ActingAsProvider>
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
    </QueryClientProvider>
  );
}
