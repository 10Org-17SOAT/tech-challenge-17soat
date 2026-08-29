import { randomUUID } from 'node:crypto';
import { describeStockMovementRepositoryContract } from '@/modules/stock/__test__/stock-movement-repository.contract';
import { InMemoryStockMovementRepository } from '@/modules/stock/__test__/in-memory-stock-movement.repository';

describe('InMemoryStockMovementRepository', () => {
  describeStockMovementRepositoryContract(() =>
    Promise.resolve({
      repository: new InMemoryStockMovementRepository(),
      createSupply: () => Promise.resolve(randomUUID()),
    }),
  );
});
