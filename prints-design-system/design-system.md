# Birth Hub 360° — Visual Design System Audit

## Executive Summary

This document provides a comprehensive inventory of the visual design system for Birth Hub 360°, automatically generated from the codebase.

**Project:** react-example v0.0.1
**Generated:** 2026-09-26T03:54:22.705Z

## Statistics

- **Total Components:** 457
- **Successfully Rendered:** 0
- **Failed:** 0
- **Success Rate:** 0.0%
- **Design Tokens:** 210
- **Font Families:** 13

## Project Stack

- React: ^19.3.0
- TypeScript: ^6.0.3
- Vite: ^6.2.3
- Tailwind CSS: ^4.1.14

## Design Tokens

### Colors (154)

| Token | Value | File | Line |
|-------|-------|------|------|
| `--bg` | #f8fafc | C:\Github\Birthub-360\src\styles\globals.css | 168 |
| `--surface` | #ffffff | C:\Github\Birthub-360\src\styles\globals.css | 169 |
| `--surface-2` | #f1f5f9 | C:\Github\Birthub-360\src\styles\globals.css | 170 |
| `--surface-subtle` | #e2e8f0 | C:\Github\Birthub-360\src\styles\globals.css | 171 |
| `--surface-elevated` | #ffffff | C:\Github\Birthub-360\src\styles\globals.css | 172 |
| `--surface-interactive` | #f1f5f9 | C:\Github\Birthub-360\src\styles\globals.css | 173 |
| `--overlay` | rgba(11, 19, 43, 0.52) | C:\Github\Birthub-360\src\styles\globals.css | 174 |
| `--ink` | #0b132b | C:\Github\Birthub-360\src\styles\globals.css | 175 |
| `--ink-2` | #475569 | C:\Github\Birthub-360\src\styles\globals.css | 176 |
| `--gold` | #d4af37 | C:\Github\Birthub-360\src\styles\globals.css | 187 |
| `--brand` | #d4af37 | C:\Github\Birthub-360\src\styles\globals.css | 191 |
| `--brand-2` | #f0d77b | C:\Github\Birthub-360\src\styles\globals.css | 192 |
| `--on-brand` | #0b132b | C:\Github\Birthub-360\src\styles\globals.css | 193 |
| `--iris` | #c53678 | C:\Github\Birthub-360\src\styles\globals.css | 194 |
| `--pink` | #c53678 | C:\Github\Birthub-360\src\styles\globals.css | 197 |
| `--warn` | #ffc500 | C:\Github\Birthub-360\src\styles\globals.css | 198 |
| `--ok` | #0f9d64 | C:\Github\Birthub-360\src\styles\globals.css | 199 |
| `--color-info` | ... }` perderia
     pra `--color-info: #3b82f6` gerado pelo bloco `@theme` (que vem depois no arquivo e empata em
     especificidade com `.dark`, então venceria por ordem de declaração). No claro é o hex cru
     (--info-active já escurece pra badge "soft", ver comentário abaixo) | C:\Github\Birthub-360\src\styles\globals.css | 201 |
| `--info` | #3b82f6 | C:\Github\Birthub-360\src\styles\globals.css | 206 |
| `--nav-c-gold` | color-mix(in srgb, var(--brand) 72%, black) | C:\Github\Birthub-360\src\styles\globals.css | 212 |
... and 134 more colors

### Typography (4)

| Token | Value | File | Line |
|-------|-------|------|------|
| `--font-sans` | var(--font-brand-sans) | C:\Github\Birthub-360\src\styles\globals.css | 447 |
| `--font-display` | var(--font-brand-display) | C:\Github\Birthub-360\src\styles\globals.css | 448 |
| `--font-serif` | var(--font-brand-serif) | C:\Github\Birthub-360\src\styles\globals.css | 449 |
| `--font-mono` | "IBM Plex Mono", ui-monospace, "SFMono-Regular", Consolas, monospace | C:\Github\Birthub-360\src\styles\globals.css | 450 |

### Spacing (0)

| Token | Value | File | Line |
|-------|-------|------|------|


### Radius (3)

| Token | Value | File | Line |
|-------|-------|------|------|
| `--radius-card` | 12px | C:\Github\Birthub-360\src\styles\globals.css | 611 |
| `--radius-card-lg` | 16px | C:\Github\Birthub-360\src\styles\globals.css | 612 |
| `--radius-control` | 10px | C:\Github\Birthub-360\src\styles\globals.css | 614 |

### Shadows (13)

| Token | Value | File | Line |
|-------|-------|------|------|
| `--shadow-glow-pulse-value` | 0 0 15px -3px color-mix(in srgb, var(--pulse) 20%, transparent) | C:\Github\Birthub-360\src\styles\globals.css | 238 |
| `--shadow-card-value` | 0 1px 2px rgba(0, 0, 0, 0.04), 0 10px 28px -16px rgba(0, 0, 0, 0.22) | C:\Github\Birthub-360\src\styles\globals.css | 290 |
| `--shadow-card-hover-value` | 0 1px 3px rgba(0, 0, 0, 0.06), 0 18px 40px -18px rgba(0, 0, 0, 0.28) | C:\Github\Birthub-360\src\styles\globals.css | 294 |
| `--shadow-card-value` | 0 1px 2px rgba(0, 0, 0, 0.6), 0 14px 34px -18px rgba(0, 0, 0, 0.9) | C:\Github\Birthub-360\src\styles\globals.css | 343 |
| `--shadow-card-hover-value` | 0 1px 3px rgba(0, 0, 0, 0.7), 0 20px 46px -20px rgba(0, 0, 0, 0.95) | C:\Github\Birthub-360\src\styles\globals.css | 344 |
| `--shadow-glow-pulse-value` | 0 0 20px -2px color-mix(in srgb, var(--pulse) 55%, transparent),
    0 0 8px -1px color-mix(in srgb, var(--pulse) 40%, transparent) | C:\Github\Birthub-360\src\styles\globals.css | 427 |
| `--shadow-neon-cyan` | 0 0 30px rgba(34, 211, 238, 0.6), 0 0 60px rgba(34, 211, 238, 0.4) | C:\Github\Birthub-360\src\styles\globals.css | 440 |
| `--shadow-neon-purple` | 0 0 30px rgba(168, 85, 247, 0.6), 0 0 60px rgba(168, 85, 247, 0.4) | C:\Github\Birthub-360\src\styles\globals.css | 441 |
| `--shadow-neon-green` | 0 0 30px rgba(74, 222, 128, 0.6), 0 0 60px rgba(74, 222, 128, 0.4) | C:\Github\Birthub-360\src\styles\globals.css | 443 |
| `--shadow-card` | var(--shadow-card-value) | C:\Github\Birthub-360\src\styles\globals.css | 584 |
| `--shadow-card-hover` | var(--shadow-card-hover-value) | C:\Github\Birthub-360\src\styles\globals.css | 585 |
| `--shadow-glow-pulse` | var(--shadow-glow-pulse-value) | C:\Github\Birthub-360\src\styles\globals.css | 604 |
| `--animate-pulse-glow` | pulse-glow 3s ease-in-out infinite | C:\Github\Birthub-360\src\styles\globals.css | 647 |

## Typography

### Font Families (13)

| Family | Weight | Style | Origin |
|--------|--------|-------|--------|
| Cabin | 400 700 | normal | self-hosted |
| IBM Plex Mono | 400 | normal | self-hosted |
| IBM Plex Mono | 400 | italic | self-hosted |
| IBM Plex Mono | 500 | normal | self-hosted |
| IBM Plex Mono | 600 | normal | self-hosted |
| IBM Plex Mono | 700 | normal | self-hosted |
| Sora | 100 800 | normal | self-hosted |
| Sora | 100 800 | normal | self-hosted |
| Inter | 100 900 | normal | self-hosted |
| Inter | 100 900 | normal | self-hosted |
| Bodoni Moda | 400 900 | normal | self-hosted |
| Bodoni Moda | 400 900 | normal | self-hosted |
| Playfair Display ital,wght@0,400..700;1,400..700 | variable | normal | google-fonts |

## Components

### By Category


#### Other (280)


##### Ldr

**File:** `\src\pages\Ldr.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### WorkspaceRenderer

**File:** `\src\features\workspace\components\WorkspaceRenderer.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### WorkspaceHome

**File:** `\src\features\workspace\components\WorkspaceRenderer.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### WorkspaceHome

**File:** `\src\features\workspace\components\WorkspaceHome.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ThemeProvider

**File:** `\src\features\voice-hub\components\ThemeContext.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### AtlasLogo

**File:** `\src\features\voice-hub\components\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Switch

**File:** `\src\features\voice-hub\components\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Skeleton

**File:** `\src\features\voice-hub\components\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### EmptyState

**File:** `\src\features\voice-hub\components\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Alert

**File:** `\src\features\voice-hub\components\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Spinner

**File:** `\src\features\voice-hub\components\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Progress

**File:** `\src\features\voice-hub\components\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Avatar

**File:** `\src\features\voice-hub\components\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Tabs

**File:** `\src\features\voice-hub\components\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Breadcrumb

**File:** `\src\features\voice-hub\components\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Timeline

**File:** `\src\features\voice-hub\components\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Tooltip

**File:** `\src\features\voice-hub\components\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### GlobalHelpCenter

**File:** `\src\features\voice-hub\components\GlobalHelpCenter.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ErrorBoundary

**File:** `\src\features\voice-hub\components\ErrorBoundary.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### CommandPalette

**File:** `\src\features\voice-hub\components\CommandPalette.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### VisualCanvas

**File:** `\src\features\voice-hub\components\studio\Canvas.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### VersionHistoryPanel

**File:** `\src\features\voice-hub\components\studio\panels\VersionHistoryPanel.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ValidationIssuesList

**File:** `\src\features\voice-hub\components\studio\panels\ValidationIssuesList.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### TopBar

**File:** `\src\features\voice-hub\components\studio\panels\TopBar.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### LayersPanel

**File:** `\src\features\voice-hub\components\studio\panels\LayersPanel.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### InspectorPanel

**File:** `\src\features\voice-hub\components\studio\panels\InspectorPanel.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### BottomDrawer

**File:** `\src\features\voice-hub\components\studio\panels\BottomDrawer.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### UnifiedNode

**File:** `\src\features\voice-hub\components\studio\nodes\UnifiedNode.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### StartNode

**File:** `\src\features\voice-hub\components\studio\nodes\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### EndNode

**File:** `\src\features\voice-hub\components\studio\nodes\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### PromptNode

**File:** `\src\features\voice-hub\components\studio\nodes\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ConditionNode

**File:** `\src\features\voice-hub\components\studio\nodes\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ToolNode

**File:** `\src\features\voice-hub\components\studio\nodes\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### LlmNode

**File:** `\src\features\voice-hub\components\studio\nodes\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### VoiceNode

**File:** `\src\features\voice-hub\components\studio\nodes\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### QuestionNode

**File:** `\src\features\voice-hub\components\studio\nodes\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### SwitchNode

