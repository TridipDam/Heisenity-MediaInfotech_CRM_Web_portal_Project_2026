import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const latitude = searchParams.get('latitude')
    const longitude = searchParams.get('longitude')

    if (!latitude || !longitude) {
      return NextResponse.json(
        { success: false, error: 'Latitude and longitude are required' },
        { status: 400 }
      )
    }

    // Call backend API
    const backendUrl = `${process.env.BACKEND_URL}/attendance/location?latitude=${latitude}&longitude=${longitude}`
    const response = await fetch(backendUrl)

    if (!response.ok) {
      throw new Error('Backend request failed')
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Location API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get location data' },
      { status: 500 }
    )
  }
}