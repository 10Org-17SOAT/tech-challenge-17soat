import { AddressProps } from '../../domain/value-objects/address.value-object';
import { PersonType } from '../../domain/value-objects/person-type.enum';
import { PhoneProps } from '../../domain/value-objects/phone.value-object';

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
  phone: PhoneProps;
  address: AddressProps;
  createdAt: Date;
  updatedAt: Date;
}
