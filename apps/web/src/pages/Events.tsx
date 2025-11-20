import { Link } from 'react-router-dom'
import { useEvents } from '@/lib/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, Users, Clock, ArrowRight, Calendar as CalendarIcon, Sparkles, Loader2 } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { motion } from 'framer-motion'

export default function Events() {
  const { data: events = [], isLoading } = useEvents()

  // Group events by month
  const groupedEvents = events.reduce((acc, event) => {
    if (!event.starts_at) return acc
    const month = new Date(event.starts_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    if (!acc[month]) acc[month] = []
    acc[month].push(event)
    return acc
  }, {} as Record<string, typeof events>)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Loading exciting events...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-gray-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600 text-white py-24">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-700" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-6 border border-white/30">
              <CalendarIcon className="h-4 w-4" />
              <span className="text-sm font-medium">Upcoming Events</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/90">
              Community Events
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto">
              Celebrate, connect, and create memories at our special community gatherings
            </p>
          </motion.div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 0L60 10C120 20 240 40 360 46.7C480 53 600 47 720 43.3C840 40 960 40 1080 46.7C1200 53 1320 67 1380 73.3L1440 80V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V0Z" fill="rgb(239, 246, 255)"/>
          </svg>
        </div>
      </section>

      {/* Events Timeline */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          {Object.keys(groupedEvents).length > 0 ? (
            Object.entries(groupedEvents).map(([month, monthEvents], monthIndex) => (
              <motion.div
                key={month}
                className="mb-16"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: monthIndex * 0.1 }}
              >
                {/* Month Header */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-bold shadow-lg">
                    <CalendarIcon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-600">
                      {month}
                    </h2>
                    <div className="h-1 w-24 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full mt-2" />
                  </div>
                </div>

                {/* Events */}
                <div className="space-y-6">
                  {monthEvents.map((event, eventIndex) => (
                    <motion.div
                      key={event.id}
                      className="relative"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: eventIndex * 0.1 }}
                    >
                      <Card className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-blue-200 relative overflow-hidden">
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        <div className="flex flex-col md:flex-row relative">
                          {/* Date Badge */}
                          <div className="flex-shrink-0 p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-r">
                            <div className="text-center">
                              <div className="text-4xl font-bold text-blue-600">
                                {event.starts_at && new Date(event.starts_at).getDate()}
                              </div>
                              <div className="text-sm font-medium text-blue-600 mt-1">
                                {event.starts_at && new Date(event.starts_at).toLocaleDateString('en-US', { weekday: 'short' })}
                              </div>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 p-6">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                              <div className="flex-1">
                                <h3 className="text-2xl font-bold mb-2 group-hover:text-blue-600 transition-colors">
                                  {event.title}
                                </h3>
                                {event.starts_at && (
                                  <p className="text-sm text-muted-foreground font-medium">
                                    {formatDateTime(event.starts_at)}
                                  </p>
                                )}
                              </div>
                              {event.spots_left !== undefined && event.spots_left <= 10 && event.spots_left > 0 && (
                                <span className="px-3 py-1 bg-orange-100 text-orange-700 text-sm font-semibold rounded-full whitespace-nowrap">
                                  Only {event.spots_left} spots left!
                                </span>
                              )}
                            </div>

                            <p className="text-muted-foreground mb-6 leading-relaxed">
                              {event.description}
                            </p>

                            <div className="grid md:grid-cols-3 gap-4 mb-6">
                              {event.location && (
                                <div className="flex items-center gap-3 text-sm bg-gray-50 p-3 rounded-lg">
                                  <MapPin className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                  <span className="font-medium">{event.location}</span>
                                </div>
                              )}
                              {event.starts_at && event.ends_at && (
                                <div className="flex items-center gap-3 text-sm bg-gray-50 p-3 rounded-lg">
                                  <Clock className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                  <span className="font-medium">
                                    {new Date(event.starts_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {new Date(event.ends_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-3 text-sm bg-gray-50 p-3 rounded-lg">
                                <Users className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                <span className="font-medium">
                                  {event.spots_left !== undefined && event.spots_left > 0
                                    ? `${event.spots_left} spots available`
                                    : event.spots_left === 0
                                    ? 'Full - Join waitlist'
                                    : `${event.capacity} capacity`}
                                </span>
                              </div>
                            </div>

                            <Button
                              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg group/btn"
                              asChild
                            >
                              <Link to={`/events/${event.slug}`}>
                                View Details & Register
                                <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                              </Link>
                            </Button>
                          </div>
                        </div>

                        {/* Shine effect */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/10 to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div
              className="text-center py-20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold mb-3">No events scheduled</h3>
                <p className="text-muted-foreground mb-6">
                  Check back soon for exciting upcoming events!
                </p>
                <Button variant="outline" asChild>
                  <Link to="/programs">Browse Programs</Link>
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  )
}
