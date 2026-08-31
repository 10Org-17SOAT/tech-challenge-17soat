import request from 'supertest';
import { App } from 'supertest/types';

/**
 * Shared setup for the graph a service order now hangs off: a service order
 * needs a vehicle, and a vehicle needs an owner. Every suite that opens an
 * order has to walk that chain first, so it lives here once.
 */

const unique = () => Math.random().toString(36).slice(2, 10);

/**
 * A syntactically valid CPF with correct check digits — the Document value
 * object verifies them, so random digits are rejected. The first nine are
 * random so parallel suites do not collide on the active-document unique index.
 */
const uniqueDocument = (): string => {
  const digits = Array.from({ length: 9 }, () =>
    Math.floor(Math.random() * 10),
  );

  const checkDigit = (source: number[]): number => {
    const weightStart = source.length + 1;
    const sum = source.reduce(
      (total, digit, index) => total + digit * (weightStart - index),
      0,
    );
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  digits.push(checkDigit(digits));
  digits.push(checkDigit(digits));

  // All-equal digits ("11111111111") are rejected regardless of check digits.
  return digits.every((d) => d === digits[0])
    ? uniqueDocument()
    : digits.join('');
};

/** AAA-0000, unique per call, matching the plate regex. */
const uniquePlate = () => {
  const letters = Array.from({ length: 3 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26)),
  ).join('');
  return `${letters}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
};

export async function givenCustomer(
  app: App,
  email = `cliente-${unique()}@example.com`,
): Promise<{ id: string; email: string }> {
  const res = await request(app)
    .post('/customers')
    .send({
      personType: 'CPF',
      document: uniqueDocument(),
      name: 'Ana Souza',
      email,
      phone: { countryCode: '55', areaCode: '11', number: '999998888' },
      address: {
        street: 'Rua das Flores',
        number: '100',
        neighborhood: 'Centro',
        city: 'Sao Paulo',
        state: 'SP',
        zipCode: '01001000',
      },
    })
    .expect(201);
  return { id: (res.body as { id: string }).id, email };
}

export async function givenVehicle(
  app: App,
  customerId: string,
): Promise<string> {
  const res = await request(app)
    .post('/vehicles')
    .send({
      customerId,
      licensePlate: uniquePlate(),
      model: 'Uno',
      year: 2018,
      manufacturer: 'Fiat',
      color: 'Prata',
      fuelType: 'GASOLINE',
      odometer: 45000,
    })
    .expect(201);
  return (res.body as { vehicle_id: string }).vehicle_id;
}

/** Customer + vehicle in one call, for suites that do not care about either. */
export async function givenOwnedVehicle(
  app: App,
): Promise<{ customerId: string; vehicleId: string; email: string }> {
  const customer = await givenCustomer(app);
  const vehicleId = await givenVehicle(app, customer.id);
  return { customerId: customer.id, vehicleId, email: customer.email };
}

/**
 * Truncation order matters: children before parents, and vehicles before the
 * customers they belong to.
 */
export const CLEANUP_TABLES = [
  'payments',
  'quotation_items',
  'quotations',
  'diagnostics',
  'service_items',
  'service_supplies',
  'service_orders',
  'services',
  'stock_movements',
  'supplies',
  'vehicles',
  'customers',
] as const;
