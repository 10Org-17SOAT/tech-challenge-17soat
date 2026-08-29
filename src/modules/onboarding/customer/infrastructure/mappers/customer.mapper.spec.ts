import { Customer } from '@/modules/onboarding/customer/domain/customer.entity';
import { PersonType } from '@/modules/onboarding/customer/domain/value-objects/person-type.enum';
import { Document } from '@/modules/onboarding/customer/domain/value-objects/document.value-object';
import { Email } from '@/modules/onboarding/customer/domain/value-objects/email.value-object';
import { Phone } from '@/modules/onboarding/customer/domain/value-objects/phone.value-object';
import { Address } from '@/modules/onboarding/customer/domain/value-objects/address.value-object';
import {
  CustomerMapper,
  type CustomerRow,
} from '@/modules/onboarding/customer/infrastructure/mappers/customer.mapper';

const makePfCustomer = (): Customer =>
  Customer.create({
    personType: PersonType.CPF,
    document: new Document('11144477735'),
    name: 'John Doe',
    email: new Email('john.doe@example.com'),
    phone: new Phone({
      countryCode: '55',
      areaCode: '11',
      number: '912345678',
    }),
    address: new Address({
      street: 'Avenida Paulista',
      number: '1000',
      neighborhood: 'Bela Vista',
      city: 'Sao Paulo',
      state: 'SP',
      zipCode: '01310100',
    }),
  });

describe('CustomerMapper', () => {
  it('maps an entity to a complete persistence row', () => {
    const customer = makePfCustomer();

    const row = CustomerMapper.toPersistence(customer);

    expect(row.id).toBe(customer.getId());
    expect(row.personType).toBe(PersonType.CPF);
    expect(row.document).toBe('11144477735');
    expect(row.name).toBe('John Doe');
    expect(row.corporateName).toBeNull();
    expect(row.tradeName).toBeNull();
    expect(row.email).toBe('john.doe@example.com');
    expect(row.phone).toEqual({
      countryCode: '55',
      areaCode: '11',
      number: '912345678',
    });
    expect(row.address).toEqual(
      expect.objectContaining({
        street: 'Avenida Paulista',
        number: '1000',
        city: 'Sao Paulo',
        state: 'SP',
        zipCode: '01310100',
      }),
    );
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(row.updatedAt).toBeInstanceOf(Date);
    expect(row.deletedAt).toBeNull();
  });

  it('restores a PJ entity from a persistence row', () => {
    const now = new Date();
    const row: CustomerRow = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      personType: PersonType.CNPJ,
      document: '11444777000161',
      name: null,
      corporateName: 'Acme LTDA',
      tradeName: 'Acme',
      email: 'contato@acme.com.br',
      phone: { countryCode: '55', areaCode: '11', number: '33334444' },
      address: {
        street: 'Rua da Consolacao',
        number: '200',
        complement: null,
        neighborhood: 'Centro',
        city: 'Sao Paulo',
        state: 'SP',
        zipCode: '01302000',
      },
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const customer = CustomerMapper.toDomain(row);

    expect(customer.getId()).toBe(row.id);
    expect(customer.getPersonType()).toBe(PersonType.CNPJ);
    expect(customer.getDocument().getValue()).toBe('11444777000161');
    expect(customer.getDocument().getType()).toBe(PersonType.CNPJ);
    expect(customer.getName()).toBeNull();
    expect(customer.getCorporateName()).toBe('Acme LTDA');
    expect(customer.getEmail().getValue()).toBe('contato@acme.com.br');
    expect(customer.getPhone().getAreaCode()).toBe('11');
    expect(customer.getAddress().getZipCode()).toBe('01302000');
    expect(customer.getCreatedAt()).toBe(now);
    expect(customer.getDeletedAt()).toBeNull();
  });

  it('round-trips entity -> row -> entity preserving identity and data', () => {
    const original = makePfCustomer();

    const restored = CustomerMapper.toDomain(
      CustomerMapper.toPersistence(original),
    );

    expect(restored.equals(original)).toBe(true);
    expect(restored.toPrimitives()).toEqual(original.toPrimitives());
  });

  it('preserves soft delete through the round trip', () => {
    const customer = makePfCustomer();
    customer.softDelete();

    const row = CustomerMapper.toPersistence(customer);

    expect(row.deletedAt).toBeInstanceOf(Date);

    const restored = CustomerMapper.toDomain(row);

    expect(restored.getDeletedAt()).not.toBeNull();
  });
});