**File:** `\src\features\voice-hub\components\studio\nodes\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### MemoryNode

**File:** `\src\features\voice-hub\components\studio\nodes\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### KnowledgeNode

**File:** `\src\features\voice-hub\components\studio\nodes\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### HumanHandoffNode

**File:** `\src\features\voice-hub\components\studio\nodes\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### StudioEdge

**File:** `\src\features\voice-hub\components\studio\edges\StudioEdge.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### NotificationCenter

**File:** `\src\features\voice-hub\components\NotificationCenter\NotificationCenter.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### LiveSupervisor

**File:** `\src\features\voice-hub\components\LiveSupervisor\LiveSupervisor.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ThemeProvider

**File:** `\src\features\voice-hub\components\design-system\ThemeContext.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### AtlasLogo

**File:** `\src\features\voice-hub\components\design-system\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Switch

**File:** `\src\features\voice-hub\components\design-system\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Skeleton

**File:** `\src\features\voice-hub\components\design-system\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### EmptyState

**File:** `\src\features\voice-hub\components\design-system\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Alert

**File:** `\src\features\voice-hub\components\design-system\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Spinner

**File:** `\src\features\voice-hub\components\design-system\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Progress

**File:** `\src\features\voice-hub\components\design-system\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Avatar

**File:** `\src\features\voice-hub\components\design-system\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Tabs

**File:** `\src\features\voice-hub\components\design-system\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Breadcrumb

**File:** `\src\features\voice-hub\components\design-system\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Timeline

**File:** `\src\features\voice-hub\components\design-system\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Tooltip

**File:** `\src\features\voice-hub\components\design-system\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ErrorBoundary

**File:** `\src\features\voice-hub\components\design-system\ErrorBoundary.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### CommandPalette

**File:** `\src\features\voice-hub\components\design-system\CommandPalette.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Team

**File:** `\src\features\team\components\Team.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### SocialSellingHub

**File:** `\src\features\social-selling\components\SocialSellingHub.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Settings

**File:** `\src\features\settings\components\Settings.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### MemoryGovernancePanel

**File:** `\src\features\settings\components\MemoryGovernancePanel.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### LearningProfilePanel

**File:** `\src\features\settings\components\LearningProfilePanel.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### LeadDedupPanel

**File:** `\src\features\settings\components\LeadDedupPanel.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### CompanyDedupPanel

**File:** `\src\features\settings\components\CompanyDedupPanel.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### RoleplayHub

**File:** `\src\features\roleplay\components\RoleplayHub.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### RoleplayHistoryPanel

**File:** `\src\features\roleplay\components\roleplay-hub\RoleplayHistoryPanel.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### CallSetup

**File:** `\src\features\roleplay\components\roleplay-hub\CallSetup.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### CallAnalysisReport

**File:** `\src\features\roleplay\components\roleplay-hub\CallAnalysisReport.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ActiveCallView

**File:** `\src\features\roleplay\components\roleplay-hub\ActiveCallView.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### UserKanbanBoard

**File:** `\src\features\prospecting\outbound\components\UserKanbanBoard.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### TasksOverviewTab

**File:** `\src\features\prospecting\outbound\components\TasksOverviewTab.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### MyTasksTab

**File:** `\src\features\prospecting\outbound\components\MyTasksTab.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### LoginScreen

**File:** `\src\features\prospecting\outbound\components\LoginScreen.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### LOSS_REASONS

**File:** `\src\features\prospecting\outbound\components\LeadStageAndTags.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### WIN_REASONS

**File:** `\src\features\prospecting\outbound\components\LeadStageAndTags.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### LeadDistributionTab

**File:** `\src\features\prospecting\outbound\components\LeadDistributionTab.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ProspectingHub

**File:** `\src\features\prospecting\components\ProspectingHub.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ProspectingToolsHub

**File:** `\src\features\prospecting\components\prospecting-hub\ProspectingToolsHub.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### OcrCapturePanel

**File:** `\src\features\prospecting\components\prospecting-hub\OcrCapturePanel.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### InfoTile

**File:** `\src\features\prospecting\components\prospecting-hub\InfoTile.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### DiscoveryResultsPanel

**File:** `\src\features\prospecting\components\prospecting-hub\DiscoveryResultsPanel.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### DiscoveryFilterPanel

**File:** `\src\features\prospecting\components\prospecting-hub\DiscoveryFilterPanel.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### DecisionMakerSearch

**File:** `\src\features\prospecting\components\prospecting-hub\DecisionMakerSearch.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### CnpjSearchPanel

**File:** `\src\features\prospecting\components\prospecting-hub\CnpjSearchPanel.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### YoutubeTool

**File:** `\src\features\prospecting\components\prospecting-hub\tools\YoutubeTool.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### NotConfiguredBanner

**File:** `\src\features\prospecting\components\prospecting-hub\tools\NotConfiguredBanner.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### NewsTool

**File:** `\src\features\prospecting\components\prospecting-hub\tools\NewsTool.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### LinkedInTool

**File:** `\src\features\prospecting\components\prospecting-hub\tools\LinkedInTool.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### HunterTool

**File:** `\src\features\prospecting\components\prospecting-hub\tools\HunterTool.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### GooglePlacesTool

**File:** `\src\features\prospecting\components\prospecting-hub\tools\GooglePlacesTool.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### GitHubTool

**File:** `\src\features\prospecting\components\prospecting-hub\tools\GitHubTool.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ApolloTool

**File:** `\src\features\prospecting\components\prospecting-hub\tools\ApolloTool.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### QualificationMatrixPage

**File:** `\src\features\playbook\components\QualificationMatrixPage.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ObjectionSuggestionsReview

**File:** `\src\features\playbook\components\ObjectionSuggestionsReview.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ObjectionsMatrixPage

**File:** `\src\features\playbook\components\ObjectionsMatrixPage.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### LivingPlaybookReview

**File:** `\src\features\playbook\components\LivingPlaybookReview.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### OnboardingTour

**File:** `\src\features\onboarding\components\OnboardingTour.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Notifications

**File:** `\src\features\notifications\components\Notifications.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ModuleAccessAdmin

**File:** `\src\features\module-access\components\ModuleAccessAdmin.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### SdrDashboard

**File:** `\src\features\mesa-tratamento\components\SdrDashboard.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### QueueList

**File:** `\src\features\mesa-tratamento\components\QueueList.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### PomodoroWidget

**File:** `\src\features\mesa-tratamento\components\PomodoroWidget.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### MesaTratamento

**File:** `\src\features\mesa-tratamento\components\MesaTratamento.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ManagementPanel

**File:** `\src\features\mesa-tratamento\components\ManagementPanel.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### VisualOrgChart

**File:** `\src\features\market-intelligence\components\VisualOrgChart.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### LeadApprovalDeck

**File:** `\src\features\market-intelligence\components\LeadApprovalDeck.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### LdrAccountIntelligence

**File:** `\src\features\market-intelligence\components\LdrAccountIntelligence.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### CompanyBranchesView

**File:** `\src\features\market-intelligence\components\CompanyBranchesView.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Account360

**File:** `\src\features\market-intelligence\components\Account360.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### DataSubjectRights

**File:** `\src\features\lgpd\components\DataSubjectRights.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### AuditLogs

**File:** `\src\features\lgpd\components\AuditLogs.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### EditorIA

**File:** `\src\features\knowledge\components\EditorIA.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Base

**File:** `\src\features\knowledge\components\Base.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### TopicTrainingAcademy

**File:** `\src\features\intelligence\components\TopicTrainingAcademy.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### SwarmObservability

**File:** `\src\features\intelligence\components\SwarmObservability.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### SwarmDashboard

**File:** `\src\features\intelligence\components\SwarmDashboard.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### SuperagentCreator

**File:** `\src\features\intelligence\components\SuperagentCreator.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### SalesMethodologyStudio

**File:** `\src\features\intelligence\components\SalesMethodologyStudio.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### RobustScriptGenerator

**File:** `\src\features\intelligence\components\RobustScriptGenerator.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ReportsHub

**File:** `\src\features\intelligence\components\ReportsHub.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IntelligenceHub

**File:** `\src\features\intelligence\components\IntelligenceHub.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ContextualCopilot

**File:** `\src\features\intelligence\components\ContextualCopilot.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### BitrixGuideHub

**File:** `\src\features\intelligence\components\BitrixGuideHub.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### B2BGenerator

**File:** `\src\features\intelligence\components\B2BGenerator.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### AutomationGuide

**File:** `\src\features\intelligence\components\AutomationGuide.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### AISuiteHub

**File:** `\src\features\intelligence\components\AISuiteHub.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### AIPendingActions

**File:** `\src\features\intelligence\components\AIPendingActions.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### AgentQualityPanel

**File:** `\src\features\intelligence\components\AgentQualityPanel.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### WhatsAppWebPanel

**File:** `\src\features\integrations\whatsapp\components\WhatsAppWebPanel.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### WhatsAppChatPanel

**File:** `\src\features\integrations\whatsapp\components\WhatsAppChatPanel.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### StripeConnectionPanel

**File:** `\src\features\integrations\stripe\components\StripeConnectionPanel.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### SlackConnectionPanel

**File:** `\src\features\integrations\slack\components\SlackConnectionPanel.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### OmieConnectionPanel

**File:** `\src\features\integrations\omie\components\OmieConnectionPanel.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### WebhookMonitor

**File:** `\src\features\integrations\components\WebhookMonitor.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Integrations

**File:** `\src\features\integrations\components\Integrations.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ExternalCrmPanel

**File:** `\src\features\integrations\components\ExternalCrmPanel.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### BitrixSyncRulesPanel

**File:** `\src\features\integrations\components\BitrixSyncRulesPanel.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### BitrixImportPanel

**File:** `\src\features\integrations\components\BitrixImportPanel.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### BitrixExtractionPanel

**File:** `\src\features\integrations\components\BitrixExtractionPanel.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### VoiceHubConnectionPanel

**File:** `\src\features\integrations\birth-voice\components\VoiceHubConnectionPanel.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### VoiceCallActivity

**File:** `\src\features\integrations\birth-voice\components\VoiceCallActivity.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### HubTaskWidget

**File:** `\src\features\hub\components\HubTaskWidget.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### HubScreen

**File:** `\src\features\hub\components\HubScreen.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### HubBurstCanvas

**File:** `\src\features\hub\components\HubBurstCanvas.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### CommercialAgentCellPanel

**File:** `\src\features\hub\components\CommercialAgentCellPanel.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### FeatureFlagsPanel

**File:** `\src\features\feature-flags\components\FeatureFlagsPanel.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Editor

**File:** `\src\features\document-editor\components\Editor.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### DesignLabPage

**File:** `\src\features\design-lab\DesignLabPage.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### TeamRankingWidget

**File:** `\src\features\dashboard\components\TeamRankingWidget.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### SinglePageDashboard

**File:** `\src\features\dashboard\components\SinglePageDashboard.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### RevenueSignalOrb

**File:** `\src\features\dashboard\components\RevenueSignalOrb.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### RealtimeFeed

