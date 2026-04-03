export interface Event {
  day: number;
  time: string;
  description: string;
}

export interface Sport {
  id: number;
  name: string;
  participants: number;
  events: Event[];
}

export interface VehicleAssignment {
  type: "BUS" | "VAN_1" | "VAN_2" | "VAN_3" | "VAN_SRU";
  seats: number;
  tripsUsed?: number;
}

export interface TransportGroup {
  day: number;
  departureTime: string;
  sports: Sport[];
  totalParticipants: number;
  assignedVehicles: VehicleAssignment[];
}
