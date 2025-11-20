import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, Check, MapPin, Calendar, Clock, Users, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useFacilities } from '@/lib/hooks'
import { Link } from 'react-router-dom'

// Map facility types to icons and colors
const facilityTypeConfig: Record<string, { icon: typeof Building2; color: string; bgColor: string }> = {
  field: {
    icon: Building2,
    color: 'from-green-600 to-emerald-600',
    bgColor: 'from-green-50 to-emerald-50',
  },
  court: {
    icon: Building2,
    color: 'from-blue-600 to-cyan-600',
    bgColor: 'from-blue-50 to-cyan-50',
  },
  room: {
    icon: Building2,
    color: 'from-purple-600 to-pink-600',
    bgColor: 'from-purple-50 to-pink-50',
  },
  default: {
    icon: Building2,
    color: 'from-orange-600 to-red-600',
    bgColor: 'from-orange-50 to-red-50',
  },
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function Facilities() {
  const { data: facilities, isLoading, error } = useFacilities()
  const [selectedType, setSelectedType] = useState<string>('all')

  // Filter facilities by type
  const filteredFacilities = facilities?.filter(f =>
    selectedType === 'all' || f.facility_type === selectedType
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading facilities...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-gray-50 flex items-center justify-center">
        <Card className="max-w-md p-6">
          <p className="text-red-600">Failed to load facilities. Please try again later.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-gray-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-600 via-red-600 to-pink-600 text-white py-24">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl animate-pulse delay-700" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-6 border border-white/30">
              <Building2 className="h-4 w-4" />
              <span className="text-sm font-medium">Book Our Facilities</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/90">
              Our Facilities
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto">
              Browse and book our recreational spaces for your next event or activity
            </p>
          </motion.div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 0L60 10C120 20 240 40 360 46.7C480 53 600 47 720 43.3C840 40 960 40 1080 46.7C1200 53 1320 67 1380 73.3L1440 80V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V0Z" fill="rgb(255, 247, 237)"/>
          </svg>
        </div>
      </section>

      {/* Facilities Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-pink-600">
              Available Facilities
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Select a facility to view availability and book your time slot
            </p>
          </motion.div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            <Button
              variant={selectedType === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedType('all')}
              className={selectedType === 'all' ? 'bg-gradient-to-r from-orange-600 to-pink-600' : ''}
            >
              All Facilities
            </Button>
            <Button
              variant={selectedType === 'field' ? 'default' : 'outline'}
              onClick={() => setSelectedType('field')}
              className={selectedType === 'field' ? 'bg-gradient-to-r from-green-600 to-emerald-600' : ''}
            >
              Fields
            </Button>
            <Button
              variant={selectedType === 'court' ? 'default' : 'outline'}
              onClick={() => setSelectedType('court')}
              className={selectedType === 'court' ? 'bg-gradient-to-r from-blue-600 to-cyan-600' : ''}
            >
              Courts
            </Button>
            <Button
              variant={selectedType === 'room' ? 'default' : 'outline'}
              onClick={() => setSelectedType('room')}
              className={selectedType === 'room' ? 'bg-gradient-to-r from-purple-600 to-pink-600' : ''}
            >
              Rooms
            </Button>
          </div>

          {facilities && facilities.length === 0 ? (
            <Card className="max-w-2xl mx-auto p-12 text-center">
              <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Facilities Available</h3>
              <p className="text-muted-foreground">
                There are currently no facilities available for booking. Please check back later.
              </p>
            </Card>
          ) : filteredFacilities && filteredFacilities.length === 0 ? (
            <Card className="max-w-2xl mx-auto p-12 text-center">
              <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Facilities Found</h3>
              <p className="text-muted-foreground">
                No {selectedType !== 'all' ? selectedType + 's' : 'facilities'} available. Try a different filter.
              </p>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredFacilities?.map((facility, index) => {
                const config = facilityTypeConfig[facility.facility_type] || facilityTypeConfig.default
                const Icon = config.icon

                // Get availability summary
                const availabilityDays = facility.availability_windows
                  ? Array.from(new Set(facility.availability_windows.map(w => dayNames[w.day_of_week])))
                  : []

                return (
                  <motion.div
                    key={facility.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                  >
                    <Card className="h-full group hover:shadow-xl transition-all duration-300 border hover:border-orange-200 relative overflow-hidden">
                      {/* Compact Header */}
                      <div className={`p-4 bg-gradient-to-br ${config.bgColor} border-b relative`}>
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg bg-gradient-to-br ${config.color} text-white shadow group-hover:scale-110 transition-transform duration-300`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`text-lg font-bold mb-1 bg-clip-text text-transparent bg-gradient-to-r ${config.color} truncate`}>
                              {facility.name}
                            </h3>
                            <div className="flex flex-wrap gap-1.5">
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/60 rounded-full text-xs font-medium">
                                <MapPin className="h-3 w-3" />
                                {facility.location || 'Sterling'}
                              </div>
                              {facility.capacity && (
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/60 rounded-full text-xs font-medium">
                                  <Users className="h-3 w-3" />
                                  {facility.capacity}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Compact Booking Info */}
                          <div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Clock className="h-3.5 w-3.5 text-orange-600" />
                              <h4 className="font-semibold text-xs">Booking</h4>
                            </div>
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <div>{facility.min_booking_duration_minutes}-{facility.max_booking_duration_minutes} min slots</div>
                              <div>Book {facility.advance_booking_days} days ahead</div>
                            </div>
                          </div>

                          {/* Compact Availability */}
                          {availabilityDays.length > 0 && (
                            <div>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <Calendar className="h-3.5 w-3.5 text-orange-600" />
                                <h4 className="font-semibold text-xs">Days</h4>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {availabilityDays.map((day) => (
                                  <span
                                    key={day}
                                    className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium"
                                  >
                                    {day.slice(0, 3)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>

                      <div className="p-4 pt-0">
                        <Link to={`/facilities/${facility.slug}`}>
                          <Button size="sm" className="w-full bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-700 hover:to-pink-700">
                            View & Book
                          </Button>
                        </Link>
                      </div>

                      {/* Shine effect */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/10 to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
