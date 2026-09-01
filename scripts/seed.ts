import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from '../src/shared/config/database/schema';
import type { Specialty } from '../src/modules/mechanic/domain/value-objects/specialty.enum';

/**
 * Popula a oficina com os atores e o catálogo que uma ordem de serviço exige,
 * para que um clone novo consiga percorrer todo o ciclo de vida sem cadastrar
 * nada à mão. A OS em si não é criada aqui: abrir, diagnosticar, orçar, executar
 * e pagar é justamente o roteiro do README.
 *
 * Os ids são fixos de propósito. O guia de fluxo cita cada um deles
 * literalmente, e um seed que sorteasse uuids a cada execução transformaria o
 * guia em paráfrase em vez de algo para colar no terminal.
 *
 * Todo insert é `on conflict do nothing`: rodar duas vezes não duplica nada e
 * nada é apagado, então uma OS aberta contra um veículo semeado sobrevive a uma
 * nova execução. Para recomeçar do zero, derrube o volume do Postgres
 * (`docker compose down -v`) e migre de novo.
 */

// Um seed carrega credenciais conhecidas por todo mundo que lê o repositório —
// é aceitável em desenvolvimento e inaceitável em produção.
if (process.env.NODE_ENV === 'production') {
  throw new Error(
    'O seed é uma ferramenta de desenvolvimento e nunca deve rodar em produção.',
  );
}

/** Senha de todas as contas semeadas. 12 caracteres: serve também como BOOTSTRAP_ADMIN_PASSWORD. */
const SEED_PASSWORD = 'Oficina@2026';

const USER = {
  admin: '11111111-1111-4111-8111-000000000001',
  consultant: '11111111-1111-4111-8111-000000000002',
  mechanicBruno: '11111111-1111-4111-8111-000000000003',
  mechanicDiego: '11111111-1111-4111-8111-000000000004',
  stockKeeper: '11111111-1111-4111-8111-000000000005',
  customerAna: '11111111-1111-4111-8111-000000000006',
  customerTransportadora: '11111111-1111-4111-8111-000000000007',
} as const;

const CUSTOMER = {
  ana: '22222222-2222-4222-8222-000000000001',
  transportadora: '22222222-2222-4222-8222-000000000002',
} as const;

const VEHICLE = {
  anaUno: '33333333-3333-4333-8333-000000000001',
  anaGol: '33333333-3333-4333-8333-000000000002',
  sprinter: '33333333-3333-4333-8333-000000000003',
} as const;

const CONSULTANT = {
  carla: '44444444-4444-4444-8444-000000000001',
} as const;

const MECHANIC = {
  bruno: '55555555-5555-4555-8555-000000000001',
  diego: '55555555-5555-4555-8555-000000000002',
} as const;

const STOCK_KEEPER = {
  marina: '66666666-6666-4666-8666-000000000001',
} as const;

const SUPPLY = {
  brakePad: '77777777-7777-4777-8777-000000000001',
  oil: '77777777-7777-4777-8777-000000000002',
  oilFilter: '77777777-7777-4777-8777-000000000003',
  brakeDisc: '77777777-7777-4777-8777-000000000004',
  tire: '77777777-7777-4777-8777-000000000005',
} as const;

const SERVICE = {
  oilChange: '88888888-8888-4888-8888-000000000001',
  brakePads: '88888888-8888-4888-8888-000000000002',
  brakeOverhaul: '88888888-8888-4888-8888-000000000003',
  alignment: '88888888-8888-4888-8888-000000000004',
  electricalCheck: '88888888-8888-4888-8888-000000000005',
} as const;

const MOVEMENT = {
  brakePadIn: '99999999-9999-4999-8999-000000000001',
  oilIn: '99999999-9999-4999-8999-000000000002',
  oilFilterIn: '99999999-9999-4999-8999-000000000003',
  brakeDiscIn: '99999999-9999-4999-8999-000000000004',
  tireIn: '99999999-9999-4999-8999-000000000005',
} as const;

const SPECIALTIES_BRUNO: Specialty[] = ['mechanical', 'electrical'];
const SPECIALTIES_DIEGO: Specialty[] = ['tire', 'mechanical'];

