import { EmployeeSelfAttendance } from "@/components/EmployeeSelfAttendance"
import { getDeviceInfo } from "@/lib/server-api"

export default async function Attendance() {
  let deviceInfo

  try {
    console.log('Fetching device info...')
    deviceInfo = await getDeviceInfo()
    console.log('Device info:', deviceInfo)
  } catch (error) {
    console.error('Error in Attendance page:', error)
  }

  return (
    <EmployeeSelfAttendance 
      deviceInfo={deviceInfo}
      locationInfo={null}
    />
  )
}