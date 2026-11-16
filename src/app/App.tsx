import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, RouterProvider, useParams, type RouteObject } from 'react-router-dom'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import ErrorBoundary from '@/components/ErrorBoundary'
import { PageSkeleton } from '@/components/page'
import { RootLayout, StaffLayout } from '@/app/layout/AppShell'
import { ClientLayout } from '@/app/layout/ClientLayout'
import { LEGACY_TAB_TO_PATH } from '@/app/navigation'

// Client site
const HomePage = lazy(() => import('@/features/home/HomePage'))
const ProjectsPage = lazy(() => import('@/features/projects/ProjectsPage'))
const ProjectDetailPage = lazy(() => import('@/features/projects/ProjectDetailPage'))
const FinderPage = lazy(() => import('@/features/client/FinderPage'))
const ComparePage = lazy(() => import('@/features/client/ComparePage'))
const MapPage = lazy(() => import('@/features/client/GISMapPage'))
const GalleryPage = lazy(() => import('@/features/client/GalleryPage'))
const TownshipPage = lazy(() => import('@/features/client/TownshipPage'))
const InteriorPage = lazy(() => import('@/features/client/InteriorPage'))
const WalkthroughPage = lazy(() => import('@/features/client/WalkthroughPage'))
const AdvisorPage = lazy(() => import('@/features/client/AdvisorPage'))
const PortalPage = lazy(() => import('@/features/client/PortalPage'))
// CRM
const CrmPage = lazy(() => import('@/features/crm/CrmPage'))
const AutomationPage = lazy(() => import('@/features/crm/AutomationPage'))
// Sales OS
const AnalyticsPage = lazy(() => import('@/features/sales/AnalyticsPage'))
const ExecutivePage = lazy(() => import('@/features/sales/ExecutivePage'))
const InventoryPage = lazy(() => import('@/features/sales/InventoryPage'))
const CallInsightsPage = lazy(() => import('@/features/sales/CallInsightsPage'))
const CompetitorsPage = lazy(() => import('@/features/sales/CompetitorsPage'))
const CopilotPage = lazy(() => import('@/features/sales/CopilotPage'))
const ArchitecturePage = lazy(() => import('@/features/sales/ArchitecturePage'))

const page = (el: ReactNode) => (
  <ErrorBoundary>
    <Suspense fallback={<PageSkeleton />}>{el}</Suspense>
  </ErrorBoundary>
)

/** Old #tab links (from the previous single-page app) → new routes. */
function HashRedirect() {
  const hash = window.location.hash.replace('#', '')
  const to = LEGACY_TAB_TO_PATH[hash]
  return to ? <Navigate to={to} replace /> : page(<HomePage />)
}
function OldProjectRedirect() {
  const { id } = useParams()
  return <Navigate to={`/projects/${id}`} replace />
}
const oldRedirects: RouteObject[] = [
  ...Object.entries(LEGACY_TAB_TO_PATH)
    .filter(([tab, to]) => `/${tab}` !== to)
    .map(([tab, to]) => ({ path: tab, element: <Navigate to={to} replace /> })),
  { path: 'landing/:id', element: <OldProjectRedirect /> },
  { path: 'leads/tools', element: <Navigate to="/crm/tools" replace /> },
]

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        // ── Client site: public, buyer-facing ──
        element: <ClientLayout />,
        children: [
          { index: true, element: <HashRedirect /> },
          { path: 'projects', element: page(<ProjectsPage />) },
          { path: 'projects/:projectId', element: page(<ProjectDetailPage />) },
          { path: 'finder', element: page(<FinderPage />) },
          { path: 'compare', element: page(<ComparePage />) },
          { path: 'map', element: page(<MapPage />) },
          { path: 'gallery', element: page(<GalleryPage />) },
          { path: 'township', element: page(<TownshipPage />) },
          { path: 'interior', element: page(<InteriorPage />) },
          { path: 'ar', element: page(<WalkthroughPage />) },
          { path: 'advisor', element: page(<AdvisorPage />) },
          { path: 'portal', element: page(<PortalPage />) },
          ...oldRedirects,
        ],
      },
      {
        // ── Staff apps: CRM and Sales OS ──
        element: <StaffLayout />,
        children: [
          {
            path: 'crm',
            children: [
              { index: true, element: page(<CrmPage view="leads" />) },
              { path: 'pipeline', element: page(<CrmPage view="pipeline" />) },
              { path: 'followups', element: page(<CrmPage view="followups" />) },
              { path: 'payments', element: page(<CrmPage view="payments" />) },
              { path: 'partners', element: page(<CrmPage view="partners" />) },
              { path: 'tools', element: page(<AutomationPage />) },
            ],
          },
          {
            path: 'sales',
            children: [
              { index: true, element: page(<AnalyticsPage />) },
              { path: 'executive', element: page(<ExecutivePage />) },
              { path: 'calls', element: page(<CallInsightsPage />) },
              { path: 'competitors', element: page(<CompetitorsPage />) },
              { path: 'inventory', element: page(<InventoryPage />) },
              { path: 'copilot', element: page(<CopilotPage />) },
              { path: 'architecture', element: page(<ArchitecturePage />) },
            ],
          },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default function App() {
  return (
    <TooltipProvider>
      <RouterProvider router={router} />
      <Toaster position="bottom-right" richColors />
    </TooltipProvider>
  )
}
