import { getEvents } from "@/actions/events"
import { getLocations } from "@/actions/locations"
import EventManager from "./event-manager"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function EventsPage() {
  const events = await getEvents()
  const locations = await getLocations()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Attendance Events</h2>
        <p className="text-muted-foreground">
          Create and manage attendance sessions (Check-In / Check-Out).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
          <CardDescription>
            Active and past attendance events created by supervisors.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EventManager initialEvents={events} locations={locations} />
        </CardContent>
      </Card>
    </div>
  )
}
