import { Diagnosis } from './diagnosis.entity';

export interface DiagnosisRepository {
  findByServiceOrderId(serviceOrderId: string): Promise<Diagnosis | null>;
  save(diagnosis: Diagnosis): Promise<void>;
}

export const DIAGNOSIS_REPOSITORY = Symbol('DIAGNOSIS_REPOSITORY');