**File:** `\src\features\dashboard\components\RealtimeFeed.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### DeferredRevenueSignalOrb

**File:** `\src\features\dashboard\components\DeferredRevenueSignalOrb.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### AiGatewayShowcase

**File:** `\src\features\dashboard\components\AiGatewayShowcase.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### AdaptiveDashboard

**File:** `\src\features\dashboard\components\AdaptiveDashboard.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### PropostasList

**File:** `\src\features\crm360\components\PropostasList.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### PropostaDetail

**File:** `\src\features\crm360\components\PropostaDetail.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### CrmOverview

**File:** `\src\features\crm360\components\CrmOverview.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### SavedViewsPanel

**File:** `\src\features\crm\components\SavedViewsPanel.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### LeadDetailDrawer

**File:** `\src\features\crm\components\LeadDetailDrawer.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### LeadActionBar

**File:** `\src\features\crm\components\LeadActionBar.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### KanbanColumn

**File:** `\src\features\crm\components\KanbanColumn.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### LeadCopilotoPanel

**File:** `\src\features\copiloto-ia\components\LeadCopilotoPanel.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### CopilotoIaHub

**File:** `\src\features\copiloto-ia\components\CopilotoIaHub.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ConversationsTab

**File:** `\src\features\copiloto-ia\components\ConversationsTab.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ConversationDetailDrawer

**File:** `\src\features\copiloto-ia\components\ConversationDetailDrawer.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### BitrixMappingSettingsTab

**File:** `\src\features\copiloto-ia\components\BitrixMappingSettingsTab.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ContactList

**File:** `\src\features\contacts\components\ContactList.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ContactDetail

**File:** `\src\features\contacts\components\ContactDetail.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### CompanyList

**File:** `\src\features\companies\components\CompanyList.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### CompanyDetail

**File:** `\src\features\companies\components\CompanyDetail.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### PipelineForecastTab

**File:** `\src\features\commercial-intelligence\components\PipelineForecastTab.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### LossReasonAiCheck

**File:** `\src\features\commercial-intelligence\components\LossReasonAiCheck.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### LossesTab

**File:** `\src\features\commercial-intelligence\components\LossesTab.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### LeadingIndicatorsTab

**File:** `\src\features\commercial-intelligence\components\LeadingIndicatorsTab.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### JourneyTab

**File:** `\src\features\commercial-intelligence\components\JourneyTab.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### JoaoReisDiagnosticHub

**File:** `\src\features\commercial-intelligence\components\JoaoReisDiagnosticHub.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### GoalCountdownOverlay

**File:** `\src\features\commercial-intelligence\components\GoalCountdownOverlay.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ExecutiveOverviewTab

**File:** `\src\features\commercial-intelligence\components\ExecutiveOverviewTab.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### DecisionCenterPanel

**File:** `\src\features\commercial-intelligence\components\DecisionCenterPanel.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### DealDrillDownDrawer

**File:** `\src\features\commercial-intelligence\components\DealDrillDownDrawer.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### DailyPlanTeamOverview

**File:** `\src\features\commercial-intelligence\components\DailyPlanTeamOverview.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### DailyPlanHub

**File:** `\src\features\commercial-intelligence\components\DailyPlanHub.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### DailyClosingGate

**File:** `\src\features\commercial-intelligence\components\DailyClosingGate.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### CrmQualityTab

**File:** `\src\features\commercial-intelligence\components\CrmQualityTab.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### CommercialIntelligenceHub

**File:** `\src\features\commercial-intelligence\components\CommercialIntelligenceHub.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### AlertsPanel

**File:** `\src\features\commercial-intelligence\components\AlertsPanel.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### AgingTab

**File:** `\src\features\commercial-intelligence\components\AgingTab.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### FloatingChatbook

**File:** `\src\features\chatbook\components\FloatingChatbook.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ChatbookHub

**File:** `\src\features\chatbook\components\ChatbookHub.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### PublicBookingPage

**File:** `\src\features\calendar\components\PublicBookingPage.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Calendar

**File:** `\src\features\calendar\components\Calendar.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### CadenceHub

**File:** `\src\features\cadence\components\CadenceHub.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Billing

**File:** `\src\features\billing\components\Billing.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Automations

**File:** `\src\features\automations\components\Automations.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### WelcomeScreen

**File:** `\src\features\auth\components\WelcomeScreen.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ResetPasswordScreen

**File:** `\src\features\auth\components\ResetPasswordScreen.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### LoginScreen

**File:** `\src\features\auth\components\LoginScreen.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### LandingLoginSplitScreen

**File:** `\src\features\auth\components\LandingLoginSplitScreen.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ChangePasswordGate

**File:** `\src\features\auth\components\ChangePasswordGate.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### WinLossAnalysis

**File:** `\src\features\analytics\components\WinLossAnalysis.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### GlowChart

**File:** `\src\features\analytics\components\GlowChart.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### HeatmapWidget

**File:** `\src\features\analytics\components\DashboardExtensions.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### LostReasonsWidget

**File:** `\src\features\analytics\components\DashboardExtensions.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### TmqTile

**File:** `\src\features\analytics\components\DashboardExtensions.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### CohortAnalysis

**File:** `\src\features\analytics\components\CohortAnalysis.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Analytics

**File:** `\src\features\analytics\components\Analytics.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Timeline

**File:** `\src\features\activities\components\Timeline.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ActivityList

**File:** `\src\features\activities\components\ActivityList.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ThemeProvider

**File:** `\src\contexts\ThemeContext.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ExperienceModeProvider

**File:** `\src\contexts\ExperienceModeContext.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### DailyClosingProvider

**File:** `\src\contexts\DailyClosingContext.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### BrandProvider

**File:** `\src\contexts\BrandContext.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### AuthProvider

**File:** `\src\contexts\AuthContext.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ActiveRecordProvider

**File:** `\src\contexts\ActiveRecordContext.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Intelligence

**File:** `\src\components\Intelligence.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ErrorBoundary

**File:** `\src\components\ErrorBoundary.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### CrmBoard

**File:** `\src\components\CrmBoard.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### WorkspaceReadySection

**File:** `\src\components\workspace\WorkspaceReadySection.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### VoiceCommandWidget

**File:** `\src\components\ui\VoiceCommandWidget.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Toggle

**File:** `\src\components\ui\Toggle.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Toaster

**File:** `\src\components\ui\Toaster.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Timeline

**File:** `\src\components\ui\Timeline.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ThemeSwitcher

**File:** `\src\components\ui\ThemeSwitcher.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### QuickThemeToggle

**File:** `\src\components\ui\ThemeSwitcher.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### StyleShowcase

**File:** `\src\components\ui\StyleShowcase.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Skeleton

**File:** `\src\components\ui\Skeleton.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ListSkeleton

**File:** `\src\components\ui\Skeleton.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ChartSkeleton

**File:** `\src\components\ui\Skeleton.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### LoginPage

**File:** `\src\components\ui\sign-in-page.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ParticleSystem

**File:** `\src\components\ui\ParticleSystem.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### DigitalRain

**File:** `\src\components\ui\ParticleSystem.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### GlitchEffect

**File:** `\src\components\ui\ParticleSystem.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Pagination

**File:** `\src\components\ui\Pagination.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Magnetic

**File:** `\src\components\ui\Magnetic.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### LiveStatsWidget

**File:** `\src\components\ui\LiveStatsWidget.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### GamificationWidget

**File:** `\src\components\ui\GamificationWidget.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### FunnelBars

**File:** `\src\components\ui\FunnelBars.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### FindingsList

**File:** `\src\components\ui\FindingsList.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### EmptyState

**File:** `\src\components\ui\EmptyState.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Drawer

**File:** `\src\components\ui\Drawer.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### CopilotTrigger

**File:** `\src\components\ui\CopilotTrigger.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### CompareBar

**File:** `\src\components\ui\CompareBar.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### DeltaPill

**File:** `\src\components\ui\CompareBar.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### CommandPalette

**File:** `\src\components\ui\CommandPalette.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ClockCalendarWidget

**File:** `\src\components\ui\ClockCalendarWidget.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Checklist

**File:** `\src\components\ui\Checklist.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ChannelDonut

**File:** `\src\components\ui\ChannelDonut.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Carousel

**File:** `\src\components\ui\Carousel.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### CarouselSlide

**File:** `\src\components\ui\Carousel.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### CalendarHeatmap

**File:** `\src\components\ui\CalendarHeatmap.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### BrandOrb

**File:** `\src\components\ui\BrandOrb.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### BottomSheet

**File:** `\src\components\ui\BottomSheet.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### BorderBeam

**File:** `\src\components\ui\BorderBeam.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### BlockedState

**File:** `\src\components\ui\BlockedState.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### AIEmailGenerator

**File:** `\src\components\ui\AIEmailGenerator.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ActionPlanSteps

**File:** `\src\components\ui\ActionPlanSteps.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### BentoInsight

**File:** `\src\components\ui\bento\BentoInsight.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### BentoHero

**File:** `\src\components\ui\bento\BentoHero.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ScriptDocument

**File:** `\src\components\pdf\PDFExport.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### RequireRole

**File:** `\src\components\layout\RequireRole.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### RequireModuleAccess

**File:** `\src\components\layout\RequireModuleAccess.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ProtectedRoute

**File:** `\src\components\layout\ProtectedRoute.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### PageTransition

**File:** `\src\components\layout\PageTransition.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### OfflineBanner

**File:** `\src\components\layout\OfflineBanner.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### FloatingDock

**File:** `\src\components\layout\FloatingDock.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### AppTopbar

**File:** `\src\components\layout\AppTopbar.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IntelligenceSignal

**File:** `\src\components\intelligence\IntelligenceSignal.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### RichTextEditor

**File:** `\src\components\editor\RichTextEditor.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### EntityNotes

**File:** `\src\components\crm\EntityNotes.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### EntityAttachments

**File:** `\src\components\crm\EntityAttachments.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### FunnelChart

**File:** `\src\components\charts\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### SankeyChart

**File:** `\src\components\charts\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### HeatmapChart

**File:** `\src\components\charts\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### BarChart

**File:** `\src\components\charts\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### LineChart

**File:** `\src\components\charts\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### BirthHubLogo

**File:** `\src\components\brand\BirthHubLogo.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### BirthHubSignature

**File:** `\src\components\brand\BirthHubLogo.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### BirthHubWordmark

**File:** `\src\components\brand\BirthHubLogo.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available



#### Navigation (6)


##### Sidebar

**File:** `\src\features\voice-hub\components\Sidebar.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### PageHeader

**File:** `\src\components\ui\PageHeader.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Sidebar

**File:** `\src\components\layout\Sidebar.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### NavLaunchTransition

**File:** `\src\components\layout\NavLaunchTransition.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### FuturisticSidebar

**File:** `\src\components\layout\FuturisticSidebar.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ExecutiveHeader

**File:** `\src\components\layout\ExecutiveHeader.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available



#### Button (9)


##### Button

**File:** `\src\features\voice-hub\components\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Button

**File:** `\src\features\voice-hub\components\design-system\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ReportErrorButton

