import { Anamnesis } from './anamnesis.entity';

export interface AnamnesisRepository {
  findByServiceOrderId(serviceOrderId: string): Promise<Anamnesis | null>;
  save(anamnesis: Anamnesis): Promise<void>;
}

export const ANAMNESIS_REPOSITORY = Symbol('ANAMNESIS_REPOSITORY');