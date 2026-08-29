import { describeMechanicRepositoryContract } from './mechanic-repository.contract';
import { InMemoryMechanicRepository } from './in-memory-mechanic.repository';

describeMechanicRepositoryContract(() =>
  Promise.resolve({ repository: new InMemoryMechanicRepository() }),
);