**File:** `\src\features\prospecting\outbound\components\ReportErrorButton.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### NeonTokyoButton

**File:** `\src\features\design-lab\neon-tokyo-buttons\NeonTokyoButton.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ButtonGallery

**File:** `\src\features\design-lab\neon-tokyo-buttons\ButtonGallery.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### NeonButton

**File:** `\src\components\ui\NeonButton.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### CopyButton

**File:** `\src\components\ui\CopyButton.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### BugReportButton

**File:** `\src\components\ui\BugReportButton.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### PDFDownloadButton

**File:** `\src\components\pdf\PDFExport.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available



#### Input (3)


##### Input

**File:** `\src\features\voice-hub\components\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Input

**File:** `\src\features\voice-hub\components\design-system\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### CyberInput

**File:** `\src\components\ui\CyberInput.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available



#### Form (15)


##### Textarea

**File:** `\src\features\voice-hub\components\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Checkbox

**File:** `\src\features\voice-hub\components\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Select

**File:** `\src\features\voice-hub\components\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### AgentForm

**File:** `\src\features\voice-hub\components\AgentForm.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Textarea

**File:** `\src\features\voice-hub\components\design-system\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Checkbox

**File:** `\src\features\voice-hub\components\design-system\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Select

**File:** `\src\features\voice-hub\components\design-system\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### PerformanceTab

**File:** `\src\features\prospecting\outbound\components\PerformanceTab.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### QualificationItemForm

**File:** `\src\features\playbook\components\QualificationItemForm.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ObjectionItemForm

**File:** `\src\features\playbook\components\ObjectionItemForm.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### PropostaForm

**File:** `\src\features\crm360\components\PropostaForm.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ContactForm

**File:** `\src\features\contacts\components\ContactForm.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### CompanyForm

**File:** `\src\features\companies\components\CompanyForm.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### PerformanceTab

**File:** `\src\features\commercial-intelligence\components\PerformanceTab.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### AgentPerformanceWidget

**File:** `\src\features\analytics\components\DashboardExtensions.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available



#### Badge (4)


##### Badge

**File:** `\src\features\voice-hub\components\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Badge

**File:** `\src\features\voice-hub\components\design-system\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IntegrationStatusBadge

**File:** `\src\features\integrations\components\IntegrationStatusBadge.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### BrandEmblemBadge

**File:** `\src\components\brand\BrandEmblemBadge.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available



#### Card (33)


##### Card

**File:** `\src\features\voice-hub\components\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Card

**File:** `\src\features\voice-hub\components\design-system\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### MetricsChart

**File:** `\src\features\prospecting\outbound\components\MetricsChart.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### CnpjResultCard

**File:** `\src\features\prospecting\components\prospecting-hub\CnpjResultCard.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### CandidateCard

**File:** `\src\features\prospecting\components\prospecting-hub\CandidateCard.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### CurrentLeadCard

**File:** `\src\features\mesa-tratamento\components\CurrentLeadCard.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### SellerCoachingCard

**File:** `\src\features\dashboard\components\SellerCoachingCard.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### KanbanCard

**File:** `\src\features\crm\components\KanbanCard.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### TrendChartCard

**File:** `\src\features\commercial-intelligence\components\TrendChartCard.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### SellerBenchmarkCard

**File:** `\src\features\commercial-intelligence\components\SellerBenchmarkCard.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### PipelineByStageCard

**File:** `\src\features\commercial-intelligence\components\PipelineByStageCard.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### MetricInfo

**File:** `\src\features\commercial-intelligence\components\MetricInfo.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### MentorPlaybookCard

**File:** `\src\features\commercial-intelligence\components\MentorPlaybookCard.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### KpiTile

**File:** `\src\features\commercial-intelligence\components\KpiTile.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### HiringScenarioCard

**File:** `\src\features\commercial-intelligence\components\HiringScenarioCard.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### HealthScoreCard

**File:** `\src\features\commercial-intelligence\components\HealthScoreCard.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### FunnelConversionCard

**File:** `\src\features\commercial-intelligence\components\FunnelConversionCard.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### FunnelBottleneckCard

**File:** `\src\features\commercial-intelligence\components\FunnelBottleneckCard.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ForecastRangeCard

**File:** `\src\features\commercial-intelligence\components\ForecastRangeCard.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ForecastCalibrationCard

**File:** `\src\features\commercial-intelligence\components\ForecastCalibrationCard.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ForecastAccuracyCard

**File:** `\src\features\commercial-intelligence\components\ForecastAccuracyCard.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### CloseDateIntelligenceCard

**File:** `\src\features\commercial-intelligence\components\CloseDateIntelligenceCard.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ChannelAttributionCard

**File:** `\src\features\commercial-intelligence\components\ChannelAttributionCard.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ColdCallStatusCard

**File:** `\src\features\automations\components\ColdCallStatusCard.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### TiltCard

**File:** `\src\components\ui\TiltCard.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### TabNavCards

**File:** `\src\components\ui\TabNavCards.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### MetricSkeleton

**File:** `\src\components\ui\Skeleton.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### CardSkeleton

**File:** `\src\components\ui\Skeleton.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### KpiCard

**File:** `\src\components\ui\KpiCard.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### HolographicCard

**File:** `\src\components\ui\HolographicCard.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### DealCard

**File:** `\src\components\ui\DealsGrid.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### BentoMetric

**File:** `\src\components\ui\bento\BentoMetric.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### BentoCard

**File:** `\src\components\ui\bento\BentoCard.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available



#### Table (13)


##### Table

**File:** `\src\features\voice-hub\components\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### TableHead

**File:** `\src\features\voice-hub\components\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### TableRow

**File:** `\src\features\voice-hub\components\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### TableCell

**File:** `\src\features\voice-hub\components\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Table

**File:** `\src\features\voice-hub\components\design-system\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### TableHead

**File:** `\src\features\voice-hub\components\design-system\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### TableRow

**File:** `\src\features\voice-hub\components\design-system\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### TableCell

**File:** `\src\features\voice-hub\components\design-system\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### VirtualTable

**File:** `\src\components\ui\VirtualTable.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### TableSkeleton

**File:** `\src\components\ui\Skeleton.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### DealsGrid

**File:** `\src\components\ui\DealsGrid.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### CompareTable

**File:** `\src\components\ui\CompareTable.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### BentoGrid

**File:** `\src\components\ui\bento\BentoGrid.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available



#### Modal (12)


##### Modal

**File:** `\src\features\voice-hub\components\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### TestSimulatorModal

**File:** `\src\features\voice-hub\components\studio\panels\TestSimulatorModal.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Modal

**File:** `\src\features\voice-hub\components\design-system\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### SavedSearchesModal

**File:** `\src\features\prospecting\components\SavedSearchesModal.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### BitrixImportModal

**File:** `\src\features\crm\components\BitrixImportModal.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### NewActivityModal

**File:** `\src\features\commercial-intelligence\components\NewActivityModal.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### GoalEditorDialog

**File:** `\src\features\commercial-intelligence\components\GoalEditorDialog.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### BookingLinksModal

**File:** `\src\features\calendar\components\BookingLinksModal.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### AutomationVersionsDialog

**File:** `\src\features\automations\components\AutomationVersionsDialog.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### AutomationDryRunDialog

**File:** `\src\features\automations\components\AutomationDryRunDialog.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### GoogleLoginModal

**File:** `\src\features\auth\components\GoogleLoginModal.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### Dialog

**File:** `\src\components\ui\Dialog.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available



#### Layout (4)


##### ToastContainer

**File:** `\src\features\voice-hub\components\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### ToastContainer

**File:** `\src\features\voice-hub\components\design-system\index.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### MainLayout

**File:** `\src\components\layout\MainLayout.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### FuturisticLayout

**File:** `\src\components\layout\FuturisticLayout.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available



#### Icon (78)


##### SourceRequiredIcon

**File:** `\src\components\ui\BlockedState.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### FutureToolIcon

**File:** `\src\components\ui\BlockedState.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### AIContextPopover

**File:** `\src\components\ui\AIContextPopover.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### YoutubeIcon

**File:** `\src\components\ui\icons\YoutubeIcon.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### LinkedinIcon

**File:** `\src\components\ui\icons\LinkedinIcon.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### GithubIcon

**File:** `\src\components\ui\icons\GithubIcon.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconHome

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconBuilding

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconContacts

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconPipeline

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconActivity

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconRadar

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconSparkle

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconBrain

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconSearch

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconBell

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconChevronsLeft

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconArrowRight

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconCheck

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconTarget

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconBolt

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconLogout

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconUser

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconClock

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconMenu

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconGrid

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconTrendUp

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconPhone

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconDocument

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconHandshake

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconTrophy

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconClose

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconFlame

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconSnowflake

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconDownload

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconPlus

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconEdit

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconTrash

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconMail

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconMapPin

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconSpinner

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconArrowLeft

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconGlobe

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconLinkedin

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconInstagram

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconTwitterX

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconFacebook

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconStar

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconTag

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconWrench

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconClipboard

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconChevronDown

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconChevronUp

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconSend

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconSave

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconInfo

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconMessage

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconCalendar

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconChat

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconDatabase

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconCpu

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconBot

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconServer

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconShieldCheck

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconWarning

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconLandmark

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconUserPlus

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconSliders

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconDollar

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconBook

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconX

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconAlertTriangle

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconHelp

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconFilter

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconZap

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconCode

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconLayers

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available


##### IconRefresh

**File:** `\src\components\icons\BrandIcons.tsx`

**Type:** unknown

**Export:** named

**Screenshot:** Not available




## Render Errors

No render errors.

## Component → Source Mapping


### Ldr

- **Source:** `\src\pages\Ldr.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### WorkspaceRenderer

- **Source:** `\src\features\workspace\components\WorkspaceRenderer.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### WorkspaceHome

- **Source:** `\src\features\workspace\components\WorkspaceRenderer.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### WorkspaceHome

- **Source:** `\src\features\workspace\components\WorkspaceHome.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ThemeProvider

- **Source:** `\src\features\voice-hub\components\ThemeContext.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Sidebar

- **Source:** `\src\features\voice-hub\components\Sidebar.tsx`
- **Category:** navigation
- **Screenshot:** Not available
- **Status:** not rendered


### AtlasLogo

- **Source:** `\src\features\voice-hub\components\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Button

- **Source:** `\src\features\voice-hub\components\index.tsx`
- **Category:** button
- **Screenshot:** Not available
- **Status:** not rendered


### Input

- **Source:** `\src\features\voice-hub\components\index.tsx`
- **Category:** input
- **Screenshot:** Not available
- **Status:** not rendered


### Textarea

- **Source:** `\src\features\voice-hub\components\index.tsx`
- **Category:** form
- **Screenshot:** Not available
- **Status:** not rendered


### Checkbox

- **Source:** `\src\features\voice-hub\components\index.tsx`
- **Category:** form
- **Screenshot:** Not available
- **Status:** not rendered


### Switch

- **Source:** `\src\features\voice-hub\components\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Select

