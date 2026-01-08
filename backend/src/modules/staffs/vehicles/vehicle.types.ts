export interface Vehicle {
  id: string
  vehicleNumber: string
  make: string
  model: string
  year?: number
  type: VehicleType
  status: VehicleStatus
  assignedTo?: string
  assignedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface PetrolBill {
  id: string
  vehicleId: string
  employeeId: string
  amount: number
  date: Date
  imageUrl?: string
  description?: string
  status: BillStatus
  approvedBy?: string
  approvedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export enum VehicleType {
  CAR = 'CAR',
  BIKE = 'BIKE',
  TRUCK = 'TRUCK',
  VAN = 'VAN'
}

export enum VehicleStatus {
  AVAILABLE = 'AVAILABLE',
  ASSIGNED = 'ASSIGNED',
  MAINTENANCE = 'MAINTENANCE',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE'
}

export enum BillStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface CreateVehicleRequest {
  vehicleNumber: string
  make: string
  model: string
  year?: number
  type: VehicleType
}

export interface AssignVehicleRequest {
  vehicleId: string
  employeeId: string
}

export interface CreatePetrolBillRequest {
  vehicleId: string
  amount: number
  date: string
  imageUrl?: string
  description?: string
}

export interface ApprovePetrolBillRequest {
  billId: string
  status: 'APPROVED' | 'REJECTED'
  adminId: string
}