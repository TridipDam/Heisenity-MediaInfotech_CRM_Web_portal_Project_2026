import { prisma } from '@/lib/prisma';
import { getHumanReadableLocation, getCoordinatesFromMapMyIndia, calculateDistanceMeters } from '@/utils/geolocation';
import { getDeviceInfo } from '@/utils/deviceinfo';
// Environment-configurable defaults
const DEFAULT_ATTENDANCE_RADIUS_METERS = Number(process.env.DEFAULT_ATTENDANCE_RADIUS_METERS || 50);
const DEFAULT_FLEXIBLE_WINDOW_MINUTES = Number(process.env.DEFAULT_FLEXIBLE_WINDOW_MINUTES || 120);
const MAX_ATTEMPTS = 3;
// Helper functions to convert between AttemptCount enum and numbers
function attemptCountToNumber(attemptCount) {
    if (attemptCount === 'ZERO')
        return 0;
    if (attemptCount === 'ONE')
        return 1;
    if (attemptCount === 'TWO')
        return 2;
    if (attemptCount === 'THREE')
        return 3;
    return 0;
}
function numberToAttemptCount(num) {
    if (num <= 0)
        return 'ZERO';
    if (num === 1)
        return 'ONE';
    if (num === 2)
        return 'TWO';
    if (num >= 3)
        return 'THREE';
    return 'ZERO';
}
// Strictly consider 0,0 as placeholder / invalid
function hasValidCoordinates(coords) {
    if (!coords)
        return false;
    const lat = Number(coords.latitude);
    const lon = Number(coords.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lon))
        return false;
    // treat 0,0 as invalid placeholder
    return !(lat === 0 && lon === 0);
}
/* ... (validateLocationByGPS and validateLocationByArea unchanged) ... */
// Validate by GPS coordinates (Haversine)
async function validateLocationByGPS(userCoordinates, assignedCoordinates, allowedRadiusMeters) {
    try {
        if (!hasValidCoordinates(assignedCoordinates)) {
            return {
                isMatch: false,
                confidence: 'none',
                details: 'Assigned coordinates are not present or invalid',
                code: 'ASSIGNED_COORDS_MISSING'
            };
        }
        const distance = Math.round(calculateDistanceMeters(userCoordinates.latitude, userCoordinates.longitude, assignedCoordinates.latitude, assignedCoordinates.longitude));
        if (distance <= allowedRadiusMeters) {
            return {
                isMatch: true,
                confidence: 'exact',
                details: `Within ${allowedRadiusMeters}m (distance: ${distance}m)`,
                distance,
                radiusUsed: allowedRadiusMeters,
                assignedCoords: assignedCoordinates
            };
        }
        if (distance <= allowedRadiusMeters * 2) {
            return {
                isMatch: false,
                confidence: 'nearby',
                details: `Close but outside allowed radius (${distance}m away, allowed ${allowedRadiusMeters}m)`,
                distance,
                radiusUsed: allowedRadiusMeters,
                assignedCoords: assignedCoordinates,
                code: 'LOCATION_MISMATCH'
            };
        }
        return {
            isMatch: false,
            confidence: 'none',
            details: `Too far from assigned coordinates (${distance}m > ${allowedRadiusMeters}m)`,
            distance,
            radiusUsed: allowedRadiusMeters,
            assignedCoords: assignedCoordinates,
            code: 'LOCATION_MISMATCH'
        };
    }
    catch (err) {
        console.error({ event: 'validate_gps_error', error: err instanceof Error ? err.message : err });
        return { isMatch: false, confidence: 'none', details: 'Error validating GPS', code: 'LOCATION_SERVICE_ERROR' };
    }
}
// Area-based fallback: token matching (coarse)
async function validateLocationByArea(userCoordinates, assignedLocationText) {
    try {
        // Use reverse geocoding by calling getCoordinatesFromMapMyIndia with coordinate string
        const coordinatesString = `${userCoordinates.latitude},${userCoordinates.longitude}`;
        const userLocation = await getCoordinatesFromMapMyIndia(coordinatesString);
        if (!userLocation) {
            return { isMatch: false, confidence: 'none', details: 'Could not reverse geocode user coordinates', code: 'LOCATION_SERVICE_ERROR' };
        }
        // Extract address and city from the displayName or use empty strings
        const displayName = userLocation.displayName || '';
        const userAddress = displayName.toLowerCase();
        const userCity = displayName.toLowerCase(); // For now, use displayName for both
        const assignedNormalized = assignedLocationText.toLowerCase().trim();
        // Split assignedName into meaningful keywords
        const assignedKeywords = assignedNormalized
            .split(/[\s,.-]+/)
            .map(w => w.trim())
            .filter(w => w.length > 2);
        // If nothing meaningful, cannot validate
        if (assignedKeywords.length === 0) {
            return { isMatch: false, confidence: 'none', details: 'Assigned location too generic for area validation', code: 'ASSIGNED_LOCATION_GENERIC' };
        }
        // Check exact terms in user address first
        for (const kw of assignedKeywords) {
            if (userAddress.includes(kw)) {
                return { isMatch: true, confidence: 'exact', details: `Matched keyword "${kw}" in user address` };
            }
        }
        // City-level match is weaker
        for (const kw of assignedKeywords) {
            if (userCity.includes(kw)) {
                return { isMatch: false, confidence: 'city', details: `User is in ${userCity} but not in the assigned area ${assignedNormalized}`, code: 'CITY_LEVEL_MATCH' };
            }
        }
        return { isMatch: false, confidence: 'none', details: `No area-level match: user ${userAddress}, assigned ${assignedNormalized}`, code: 'LOCATION_MISMATCH' };
    }
    catch (err) {
        console.error({ event: 'validate_area_error', error: err instanceof Error ? err.message : err });
        return { isMatch: false, confidence: 'none', details: 'Error validating area', code: 'LOCATION_SERVICE_ERROR' };
    }
}
// Main validator used by controller/service. Returns rich metadata.
export async function validateEmployeeLocation(employeeId, coordinates) {
    // Normalize config
    const now = new Date();
    // Find employee
    const employee = await prisma.employee.findUnique({ where: { employeeId } });
    if (!employee) {
        return { isValid: false, details: 'Employee not found', code: 'EMPLOYEE_NOT_FOUND' };
    }

    // Role-based validation logic
    if (employee.role === 'IN_OFFICE') {
        // For in-office employees, no location validation required
        return {
            isValid: true,
            details: 'In-office employee - no location validation required',
            confidence: 'exact'
        };
    }

    // For field engineers, continue with location validation
    if (employee.role === 'FIELD_ENGINEER') {
        // Find today's assignment
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dailyLocation = await prisma.dailyLocation.findUnique({
            where: { employeeId_date: { employeeId: employee.id, date: today } }
        });
        if (!dailyLocation) {
            return { isValid: false, details: 'No assigned location for today', code: 'NO_ASSIGNMENT' };
        }
        // time windows
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const startMinutes = dailyLocation.startTime.getHours() * 60 + dailyLocation.startTime.getMinutes();
        const endMinutes = dailyLocation.endTime.getHours() * 60 + dailyLocation.endTime.getMinutes();
        // Determine assignment type
        const assignedLat = Number(dailyLocation.latitude);
        const assignedLon = Number(dailyLocation.longitude);
        const assignedHasCoords = hasValidCoordinates({ latitude: assignedLat, longitude: assignedLon });
        const assignedAreaText = (dailyLocation.address || dailyLocation.city || '').toString().trim();
        
        // Check if this is a task-based assignment (created by task service)
        const isTaskBased = dailyLocation.state === "Task Location";
        
        // NO TIME RESTRICTIONS for task-based assignments - employees can check in anytime
        if (isTaskBased) {
            // Skip time validation entirely for task-based assignments
            console.log(`Skipping time validation for task-based assignment for employee ${employeeId}`);
        } else {
            // Apply time restrictions only for non-task assignments
            // Strict time enforcement for GPS-based assignments
            if (assignedHasCoords) {
                if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
                    return {
                        isValid: false,
                        details: `Attendance only allowed between ${dailyLocation.startTime.toLocaleTimeString()} and ${dailyLocation.endTime.toLocaleTimeString()}`,
                        code: 'TIME_WINDOW_VIOLATION',
                        allowedLocation: dailyLocation
                    };
                }
            }
            else {
                // flexible window for area-based assignments
                const flex = DEFAULT_FLEXIBLE_WINDOW_MINUTES;
                const flexStart = startMinutes - flex;
                const flexEnd = Math.max(endMinutes, startMinutes) + flex;
                if (currentMinutes < flexStart || currentMinutes > flexEnd) {
                    const s = new Date();
                    s.setHours(Math.floor(flexStart / 60), flexStart % 60, 0, 0);
                    const e = new Date();
                    e.setHours(Math.floor(flexEnd / 60), flexEnd % 60, 0, 0);
                    return {
                        isValid: false,
                        details: `Attendance allowed between ${s.toLocaleTimeString()} and ${e.toLocaleTimeString()} (flexible window)`,
                        code: 'TIME_WINDOW_VIOLATION',
                        allowedLocation: dailyLocation
                    };
                }
            }
        }
        // If assigned coordinates exist, prefer them (authoritative)
        if (assignedHasCoords) {
            const assignedCoords = { latitude: assignedLat, longitude: assignedLon };
            const radiusToUse = Number(dailyLocation.radius ?? DEFAULT_ATTENDANCE_RADIUS_METERS);
            const gpsResult = await validateLocationByGPS(coordinates, assignedCoords, radiusToUse);
            console.info({
                event: 'validate_gps_attempt',
                employeeId,
                assignedCoords,
                userCoords: coordinates,
                gpsResult
            });
            if (gpsResult.isMatch) {
                return {
                    isValid: true,
                    details: gpsResult.details,
                    distance: gpsResult.distance,
                    radiusUsed: gpsResult.radiusUsed,
                    assignedCoords,
                    confidence: gpsResult.confidence
                };
            }
            // GPS failed: do NOT mark present. Return detailed info to caller
            return {
                isValid: false,
                details: gpsResult.details,
                code: gpsResult.code || 'LOCATION_MISMATCH',
                distance: gpsResult.distance,
                radiusUsed: gpsResult.radiusUsed,
                assignedCoords,
                confidence: gpsResult.confidence,
                allowedLocation: dailyLocation
            };
        }
        // Assigned has no coordinates -> DO NOT perform forward geocoding at attendance-time.
        // Reject validation and instruct admin to set precise coordinates.
        if (assignedAreaText) {
            return {
                isValid: false,
                details: 'Assigned location does not have authoritative coordinates. Please ask your administrator to set latitude and longitude for the assigned location so attendance validation can use precise coordinates.',
                code: 'ASSIGNED_COORDS_MISSING',
                allowedLocation: dailyLocation
            };
        }
        // No coords + no area -> task-based (no location enforcement). If admin marked task-based, allow.
        return {
            isValid: true,
            details: 'Task-based assignment (no GPS required)',
            assignedCoords: null,
            confidence: 'exact',
            allowedLocation: dailyLocation
        };
    }

    // Default fallback for unknown roles
    return { isValid: false, details: 'Unknown employee role', code: 'UNKNOWN_ROLE' };
}
// Create attendance record with atomic attempt increments and strict rules
export async function createAttendanceRecord(data) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const employee = await prisma.employee.findUnique({ where: { employeeId: data.employeeId } });
    if (!employee)
        throw new Error('EMPLOYEE_NOT_FOUND');

    // Role-based logic for attendance creation
    if (employee.role === 'IN_OFFICE') {
        // For in-office employees, create attendance without location validation
        const deviceInfo = getDeviceInfo(data.userAgent);
        const deviceString = `${deviceInfo.os} - ${deviceInfo.browser} - ${deviceInfo.device}`;
        
        if (existing && existing.locked)
            throw new Error('ATTENDANCE_LOCKED');

        const updateData = {
            latitude: null, // In-office employees don't need coordinates
            longitude: null,
            location: data.locationText || 'Office Location',
            ipAddress: data.ipAddress,
            deviceInfo: deviceString,
            photo: data.photo ?? existing?.photo,
            status: data.status,
            source: 'SELF',
            updatedAt: new Date(),
            attemptCount: 'ZERO'
        };

        // Handle check-in/check-out for in-office employees
        if (data.action === 'check-in') {
            updateData.clockIn = new Date();
        } else if (data.action === 'check-out') {
            updateData.clockOut = new Date();
        } else {
            if (!existing?.clockIn && (data.status === 'PRESENT' || data.status === 'LATE')) {
                updateData.clockIn = new Date();
            }
        }

        const saved = existing
            ? await prisma.attendance.update({
                where: { id: existing.id },
                data: {
                    ...updateData,
                    clockIn: updateData.clockIn !== undefined ? updateData.clockIn : existing.clockIn,
                    clockOut: updateData.clockOut !== undefined ? updateData.clockOut : existing.clockOut
                }
            })
            : await prisma.attendance.create({
                data: {
                    employeeId: employee.id,
                    date: today,
                    clockIn: updateData.clockIn || (data.status === 'PRESENT' || data.status === 'LATE' ? new Date() : null),
                    clockOut: updateData.clockOut || null,
                    latitude: null,
                    longitude: null,
                    location: updateData.location,
                    ipAddress: data.ipAddress,
                    deviceInfo: deviceString,
                    photo: data.photo,
                    status: data.status,
                    source: 'SELF',
                    lockedReason: '',
                    locked: false,
                    attemptCount: 'ZERO'
                }
            });

        return {
            employeeId: data.employeeId,
            timestamp: saved.createdAt.toISOString(),
            location: saved.location || 'Office Location',
            ipAddress: saved.ipAddress || data.ipAddress || '',
            deviceInfo: saved.deviceInfo || deviceString || '',
            photo: saved.photo || data.photo || undefined,
            status: saved.status
        };
    }
    // For field engineers, continue with existing validation logic
    if (employee.role === 'FIELD_ENGINEER') {
        // read existing attendance if any
        const existing = await prisma.attendance.findUnique({
            where: { employeeId_date: { employeeId: employee.id, date: today } }
        });
    
        // If coordinates provided, ensure they are in valid range and not 0,0 (which is placeholder)
        if (data.coordinates) {
            const lat = Number(data.coordinates.latitude);
            const lon = Number(data.coordinates.longitude);
            if (Number.isNaN(lat) || Number.isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
                throw new Error('INVALID_COORDINATES');
            }
            if (lat === 0 && lon === 0 && !data.bypassLocationValidation && !data.locationText) {
                // never accept 0,0 as a valid coordinate for non-admin flows
                throw new Error('INVALID_COORDINATES');
            }
        }
    // Admin entry path (no coordinates accepted) — require locationText
    if ((!data.coordinates || (data.coordinates.latitude === 0 && data.coordinates.longitude === 0)) && data.locationText) {
        const deviceInfo = getDeviceInfo(data.userAgent);
        const deviceString = `${deviceInfo.os} - ${deviceInfo.browser} - ${deviceInfo.device}`;
        // Upsert admin-provided attendance immediately (admin trusting)
        if (existing && existing.locked)
            throw new Error('ATTENDANCE_LOCKED');
        const updateData = {
            location: data.locationText,
            ipAddress: data.ipAddress,
            deviceInfo: deviceString,
            photo: data.photo ?? existing?.photo,
            status: data.status,
            source: 'ADMIN', // Mark as admin-created
            updatedAt: new Date()
        };
        // Handle check-in/check-out for admin entries
        if (data.action === 'check-in') {
            updateData.clockIn = new Date();
        }
        else if (data.action === 'check-out') {
            updateData.clockOut = new Date();
        }
        else {
            // Default behavior - set clockIn if not exists and status is PRESENT/LATE
            if (!existing?.clockIn && (data.status === 'PRESENT' || data.status === 'LATE')) {
                updateData.clockIn = new Date();
            }
        }
        const saved = existing
            ? await prisma.attendance.update({
                where: { id: existing.id },
                data: {
                    ...updateData,
                    // Preserve existing clockIn/clockOut when updating unless explicitly setting them
                    clockIn: updateData.clockIn !== undefined ? updateData.clockIn : existing.clockIn,
                    clockOut: updateData.clockOut !== undefined ? updateData.clockOut : existing.clockOut
                }
            })
            : await prisma.attendance.create({
                data: {
                    employeeId: employee.id,
                    date: today,
                    clockIn: updateData.clockIn || (data.status === 'PRESENT' || data.status === 'LATE' ? new Date() : null),
                    clockOut: updateData.clockOut || null,
                    latitude: null,
                    longitude: null,
                    location: data.locationText,
                    ipAddress: data.ipAddress,
                    deviceInfo: deviceString,
                    photo: data.photo,
                    status: data.status,
                    source: 'ADMIN', // Mark as admin-created
                    lockedReason: '',
                    locked: false,
                    attemptCount: 'ZERO'
                }
            });
        return {
            employeeId: data.employeeId,
            timestamp: saved.createdAt.toISOString(),
            location: saved.location || data.locationText || '',
            ipAddress: saved.ipAddress || data.ipAddress || '',
            deviceInfo: saved.deviceInfo || deviceString || '',
            photo: saved.photo || data.photo || undefined,
            status: saved.status
        };
    }
    // Normal path: coordinates must be present (unless bypass)
    if (!data.coordinates && !data.bypassLocationValidation) {
        throw new Error('MISSING_COORDINATES');
    }
    // If bypass requested, create or update without validation
    if (data.bypassLocationValidation) {
        const human = data.coordinates ? await getHumanReadableLocation(data.coordinates) : data.locationText ?? 'Bypass';
        const deviceInfo = getDeviceInfo(data.userAgent);
        const deviceString = `${deviceInfo.os} - ${deviceInfo.browser} - ${deviceInfo.device}`;
        if (existing && existing.locked)
            throw new Error('ATTENDANCE_LOCKED');
        const updateData = {
            latitude: data.coordinates ? data.coordinates.latitude : existing?.latitude,
            longitude: data.coordinates ? data.coordinates.longitude : existing?.longitude,
            location: human,
            ipAddress: data.ipAddress,
            deviceInfo: deviceString,
            photo: data.photo ?? existing?.photo,
            status: data.status,
            source: 'ADMIN', // Mark as admin bypass
            updatedAt: new Date()
        };
        // Handle check-in/check-out for bypass entries
        if (data.action === 'check-in') {
            updateData.clockIn = new Date();
        }
        else if (data.action === 'check-out') {
            updateData.clockOut = new Date();
        }
        else {
            // Default behavior - set clockIn if not exists and status is PRESENT/LATE
            if (!existing?.clockIn && (data.status === 'PRESENT' || data.status === 'LATE')) {
                updateData.clockIn = new Date();
            }
        }
        const saved = existing
            ? await prisma.attendance.update({
                where: { id: existing.id },
                data: {
                    ...updateData,
                    // Preserve existing clockIn/clockOut when updating unless explicitly setting them
                    clockIn: updateData.clockIn !== undefined ? updateData.clockIn : existing.clockIn,
                    clockOut: updateData.clockOut !== undefined ? updateData.clockOut : existing.clockOut
                }
            })
            : await prisma.attendance.create({
                data: {
                    employeeId: employee.id,
                    date: today,
                    clockIn: updateData.clockIn || (data.status === 'PRESENT' || data.status === 'LATE' ? new Date() : null),
                    clockOut: updateData.clockOut || null,
                    latitude: data.coordinates ? data.coordinates.latitude : null,
                    longitude: data.coordinates ? data.coordinates.longitude : null,
                    location: human,
                    ipAddress: data.ipAddress,
                    deviceInfo: deviceString,
                    photo: data.photo,
                    status: data.status,
                    source: 'ADMIN', // Mark as admin bypass
                    lockedReason: '',
                    locked: false,
                    attemptCount: 'ZERO'
                }
            });
        return {
            employeeId: data.employeeId,
            timestamp: saved.createdAt.toISOString(),
            location: saved.location || human || '',
            ipAddress: saved.ipAddress || data.ipAddress || '',
            deviceInfo: saved.deviceInfo || deviceString || '',
            photo: saved.photo || data.photo || undefined,
            status: saved.status
        };
    }
    // Real validation: validate coordinates
    const validation = await validateEmployeeLocation(data.employeeId, data.coordinates);
    if (!validation.isValid) {
        // Atomic increment of attemptCount using transaction
        const txResult = await prisma.$transaction(async (tx) => {
            // re-fetch inside tx to avoid race
            const att = await tx.attendance.findUnique({
                where: { employeeId_date: { employeeId: employee.id, date: today } }
            });
            const prevAttempts = att ? attemptCountToNumber(att.attemptCount) : 0;
            const nextAttempts = Math.min(MAX_ATTEMPTS, prevAttempts + 1);
            // If reached max attempts -> mark ABSENT and lock
            if (nextAttempts >= MAX_ATTEMPTS) {
                const up = att
                    ? await tx.attendance.update({
                        where: { id: att.id },
                        data: {
                            status: 'ABSENT',
                            attemptCount: numberToAttemptCount(nextAttempts),
                            latitude: data.coordinates?.latitude ?? att.latitude,
                            longitude: data.coordinates?.longitude ?? att.longitude,
                            location: validation.details || att.location,
                            ipAddress: data.ipAddress,
                            deviceInfo: `${getDeviceInfo(data.userAgent).os} - ${getDeviceInfo(data.userAgent).browser} - ${getDeviceInfo(data.userAgent).device}`,
                            lockedReason: 'Maximum location validation attempts exceeded',
                            locked: true,
                            updatedAt: new Date()
                        }
                    })
                    : await tx.attendance.create({
                        data: {
                            employeeId: employee.id,
                            date: today,
                            status: 'ABSENT',
                            attemptCount: numberToAttemptCount(nextAttempts),
                            latitude: data.coordinates?.latitude ?? null,
                            longitude: data.coordinates?.longitude ?? null,
                            location: validation.details,
                            ipAddress: data.ipAddress,
                            deviceInfo: `${getDeviceInfo(data.userAgent).os} - ${getDeviceInfo(data.userAgent).browser} - ${getDeviceInfo(data.userAgent).device}`,
                            lockedReason: 'Maximum location validation attempts exceeded',
                            locked: true
                        }
                    });
                return { action: 'locked', record: up, attempts: nextAttempts };
            }
            // Otherwise upsert with PRESENT status (not PENDING as it's not in enum)
            const up = att
                ? await tx.attendance.update({
                    where: { id: att.id },
                    data: {
                        attemptCount: numberToAttemptCount(nextAttempts),
                        updatedAt: new Date()
                    }
                })
                : await tx.attendance.create({
                    data: {
                        employeeId: employee.id,
                        date: today,
                        status: 'PRESENT', // Use PRESENT instead of PENDING
                        attemptCount: numberToAttemptCount(nextAttempts),
                        latitude: data.coordinates?.latitude ?? null,
                        longitude: data.coordinates?.longitude ?? null,
                        location: validation.details || '',
                        ipAddress: data.ipAddress,
                        deviceInfo: `${getDeviceInfo(data.userAgent).os} - ${getDeviceInfo(data.userAgent).browser} - ${getDeviceInfo(data.userAgent).device}`
                    }
                });
            return { action: 'attempt_incremented', record: up, attempts: nextAttempts };
        });
        // Return informative error (do not create attendance as PRESENT)
        if (txResult.action === 'locked') {
            console.warn({ event: 'max_attempts_exceeded', employeeId: data.employeeId, attempts: txResult.attempts });
            const e = new Error(`Maximum attempts exceeded. Marked ABSENT. ${validation.details}`);
            e.code = 'MAX_ATTEMPTS_EXCEEDED';
            throw e;
        }
        // else inform user of failed validation and attempts left
        const attemptsLeft = Math.max(0, MAX_ATTEMPTS - txResult.attempts);
        const err = new Error(`${validation.details} Attempt ${txResult.attempts}/${MAX_ATTEMPTS}. ${attemptsLeft} attempt(s) remaining.`);
        err.code = validation.code || 'LOCATION_MISMATCH';
        throw err;
    }
    // If validation is ok -> persist as PRESENT (or given status)
    const humanReadable = await getHumanReadableLocation(data.coordinates);
    const deviceInfo = getDeviceInfo(data.userAgent);
    const deviceString = `${deviceInfo.os} - ${deviceInfo.browser} - ${deviceInfo.device}`;
    if (existing && existing.locked) {
        throw new Error('ATTENDANCE_LOCKED');
    }
    // Prepare update data based on action
    const updateData = {
        latitude: data.coordinates?.latitude ?? existing?.latitude,
        longitude: data.coordinates?.longitude ?? existing?.longitude,
        location: humanReadable,
        ipAddress: data.ipAddress,
        deviceInfo: deviceString,
        photo: data.photo ?? existing?.photo,
        status: data.status,
        source: 'SELF', // Mark as employee self-attendance
        updatedAt: new Date(),
        attemptCount: 'ZERO' // reset attempts on success
    };
    // Handle check-in/check-out logic
    // - check-in: Sets clockIn to current time
    // - check-out: Sets clockOut to current time (preserves existing clockIn)
    // - no action: Sets clockIn if not exists and status is PRESENT/LATE (backward compatibility)
    if (data.action === 'check-in') {
        updateData.clockIn = new Date();
        // Don't modify clockOut on check-in
        // If existing record is ADMIN-created, allow employee to override with their own check-in
        if (existing && existing.source === 'ADMIN') {
            updateData.clockOut = null; // Reset clockOut for fresh employee check-in
        }
    }
    else if (data.action === 'check-out') {
        updateData.clockOut = new Date();
        // Preserve existing clockIn - don't overwrite it
        // Only allow check-out if employee has checked in themselves
        if (existing && existing.source === 'ADMIN' && !existing.clockIn) {
            throw new Error('CANNOT_CHECKOUT_WITHOUT_CHECKIN');
        }
    }
    else {
        // Default behavior - set clockIn if not exists and status is PRESENT/LATE
        if (!existing?.clockIn && (data.status === 'PRESENT' || data.status === 'LATE')) {
            updateData.clockIn = new Date();
        }
    }
    const saved = existing
        ? await prisma.attendance.update({
            where: { id: existing.id },
            data: {
                ...updateData,
                // Preserve existing clockIn when updating unless explicitly setting it
                clockIn: updateData.clockIn !== undefined ? updateData.clockIn : existing.clockIn,
                clockOut: updateData.clockOut !== undefined ? updateData.clockOut : existing.clockOut
            }
        })
        : await prisma.attendance.create({
            data: {
                employeeId: employee.id,
                date: today,
                clockIn: updateData.clockIn || (data.status === 'PRESENT' || data.status === 'LATE' ? new Date() : null),
                clockOut: updateData.clockOut || null,
                latitude: data.coordinates?.latitude ?? null,
                longitude: data.coordinates?.longitude ?? null,
                location: humanReadable,
                ipAddress: data.ipAddress,
                deviceInfo: deviceString,
                photo: data.photo,
                status: data.status,
                source: 'SELF', // Mark as employee self-attendance
                lockedReason: '',
                locked: false,
                attemptCount: 'ZERO'
            }
        });
    
    // Auto-unassign vehicle on checkout
    if (data.action === 'check-out') {
        try {
            const { VehicleService } = await import('../vehicles/vehicle.service.js');
            const { NotificationService } = await import('../../notifications/notification.service.ts');
            
            const vehicleService = new VehicleService();
            const notificationService = new NotificationService();
            
            // Get employee's assigned vehicle
            const vehicleResult = await vehicleService.getEmployeeVehicle(data.employeeId);
            
            if (vehicleResult.success && vehicleResult.data) {
                const vehicle = vehicleResult.data;
                
                // Unassign the vehicle
                const unassignResult = await vehicleService.unassignVehicle(vehicle.id);
                
                if (unassignResult.success) {
                    // Create admin notification
                    await notificationService.createAdminNotification({
                        type: 'VEHICLE_UNASSIGNED',
                        title: 'Vehicle Auto-Unassigned',
                        message: `Vehicle ${vehicle.vehicleNumber} (${vehicle.make} ${vehicle.model}) has been automatically unassigned from ${employee.name} (${data.employeeId}) after checkout.`,
                        data: {
                            vehicleId: vehicle.id,
                            vehicleNumber: vehicle.vehicleNumber,
                            employeeId: data.employeeId,
                            employeeName: employee.name,
                            checkoutTime: saved.clockOut?.toISOString(),
                            location: saved.location
                        }
                    });
                    
                    console.log(`Vehicle ${vehicle.vehicleNumber} auto-unassigned from employee ${data.employeeId} after checkout`);
                }
            }
        } catch (error) {
            console.error('Error auto-unassigning vehicle on checkout:', error);
            // Don't fail the checkout if vehicle unassignment fails
        }
    }
    
    return {
        employeeId: data.employeeId,
        timestamp: saved.createdAt.toISOString(),
        location: saved.location || humanReadable || '',
        ipAddress: saved.ipAddress || data.ipAddress || '',
        deviceInfo: saved.deviceInfo || deviceString || '',
        photo: saved.photo || data.photo || undefined,
        status: saved.status
    };
    }

    // Default fallback for unknown roles
    throw new Error('UNKNOWN_EMPLOYEE_ROLE');
}
// Get remaining attempts (updated to numeric)
export async function getRemainingAttempts(employeeId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const employee = await prisma.employee.findUnique({ where: { employeeId } });
    if (!employee)
        throw new Error('EMPLOYEE_NOT_FOUND');

    // For in-office employees, no attempt limits
    if (employee.role === 'IN_OFFICE') {
        return { remainingAttempts: MAX_ATTEMPTS, isLocked: false };
    }

    // For field engineers, check attempt limits
    if (employee.role === 'FIELD_ENGINEER') {
        const attendance = await prisma.attendance.findUnique({
            where: { employeeId_date: { employeeId: employee.id, date: today } }
        });
        if (!attendance) {
            return { remainingAttempts: MAX_ATTEMPTS, isLocked: false };
        }
        if (attendance.locked) {
            return { remainingAttempts: 0, isLocked: true, status: attendance.status };
        }
        const used = attemptCountToNumber(attendance.attemptCount);
        return { remainingAttempts: Math.max(0, MAX_ATTEMPTS - used), isLocked: false, status: attendance.status };
    }

    // Default for unknown roles
    return { remainingAttempts: 0, isLocked: true };
}
// Get today's assigned location (updated for role-based logic)
export async function getTodayAssignedLocation(employeeId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const employee = await prisma.employee.findUnique({ where: { employeeId } });
    if (!employee)
        throw new Error('EMPLOYEE_NOT_FOUND');

    // For in-office employees, no assigned location needed
    if (employee.role === 'IN_OFFICE') {
        return null;
    }

    // For field engineers, return assigned location
    if (employee.role === 'FIELD_ENGINEER') {
        return await prisma.dailyLocation.findUnique({
            where: { employeeId_date: { employeeId: employee.id, date: today } }
        });
    }

    return null;
}
// Expose helper for tests if needed
export const __test_helpers = {
    calculateDistanceMeters
};
const STANDARD_WORK_MINUTES = 8 * 60;
export function calculateWorkAndOvertimeFromAttendance(clockIn, clockOut) {
    if (!clockIn || !clockOut)
        return null;
    const diffMs = clockOut.getTime() - clockIn.getTime();
    if (diffMs <= 0)
        return null;
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const workedMinutes = Math.min(totalMinutes, STANDARD_WORK_MINUTES);
    const overtimeMinutes = Math.max(totalMinutes - STANDARD_WORK_MINUTES, 0);
    return {
        workedMinutes,
        overtimeMinutes
    };
}
export function formatMinutes(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
}
