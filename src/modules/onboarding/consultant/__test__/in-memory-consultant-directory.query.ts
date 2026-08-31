import type {
  ConsultantDirectoryQuery,
  ConsultantView,
} from '../public/consultant-directory.query';

export class InMemoryConsultantDirectoryQuery implements ConsultantDirectoryQuery {
  private readonly consultants = new Map<string, ConsultantView>();

  add(consultant: ConsultantView): void {
    this.consultants.set(consultant.id, consultant);
  }

  findById(id: string): Promise<ConsultantView | null> {
    return Promise.resolve(this.consultants.get(id) ?? null);
  }
}
