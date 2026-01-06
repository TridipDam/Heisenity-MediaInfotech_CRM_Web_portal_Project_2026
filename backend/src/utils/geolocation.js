export async function getLocationFromCoordinates(coordinates) {
    try {
        const { latitude, longitude } = coordinates;
        // Use a free reverse geocoding service (OpenStreetMap Nominatim)
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`, {
            headers: {
                'User-Agent': 'AttendanceApp/1.0'
            }
        });
        if (!response.ok) {
            throw new Error('Failed to reverse geocode coordinates');
        }
        const data = await response.json();
        if (!data || !data.address) {
            return null;
        }
        const address = data.address;
        return {
            address: data.display_name || 'Unknown Address',
            city: address.city || address.town || address.village || address.municipality || 'Unknown City',
            state: address.state || address.province || address.region || 'Unknown State'
        };
    }
    catch (error) {
        console.error('Geolocation error:', error);
        return null;
    }
}
export async function getHumanReadableLocation(coordinates) {
    try {
        const location = await getLocationFromCoordinates(coordinates);
        if (!location) {
            return `Coordinates: ${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
        }
        // Format: Address, City, State
        const parts = [location.address, location.city, location.state].filter((part) => part && part.trim());
        return parts.join(', ');
    }
    catch (error) {
        console.error('Error getting human-readable location:', error);
        return `Coordinates: ${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
    }
}
// Helper function to format coordinates as a simple string
export function formatCoordinates(coordinates) {
    return `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
}
