import type { Specialty } from '../../domain/value-objects/specialty.enum';
import type { MechanicAvailability } from '../../domain/value-objects/mechanic-availability.enum';

export interface CreateMechanicInput {
  name: string;
  cpf: string;
  email: string;
  phone: {
    countryCode: string;
    areaCode?: string | null;
    number: string;
  };
  specialties: Specialty[];
  hireDate: Date;
}

export interface UpdateMechanicInput {
  id: string;
  data: {
    name?: string;
    email?: string;
    phone?: {
      countryCode: string;
      areaCode?: string | null;
      number: string;
    };
    specialties?: Specialty[];
    hireDate?: Date;
  };
}

export interface MechanicResponseDTO {
  id: string;
  name: string;
  cpf: string;
  email: string;
  phone: {
    countryCode: string;
    areaCode: string | null;
    number: string;
  };
  specialties: Specialty[];
  hireDate: Date;
  availability: MechanicAvailability;
  availableSince: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedMechanicsDTO {
  data: MechanicResponseDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}