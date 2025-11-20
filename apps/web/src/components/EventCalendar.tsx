import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Event } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'

interface EventCalendarProps {
  events: Event[]
}

export function EventCalendar({ events }: EventCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const daysInMonth = lastDayOfMonth.getDate()
  const startingDayOfWeek = firstDayOfMonth.getDay()

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      if (!event.starts_at) return false
      const eventDate = new Date(event.starts_at)
      return eventDate.getDate() === date.getDate() &&
             eventDate.getMonth() === date.getMonth() &&
             eventDate.getFullYear() === date.getFullYear()
    })
  }

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(year, month, day)
    const dateEvents = getEventsForDate(clickedDate)
    if (dateEvents.length > 0) {
      setSelectedDate(clickedDate)
      setIsDialogOpen(true)
    }
  }

  const calendarDays = []

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="h-20 md:h-24" />)
  }

  // Add cells for each day of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const dayEvents = getEventsForDate(date)
    const hasEvents = dayEvents.length > 0
    const isToday = new Date().toDateString() === date.toDateString()

    calendarDays.push(
      <div
        key={day}
        onClick={() => handleDateClick(day)}
        className={`relative h-20 md:h-24 border border-border p-2 transition-colors ${
          hasEvents ? 'cursor-pointer hover:bg-accent' : ''
        } ${isToday ? 'bg-primary/5 border-primary' : ''}`}
      >
        <div className={`text-sm font-medium ${isToday ? 'text-primary' : 'text-foreground'}`}>
          {day}
        </div>
        {hasEvents && (
          <div className="mt-1 space-y-1">
            {dayEvents.slice(0, 2).map((event, idx) => (
              <div
                key={idx}
                className="text-xs truncate bg-primary/10 text-primary px-1 py-0.5 rounded"
              >
                {event.title}
              </div>
            ))}
            {dayEvents.length > 2 && (
              <div className="text-xs text-muted-foreground">
                +{dayEvents.length - 2} more
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : []

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">
            {monthNames[month]} {year}
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {dayNames.map(day => (
            <div
              key={day}
              className="text-center text-sm font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}
          {calendarDays}
        </div>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Events on {selectedDate?.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </DialogTitle>
            <DialogDescription>
              {selectedDateEvents.length} event{selectedDateEvents.length !== 1 ? 's' : ''} scheduled
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {selectedDateEvents.map(event => (
              <Card key={event.id} className="p-4">
                <h3 className="font-semibold text-lg">{event.title}</h3>
                {event.starts_at && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDateTime(event.starts_at)}
                  </p>
                )}
                {event.description && (
                  <p className="text-sm mt-2">{event.description}</p>
                )}
                {event.location && (
                  <p className="text-sm text-muted-foreground mt-2">
                    📍 {event.location}
                  </p>
                )}
                <Button className="w-full mt-3" asChild>
                  <a href={`/events/${event.slug}`}>View Details</a>
                </Button>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
