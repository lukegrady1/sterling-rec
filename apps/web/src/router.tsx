import { createBrowserRouter } from 'react-router-dom'
import { Layout } from './components/Layout'
import Home from './pages/Home'
import Programs from './pages/Programs'
import ProgramDetail from './pages/ProgramDetail'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import Facilities from './pages/Facilities'
import FacilityDetail from './pages/FacilityDetail'
import BookingsPage from './pages/BookingsPage'
import Login from './pages/Login'
import Signup from './pages/Signup'
import FamilyPage from './pages/FamilyPage'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/admin/Dashboard'
import AdminPrograms from './pages/admin/Programs'
import AdminEvents from './pages/admin/Events'
import AdminFacilities from './pages/admin/Facilities'
import AdminFacilitiesManagement from './pages/admin/FacilitiesManagement'
import AdminBookings from './pages/admin/Bookings'
import AdminProgramRegistrations from './pages/admin/ProgramRegistrations'
import AdminSettings from './pages/admin/Settings'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'programs', element: <Programs /> },
      { path: 'programs/:slug', element: <ProgramDetail /> },
      { path: 'events', element: <Events /> },
      { path: 'events/:slug', element: <EventDetail /> },
      { path: 'facilities', element: <Facilities /> },
      { path: 'facilities/:slug', element: <FacilityDetail /> },
      { path: 'bookings', element: <BookingsPage /> },
      { path: 'login', element: <Login /> },
      { path: 'signup', element: <Signup /> },
      { path: 'account/family', element: <FamilyPage /> },
    ],
  },
  {
    path: '/admin',
    children: [
      { path: 'login', element: <AdminLogin /> },
      { index: true, element: <AdminDashboard /> },
      { path: 'dashboard', element: <AdminDashboard /> },
      { path: 'programs', element: <AdminPrograms /> },
      { path: 'events', element: <AdminEvents /> },
      { path: 'facilities', element: <AdminFacilitiesManagement /> },
      { path: 'facilities-old', element: <AdminFacilities /> },
      { path: 'bookings', element: <AdminBookings /> },
      { path: 'program-registrations', element: <AdminProgramRegistrations /> },
      { path: 'settings', element: <AdminSettings /> },
    ],
  },
])