- **Source:** `\src\features\voice-hub\components\index.tsx`
- **Category:** form
- **Screenshot:** Not available
- **Status:** not rendered


### Badge

- **Source:** `\src\features\voice-hub\components\index.tsx`
- **Category:** badge
- **Screenshot:** Not available
- **Status:** not rendered


### Card

- **Source:** `\src\features\voice-hub\components\index.tsx`
- **Category:** card
- **Screenshot:** Not available
- **Status:** not rendered


### Skeleton

- **Source:** `\src\features\voice-hub\components\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### EmptyState

- **Source:** `\src\features\voice-hub\components\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Alert

- **Source:** `\src\features\voice-hub\components\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Spinner

- **Source:** `\src\features\voice-hub\components\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Progress

- **Source:** `\src\features\voice-hub\components\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Avatar

- **Source:** `\src\features\voice-hub\components\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Tabs

- **Source:** `\src\features\voice-hub\components\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Breadcrumb

- **Source:** `\src\features\voice-hub\components\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Table

- **Source:** `\src\features\voice-hub\components\index.tsx`
- **Category:** table
- **Screenshot:** Not available
- **Status:** not rendered


### TableHead

- **Source:** `\src\features\voice-hub\components\index.tsx`
- **Category:** table
- **Screenshot:** Not available
- **Status:** not rendered


### TableRow

- **Source:** `\src\features\voice-hub\components\index.tsx`
- **Category:** table
- **Screenshot:** Not available
- **Status:** not rendered


### TableCell

- **Source:** `\src\features\voice-hub\components\index.tsx`
- **Category:** table
- **Screenshot:** Not available
- **Status:** not rendered


### Modal

- **Source:** `\src\features\voice-hub\components\index.tsx`
- **Category:** modal
- **Screenshot:** Not available
- **Status:** not rendered


### Timeline

- **Source:** `\src\features\voice-hub\components\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Tooltip

- **Source:** `\src\features\voice-hub\components\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ToastContainer

- **Source:** `\src\features\voice-hub\components\index.tsx`
- **Category:** layout
- **Screenshot:** Not available
- **Status:** not rendered


### GlobalHelpCenter

- **Source:** `\src\features\voice-hub\components\GlobalHelpCenter.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ErrorBoundary

- **Source:** `\src\features\voice-hub\components\ErrorBoundary.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### CommandPalette

- **Source:** `\src\features\voice-hub\components\CommandPalette.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### AgentForm

- **Source:** `\src\features\voice-hub\components\AgentForm.tsx`
- **Category:** form
- **Screenshot:** Not available
- **Status:** not rendered


### VisualCanvas

- **Source:** `\src\features\voice-hub\components\studio\Canvas.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### VersionHistoryPanel

- **Source:** `\src\features\voice-hub\components\studio\panels\VersionHistoryPanel.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ValidationIssuesList

- **Source:** `\src\features\voice-hub\components\studio\panels\ValidationIssuesList.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### TopBar

- **Source:** `\src\features\voice-hub\components\studio\panels\TopBar.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### TestSimulatorModal

- **Source:** `\src\features\voice-hub\components\studio\panels\TestSimulatorModal.tsx`
- **Category:** modal
- **Screenshot:** Not available
- **Status:** not rendered


### LayersPanel

- **Source:** `\src\features\voice-hub\components\studio\panels\LayersPanel.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### InspectorPanel

- **Source:** `\src\features\voice-hub\components\studio\panels\InspectorPanel.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### BottomDrawer

- **Source:** `\src\features\voice-hub\components\studio\panels\BottomDrawer.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### UnifiedNode

- **Source:** `\src\features\voice-hub\components\studio\nodes\UnifiedNode.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### StartNode

- **Source:** `\src\features\voice-hub\components\studio\nodes\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### EndNode

- **Source:** `\src\features\voice-hub\components\studio\nodes\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### PromptNode

- **Source:** `\src\features\voice-hub\components\studio\nodes\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ConditionNode

- **Source:** `\src\features\voice-hub\components\studio\nodes\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ToolNode

- **Source:** `\src\features\voice-hub\components\studio\nodes\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### LlmNode

- **Source:** `\src\features\voice-hub\components\studio\nodes\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### VoiceNode

- **Source:** `\src\features\voice-hub\components\studio\nodes\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### QuestionNode

- **Source:** `\src\features\voice-hub\components\studio\nodes\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### SwitchNode

- **Source:** `\src\features\voice-hub\components\studio\nodes\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### MemoryNode

- **Source:** `\src\features\voice-hub\components\studio\nodes\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### KnowledgeNode

- **Source:** `\src\features\voice-hub\components\studio\nodes\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### HumanHandoffNode

- **Source:** `\src\features\voice-hub\components\studio\nodes\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### StudioEdge

- **Source:** `\src\features\voice-hub\components\studio\edges\StudioEdge.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### NotificationCenter

- **Source:** `\src\features\voice-hub\components\NotificationCenter\NotificationCenter.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### LiveSupervisor

- **Source:** `\src\features\voice-hub\components\LiveSupervisor\LiveSupervisor.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ThemeProvider

- **Source:** `\src\features\voice-hub\components\design-system\ThemeContext.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### AtlasLogo

- **Source:** `\src\features\voice-hub\components\design-system\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Button

- **Source:** `\src\features\voice-hub\components\design-system\index.tsx`
- **Category:** button
- **Screenshot:** Not available
- **Status:** not rendered


### Input

- **Source:** `\src\features\voice-hub\components\design-system\index.tsx`
- **Category:** input
- **Screenshot:** Not available
- **Status:** not rendered


### Textarea

- **Source:** `\src\features\voice-hub\components\design-system\index.tsx`
- **Category:** form
- **Screenshot:** Not available
- **Status:** not rendered


### Checkbox

- **Source:** `\src\features\voice-hub\components\design-system\index.tsx`
- **Category:** form
- **Screenshot:** Not available
- **Status:** not rendered


### Switch

- **Source:** `\src\features\voice-hub\components\design-system\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Select

- **Source:** `\src\features\voice-hub\components\design-system\index.tsx`
- **Category:** form
- **Screenshot:** Not available
- **Status:** not rendered


### Badge

- **Source:** `\src\features\voice-hub\components\design-system\index.tsx`
- **Category:** badge
- **Screenshot:** Not available
- **Status:** not rendered


### Card

- **Source:** `\src\features\voice-hub\components\design-system\index.tsx`
- **Category:** card
- **Screenshot:** Not available
- **Status:** not rendered


### Skeleton

- **Source:** `\src\features\voice-hub\components\design-system\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### EmptyState

- **Source:** `\src\features\voice-hub\components\design-system\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Alert

- **Source:** `\src\features\voice-hub\components\design-system\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Spinner

- **Source:** `\src\features\voice-hub\components\design-system\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Progress

- **Source:** `\src\features\voice-hub\components\design-system\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Avatar

- **Source:** `\src\features\voice-hub\components\design-system\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Tabs

- **Source:** `\src\features\voice-hub\components\design-system\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Breadcrumb

- **Source:** `\src\features\voice-hub\components\design-system\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Table

- **Source:** `\src\features\voice-hub\components\design-system\index.tsx`
- **Category:** table
- **Screenshot:** Not available
- **Status:** not rendered


### TableHead

- **Source:** `\src\features\voice-hub\components\design-system\index.tsx`
- **Category:** table
- **Screenshot:** Not available
- **Status:** not rendered


### TableRow

- **Source:** `\src\features\voice-hub\components\design-system\index.tsx`
- **Category:** table
- **Screenshot:** Not available
- **Status:** not rendered


### TableCell

- **Source:** `\src\features\voice-hub\components\design-system\index.tsx`
- **Category:** table
- **Screenshot:** Not available
- **Status:** not rendered


### Modal

- **Source:** `\src\features\voice-hub\components\design-system\index.tsx`
- **Category:** modal
- **Screenshot:** Not available
- **Status:** not rendered


### Timeline

- **Source:** `\src\features\voice-hub\components\design-system\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Tooltip

- **Source:** `\src\features\voice-hub\components\design-system\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ToastContainer

- **Source:** `\src\features\voice-hub\components\design-system\index.tsx`
- **Category:** layout
- **Screenshot:** Not available
- **Status:** not rendered


### ErrorBoundary

- **Source:** `\src\features\voice-hub\components\design-system\ErrorBoundary.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### CommandPalette

- **Source:** `\src\features\voice-hub\components\design-system\CommandPalette.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Team

- **Source:** `\src\features\team\components\Team.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### SocialSellingHub

- **Source:** `\src\features\social-selling\components\SocialSellingHub.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Settings

- **Source:** `\src\features\settings\components\Settings.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### MemoryGovernancePanel

- **Source:** `\src\features\settings\components\MemoryGovernancePanel.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### LearningProfilePanel

- **Source:** `\src\features\settings\components\LearningProfilePanel.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### LeadDedupPanel

- **Source:** `\src\features\settings\components\LeadDedupPanel.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### CompanyDedupPanel

- **Source:** `\src\features\settings\components\CompanyDedupPanel.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### RoleplayHub

- **Source:** `\src\features\roleplay\components\RoleplayHub.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### RoleplayHistoryPanel

- **Source:** `\src\features\roleplay\components\roleplay-hub\RoleplayHistoryPanel.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### CallSetup

- **Source:** `\src\features\roleplay\components\roleplay-hub\CallSetup.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### CallAnalysisReport

- **Source:** `\src\features\roleplay\components\roleplay-hub\CallAnalysisReport.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ActiveCallView

- **Source:** `\src\features\roleplay\components\roleplay-hub\ActiveCallView.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### UserKanbanBoard

- **Source:** `\src\features\prospecting\outbound\components\UserKanbanBoard.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### TasksOverviewTab

- **Source:** `\src\features\prospecting\outbound\components\TasksOverviewTab.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ReportErrorButton

- **Source:** `\src\features\prospecting\outbound\components\ReportErrorButton.tsx`
- **Category:** button
- **Screenshot:** Not available
- **Status:** not rendered


### PerformanceTab

- **Source:** `\src\features\prospecting\outbound\components\PerformanceTab.tsx`
- **Category:** form
- **Screenshot:** Not available
- **Status:** not rendered


### MyTasksTab

- **Source:** `\src\features\prospecting\outbound\components\MyTasksTab.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### MetricsChart

- **Source:** `\src\features\prospecting\outbound\components\MetricsChart.tsx`
- **Category:** card
- **Screenshot:** Not available
- **Status:** not rendered


### LoginScreen

- **Source:** `\src\features\prospecting\outbound\components\LoginScreen.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### LOSS_REASONS

- **Source:** `\src\features\prospecting\outbound\components\LeadStageAndTags.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### WIN_REASONS

- **Source:** `\src\features\prospecting\outbound\components\LeadStageAndTags.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### LeadDistributionTab

- **Source:** `\src\features\prospecting\outbound\components\LeadDistributionTab.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### SavedSearchesModal

