// lib/server-api.ts
import { headers } from 'next/headers'

export type DeviceInfo = {
  os: string
  browser: string
  device: string
}

export type LocationData = {
  address: string
  city: string
  state: string
}

export type LocationInfo = {
  success: boolean
  coordinates: {
    latitude: number
    longitude: number
  }
  location: LocationData
  humanReadableLocation: string
  timestamp: string
}

export async function getDeviceInfo(): Promise<DeviceInfo> {
    const ua = (await headers()).get('user-agent') ?? ''

    const res = await fetch(`${process.env.BACKEND_URL}/attendance/device`, {
        headers: { 'user-agent': ua },
        cache: 'no-store'
    })

    if (!res.ok) {
        throw new Error('Failed to fetch device info')
    }

    const { device } = await res.json()
    return device
}

export async function getLocationInfo(latitude: number, longitude: number): Promise<LocationInfo> {
    try {
        console.log('Making request to:', `${process.env.BACKEND_URL}/attendance/location?latitude=${latitude}&longitude=${longitude}`)
        
        const res = await fetch(
            `${process.env.BACKEND_URL}/attendance/location?latitude=${latitude}&longitude=${longitude}`,
            {
                cache: 'no-store'
            }
        )

        console.log('Response status:', res.status)
        console.log('Response ok:', res.ok)

        if (!res.ok) {
            const errorText = await res.text()
            console.error('Response error:', errorText)
            throw new Error(`Failed to fetch location info: ${res.status} ${errorText}`)
        }

        const locationInfo = await res.json()
        console.log('Location info response:', locationInfo)
        return locationInfo
    } catch (error) {
        console.error('getLocationInfo error:', error)
        throw error
    }
}
