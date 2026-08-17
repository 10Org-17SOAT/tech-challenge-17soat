import { PersonType } from '../value-objects/person-type.enum';

export interface CreateCustomerInput {
  personType: PersonType;
  document: string;
  name?: string;
  corporateName?: string;
  tradeName?: string;
  email: string;
  phone: {
    countryCode: string;
    areaCode?: string;
    number: string;
  };
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

export interface UpdateCustomerInput {
  name?: string;
  corporateName?: string;
  tradeName?: string;
  email?: string;
  phone?: {
    countryCode: string;
    areaCode?: string;
    number: string;
  };
  address?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

export interface CustomerResponseDTO {
  id: string;
  personType: PersonType;
  document: string;
  name: string | null;
  corporateName: string | null;
  tradeName: string | null;
  email: string;
  phone: {
    countryCode: string;
    areaCode: string | null;
    number: string;
  };
  address: {
    street: string;
    number: string;
    complement: string | null;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