- **Source:** `\src\features\prospecting\components\SavedSearchesModal.tsx`
- **Category:** modal
- **Screenshot:** Not available
- **Status:** not rendered


### ProspectingHub

- **Source:** `\src\features\prospecting\components\ProspectingHub.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ProspectingToolsHub

- **Source:** `\src\features\prospecting\components\prospecting-hub\ProspectingToolsHub.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### OcrCapturePanel

- **Source:** `\src\features\prospecting\components\prospecting-hub\OcrCapturePanel.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### InfoTile

- **Source:** `\src\features\prospecting\components\prospecting-hub\InfoTile.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### DiscoveryResultsPanel

- **Source:** `\src\features\prospecting\components\prospecting-hub\DiscoveryResultsPanel.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### DiscoveryFilterPanel

- **Source:** `\src\features\prospecting\components\prospecting-hub\DiscoveryFilterPanel.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### DecisionMakerSearch

- **Source:** `\src\features\prospecting\components\prospecting-hub\DecisionMakerSearch.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### CnpjSearchPanel

- **Source:** `\src\features\prospecting\components\prospecting-hub\CnpjSearchPanel.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### CnpjResultCard

- **Source:** `\src\features\prospecting\components\prospecting-hub\CnpjResultCard.tsx`
- **Category:** card
- **Screenshot:** Not available
- **Status:** not rendered


### CandidateCard

- **Source:** `\src\features\prospecting\components\prospecting-hub\CandidateCard.tsx`
- **Category:** card
- **Screenshot:** Not available
- **Status:** not rendered


### YoutubeTool

- **Source:** `\src\features\prospecting\components\prospecting-hub\tools\YoutubeTool.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### NotConfiguredBanner

- **Source:** `\src\features\prospecting\components\prospecting-hub\tools\NotConfiguredBanner.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### NewsTool

- **Source:** `\src\features\prospecting\components\prospecting-hub\tools\NewsTool.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### LinkedInTool

- **Source:** `\src\features\prospecting\components\prospecting-hub\tools\LinkedInTool.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### HunterTool

- **Source:** `\src\features\prospecting\components\prospecting-hub\tools\HunterTool.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### GooglePlacesTool

- **Source:** `\src\features\prospecting\components\prospecting-hub\tools\GooglePlacesTool.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### GitHubTool

- **Source:** `\src\features\prospecting\components\prospecting-hub\tools\GitHubTool.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ApolloTool

- **Source:** `\src\features\prospecting\components\prospecting-hub\tools\ApolloTool.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### QualificationMatrixPage

- **Source:** `\src\features\playbook\components\QualificationMatrixPage.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### QualificationItemForm

- **Source:** `\src\features\playbook\components\QualificationItemForm.tsx`
- **Category:** form
- **Screenshot:** Not available
- **Status:** not rendered


### ObjectionSuggestionsReview

- **Source:** `\src\features\playbook\components\ObjectionSuggestionsReview.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ObjectionsMatrixPage

- **Source:** `\src\features\playbook\components\ObjectionsMatrixPage.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ObjectionItemForm

- **Source:** `\src\features\playbook\components\ObjectionItemForm.tsx`
- **Category:** form
- **Screenshot:** Not available
- **Status:** not rendered


### LivingPlaybookReview

- **Source:** `\src\features\playbook\components\LivingPlaybookReview.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### OnboardingTour

- **Source:** `\src\features\onboarding\components\OnboardingTour.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Notifications

- **Source:** `\src\features\notifications\components\Notifications.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ModuleAccessAdmin

- **Source:** `\src\features\module-access\components\ModuleAccessAdmin.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### SdrDashboard

- **Source:** `\src\features\mesa-tratamento\components\SdrDashboard.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### QueueList

- **Source:** `\src\features\mesa-tratamento\components\QueueList.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### PomodoroWidget

- **Source:** `\src\features\mesa-tratamento\components\PomodoroWidget.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### MesaTratamento

- **Source:** `\src\features\mesa-tratamento\components\MesaTratamento.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ManagementPanel

- **Source:** `\src\features\mesa-tratamento\components\ManagementPanel.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### CurrentLeadCard

- **Source:** `\src\features\mesa-tratamento\components\CurrentLeadCard.tsx`
- **Category:** card
- **Screenshot:** Not available
- **Status:** not rendered


### VisualOrgChart

- **Source:** `\src\features\market-intelligence\components\VisualOrgChart.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### LeadApprovalDeck

- **Source:** `\src\features\market-intelligence\components\LeadApprovalDeck.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### LdrAccountIntelligence

- **Source:** `\src\features\market-intelligence\components\LdrAccountIntelligence.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### CompanyBranchesView

- **Source:** `\src\features\market-intelligence\components\CompanyBranchesView.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Account360

- **Source:** `\src\features\market-intelligence\components\Account360.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### DataSubjectRights

- **Source:** `\src\features\lgpd\components\DataSubjectRights.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### AuditLogs

- **Source:** `\src\features\lgpd\components\AuditLogs.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### EditorIA

- **Source:** `\src\features\knowledge\components\EditorIA.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Base

- **Source:** `\src\features\knowledge\components\Base.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### TopicTrainingAcademy

- **Source:** `\src\features\intelligence\components\TopicTrainingAcademy.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### SwarmObservability

- **Source:** `\src\features\intelligence\components\SwarmObservability.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### SwarmDashboard

- **Source:** `\src\features\intelligence\components\SwarmDashboard.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### SuperagentCreator

- **Source:** `\src\features\intelligence\components\SuperagentCreator.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### SalesMethodologyStudio

- **Source:** `\src\features\intelligence\components\SalesMethodologyStudio.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### RobustScriptGenerator

- **Source:** `\src\features\intelligence\components\RobustScriptGenerator.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ReportsHub

- **Source:** `\src\features\intelligence\components\ReportsHub.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### IntelligenceHub

- **Source:** `\src\features\intelligence\components\IntelligenceHub.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ContextualCopilot

- **Source:** `\src\features\intelligence\components\ContextualCopilot.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### BitrixGuideHub

- **Source:** `\src\features\intelligence\components\BitrixGuideHub.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### B2BGenerator

- **Source:** `\src\features\intelligence\components\B2BGenerator.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### AutomationGuide

- **Source:** `\src\features\intelligence\components\AutomationGuide.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### AISuiteHub

- **Source:** `\src\features\intelligence\components\AISuiteHub.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### AIPendingActions

- **Source:** `\src\features\intelligence\components\AIPendingActions.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### AgentQualityPanel

- **Source:** `\src\features\intelligence\components\AgentQualityPanel.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### WhatsAppWebPanel

- **Source:** `\src\features\integrations\whatsapp\components\WhatsAppWebPanel.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### WhatsAppChatPanel

- **Source:** `\src\features\integrations\whatsapp\components\WhatsAppChatPanel.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### StripeConnectionPanel

- **Source:** `\src\features\integrations\stripe\components\StripeConnectionPanel.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### SlackConnectionPanel

- **Source:** `\src\features\integrations\slack\components\SlackConnectionPanel.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### OmieConnectionPanel

- **Source:** `\src\features\integrations\omie\components\OmieConnectionPanel.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### WebhookMonitor

- **Source:** `\src\features\integrations\components\WebhookMonitor.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### IntegrationStatusBadge

- **Source:** `\src\features\integrations\components\IntegrationStatusBadge.tsx`
- **Category:** badge
- **Screenshot:** Not available
- **Status:** not rendered


### Integrations

- **Source:** `\src\features\integrations\components\Integrations.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ExternalCrmPanel

- **Source:** `\src\features\integrations\components\ExternalCrmPanel.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### BitrixSyncRulesPanel

- **Source:** `\src\features\integrations\components\BitrixSyncRulesPanel.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### BitrixImportPanel

- **Source:** `\src\features\integrations\components\BitrixImportPanel.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### BitrixExtractionPanel

- **Source:** `\src\features\integrations\components\BitrixExtractionPanel.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### VoiceHubConnectionPanel

- **Source:** `\src\features\integrations\birth-voice\components\VoiceHubConnectionPanel.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### VoiceCallActivity

- **Source:** `\src\features\integrations\birth-voice\components\VoiceCallActivity.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### HubTaskWidget

- **Source:** `\src\features\hub\components\HubTaskWidget.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### HubScreen

- **Source:** `\src\features\hub\components\HubScreen.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### HubBurstCanvas

- **Source:** `\src\features\hub\components\HubBurstCanvas.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### CommercialAgentCellPanel

- **Source:** `\src\features\hub\components\CommercialAgentCellPanel.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### FeatureFlagsPanel

- **Source:** `\src\features\feature-flags\components\FeatureFlagsPanel.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Editor

- **Source:** `\src\features\document-editor\components\Editor.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### DesignLabPage

- **Source:** `\src\features\design-lab\DesignLabPage.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### NeonTokyoButton

- **Source:** `\src\features\design-lab\neon-tokyo-buttons\NeonTokyoButton.tsx`
- **Category:** button
- **Screenshot:** Not available
- **Status:** not rendered


### ButtonGallery

- **Source:** `\src\features\design-lab\neon-tokyo-buttons\ButtonGallery.tsx`
- **Category:** button
- **Screenshot:** Not available
- **Status:** not rendered


### TeamRankingWidget

- **Source:** `\src\features\dashboard\components\TeamRankingWidget.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### SinglePageDashboard

- **Source:** `\src\features\dashboard\components\SinglePageDashboard.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### SellerCoachingCard

- **Source:** `\src\features\dashboard\components\SellerCoachingCard.tsx`
- **Category:** card
- **Screenshot:** Not available
- **Status:** not rendered


### RevenueSignalOrb

- **Source:** `\src\features\dashboard\components\RevenueSignalOrb.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### RealtimeFeed

- **Source:** `\src\features\dashboard\components\RealtimeFeed.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### DeferredRevenueSignalOrb

- **Source:** `\src\features\dashboard\components\DeferredRevenueSignalOrb.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### AiGatewayShowcase

- **Source:** `\src\features\dashboard\components\AiGatewayShowcase.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### AdaptiveDashboard

- **Source:** `\src\features\dashboard\components\AdaptiveDashboard.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### PropostasList

- **Source:** `\src\features\crm360\components\PropostasList.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### PropostaForm

- **Source:** `\src\features\crm360\components\PropostaForm.tsx`
- **Category:** form
- **Screenshot:** Not available
- **Status:** not rendered


### PropostaDetail

- **Source:** `\src\features\crm360\components\PropostaDetail.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### CrmOverview

- **Source:** `\src\features\crm360\components\CrmOverview.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### SavedViewsPanel

- **Source:** `\src\features\crm\components\SavedViewsPanel.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### LeadDetailDrawer

- **Source:** `\src\features\crm\components\LeadDetailDrawer.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### LeadActionBar

- **Source:** `\src\features\crm\components\LeadActionBar.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### KanbanColumn

- **Source:** `\src\features\crm\components\KanbanColumn.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### KanbanCard

- **Source:** `\src\features\crm\components\KanbanCard.tsx`
- **Category:** card
- **Screenshot:** Not available
- **Status:** not rendered


