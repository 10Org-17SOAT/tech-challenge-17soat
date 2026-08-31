import { Anamnesis } from './anamnesis.entity';
import { AnamnesisLockedError } from './errors/anamnesis-locked.error';
import { InvalidAnamnesisError } from './errors/invalid-anamnesis.error';

describe('Anamnesis', () => {
  const validProps = {
    serviceOrderId: '11111111-1111-1111-1111-111111111111',
    consultantId: '22222222-2222-2222-2222-222222222222',
    mainComplaint: 'Barulho na suspensão',
    problemDescription: 'Barulho ao passar em lombadas',
  };

  describe('create', () => {
    it('creates an anamnesis with required fields and timestamps', () => {
      const anamnesis = Anamnesis.create(validProps);

      expect(anamnesis.id).toMatch(/^[0-9a-f-]{36}$/i);
      expect(anamnesis.serviceOrderId).toBe(validProps.serviceOrderId);
      expect(anamnesis.consultantId).toBe(validProps.consultantId);
      expect(anamnesis.mainComplaint).toBe('Barulho na suspensão');
      expect(anamnesis.problemDescription).toBe(
        'Barulho ao passar em lombadas',
      );
      expect(anamnesis.updatedBy).toBeNull();
      expect(anamnesis.deletedAt).toBeNull();
      expect(anamnesis.createdAt).toBeInstanceOf(Date);
      expect(anamnesis.updatedAt).toBeInstanceOf(Date);
    });

    it('accepts all optional fields', () => {
      const anamnesis = Anamnesis.create({
        ...validProps,
        problemStartedAt: 'há 2 semanas',
        howStarted: 'gradual',
        evolution: 'piorou com o tempo',
        occurrenceConditions: 'em lombadas e buracos',
        frequency: 'intermittent',
        severity: 'moderate',
        previousOccurrences: 'já trocou amortecedor',
        recentMaintenance: 'troca de pneus há 1 mês',
        warningLights: true,
        unusualNoisesSmells: 'barulho metálico',
        behaviorChanges: 'tremor na direção',
        usageConditions: 'uso diário em cidade',
        customerObservations: 'cliente prefere manhã',
      });

      expect(anamnesis.problemStartedAt).toBe('há 2 semanas');
      expect(anamnesis.howStarted).toBe('gradual');
      expect(anamnesis.evolution).toBe('piorou com o tempo');
      expect(anamnesis.occurrenceConditions).toBe('em lombadas e buracos');
      expect(anamnesis.frequency).toBe('intermittent');
      expect(anamnesis.severity).toBe('moderate');
      expect(anamnesis.previousOccurrences).toBe('já trocou amortecedor');
      expect(anamnesis.recentMaintenance).toBe('troca de pneus há 1 mês');
      expect(anamnesis.warningLights).toBe(true);
      expect(anamnesis.unusualNoisesSmells).toBe('barulho metálico');
      expect(anamnesis.behaviorChanges).toBe('tremor na direção');
      expect(anamnesis.usageConditions).toBe('uso diário em cidade');
      expect(anamnesis.customerObservations).toBe('cliente prefere manhã');
    });

    it('normalizes text: trims and turns empty optional text into null', () => {
      const anamnesis = Anamnesis.create({
        ...validProps,
        mainComplaint: '  Barulho  ',
        evolution: '   ',
      });

      expect(anamnesis.mainComplaint).toBe('Barulho');
      expect(anamnesis.evolution).toBeNull();
    });

    it('rejects a missing mainComplaint', () => {
      expect(() =>
        Anamnesis.create({ ...validProps, mainComplaint: '   ' }),
      ).toThrow(InvalidAnamnesisError);
    });

    it('rejects a missing problemDescription', () => {
      expect(() =>
        Anamnesis.create({ ...validProps, problemDescription: '' }),
      ).toThrow(InvalidAnamnesisError);
    });

    it('rejects mainComplaint longer than 500 characters', () => {
      expect(() =>
        Anamnesis.create({ ...validProps, mainComplaint: 'a'.repeat(501) }),
      ).toThrow(InvalidAnamnesisError);
    });

    it('rejects problemDescription longer than 4000 characters', () => {
      expect(() =>
        Anamnesis.create({
          ...validProps,
          problemDescription: 'a'.repeat(4001),
        }),
      ).toThrow(InvalidAnamnesisError);
    });

    it('rejects optional text longer than 2000 characters', () => {
      expect(() =>
        Anamnesis.create({ ...validProps, evolution: 'a'.repeat(2001) }),
      ).toThrow(InvalidAnamnesisError);
    });

    it('rejects an invalid howStarted value', () => {
      expect(() =>
        Anamnesis.create({ ...validProps, howStarted: 'overnight' as never }),
      ).toThrow(InvalidAnamnesisError);
    });

    it('rejects an invalid frequency value', () => {
      expect(() =>
        Anamnesis.create({ ...validProps, frequency: 'always' as never }),
      ).toThrow(InvalidAnamnesisError);
    });

    it('rejects an invalid severity value', () => {
      expect(() =>
        Anamnesis.create({ ...validProps, severity: 'critical' as never }),
      ).toThrow(InvalidAnamnesisError);
    });
  });

  describe('restore', () => {
    it('rebuilds an anamnesis from persisted props', () => {
      const createdAt = new Date('2026-08-30T10:00:00Z');
      const anamnesis = Anamnesis.restore({
        id: '33333333-3333-3333-3333-333333333333',
        serviceOrderId: validProps.serviceOrderId,
        consultantId: validProps.consultantId,
        updatedBy: '44444444-4444-4444-4444-444444444444',
        mainComplaint: 'Barulho',
        problemDescription: 'Descrição',
        problemStartedAt: null,
        howStarted: null,
        evolution: null,
        occurrenceConditions: null,
        frequency: null,
        severity: null,
        previousOccurrences: null,
        recentMaintenance: null,
        warningLights: null,
        unusualNoisesSmells: null,
        behaviorChanges: null,
        usageConditions: null,
        customerObservations: null,
        createdAt,
        updatedAt: createdAt,
        deletedAt: null,
      });

      expect(anamnesis.id).toBe('33333333-3333-3333-3333-333333333333');
      expect(anamnesis.updatedBy).toBe('44444444-4444-4444-4444-444444444444');
      expect(anamnesis.createdAt).toBe(createdAt);
    });
  });

  describe('update', () => {
    it('updates editable fields and sets updatedBy and updatedAt while received', () => {
      const anamnesis = Anamnesis.create(validProps);
      const before = anamnesis.updatedAt.getTime();

      anamnesis.update(
        { mainComplaint: '  Novo barulho  ', severity: 'severe' },
        '55555555-5555-5555-5555-555555555555',
        'received',
      );

      expect(anamnesis.mainComplaint).toBe('Novo barulho');
      expect(anamnesis.severity).toBe('severe');
      expect(anamnesis.updatedBy).toBe('55555555-5555-5555-5555-555555555555');
      expect(anamnesis.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
    });

    it('throws AnamnesisLockedError once the order leaves received', () => {
      const anamnesis = Anamnesis.create(validProps);

      expect(() =>
        anamnesis.update(
          { mainComplaint: 'x' },
          '55555555-5555-5555-5555-555555555555',
          'in_diagnosis',
        ),
      ).toThrow(AnamnesisLockedError);
    });

    it('rejects an empty updatedBy', () => {
      const anamnesis = Anamnesis.create(validProps);

      expect(() =>
        anamnesis.update({ mainComplaint: 'x' }, '   ', 'received'),
      ).toThrow(InvalidAnamnesisError);
    });

    it('rejects an invalid enum on update', () => {
      const anamnesis = Anamnesis.create(validProps);

      expect(() =>
        anamnesis.update(
          { frequency: 'always' as never },
          '55555555-5555-5555-5555-555555555555',
          'received',
        ),
      ).toThrow(InvalidAnamnesisError);
    });
  });

  describe('delete', () => {
    it('soft deletes while received', () => {
      const anamnesis = Anamnesis.create(validProps);

      anamnesis.delete('received');

      expect(anamnesis.deletedAt).toBeInstanceOf(Date);
    });

    it('throws AnamnesisLockedError once the order leaves received', () => {
      const anamnesis = Anamnesis.create(validProps);

      expect(() => anamnesis.delete('awaiting_approval')).toThrow(
        AnamnesisLockedError,
      );
    });

    it('refuses to delete twice', () => {
      const anamnesis = Anamnesis.create(validProps);
      anamnesis.delete('received');

      expect(() => anamnesis.delete('received')).toThrow(InvalidAnamnesisError);
    });
  });
});