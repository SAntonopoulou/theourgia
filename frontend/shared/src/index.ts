/**
 * @theourgia/shared — the design-system kit shared by every Theourgia app.
 *
 * Imports here are barrel exports of:
 *   - the token layer (theme types + apply/read helpers)
 *   - the i18n shim (passthrough today; real catalog later)
 *   - the UI primitives + overlay family
 *
 * For the CSS file and the icon sprite, import via the sub-paths declared in
 * package.json::exports — those are static assets, not JS exports.
 */

export * from "./AliasGraph/index.js";
export * from "./api/index.js";
export * from "./AppShell/index.js";
export * from "./Attestations/index.js";
export * from "./auth/index.js";
export * from "./AutoStampChip/index.js";
export * from "./Avatar/index.js";
export * from "./Badge/index.js";
export * from "./Banner/index.js";
export * from "./BeingsTabs/index.js";
export * from "./BindingKindIcon/index.js";
export * from "./BindRune/index.js";
export * from "./BodySensation/index.js";
export * from "./BodySilhouette/index.js";
export * from "./BulkActionBar/index.js";
export * from "./Button/index.js";
export * from "./Calendar/index.js";
export * from "./Card/index.js";
export * from "./CelestialBand/index.js";
export * from "./crypto/index.js";
export * from "./gematria/index.js";
export * from "./GematriaCalculator/index.js";
export * from "./VocesLibrary/index.js";
export * from "./WorkshopModals/index.js";
export * from "./NewsletterEditor/index.js";
export * from "./Chart/index.js";
export * from "./Chip/index.js";
export * from "./Contracts/index.js";
export * from "./CrossJournalSearch/index.js";
export * from "./DailyPractice/index.js";
export * from "./DeckDesigner/index.js";
export * from "./Memorial/index.js";
export * from "./PilgrimageRoutes/index.js";
export * from "./Recipes/index.js";
export * from "./Dialog/index.js";
export * from "./divination/index.js";
export * from "./DivinationMisc/index.js";
export * from "./Drawer/index.js";
export * from "./Election/index.js";
export * from "./EmptyState/index.js";
export * from "./EntityCard/index.js";
export * from "./Export/index.js";
export * from "./FamilyTree/index.js";
export * from "./ExportPreview/index.js";
export * from "./Field/index.js";
export * from "./Geomancy/index.js";
export * from "./Glyph/index.js";
export * from "./hooks/index.js";
export * from "./ICalFeed/index.js";
export * from "./i18n/index.js";
export * from "./IChing/index.js";
export * from "./identity/index.js";
export * from "./Initiations/index.js";
export * from "./ItemsComposer/index.js";
export * from "./KindFunctionFilter/index.js";
export * from "./LiberResh/index.js";
export * from "./Library/index.js";
export * from "./LunarPhaseWidget/index.js";
export * from "./MagicalCircle/index.js";
export * from "./MagicSquares/index.js";
export * from "./MediaDetail/index.js";
export * from "./MediaLibrary/index.js";
export * from "./MediaUpload/index.js";
export * from "./Menu/index.js";
export * from "./MultiCalendarCard/index.js";
export * from "./Oaths/index.js";
export * from "./ObligationTable/index.js";
export * from "./Offerings/index.js";
export * from "./AddPlace/index.js";
export * from "./AnalyticsDashboard/index.js";
export * from "./AnalyticsTabs/index.js";
export * from "./AudioLibrary/index.js";
export * from "./LinguisticTabs/index.js";
export * from "./GroupRitualCoordination/index.js";
export * from "./GroupRitualPostMortem/index.js";
export * from "./GroupRitualScheduler/index.js";
export * from "./GroupRitualTimeTrio/index.js";
export * from "./HubAdmin/index.js";
export * from "./HubDiscovery/index.js";
export * from "./HubMember/index.js";
export * from "./HubPublicFace/index.js";
export * from "./MyNetworks/index.js";
export * from "./NetworkBrowser/index.js";
export * from "./NewsletterComposer/index.js";
export * from "./OracleTabs/index.js";
export * from "./PerStudyPage/index.js";
export * from "./PilgrimageMap/index.js";
export * from "./PlanetaryHourDetail/index.js";
export * from "./PlanetaryHourStrip/index.js";
export * from "./PrivateViewers/index.js";
export * from "./RolesPermissionsEditor/index.js";
export * from "./SsoAuthorizeConsent/index.js";
export * from "./FederationAuditLog/index.js";
export * from "./PushToHub/index.js";
export * from "./ActivityPubSettings/index.js";
export * from "./FollowersPane/index.js";
export * from "./RemoteContentEmbed/index.js";
export * from "./WebFingerVerify/index.js";
export * from "./FederatedComments/index.js";
export * from "./CrossPostPreview/index.js";
export * from "./InstalledPlugins/index.js";
export * from "./PluginDetail/index.js";
export * from "./PluginCapabilityReview/index.js";
export * from "./PluginConfiguration/index.js";
export * from "./PluginStatusDashboard/index.js";
export * from "./VulnerabilityAdvisoryBanner/index.js";
// ── H10 surfaces (Cluster A registry · Cluster B hardening · Cluster C agents)
// Each surface re-exports its Surface + types from the main barrel; the
// `copy` const re-exports use namespace form to avoid name collisions
// across surfaces (BUTTONS, HEADERS, SECTION_LABELS, etc.). Consumers
// access copy as `AccountDeletionCopy.BUTTONS` or import directly from
// the deep path.
export * as DataExportRequestCopy from "./DataExportRequest/index.js";
export {
  DataExportRequestSurface,
  type DataExportRequestSurfaceProps,
} from "./DataExportRequest/DataExportRequestSurface.js";
export * as AccountDeletionCopy from "./AccountDeletion/index.js";
export {
  AccountDeletionSurface,
  type AccountDeletionSurfaceProps,
} from "./AccountDeletion/AccountDeletionSurface.js";
export * as PerUserAuditLogCopy from "./PerUserAuditLog/index.js";
export {
  PerUserAuditLogSurface,
  type AuditLogRow,
  type PerUserAuditLogSurfaceProps,
} from "./PerUserAuditLog/PerUserAuditLogSurface.js";
export * as SessionsAndDevicesCopy from "./SessionsAndDevices/index.js";
export {
  SessionsAndDevicesSurface,
  type CurrentSession,
  type SessionRow,
  type SessionsAndDevicesSurfaceProps,
} from "./SessionsAndDevices/SessionsAndDevicesSurface.js";
export * as AccountSettingsCopy from "./AccountSettings/index.js";
export {
  AccountSettingsSurface,
  type AccountSettingsSurfaceProps,
} from "./AccountSettings/AccountSettingsSurface.js";
export * as AccessibilityAndMotionCopy from "./AccessibilityAndMotion/index.js";
export {
  AccessibilityAndMotionSurface,
  type AccessibilityAndMotionSurfaceProps,
} from "./AccessibilityAndMotion/AccessibilityAndMotionSurface.js";
export * as KeyRotationCopy from "./KeyRotation/index.js";
export {
  KeyRotationSurface,
  type CurrentKey,
  type KeyHistoryEntry,
  type KeyRotationSurfaceProps,
} from "./KeyRotation/KeyRotationSurface.js";
export * as RegistryPublicHomeCopy from "./RegistryPublicHome/index.js";
export {
  RegistryPublicHomeSurface,
  type RegistryPublicHomeSurfaceProps,
} from "./RegistryPublicHome/RegistryPublicHomeSurface.js";
export type {
  ExtensionPointTile,
  RecentlyAddedItem,
  RecentlyUpdatedItem,
  TierKey,
} from "./RegistryPublicHome/copy.js";
export * as PluginSubmissionFormCopy from "./PluginSubmissionForm/index.js";
export {
  PluginSubmissionFormSurface,
  type PluginSubmissionFormProps,
} from "./PluginSubmissionForm/PluginSubmissionFormSurface.js";
export type {
  CapabilityChip as RegistryCapabilityChip,
  SourceKind as RegistrySourceKind,
} from "./PluginSubmissionForm/copy.js";
export * as PluginSubmissionListCopy from "./PluginSubmissionList/index.js";
export {
  PluginSubmissionListSurface,
  type PluginSubmissionListSurfaceProps,
  type SubmissionRow,
} from "./PluginSubmissionList/PluginSubmissionListSurface.js";
export type { SubmissionState } from "./PluginSubmissionList/copy.js";
export * as PluginSubmissionDetailCopy from "./PluginSubmissionDetail/index.js";
export {
  PluginSubmissionDetailSurface,
  type PluginSubmissionDetailSurfaceProps,
} from "./PluginSubmissionDetail/PluginSubmissionDetailSurface.js";
export type {
  CapabilityChip as DetailCapabilityChip,
  TimelineEntry,
  TimelineDotTone,
} from "./PluginSubmissionDetail/copy.js";
export * as RegistryReviewQueueCopy from "./RegistryReviewQueue/index.js";
export {
  RegistryReviewQueueSurface,
  type RegistryReviewQueueSurfaceProps,
  type ReviewQueueRow,
} from "./RegistryReviewQueue/RegistryReviewQueueSurface.js";
export type {
  TargetTier,
  TargetTierFilter,
  TimeRangeFilter as ReviewTimeRangeFilter,
} from "./RegistryReviewQueue/copy.js";
export * as RegistryReviewDetailCopy from "./RegistryReviewDetail/index.js";
export {
  RegistryReviewDetailSurface,
  type RegistryReviewDetailSurfaceProps,
} from "./RegistryReviewDetail/RegistryReviewDetailSurface.js";
export type {
  VerificationCheck,
  DiffEntry as ReviewDiffEntry,
  DiffEntryKind as ReviewDiffEntryKind,
} from "./RegistryReviewDetail/copy.js";
export * as TierPromotionCopy from "./TierPromotion/index.js";
export {
  TierPromotionSurface,
  type TierPromotionSurfaceProps,
} from "./TierPromotion/TierPromotionSurface.js";
export type { PluginPickerMeta } from "./TierPromotion/TierPromotionSurface.js";
export type { ChecklistItem as TierPromotionChecklistItem } from "./TierPromotion/copy.js";
export * as VulnerabilityAdvisorySubmitCopy from "./VulnerabilityAdvisorySubmit/index.js";
export {
  VulnerabilityAdvisorySubmitSurface,
  type VulnerabilityAdvisorySubmitSurfaceProps,
  type PluginOption,
} from "./VulnerabilityAdvisorySubmit/VulnerabilityAdvisorySubmitSurface.js";
export type { SeverityKey, DisclosureTiming } from "./VulnerabilityAdvisorySubmit/copy.js";
export * as AgentsHomeCopy from "./AgentsHome/index.js";
export {
  AgentsHomeSurface,
  type AgentRow,
  type AgentsHomeSurfaceProps,
  type DisabledAgentRow,
} from "./AgentsHome/AgentsHomeSurface.js";
export type { AgentSubnavKey } from "./AgentsHome/copy.js";
export * as AgentMarketplaceCopy from "./AgentMarketplace/index.js";
export {
  AgentMarketplaceSurface,
  type AgentMarketplaceSurfaceProps,
  type MarketAgentCard,
} from "./AgentMarketplace/AgentMarketplaceSurface.js";
export type {
  AgentMarketKind,
  AgentTier,
  CapabilityFilter,
  SourceFilter,
  SortOption as MarketSortOption,
} from "./AgentMarketplace/copy.js";
export * as AgentInstallCopy from "./AgentInstall/index.js";
export {
  AgentInstallSurface,
  type AgentInstallSurfaceProps,
} from "./AgentInstall/AgentInstallSurface.js";
export type { AgentCapabilityChip } from "./AgentInstall/copy.js";
export * as AgentCapabilityReviewCopy from "./AgentCapabilityReview/index.js";
export {
  AgentCapabilityReviewSurface,
  type AgentCapabilityReviewSurfaceProps,
} from "./AgentCapabilityReview/AgentCapabilityReviewSurface.js";
export type { AgentCapabilityRow, CapabilityReviewScenario } from "./AgentCapabilityReview/copy.js";
export * as AgentByoKeySettingsCopy from "./AgentByoKeySettings/index.js";
export {
  AgentByoKeySettingsSurface,
  type AgentByoKeySettingsSurfaceProps,
  type PerAgentKeyRow,
} from "./AgentByoKeySettings/AgentByoKeySettingsSurface.js";
export type { PerAgentKeyKind } from "./AgentByoKeySettings/copy.js";
export * as AgentTaskComposerCopy from "./AgentTaskComposer/index.js";
export {
  AgentTaskComposerSurface,
  type AgentTaskComposerSurfaceProps,
} from "./AgentTaskComposer/AgentTaskComposerSurface.js";
export type { ScopeOption } from "./AgentTaskComposer/copy.js";
export * as AgentRunMonitorCopy from "./AgentRunMonitor/index.js";
export {
  AgentRunMonitorSurface,
  type AgentRunMonitorSurfaceProps,
} from "./AgentRunMonitor/AgentRunMonitorSurface.js";
export type { ActivityRowTone, HumanActivityRow } from "./AgentRunMonitor/copy.js";
export * as AgentTranscriptViewerCopy from "./AgentTranscriptViewer/index.js";
export {
  AgentTranscriptViewerSurface,
  type AgentTranscriptViewerSurfaceProps,
  type TranscriptRow,
} from "./AgentTranscriptViewer/AgentTranscriptViewerSurface.js";
export type { SpeakerKind } from "./AgentTranscriptViewer/copy.js";
export * as AgentMemoryReaderCopy from "./AgentMemoryReader/index.js";
export {
  AgentMemoryReaderSurface,
  type AgentMemoryReaderSurfaceProps,
  type MemoryFileMeta,
} from "./AgentMemoryReader/AgentMemoryReaderSurface.js";
export * as AgentCostDashboardCopy from "./AgentCostDashboard/index.js";
export {
  AgentCostDashboardSurface,
  type AgentCostDashboardSurfaceProps,
  type PerAgentRow,
} from "./AgentCostDashboard/AgentCostDashboardSurface.js";
export type { TokenBreakdown, AgentRowKind } from "./AgentCostDashboard/copy.js";
export * as AgentActivityLogCopy from "./AgentActivityLog/index.js";
export {
  AgentActivityLogSurface,
  type AgentActivityLogSurfaceProps,
  type ActivityRunRow,
} from "./AgentActivityLog/AgentActivityLogSurface.js";
export type {
  ActivityTimeRange,
  OutcomeFilter,
  RunOutcome as ActivityRunOutcome,
} from "./AgentActivityLog/copy.js";
export * as AgentTrustReviewCopy from "./AgentTrustReview/index.js";
export {
  AgentTrustReviewSurface,
  type AgentTrustReviewSurfaceProps,
  type AddedSinceInstall,
} from "./AgentTrustReview/AgentTrustReviewSurface.js";
export type { CurrentCapabilityRow } from "./AgentTrustReview/copy.js";
export * from "./RegistryBrowser/index.js";
export * from "./RegistryPluginDetail/index.js";
export * from "./PluginAuthorProfile/index.js";
export * from "./BundleLibrary/index.js";
export * from "./BundleDetail/index.js";
export * from "./BundleInstallPreview/index.js";
export * from "./SandboxBrowser/index.js";
export * from "./SandboxDetail/index.js";
export * from "./SandboxPromote/index.js";
export * from "./BundleDiscard/index.js";
export * from "./PluginUpdateDiff/index.js";
export * from "./practice/index.js";
export * from "./PracticeNav/index.js";
export * from "./LunarDayChip/index.js";
export * from "./Astragaloi/index.js";
export * from "./TwoGateVerdict/index.js";
export * from "./TetraktysLadder/index.js";
export * from "./PracticeLogs/index.js";
export * from "./workshop/index.js";
export * from "./Popover/index.js";
export * from "./Progress/index.js";
export * from "./QueryBuilder/index.js";
export * from "./PublicChrome/index.js";
export * from "./PricingDistribution/index.js";
export * from "./PrintPreview/index.js";
export * from "./Reader/index.js";
export * from "./Comments/index.js";
export * from "./LanguageIME/index.js";
export {
  type FeedPack,
  fetchPackFeed,
  fetchPackMbf,
  parsePackFeed,
} from "./packs/packFeed.js";
export {
  fetchPackContent,
  installedPackPayloads,
  isClientReadable,
  MAX_CLIENT_SIDE_BYTES,
  type PackPayloads,
  parsePackBytes,
} from "./packs/packContent.js";
export {
  MODULE_INSTALL_KIND,
  type ModuleInstallFact,
  moduleInstallEntry,
  offeredFromOtherDevices,
  packSyncEnabled,
  parseModuleInstalls,
  type RecordEntry,
  setPackSyncEnabled,
} from "./packs/moduleInstallSync.js";
export {
  CorrespondenceChart,
  type CorrespondenceChartProps,
} from "./correspondence/CorrespondenceChart.js";
export {
  categoriesFor,
  type CorrespondenceEntry,
  type CorrespondenceSource,
  type CorrespondenceTable,
  packToCorrespondenceTable,
  subjectsAcross,
  valueIn,
} from "./correspondence/packCorrespondences.js";
export {
  DirectionalFrameReference,
  type DirectionalFrameReferenceProps,
} from "./directionalFrame/DirectionalFrameReference.js";
export {
  type DirectionalFrame,
  type FrameQuarter,
  packToFrames,
} from "./directionalFrame/packFrames.js";
export {
  ElectionReference,
  type ElectionReferenceProps,
} from "./electionRules/ElectionReference.js";
// The written rites, read from the synced record (the web mirror of the phone's
// Rituals screen).
export {
  type Rite,
  type RiteRecordEntry,
  ritesFromEntries,
} from "./rites/recordRites.js";
export {
  RITE_SYNTAX_HINT,
  type ScriptBlock,
  type ScriptSpan,
  isRiteEmpty,
  parseRite,
  spokenOnly,
} from "./rites/riteScript.js";
export { RiteScriptView, type RiteScriptViewProps } from "./rites/RiteScriptView.js";
export { RitesLibrary, type RitesLibraryProps } from "./rites/RitesLibrary.js";
export { RiteEditor, type RiteDraft, type RiteEditorProps } from "./rites/RiteEditor.js";
// The long operations, read from the synced record (the phone's Workings screen).
export {
  type Working,
  type WorkingItem,
  type WorkingRecordEntry,
  type WorkingStage,
  workingsFromEntries,
} from "./workings/recordWorkings.js";
export { WorkingsLibrary, type WorkingsLibraryProps } from "./workings/WorkingsLibrary.js";
export {
  WorkingEditor,
  type WorkingDraft,
  type WorkingEditorProps,
  type WorkingItemInput,
} from "./workings/WorkingEditor.js";
// The day's agenda — which scheduled rites/sittings fall on a day (the phone's
// Recurrence, ported), for a real Today.
export {
  type RecurrenceKind,
  type Schedule,
  type ScheduleRecordEntry,
  isoWeekday,
  scheduleDueOn,
  scheduleSubjectKey,
  schedulesFromEntries,
} from "./agenda/scheduleAgenda.js";
// Keeping — recording a practice as done, the way the phone captures it (sky
// context + mood/body/note), written back to the record so it crosses to the phone.
export {
  BODY_LABELS,
  MOOD_LABELS,
  type BuildObservanceInput,
  type RecordEntryWrite,
  buildObservanceEntry,
} from "./keeping/observance.js";
export {
  type BuildContextInput,
  type ContextHours,
  type ContextPlacement,
  type ObservanceContext,
  SIGN_NAMES,
  buildObservanceContext,
  signIndex,
} from "./keeping/observanceContext.js";
export {
  KeepingSheet,
  type KeepingSheetProps,
  type KeepingValues,
} from "./keeping/KeepingSheet.js";
export {
  type BuildDayEntryInput,
  type DayEntryKind,
  JOURNAL_KINDS,
  buildDayEntryEntry,
} from "./keeping/dayEntry.js";
export { type BuildSubjectInput, buildSubjectEntry } from "./keeping/subject.js";
// Pure timing for the self-contained practice tools (sitting timer, breath pacer).
export {
  type BreathPhase,
  type BreathRatio,
  breathPattern,
  cycleSeconds,
  formatClock,
  phaseAt,
} from "./practiceTimer/practiceTimer.js";
export {
  type ElectionClause,
  type ElectionTemplates,
  type Matter,
  packToElectionTemplates,
  type Ruleset,
} from "./electionRules/packElections.js";
export {
  FestivalCalendarReference,
  type FestivalCalendarReferenceProps,
  type NamedCalendar,
} from "./festivalCalendar/FestivalCalendarReference.js";
export {
  type NamedDeckSet,
  OracleDeckReference,
  type OracleDeckReferenceProps,
} from "./oracleDeck/OracleDeckReference.js";
export {
  groupCards,
  type OracleCard,
  type OracleDeck,
  type OracleDeckPack,
  type OracleSpread,
  type OracleSpreadPosition,
  packToOracleDeck,
} from "./oracleDeck/packDecks.js";
export {
  type FestivalCalendar,
  type Occasion,
  packToFestivalCalendar,
  type Reckoning,
} from "./festivalCalendar/packCalendar.js";
export {
  TechniqueReference,
  type TechniqueReferenceProps,
} from "./technique/TechniqueReference.js";
export { packToTechniques, type Technique } from "./technique/packTechniques.js";
export {
  type CorpusMeta,
  type CorpusRow,
  indexByValue,
  isWordCorpusPack,
  parseCorpusMeta,
  parseEntries,
  type ValueMatches,
  wordsForValue,
} from "./wordCorpus/parseCorpus.js";
export { type LoadedCorpus, readCorpusFromMbf } from "./wordCorpus/readCorpus.js";
export * from "./PublicationEditor/index.js";
export * from "./PublicationSettings/index.js";
export * from "./Publications/index.js";
export * from "./PublicVaultPage/index.js";
export * from "./SubscriptionTiers/index.js";
export * from "./Subscribers/index.js";
export * from "./ReceptionSelector/index.js";
export * from "./RelationshipStatusPill/index.js";
export * from "./Runes/index.js";
export * from "./SacredSite/index.js";
export * from "./Search/index.js";
export * from "./SealUnlock/index.js";
export * from "./SegmentedControl/index.js";
export * from "./SensationConfig/index.js";
export * from "./Servitors/index.js";
export * from "./SigilGenerator/index.js";
export * from "./Signing/index.js";
export * from "./Skeleton/index.js";
export * from "./Stat/index.js";
export * from "./StatusDot/index.js";
export * from "./StudiesIndex/index.js";
export * from "./TalismanDesigner/index.js";
export * from "./Switch/index.js";
export * from "./SynchronicityLog/index.js";
export * from "./SynchronicityQuickCapture/index.js";
export * from "./Tarot/index.js";
export * from "./TemplateDesigner/index.js";
export * from "./Editor/index.js";
export * from "./Toast/index.js";
export * from "./TransliterationUtility/index.js";
export * from "./TodayLedger/index.js";
export * from "./Tooltip/index.js";
export * from "./ToolRegistry/index.js";
export * from "./tokens/index.js";
export * from "./VaultNav/index.js";
export * from "./VaultTopbar/index.js";
export * from "./Visibility/index.js";
export * from "./VocesMagicae/index.js";