async function seed(): Promise<void> {
  const pool = new Pool({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_NAME ?? 'tech_challenge',
  });
  const db = drizzle(pool, { schema });

  const now = new Date();
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  try {
    // Contas de acesso. Todo perfil (cliente, consultor, mecânico, estoquista)
    // aponta para uma delas por user_id — validado no domínio, sem FK.
    await db
      .insert(schema.users)
      .values([
        {
          user_id: USER.admin,
          name: 'Administrador da Oficina',
          email: 'admin@oficina.dev',
          password_hash: passwordHash,
          role_id: 1,
        },
        // O consultor opera endpoints marcados como ADMIN (clientes, veículos,
        // anamnese, OS), então a conta dele é ADMIN — o perfil é que o
        // identifica como consultor.
        {
          user_id: USER.consultant,
          name: 'Carla Menezes',
          email: 'consultor@oficina.dev',
          password_hash: passwordHash,
          role_id: 1,
        },
        {
          user_id: USER.mechanicBruno,
          name: 'Bruno Lima',
          email: 'bruno@oficina.dev',
          password_hash: passwordHash,
          role_id: 3,
        },
        {
          user_id: USER.mechanicDiego,
          name: 'Diego Alves',
          email: 'diego@oficina.dev',
          password_hash: passwordHash,
          role_id: 3,
        },
        {
          user_id: USER.stockKeeper,
          name: 'Marina Rocha',
          email: 'estoquista@oficina.dev',
          password_hash: passwordHash,
          role_id: 2,
        },
        {
          user_id: USER.customerAna,
          name: 'Ana Souza',
          email: 'ana@example.com',
          password_hash: passwordHash,
          role_id: 4,
        },
        {
          user_id: USER.customerTransportadora,
          name: 'Transportadora Boa Viagem',
          email: 'contato@boaviagem.example.com',
          password_hash: passwordHash,
          role_id: 4,
        },
      ])
      .onConflictDoNothing();

    await db
      .insert(schema.customersTable)
      .values([
        {
          id: CUSTOMER.ana,
          userId: USER.customerAna,
          personType: 'CPF',
          document: '52998224725',
          name: 'Ana Souza',
          corporateName: null,
          tradeName: null,
          email: 'ana@example.com',
          phone: { countryCode: '55', areaCode: '11', number: '988887777' },
          address: {
            street: 'Rua das Flores',
            number: '100',
            complement: 'Apto 42',
            neighborhood: 'Centro',
            city: 'Sao Paulo',
            state: 'SP',
            zipCode: '01001000',
          },
          createdAt: now,
          updatedAt: now,
        },
        {
          id: CUSTOMER.transportadora,
          userId: USER.customerTransportadora,
          personType: 'CNPJ',
          document: '11222333000181',
          name: null,
          corporateName: 'Boa Viagem Transportes LTDA',
          tradeName: 'Transportadora Boa Viagem',
          email: 'contato@boaviagem.example.com',
          phone: { countryCode: '55', areaCode: '11', number: '33334444' },
          address: {
            street: 'Avenida Industrial',
            number: '2500',
            complement: null,
            neighborhood: 'Distrito Industrial',
            city: 'Guarulhos',
            state: 'SP',
            zipCode: '07034000',
          },
          createdAt: now,
          updatedAt: now,
        },
      ])
      .onConflictDoNothing();

    // Dois carros da Ana para o guia poder rodar o fluxo duas vezes sem
    // esbarrar em "esse veículo já tem OS aberta".
    await db
      .insert(schema.vehiclesTable)
      .values([
        {
          vehicle_id: VEHICLE.anaUno,
          customerId: CUSTOMER.ana,
          licensePlate: 'ABC-1234',
          model: 'Uno',
          year: 2018,
          manufacturer: 'Fiat',
          description: 'Carro do dia a dia',
          color: 'Prata',
          fuelType: 'GASOLINE',
          odometer: 45000,
        },
        {
          vehicle_id: VEHICLE.anaGol,
          customerId: CUSTOMER.ana,
          licensePlate: 'DEF-5678',
          model: 'Gol',
          year: 2020,
          manufacturer: 'Volkswagen',
          description: null,
          color: 'Branco',
          fuelType: 'ETHANOL',
          odometer: 32000,
        },
        {
          vehicle_id: VEHICLE.sprinter,
          customerId: CUSTOMER.transportadora,
          licensePlate: 'BRA1A23',
          model: 'Sprinter',
          year: 2021,
          manufacturer: 'Mercedes-Benz',
          description: 'Van de entregas',
          color: 'Branco',
          fuelType: 'DIESEL',
          odometer: 118000,
        },
      ])
      .onConflictDoNothing();

    await db
      .insert(schema.consultants)
      .values([
        {
          id: CONSULTANT.carla,
          userId: USER.consultant,
          name: 'Carla Menezes',
          cpf: '12345678909',
          phone: '11987654321',
          createdAt: now,
          updatedAt: now,
        },
      ])
      .onConflictDoNothing();

    // `availableSince` separado por uma hora: a alocação é FIFO, então quem
    // está livre há mais tempo — o Bruno — assume o primeiro claim.
    const brunoAvailableSince = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const diegoAvailableSince = new Date(now.getTime() - 1 * 60 * 60 * 1000);

    await db
      .insert(schema.mechanicsTable)
      .values([
        {
          id: MECHANIC.bruno,
          userId: USER.mechanicBruno,
          name: 'Bruno Lima',
          cpf: '11144477735',
          email: 'bruno@oficina.dev',
          phone: { countryCode: '55', areaCode: '11', number: '911112222' },
          specialties: SPECIALTIES_BRUNO,
          hireDate: new Date('2023-03-01T00:00:00.000Z'),
          availability: 'AVAILABLE',
          availableSince: brunoAvailableSince,
          currentServiceOrderId: null,
        },
        {
          id: MECHANIC.diego,
          userId: USER.mechanicDiego,
          name: 'Diego Alves',
          cpf: '11122233396',
          email: 'diego@oficina.dev',
          phone: { countryCode: '55', areaCode: '11', number: '933334444' },
          specialties: SPECIALTIES_DIEGO,
          hireDate: new Date('2024-07-15T00:00:00.000Z'),
          availability: 'AVAILABLE',
          availableSince: diegoAvailableSince,
          currentServiceOrderId: null,
        },
      ])
      .onConflictDoNothing();

    await db
      .insert(schema.stockKeepers)
      .values([
        {
          id: STOCK_KEEPER.marina,
          userId: USER.stockKeeper,
          name: 'Marina Rocha',
          cpf: '98765432100',
          phone: '11955556666',
          createdAt: now,
          updatedAt: now,
        },
      ])
      .onConflictDoNothing();

    await db
      .insert(schema.supplies)
      .values([
        {
          id: SUPPLY.brakePad,
          name: 'Pastilha de freio dianteira',
          description: 'Jogo com 4 pastilhas',
          priceInCents: 12000,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: SUPPLY.oil,
          name: 'Óleo sintético 5W30 (litro)',
          description: null,
          priceInCents: 4500,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: SUPPLY.oilFilter,
          name: 'Filtro de óleo',
          description: null,
          priceInCents: 3500,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: SUPPLY.brakeDisc,
          name: 'Disco de freio ventilado',
          description: 'Unidade',
          priceInCents: 18000,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: SUPPLY.tire,
          name: 'Pneu aro 15',
          description: null,
          priceInCents: 32000,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .onConflictDoNothing();

    // A quantidade disponível nunca é uma coluna: ela sai destes movimentos.
    // Sem estas entradas o estoque nasce zerado e nenhuma reserva passa.
    await db
      .insert(schema.stockMovements)
      .values([
        {
          id: MOVEMENT.brakePadIn,
          supplyId: SUPPLY.brakePad,
          type: 'IN',
          quantity: 20,
          serviceOrderReference: null,
          performedById: STOCK_KEEPER.marina,
          performedByName: 'Marina Rocha',
          createdAt: now,
        },
        {
          id: MOVEMENT.oilIn,
          supplyId: SUPPLY.oil,
          type: 'IN',
          quantity: 60,
          serviceOrderReference: null,
          performedById: STOCK_KEEPER.marina,
          performedByName: 'Marina Rocha',
          createdAt: now,
        },
        {
          id: MOVEMENT.oilFilterIn,
          supplyId: SUPPLY.oilFilter,
          type: 'IN',
          quantity: 25,
          serviceOrderReference: null,
          performedById: STOCK_KEEPER.marina,
          performedByName: 'Marina Rocha',
          createdAt: now,
        },
        {
          id: MOVEMENT.brakeDiscIn,
          supplyId: SUPPLY.brakeDisc,
          type: 'IN',
          quantity: 10,
          serviceOrderReference: null,
          performedById: STOCK_KEEPER.marina,
          performedByName: 'Marina Rocha',
          createdAt: now,
        },
        {
          id: MOVEMENT.tireIn,
          supplyId: SUPPLY.tire,
          type: 'IN',
          quantity: 16,
          serviceOrderReference: null,
          performedById: STOCK_KEEPER.marina,
          performedByName: 'Marina Rocha',
          createdAt: now,
        },
      ])
      .onConflictDoNothing();

    await db
      .insert(schema.services)
      .values([
        {
          id: SERVICE.oilChange,
          name: 'Troca de óleo e filtro',
          description: 'Troca de óleo sintético com substituição do filtro',
          category: 'mechanical',
          laborPriceInCents: 8000,
          estimatedDuration: 30,
          warrantyDays: 90,
          active: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: SERVICE.brakePads,
          name: 'Troca de pastilhas de freio',
          description: 'Substituição das pastilhas dianteiras',
          category: 'mechanical',
          laborPriceInCents: 15000,
          estimatedDuration: 60,
          warrantyDays: 180,
          active: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: SERVICE.brakeOverhaul,
          name: 'Revisão completa de freios',
          description: 'Troca de discos e pastilhas dianteiros',
          category: 'mechanical',
          laborPriceInCents: 22000,
          estimatedDuration: 120,
          warrantyDays: 180,
          active: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: SERVICE.alignment,
          name: 'Alinhamento e balanceamento',
          description: 'Geometria completa das quatro rodas',
          category: 'tire',
          laborPriceInCents: 12000,
          estimatedDuration: 45,
          warrantyDays: 30,
          active: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: SERVICE.electricalCheck,
          name: 'Revisão elétrica',
          description: 'Diagnóstico do sistema elétrico e da bateria',
          category: 'electrical',
          laborPriceInCents: 18000,
          estimatedDuration: 90,
          warrantyDays: 60,
          active: true,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .onConflictDoNothing();

    // Ficha técnica: é por ela que peças entram no orçamento. Serviço sem
    // insumo (alinhamento, revisão elétrica) gera orçamento só de mão de obra.
    await db
      .insert(schema.serviceSupplies)
      .values([
        { serviceId: SERVICE.oilChange, supplyId: SUPPLY.oil, quantity: 4 },
        {
          serviceId: SERVICE.oilChange,
          supplyId: SUPPLY.oilFilter,
          quantity: 1,
        },
        {
          serviceId: SERVICE.brakePads,
          supplyId: SUPPLY.brakePad,
          quantity: 1,
        },
        {
          serviceId: SERVICE.brakeOverhaul,
          supplyId: SUPPLY.brakePad,
          quantity: 1,
        },
        {
          serviceId: SERVICE.brakeOverhaul,
          supplyId: SUPPLY.brakeDisc,
          quantity: 2,
        },
      ])
      .onConflictDoNothing();

    report();
  } finally {
    await pool.end();
  }
}

function report(): void {
  console.log(`
Seed aplicado.

Contas (senha: ${SEED_PASSWORD})
  admin@oficina.dev         ADMIN         ${USER.admin}
  consultor@oficina.dev     ADMIN         ${USER.consultant}
  bruno@oficina.dev         MECHANIC      ${USER.mechanicBruno}
  diego@oficina.dev         MECHANIC      ${USER.mechanicDiego}
  estoquista@oficina.dev    STOCK_KEEPER  ${USER.stockKeeper}
  ana@example.com           CUSTOMER      ${USER.customerAna}

Clientes
  Ana Souza (PF)            ${CUSTOMER.ana}
  Boa Viagem (PJ)           ${CUSTOMER.transportadora}

Veículos
  Fiat Uno ABC-1234         ${VEHICLE.anaUno}
  VW Gol DEF-5678           ${VEHICLE.anaGol}
  Sprinter BRA1A23          ${VEHICLE.sprinter}

Perfis
  Consultora Carla          ${CONSULTANT.carla}
  Mecânico Bruno            ${MECHANIC.bruno}   (primeiro da fila FIFO)
  Mecânico Diego            ${MECHANIC.diego}
  Estoquista Marina         ${STOCK_KEEPER.marina}

Serviços
  Troca de óleo e filtro    ${SERVICE.oilChange}   R$  80,00 + 4 óleos + 1 filtro
  Troca de pastilhas        ${SERVICE.brakePads}   R$ 150,00 + 1 jogo de pastilhas
  Revisão de freios         ${SERVICE.brakeOverhaul}   R$ 220,00 + 1 pastilha + 2 discos
  Alinhamento               ${SERVICE.alignment}   R$ 120,00 (sem peças)
  Revisão elétrica          ${SERVICE.electricalCheck}   R$ 180,00 (sem peças)

Insumos (saldo em estoque)
  Pastilha de freio         ${SUPPLY.brakePad}   20
  Óleo 5W30                 ${SUPPLY.oil}   60
  Filtro de óleo            ${SUPPLY.oilFilter}   25
  Disco de freio            ${SUPPLY.brakeDisc}   10
  Pneu aro 15               ${SUPPLY.tire}   16

Próximo passo: o guia "Testando o ciclo de vida da OS" no README.
`);
}

seed().catch((error: unknown) => {
  console.error('\nO seed falhou.');
  console.error(error);
  console.error(
    '\nO banco está no ar e migrado? `docker compose up -d && npm run db:migrate`',
  );
  process.exit(1);
});