### BitrixImportModal

- **Source:** `\src\features\crm\components\BitrixImportModal.tsx`
- **Category:** modal
- **Screenshot:** Not available
- **Status:** not rendered


### LeadCopilotoPanel

- **Source:** `\src\features\copiloto-ia\components\LeadCopilotoPanel.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### CopilotoIaHub

- **Source:** `\src\features\copiloto-ia\components\CopilotoIaHub.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ConversationsTab

- **Source:** `\src\features\copiloto-ia\components\ConversationsTab.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ConversationDetailDrawer

- **Source:** `\src\features\copiloto-ia\components\ConversationDetailDrawer.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### BitrixMappingSettingsTab

- **Source:** `\src\features\copiloto-ia\components\BitrixMappingSettingsTab.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ContactList

- **Source:** `\src\features\contacts\components\ContactList.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ContactForm

- **Source:** `\src\features\contacts\components\ContactForm.tsx`
- **Category:** form
- **Screenshot:** Not available
- **Status:** not rendered


### ContactDetail

- **Source:** `\src\features\contacts\components\ContactDetail.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### CompanyList

- **Source:** `\src\features\companies\components\CompanyList.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### CompanyForm

- **Source:** `\src\features\companies\components\CompanyForm.tsx`
- **Category:** form
- **Screenshot:** Not available
- **Status:** not rendered


### CompanyDetail

- **Source:** `\src\features\companies\components\CompanyDetail.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### TrendChartCard

- **Source:** `\src\features\commercial-intelligence\components\TrendChartCard.tsx`
- **Category:** card
- **Screenshot:** Not available
- **Status:** not rendered


### SellerBenchmarkCard

- **Source:** `\src\features\commercial-intelligence\components\SellerBenchmarkCard.tsx`
- **Category:** card
- **Screenshot:** Not available
- **Status:** not rendered


### PipelineForecastTab

- **Source:** `\src\features\commercial-intelligence\components\PipelineForecastTab.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### PipelineByStageCard

- **Source:** `\src\features\commercial-intelligence\components\PipelineByStageCard.tsx`
- **Category:** card
- **Screenshot:** Not available
- **Status:** not rendered


### PerformanceTab

- **Source:** `\src\features\commercial-intelligence\components\PerformanceTab.tsx`
- **Category:** form
- **Screenshot:** Not available
- **Status:** not rendered


### NewActivityModal

- **Source:** `\src\features\commercial-intelligence\components\NewActivityModal.tsx`
- **Category:** modal
- **Screenshot:** Not available
- **Status:** not rendered


### MetricInfo

- **Source:** `\src\features\commercial-intelligence\components\MetricInfo.tsx`
- **Category:** card
- **Screenshot:** Not available
- **Status:** not rendered


### MentorPlaybookCard

- **Source:** `\src\features\commercial-intelligence\components\MentorPlaybookCard.tsx`
- **Category:** card
- **Screenshot:** Not available
- **Status:** not rendered


### LossReasonAiCheck

- **Source:** `\src\features\commercial-intelligence\components\LossReasonAiCheck.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### LossesTab

- **Source:** `\src\features\commercial-intelligence\components\LossesTab.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### LeadingIndicatorsTab

- **Source:** `\src\features\commercial-intelligence\components\LeadingIndicatorsTab.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### KpiTile

- **Source:** `\src\features\commercial-intelligence\components\KpiTile.tsx`
- **Category:** card
- **Screenshot:** Not available
- **Status:** not rendered


### JourneyTab

- **Source:** `\src\features\commercial-intelligence\components\JourneyTab.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### JoaoReisDiagnosticHub

- **Source:** `\src\features\commercial-intelligence\components\JoaoReisDiagnosticHub.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### HiringScenarioCard

- **Source:** `\src\features\commercial-intelligence\components\HiringScenarioCard.tsx`
- **Category:** card
- **Screenshot:** Not available
- **Status:** not rendered


### HealthScoreCard

- **Source:** `\src\features\commercial-intelligence\components\HealthScoreCard.tsx`
- **Category:** card
- **Screenshot:** Not available
- **Status:** not rendered


### GoalEditorDialog

- **Source:** `\src\features\commercial-intelligence\components\GoalEditorDialog.tsx`
- **Category:** modal
- **Screenshot:** Not available
- **Status:** not rendered


### GoalCountdownOverlay

- **Source:** `\src\features\commercial-intelligence\components\GoalCountdownOverlay.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### FunnelConversionCard

- **Source:** `\src\features\commercial-intelligence\components\FunnelConversionCard.tsx`
- **Category:** card
- **Screenshot:** Not available
- **Status:** not rendered


### FunnelBottleneckCard

- **Source:** `\src\features\commercial-intelligence\components\FunnelBottleneckCard.tsx`
- **Category:** card
- **Screenshot:** Not available
- **Status:** not rendered


### ForecastRangeCard

- **Source:** `\src\features\commercial-intelligence\components\ForecastRangeCard.tsx`
- **Category:** card
- **Screenshot:** Not available
- **Status:** not rendered


### ForecastCalibrationCard

- **Source:** `\src\features\commercial-intelligence\components\ForecastCalibrationCard.tsx`
- **Category:** card
- **Screenshot:** Not available
- **Status:** not rendered


### ForecastAccuracyCard

- **Source:** `\src\features\commercial-intelligence\components\ForecastAccuracyCard.tsx`
- **Category:** card
- **Screenshot:** Not available
- **Status:** not rendered


### ExecutiveOverviewTab

- **Source:** `\src\features\commercial-intelligence\components\ExecutiveOverviewTab.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### DecisionCenterPanel

- **Source:** `\src\features\commercial-intelligence\components\DecisionCenterPanel.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### DealDrillDownDrawer

- **Source:** `\src\features\commercial-intelligence\components\DealDrillDownDrawer.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### DailyPlanTeamOverview

- **Source:** `\src\features\commercial-intelligence\components\DailyPlanTeamOverview.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### DailyPlanHub

- **Source:** `\src\features\commercial-intelligence\components\DailyPlanHub.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### DailyClosingGate

- **Source:** `\src\features\commercial-intelligence\components\DailyClosingGate.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### CrmQualityTab

- **Source:** `\src\features\commercial-intelligence\components\CrmQualityTab.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### CommercialIntelligenceHub

- **Source:** `\src\features\commercial-intelligence\components\CommercialIntelligenceHub.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### CloseDateIntelligenceCard

- **Source:** `\src\features\commercial-intelligence\components\CloseDateIntelligenceCard.tsx`
- **Category:** card
- **Screenshot:** Not available
- **Status:** not rendered


### ChannelAttributionCard

- **Source:** `\src\features\commercial-intelligence\components\ChannelAttributionCard.tsx`
- **Category:** card
- **Screenshot:** Not available
- **Status:** not rendered


### AlertsPanel

- **Source:** `\src\features\commercial-intelligence\components\AlertsPanel.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### AgingTab

- **Source:** `\src\features\commercial-intelligence\components\AgingTab.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### FloatingChatbook

- **Source:** `\src\features\chatbook\components\FloatingChatbook.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ChatbookHub

- **Source:** `\src\features\chatbook\components\ChatbookHub.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### PublicBookingPage

- **Source:** `\src\features\calendar\components\PublicBookingPage.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Calendar

- **Source:** `\src\features\calendar\components\Calendar.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### BookingLinksModal

- **Source:** `\src\features\calendar\components\BookingLinksModal.tsx`
- **Category:** modal
- **Screenshot:** Not available
- **Status:** not rendered


### CadenceHub

- **Source:** `\src\features\cadence\components\CadenceHub.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Billing

- **Source:** `\src\features\billing\components\Billing.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ColdCallStatusCard

- **Source:** `\src\features\automations\components\ColdCallStatusCard.tsx`
- **Category:** card
- **Screenshot:** Not available
- **Status:** not rendered


### AutomationVersionsDialog

- **Source:** `\src\features\automations\components\AutomationVersionsDialog.tsx`
- **Category:** modal
- **Screenshot:** Not available
- **Status:** not rendered


### Automations

- **Source:** `\src\features\automations\components\Automations.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### AutomationDryRunDialog

- **Source:** `\src\features\automations\components\AutomationDryRunDialog.tsx`
- **Category:** modal
- **Screenshot:** Not available
- **Status:** not rendered


### WelcomeScreen

- **Source:** `\src\features\auth\components\WelcomeScreen.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ResetPasswordScreen

- **Source:** `\src\features\auth\components\ResetPasswordScreen.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### LoginScreen

- **Source:** `\src\features\auth\components\LoginScreen.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### LandingLoginSplitScreen

- **Source:** `\src\features\auth\components\LandingLoginSplitScreen.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### GoogleLoginModal

- **Source:** `\src\features\auth\components\GoogleLoginModal.tsx`
- **Category:** modal
- **Screenshot:** Not available
- **Status:** not rendered


### ChangePasswordGate

- **Source:** `\src\features\auth\components\ChangePasswordGate.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### WinLossAnalysis

- **Source:** `\src\features\analytics\components\WinLossAnalysis.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### GlowChart

- **Source:** `\src\features\analytics\components\GlowChart.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### HeatmapWidget

- **Source:** `\src\features\analytics\components\DashboardExtensions.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### AgentPerformanceWidget

- **Source:** `\src\features\analytics\components\DashboardExtensions.tsx`
- **Category:** form
- **Screenshot:** Not available
- **Status:** not rendered


### LostReasonsWidget

- **Source:** `\src\features\analytics\components\DashboardExtensions.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### TmqTile

- **Source:** `\src\features\analytics\components\DashboardExtensions.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### CohortAnalysis

- **Source:** `\src\features\analytics\components\CohortAnalysis.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Analytics

- **Source:** `\src\features\analytics\components\Analytics.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Timeline

- **Source:** `\src\features\activities\components\Timeline.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ActivityList

- **Source:** `\src\features\activities\components\ActivityList.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ThemeProvider

- **Source:** `\src\contexts\ThemeContext.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ExperienceModeProvider

- **Source:** `\src\contexts\ExperienceModeContext.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### DailyClosingProvider

- **Source:** `\src\contexts\DailyClosingContext.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### BrandProvider

- **Source:** `\src\contexts\BrandContext.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### AuthProvider

- **Source:** `\src\contexts\AuthContext.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ActiveRecordProvider

- **Source:** `\src\contexts\ActiveRecordContext.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Intelligence

- **Source:** `\src\components\Intelligence.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ErrorBoundary

- **Source:** `\src\components\ErrorBoundary.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### CrmBoard

- **Source:** `\src\components\CrmBoard.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### WorkspaceReadySection

- **Source:** `\src\components\workspace\WorkspaceReadySection.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### VoiceCommandWidget

- **Source:** `\src\components\ui\VoiceCommandWidget.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### VirtualTable

- **Source:** `\src\components\ui\VirtualTable.tsx`
- **Category:** table
- **Screenshot:** Not available
- **Status:** not rendered


### Toggle

