import { usePrograms, useEvents } from '@/lib/hooks'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Link } from 'react-router-dom'
import { EventCalendar } from '@/components/EventCalendar'
import { Calendar, Users, Building2, Sparkles, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import AnimatedGradientText from '@/components/ui/animated-gradient-text'

export default function Home() {
  const { data: programs = [] } = usePrograms()
  const { data: events = [] } = useEvents()

  const features = [
    {
      Icon: Users,
      name: "Programs",
      description: "Explore our recreational programs for all ages. From youth sports to arts & crafts, we have something for everyone.",
      href: "/programs",
      cta: "Browse Programs",
      background: (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20">
          <div className="absolute inset-0 bg-grid-white/10" />
        </div>
      ),
      className: "lg:row-start-1 lg:row-end-3 lg:col-start-1 lg:col-end-2",
    },
    {
      Icon: Calendar,
      name: "Events",
      description: "Join us for community events, celebrations, and special activities throughout the year.",
      href: "/events",
      cta: "View Events",
      background: (
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-teal-500/20 to-blue-500/20">
          <div className="absolute inset-0 bg-grid-white/10" />
        </div>
      ),
      className: "lg:col-start-2 lg:col-end-3 lg:row-start-1 lg:row-end-3",
    },
    {
      Icon: Building2,
      name: "Facilities",
      description: "Discover our state-of-the-art facilities including gymnasiums, fields, courts, and community spaces.",
      href: "/facilities",
      cta: "Explore Facilities",
      background: (
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-red-500/20 to-pink-500/20">
          <div className="absolute inset-0 bg-grid-white/10" />
        </div>
      ),
      className: "lg:col-start-3 lg:col-end-4 lg:row-start-1 lg:row-end-3",
    },
  ]

  return (
    <div>
      {/* Hero Section - Modern Gradient */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white py-32">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 w-full h-full">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse delay-700" />
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <AnimatedGradientText className="mb-6">
              <Sparkles className="h-4 w-4 mr-2" />
              <span className="inline animate-gradient bg-gradient-to-r from-[#ffaa40] via-[#9c40ff] to-[#ffaa40] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent">
                Welcome to Sterling Recreation
              </span>
            </AnimatedGradientText>
          </motion.div>

          <motion.h1
            className="text-6xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Your Community,
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200">
              Your Adventure
            </span>
          </motion.h1>

          <motion.p
            className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto text-white/90 font-light"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Discover programs, events, and activities designed to bring joy and connection to families across Sterling
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Button
              size="lg"
              className="bg-white text-purple-600 hover:bg-white/90 shadow-2xl hover:shadow-white/50 transition-all duration-300 group"
              asChild
            >
              <Link to="/programs">
                Browse Programs
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-white/30 text-white hover:bg-white/10 backdrop-blur-sm"
              asChild
            >
              <Link to="/events">View Events</Link>
            </Button>
          </motion.div>
        </div>

        {/* Decorative bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 0L60 10C120 20 240 40 360 46.7C480 53 600 47 720 43.3C840 40 960 40 1080 46.7C1200 53 1320 67 1380 73.3L1440 80V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Split Layout Section - Calendar & Cards */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4">
          <motion.div
            className="mb-12 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
              Explore & Plan
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              View upcoming events and discover what we offer to make your experience unforgettable
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 max-w-7xl mx-auto">
            {/* Left Side - Calendar */}
            <motion.div
              className="order-2 lg:order-1"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="mb-6">
                <h3 className="text-3xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-600">
                  Event Calendar
                </h3>
                <p className="text-muted-foreground">
                  Click on a date to see event details
                </p>
              </div>
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-200">
                <EventCalendar events={events} />
              </div>
            </motion.div>

            {/* Right Side - Feature Cards Stacked */}
            <div className="order-1 lg:order-2 space-y-6">
              <motion.div
                className="mb-6"
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h3 className="text-3xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
                  What We Offer
                </h3>
                <p className="text-muted-foreground">
                  Explore our programs, events, and facilities
                </p>
              </motion.div>

              {features.map((feature, index) => (
                <motion.div
                  key={feature.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="relative overflow-hidden hover:shadow-2xl transition-all duration-300 group border-2 hover:border-purple-200">
                    {feature.background}
                    <div className="relative p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-white/90 to-white/70 backdrop-blur shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <feature.Icon className="h-7 w-7 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold mb-2 group-hover:text-purple-600 transition-colors">
                            {feature.name}
                          </h3>
                          <p className="text-muted-foreground mb-4 leading-relaxed">
                            {feature.description}
                          </p>
                          <Button
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg group/btn"
                            asChild
                          >
                            <Link to={feature.href}>
                              {feature.cta}
                              <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                    {/* Shine effect on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/10 to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 text-white relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">By The Numbers</h2>
            <p className="text-xl text-white/90">Making an impact in our community</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { value: programs.length, label: 'Active Programs', delay: 0 },
              { value: events.length, label: 'Upcoming Events', delay: 0.1 },
              { value: '3', label: 'Facilities', delay: 0.2 },
            ].map((stat, index) => (
              <motion.div
                key={index}
                className="text-center p-8 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: stat.delay }}
              >
                <div className="text-6xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80">
                  {stat.value}+
                </div>
                <div className="text-xl font-medium text-white/90">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Office Hours */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
                Get In Touch
              </h2>
              <p className="text-lg text-muted-foreground">
                We're here to help you make the most of your Sterling Recreation experience
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <motion.div
                className="p-8 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl shadow-xl border-2 border-blue-100 hover:shadow-2xl transition-all duration-300 hover:scale-105"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-blue-600 rounded-xl">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-bold text-2xl text-blue-900">Office Hours</h4>
                </div>
                <p className="text-blue-800 text-xl font-semibold">Monday - Friday</p>
                <p className="text-blue-600 text-lg">9:00 AM - 5:00 PM</p>
              </motion.div>

              <motion.div
                className="p-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-xl border-2 border-purple-100 hover:shadow-2xl transition-all duration-300 hover:scale-105"
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-purple-600 rounded-xl">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-bold text-2xl text-purple-900">Contact Us</h4>
                </div>
                <p className="text-purple-800 font-medium">Phone: (555) 123-4567</p>
                <p className="text-purple-800 font-medium">Email: info@sterlingrec.org</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
