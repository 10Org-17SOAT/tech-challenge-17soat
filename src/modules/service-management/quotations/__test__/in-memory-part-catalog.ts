import type { PartCatalog, PartView } from '../domain/part-catalog.port';

export class InMemoryPartCatalog implements PartCatalog {
  readonly parts = new Map<string, PartView>();

  add(part: PartView): void {
    this.parts.set(part.id, part);
  }

  findManyByIds(ids: string[]): Promise<Map<string, PartView>> {
    const found = new Map<string, PartView>();
    for (const id of ids) {
      const part = this.parts.get(id);
      if (part) found.set(id, part);
    }
    return Promise.resolve(found);
  }
}
