import type {
  CreatedServiceOrderResponseDto,
  CreateServiceOrderDto,
} from './dtos/service-order.dtos';

// Swagger-only. Ids are illustrative; the `services` and `parts` entries must
// exist in the catalogue and in stock for the request to succeed.

const existingCustomerAndVehicle: CreateServiceOrderDto = {
  openedById: '3a6e9f2b-1c4d-4e5a-8f6b-2d9c0e1f3a5b',
  customer: { id: '8b0f5d6e-2a1c-4f3e-9d7b-1c2e3f4a5b6c' },
  vehicle: { id: '9f1d3c40-5f0e-4a1e-9a1b-6c2d7e8f0a11' },
  services: [
    { serviceId: 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f', quantity: 1 },
  ],
  parts: [{ supplyId: 'd4e5f6a7-b8c9-4d0e-8f1a-2b3c4d5e6f70', quantity: 4 }],
  notes: 'Cliente relata barulho na suspensão dianteira',
  vehicleMileageAtEntry: 45000,
};

const newCustomerAndVehicle: CreateServiceOrderDto = {
  openedById: '3a6e9f2b-1c4d-4e5a-8f6b-2d9c0e1f3a5b',
  customer: {
    userId: '5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b',
    personType: 'CPF',
    document: '52998224725',
    name: 'Ana Souza',
    email: 'ana.souza@example.com',
    phone: { countryCode: '55', areaCode: '11', number: '999998888' },
    address: {
      street: 'Rua das Flores',
      number: '100',
      neighborhood: 'Centro',
      city: 'Sao Paulo',
      state: 'SP',
      zipCode: '01001000',
    },
  },
  vehicle: {
    licensePlate: 'ABC1D23',
    model: 'Uno',
    year: 2018,
    manufacturer: 'Fiat',
    color: 'Prata',
    fuelType: 'GASOLINE',
    odometer: 45000,
  },
  services: [
    { serviceId: 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f', quantity: 1 },
  ],
  parts: [],
};

export const createServiceOrderExamples: Record<
  string,
  { summary: string; value: CreateServiceOrderDto }
> = {
  existing: {
    summary: 'Cliente e veículo já cadastrados',
    value: existingCustomerAndVehicle,
  },
  register: {
    summary: 'Cadastra cliente e veículo na abertura',
    value: newCustomerAndVehicle,
  },
};

export const createdServiceOrderExample: CreatedServiceOrderResponseDto = {
  id: '0e1f2a3b-4c5d-4e6f-8a7b-9c0d1e2f3a4b',
  customerId: '8b0f5d6e-2a1c-4f3e-9d7b-1c2e3f4a5b6c',
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
