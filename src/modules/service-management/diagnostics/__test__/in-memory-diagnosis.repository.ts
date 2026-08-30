import { Diagnosis } from '../domain/diagnosis.entity';
import type { DiagnosisRepository } from '../domain/diagnosis.repository';

export class InMemoryDiagnosisRepository implements DiagnosisRepository {
  readonly diagnoses = new Map<string, Diagnosis>();

  findByServiceOrderId(serviceOrderId: string): Promise<Diagnosis | null> {
    for (const diagnosis of this.diagnoses.values()) {
      if (diagnosis.serviceOrderId === serviceOrderId) {
        return Promise.resolve(diagnosis);
      }
    }
    return Promise.resolve(null);
  }

  save(diagnosis: Diagnosis): Promise<void> {
    this.diagnoses.set(diagnosis.id, diagnosis);
    return Promise.resolve();
  }
}
