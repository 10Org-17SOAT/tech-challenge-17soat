import type {
  CreatedServiceOrderResponseDto,
  CreateServiceOrderDto,
} from './dtos/service-order.dtos';

// Swagger-only. Ids are illustrative; the vehicle, consultant, services and
// parts must already exist for the request to succeed.

export const createServiceOrderExample: CreateServiceOrderDto = {
  vehicleId: '9f1d3c40-5f0e-4a1e-9a1b-6c2d7e8f0a11',
  openedById: '3a6e9f2b-1c4d-4e5a-8f6b-2d9c0e1f3a5b',
  services: [
    { serviceId: 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f', quantity: 1 },
  ],
  parts: [{ supplyId: 'd4e5f6a7-b8c9-4d0e-8f1a-2b3c4d5e6f70', quantity: 4 }],
  notes: 'Cliente relata barulho na suspensão dianteira',
  vehicleMileageAtEntry: 45000,
};

export const createdServiceOrderExample: CreatedServiceOrderResponseDto = {
  id: '0e1f2a3b-4c5d-4e6f-8a7b-9c0d1e2f3a4b',
  vehicleId: '9f1d3c40-5f0e-4a1e-9a1b-6c2d7e8f0a11',
  openedById: '3a6e9f2b-1c4d-4e5a-8f6b-2d9c0e1f3a5b',
  openedByName: 'Carlos Consultor',
  status: 'received',
  approvedByCustomer: false,
  notes: 'Cliente relata barulho na suspensão dianteira',
  vehicleMileageAtEntry: 45000,
  scheduledAt: null,
  startedAt: null,
  completedAt: null,
  deliveredAt: null,
  requestedServices: [
    { serviceId: 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f', quantity: 1 },
  ],
  requestedParts: [
    { supplyId: 'd4e5f6a7-b8c9-4d0e-8f1a-2b3c4d5e6f70', quantity: 4 },
  ],
  createdAt: '2026-10-24T13:00:00.000Z',
  updatedAt: '2026-10-24T13:00:00.000Z',
};
