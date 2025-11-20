import { Link } from 'react-router-dom'
import { usePrograms } from '@/lib/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, Users, Calendar, ArrowRight, Sparkles, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'

export default function Programs() {
  const { data: programs = [], isLoading } = usePrograms()
  const [filter, setFilter] = useState<'all' | 'youth' | 'adult' | 'senior'>('all')

  const filteredPrograms = programs.filter((program) => {
    if (filter === 'all') return true
    if (filter === 'youth') return program.age_max && program.age_max <= 17
    if (filter === 'adult') return program.age_min && program.age_min >= 18 && program.age_max && program.age_max < 65
    if (filter === 'senior') return program.age_min && program.age_min >= 65
    return true
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Loading amazing programs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-gray-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 text-white py-24">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse delay-700" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-6 border border-white/30">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Discover Your Passion</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/90">
              Recreation Programs
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto">
              Join our community and discover programs designed for every age and interest
            </p>
          </motion.div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 0L60 10C120 20 240 40 360 46.7C480 53 600 47 720 43.3C840 40 960 40 1080 46.7C1200 53 1320 67 1380 73.3L1440 80V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V0Z" fill="rgb(250, 245, 255)"/>
          </svg>
        </div>
      </section>

      {/* Filter Section */}
      <section className="py-8 sticky top-0 bg-white/80 backdrop-blur-lg z-40 border-b shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap gap-3 justify-center">
            {['all', 'youth', 'adult', 'senior'].map((category) => (
              <Button
                key={category}
                onClick={() => setFilter(category as any)}
                variant={filter === category ? 'default' : 'outline'}
                className={filter === category
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'hover:border-purple-300 hover:bg-purple-50'
                }
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
                {category === 'all' && ` (${programs.length})`}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Programs Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPrograms.map((program, index) => (
              <motion.div
                key={program.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="flex flex-col h-full group hover:shadow-2xl transition-all duration-300 border-2 hover:border-purple-200 relative overflow-hidden">
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <CardHeader className="relative">
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-2xl group-hover:text-purple-600 transition-colors">
                        {program.title}
                      </CardTitle>
                      {program.spots_left !== undefined && program.spots_left <= 5 && program.spots_left > 0 && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                          Almost Full!
                        </span>
                      )}
                    </div>
                    <CardDescription className="text-base font-medium text-purple-600">
                      {program.age_min && program.age_max
                        ? `Ages ${program.age_min}-${program.age_max}`
                        : 'All ages welcome'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col relative">
                    <p className="text-muted-foreground mb-6 line-clamp-3 leading-relaxed">
                      {program.description}
                    </p>

                    <div className="space-y-3 mb-6">
                      {program.location && (
                        <div className="flex items-center gap-3 text-sm bg-gray-50 p-3 rounded-lg">
                          <MapPin className="h-4 w-4 text-purple-600 flex-shrink-0" />
                          <span className="font-medium">{program.location}</span>
                        </div>
                      )}
                      {program.start_date && program.end_date && (
                        <div className="flex items-center gap-3 text-sm bg-gray-50 p-3 rounded-lg">
                          <Calendar className="h-4 w-4 text-purple-600 flex-shrink-0" />
                          <span className="font-medium">
                            {new Date(program.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(program.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-sm bg-gray-50 p-3 rounded-lg">
                        <Users className="h-4 w-4 text-purple-600 flex-shrink-0" />
                        <span className="font-medium">
                          {program.spots_left !== undefined && program.spots_left > 0
                            ? `${program.spots_left} spots available`
                            : program.spots_left === 0
                            ? 'Full - Join waitlist'
                            : `${program.capacity} capacity`}
                        </span>
                      </div>
                    </div>

                    <Button
                      className="w-full mt-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg group/btn"
                      asChild
                    >
                      <Link to={`/programs/${program.slug}`}>
                        View Details & Register
                        <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  </CardContent>

                  {/* Shine effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/10 to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                </Card>
              </motion.div>
            ))}
          </div>

          {filteredPrograms.length === 0 && (
            <motion.div
              className="text-center py-20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="h-10 w-10 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold mb-3">No programs found</h3>
                <p className="text-muted-foreground mb-6">
                  Try adjusting your filters or check back soon for new programs!
                </p>
                <Button onClick={() => setFilter('all')} variant="outline">
                  Clear Filters
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  )
}
