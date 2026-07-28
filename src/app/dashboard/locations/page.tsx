import { getLocations } from "@/actions/locations"
import LocationManager from "./location-manager"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function LocationsPage() {
  const locations = await getLocations()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Attendance Locations</h2>
        <p className="text-muted-foreground">
          Manage physical locations where employees can mark attendance.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Locations</CardTitle>
          <CardDescription>
            A list of all approved work sites and branch offices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LocationManager initialLocations={locations} />
        </CardContent>
      </Card>
    </div>
  )
}
