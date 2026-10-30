import { randomUUID } from 'node:crypto';
import { describeStockMovementRepositoryContract } from './stock-movement-repository.contract';
import { InMemoryStockMovementRepository } from './in-memory-stock-movement.repository';

describe('InMemoryStockMovementRepository', () => {
  describeStockMovementRepositoryContract(() =>
    Promise.resolve({
      repository: new InMemoryStockMovementRepository(),
      createSupply: () => Promise.resolve(randomUUID()),
    }),
  );
});