- **Source:** `\src\components\ui\Toggle.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Toaster

- **Source:** `\src\components\ui\Toaster.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Timeline

- **Source:** `\src\components\ui\Timeline.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### TiltCard

- **Source:** `\src\components\ui\TiltCard.tsx`
- **Category:** card
- **Screenshot:** Not available
- **Status:** not rendered


### ThemeSwitcher

- **Source:** `\src\components\ui\ThemeSwitcher.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### QuickThemeToggle

- **Source:** `\src\components\ui\ThemeSwitcher.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### TabNavCards

- **Source:** `\src\components\ui\TabNavCards.tsx`
- **Category:** card
- **Screenshot:** Not available
- **Status:** not rendered


### StyleShowcase

- **Source:** `\src\components\ui\StyleShowcase.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Skeleton

- **Source:** `\src\components\ui\Skeleton.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### MetricSkeleton

- **Source:** `\src\components\ui\Skeleton.tsx`
- **Category:** card
- **Screenshot:** Not available
- **Status:** not rendered


### CardSkeleton

- **Source:** `\src\components\ui\Skeleton.tsx`
- **Category:** card
- **Screenshot:** Not available
- **Status:** not rendered


### TableSkeleton

- **Source:** `\src\components\ui\Skeleton.tsx`
- **Category:** table
- **Screenshot:** Not available
- **Status:** not rendered


### ListSkeleton

- **Source:** `\src\components\ui\Skeleton.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ChartSkeleton

- **Source:** `\src\components\ui\Skeleton.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### LoginPage

- **Source:** `\src\components\ui\sign-in-page.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ParticleSystem

- **Source:** `\src\components\ui\ParticleSystem.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### DigitalRain

- **Source:** `\src\components\ui\ParticleSystem.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### GlitchEffect

- **Source:** `\src\components\ui\ParticleSystem.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Pagination

- **Source:** `\src\components\ui\Pagination.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### PageHeader

- **Source:** `\src\components\ui\PageHeader.tsx`
- **Category:** navigation
- **Screenshot:** Not available
- **Status:** not rendered


### NeonButton

- **Source:** `\src\components\ui\NeonButton.tsx`
- **Category:** button
- **Screenshot:** Not available
- **Status:** not rendered


### Magnetic

- **Source:** `\src\components\ui\Magnetic.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### LiveStatsWidget

- **Source:** `\src\components\ui\LiveStatsWidget.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### KpiCard

- **Source:** `\src\components\ui\KpiCard.tsx`
- **Category:** card
- **Screenshot:** Not available
- **Status:** not rendered


### HolographicCard

- **Source:** `\src\components\ui\HolographicCard.tsx`
- **Category:** card
- **Screenshot:** Not available
- **Status:** not rendered


### GamificationWidget

- **Source:** `\src\components\ui\GamificationWidget.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### FunnelBars

- **Source:** `\src\components\ui\FunnelBars.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### FindingsList

- **Source:** `\src\components\ui\FindingsList.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### EmptyState

- **Source:** `\src\components\ui\EmptyState.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Drawer

- **Source:** `\src\components\ui\Drawer.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Dialog

- **Source:** `\src\components\ui\Dialog.tsx`
- **Category:** modal
- **Screenshot:** Not available
- **Status:** not rendered


### DealCard

- **Source:** `\src\components\ui\DealsGrid.tsx`
- **Category:** card
- **Screenshot:** Not available
- **Status:** not rendered


### DealsGrid

- **Source:** `\src\components\ui\DealsGrid.tsx`
- **Category:** table
- **Screenshot:** Not available
- **Status:** not rendered


### CyberInput

- **Source:** `\src\components\ui\CyberInput.tsx`
- **Category:** input
- **Screenshot:** Not available
- **Status:** not rendered


### CopyButton

- **Source:** `\src\components\ui\CopyButton.tsx`
- **Category:** button
- **Screenshot:** Not available
- **Status:** not rendered


### CopilotTrigger

- **Source:** `\src\components\ui\CopilotTrigger.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### CompareTable

- **Source:** `\src\components\ui\CompareTable.tsx`
- **Category:** table
- **Screenshot:** Not available
- **Status:** not rendered


### CompareBar

- **Source:** `\src\components\ui\CompareBar.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### DeltaPill

- **Source:** `\src\components\ui\CompareBar.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### CommandPalette

- **Source:** `\src\components\ui\CommandPalette.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ClockCalendarWidget

- **Source:** `\src\components\ui\ClockCalendarWidget.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Checklist

- **Source:** `\src\components\ui\Checklist.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ChannelDonut

- **Source:** `\src\components\ui\ChannelDonut.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### Carousel

- **Source:** `\src\components\ui\Carousel.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### CarouselSlide

- **Source:** `\src\components\ui\Carousel.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### CalendarHeatmap

- **Source:** `\src\components\ui\CalendarHeatmap.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### BugReportButton

- **Source:** `\src\components\ui\BugReportButton.tsx`
- **Category:** button
- **Screenshot:** Not available
- **Status:** not rendered


### BrandOrb

- **Source:** `\src\components\ui\BrandOrb.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### BottomSheet

- **Source:** `\src\components\ui\BottomSheet.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### BorderBeam

- **Source:** `\src\components\ui\BorderBeam.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### SourceRequiredIcon

- **Source:** `\src\components\ui\BlockedState.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### FutureToolIcon

- **Source:** `\src\components\ui\BlockedState.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### BlockedState

- **Source:** `\src\components\ui\BlockedState.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### AIEmailGenerator

- **Source:** `\src\components\ui\AIEmailGenerator.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### AIContextPopover

- **Source:** `\src\components\ui\AIContextPopover.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### ActionPlanSteps

- **Source:** `\src\components\ui\ActionPlanSteps.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### YoutubeIcon

- **Source:** `\src\components\ui\icons\YoutubeIcon.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### LinkedinIcon

- **Source:** `\src\components\ui\icons\LinkedinIcon.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### GithubIcon

- **Source:** `\src\components\ui\icons\GithubIcon.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### BentoMetric

- **Source:** `\src\components\ui\bento\BentoMetric.tsx`
- **Category:** card
- **Screenshot:** Not available
- **Status:** not rendered


### BentoInsight

- **Source:** `\src\components\ui\bento\BentoInsight.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### BentoHero

- **Source:** `\src\components\ui\bento\BentoHero.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### BentoGrid

- **Source:** `\src\components\ui\bento\BentoGrid.tsx`
- **Category:** table
- **Screenshot:** Not available
- **Status:** not rendered


### BentoCard

- **Source:** `\src\components\ui\bento\BentoCard.tsx`
- **Category:** card
- **Screenshot:** Not available
- **Status:** not rendered


### ScriptDocument

- **Source:** `\src\components\pdf\PDFExport.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### PDFDownloadButton

- **Source:** `\src\components\pdf\PDFExport.tsx`
- **Category:** button
- **Screenshot:** Not available
- **Status:** not rendered


### Sidebar

- **Source:** `\src\components\layout\Sidebar.tsx`
- **Category:** navigation
- **Screenshot:** Not available
- **Status:** not rendered


### RequireRole

- **Source:** `\src\components\layout\RequireRole.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### RequireModuleAccess

- **Source:** `\src\components\layout\RequireModuleAccess.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ProtectedRoute

- **Source:** `\src\components\layout\ProtectedRoute.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### PageTransition

- **Source:** `\src\components\layout\PageTransition.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### OfflineBanner

- **Source:** `\src\components\layout\OfflineBanner.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### NavLaunchTransition

- **Source:** `\src\components\layout\NavLaunchTransition.tsx`
- **Category:** navigation
- **Screenshot:** Not available
- **Status:** not rendered


### MainLayout

- **Source:** `\src\components\layout\MainLayout.tsx`
- **Category:** layout
- **Screenshot:** Not available
- **Status:** not rendered


### FuturisticSidebar

- **Source:** `\src\components\layout\FuturisticSidebar.tsx`
- **Category:** navigation
- **Screenshot:** Not available
- **Status:** not rendered


### FuturisticLayout

- **Source:** `\src\components\layout\FuturisticLayout.tsx`
- **Category:** layout
- **Screenshot:** Not available
- **Status:** not rendered


### FloatingDock

- **Source:** `\src\components\layout\FloatingDock.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### ExecutiveHeader

- **Source:** `\src\components\layout\ExecutiveHeader.tsx`
- **Category:** navigation
- **Screenshot:** Not available
- **Status:** not rendered


### AppTopbar

- **Source:** `\src\components\layout\AppTopbar.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### IntelligenceSignal

- **Source:** `\src\components\intelligence\IntelligenceSignal.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### IconHome

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconBuilding

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconContacts

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconPipeline

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconActivity

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconRadar

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconSparkle

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconBrain

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconSearch

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconBell

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconChevronsLeft

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconArrowRight

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconCheck

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconTarget

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconBolt

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconLogout

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconUser

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconClock

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconMenu

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconGrid

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconTrendUp

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconPhone

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconDocument

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconHandshake

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconTrophy

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconClose

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconFlame

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconSnowflake

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconDownload

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconPlus

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconEdit

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconTrash

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconMail

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconMapPin

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconSpinner

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconArrowLeft

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconGlobe

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconLinkedin

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconInstagram

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconTwitterX

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconFacebook

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconStar

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconTag

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconWrench

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconClipboard

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconChevronDown

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconChevronUp

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconSend

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconSave

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconInfo

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconMessage

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconCalendar

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconChat

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconDatabase

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconCpu

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconBot

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconServer

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconShieldCheck

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconWarning

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconLandmark

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconUserPlus

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconSliders

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconDollar

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconBook

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconX

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconAlertTriangle

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconHelp

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconFilter

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconZap

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconCode

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconLayers

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### IconRefresh

- **Source:** `\src\components\icons\BrandIcons.tsx`
- **Category:** icon
- **Screenshot:** Not available
- **Status:** not rendered


### RichTextEditor

- **Source:** `\src\components\editor\RichTextEditor.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### EntityNotes

- **Source:** `\src\components\crm\EntityNotes.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### EntityAttachments

- **Source:** `\src\components\crm\EntityAttachments.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### FunnelChart

- **Source:** `\src\components\charts\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### SankeyChart

- **Source:** `\src\components\charts\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### HeatmapChart

- **Source:** `\src\components\charts\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### BarChart

- **Source:** `\src\components\charts\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### LineChart

- **Source:** `\src\components\charts\index.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### BrandEmblemBadge

- **Source:** `\src\components\brand\BrandEmblemBadge.tsx`
- **Category:** badge
- **Screenshot:** Not available
- **Status:** not rendered


### BirthHubLogo

- **Source:** `\src\components\brand\BirthHubLogo.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### BirthHubSignature

- **Source:** `\src\components\brand\BirthHubLogo.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


### BirthHubWordmark

- **Source:** `\src\components\brand\BirthHubLogo.tsx`
- **Category:** other
- **Screenshot:** Not available
- **Status:** not rendered


---

*This document was automatically generated by the Birth Hub 360° Design System Audit tool.*
