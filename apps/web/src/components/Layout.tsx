import { Link, Outlet } from 'react-router-dom'
import { useMe, useLogout } from '@/lib/hooks'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toaster'

export function Layout() {
  const { data: meData } = useMe()
  const logout = useLogout()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-primary">
            Sterling Recreation
          </Link>

          <div className="flex items-center gap-6">
            <Link to="/programs" className="hover:text-primary">
              Programs
            </Link>
            <Link to="/events" className="hover:text-primary">
              Events
            </Link>
            <Link to="/facilities" className="hover:text-primary">
              Facilities
            </Link>

            {meData?.user ? (
              <div className="flex items-center gap-4">
                <Link to="/account/family" className="hover:text-primary">
                  Family
                </Link>
                <Link to="/bookings" className="hover:text-primary">
                  My Bookings
                </Link>
                <span className="text-sm text-muted-foreground">
                  {meData.user.first_name} {meData.user.last_name}
                </span>
                <Button variant="outline" size="sm" onClick={() => logout.mutate()}>
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">Login</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/signup">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t bg-muted/50 py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Sterling Recreation. All rights reserved.</p>
        </div>
      </footer>

      <Toaster />
    </div>
  )
}
