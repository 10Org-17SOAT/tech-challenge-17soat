import { InvalidServiceOrderError } from './errors/invalid-service-order.error';
import { InvalidServiceOrderTransitionError } from './errors/invalid-service-order-transition.error';
import { ServiceOrderNotDeletableError } from './errors/service-order-not-deletable.error';
import { ServiceOrder } from './service-order.entity';

const vehicleId = '11111111-1111-1111-1111-111111111111';

describe('ServiceOrder', () => {
  it('creates an order with defaults', () => {
    const order = ServiceOrder.create({ vehicleId });

    expect(order.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(order.vehicleId).toBe(vehicleId);
    expect(order.status).toBe('received');
    expect(order.approvedByCustomer).toBe(false);
    expect(order.notes).toBeNull();
    expect(order.vehicleMileageAtEntry).toBeNull();
    expect(order.scheduledAt).toBeNull();
    expect(order.startedAt).toBeNull();
    expect(order.completedAt).toBeNull();
    expect(order.createdAt).toBeInstanceOf(Date);
    expect(order.updatedAt).toBeInstanceOf(Date);
    expect(order.deletedAt).toBeNull();
  });

  it('normalizes notes on create (trims, empty becomes null)', () => {
    expect(ServiceOrder.create({ vehicleId, notes: '  keep me  ' }).notes).toBe(
      'keep me',
    );
    expect(ServiceOrder.create({ vehicleId, notes: '   ' }).notes).toBeNull();
  });

  it('restores vehicleId from persisted props', () => {
    const createdAt = new Date('2026-08-30T10:00:00Z');
    const order = ServiceOrder.restore({
      id: '33333333-3333-3333-3333-333333333333',
      vehicleId,
      status: 'received',
      approvedByCustomer: false,
      notes: null,
      vehicleMileageAtEntry: null,
      scheduledAt: null,
      startedAt: null,
      completedAt: null,
      createdAt,
      updatedAt: createdAt,
      deletedAt: null,
    });

    expect(order.vehicleId).toBe(vehicleId);
  });

  it('rejects negative or non-integer mileage', () => {
    expect(() =>
      ServiceOrder.create({ vehicleId, vehicleMileageAtEntry: -1 }),
    ).toThrow(InvalidServiceOrderError);
    expect(() =>
      ServiceOrder.create({ vehicleId, vehicleMileageAtEntry: 10.5 }),
    ).toThrow(InvalidServiceOrderError);
  });

  describe('state machine', () => {
    it('walks the happy path and stamps timestamps + approval', () => {
      const order = ServiceOrder.create({ vehicleId });

      order.transitionTo('in_diagnosis');
      expect(order.status).toBe('in_diagnosis');

      order.transitionTo('awaiting_approval');
      expect(order.status).toBe('awaiting_approval');
      expect(order.approvedByCustomer).toBe(false);

      order.transitionTo('awaiting_execution');
      expect(order.status).toBe('awaiting_execution');
      expect(order.approvedByCustomer).toBe(true);

      order.transitionTo('in_execution');
      expect(order.status).toBe('in_execution');
      expect(order.startedAt).toBeInstanceOf(Date);
      expect(order.completedAt).toBeNull();

      order.transitionTo('finished');
      expect(order.status).toBe('finished');
      expect(order.completedAt).toBeInstanceOf(Date);
    });

    it('rejects skipping steps', () => {
      const order = ServiceOrder.create({ vehicleId });
      expect(() => order.transitionTo('in_execution')).toThrow(
        InvalidServiceOrderTransitionError,
      );
    });

    it('rejects going backwards', () => {
      const order = ServiceOrder.create({ vehicleId });
      order.transitionTo('in_diagnosis');
      expect(order.status).toBe('in_diagnosis');
      expect(() => order.transitionTo('received')).toThrow(
        InvalidServiceOrderTransitionError,
      );
    });

    it('rejects transitioning to the same status', () => {
      const order = ServiceOrder.create({ vehicleId });
      expect(() => order.transitionTo('received')).toThrow(
        InvalidServiceOrderTransitionError,
      );
    });

    it('rejects transitioning out of the terminal status', () => {
      const order = ServiceOrder.create({ vehicleId });
      order.transitionTo('in_diagnosis');
      order.transitionTo('awaiting_approval');
      order.transitionTo('awaiting_execution');
      order.transitionTo('in_execution');
      order.transitionTo('finished');
      expect(() => order.transitionTo('received')).toThrow(
        InvalidServiceOrderTransitionError,
      );
    });
  });

  describe('update()', () => {
    it('updates only the provided fields', () => {
      const order = ServiceOrder.create({
        vehicleId,
        notes: 'old',
        vehicleMileageAtEntry: 100,
      });
      order.update({ notes: 'new', vehicleMileageAtEntry: 200 });

      expect(order.notes).toBe('new');
      expect(order.vehicleMileageAtEntry).toBe(200);
    });

    it('allows nulling notes and stripping whitespace', () => {
      const order = ServiceOrder.create({ vehicleId, notes: 'x' });
      order.update({ notes: null });
      expect(order.notes).toBeNull();

      order.update({ notes: '   ' });
      expect(order.notes).toBeNull();
    });

    it('blocks mileage/scheduledAt updates once in_execution', () => {
      const order = ServiceOrder.create({ vehicleId });
      order.transitionTo('in_diagnosis');
      order.transitionTo('awaiting_approval');
      order.transitionTo('awaiting_execution');
      order.transitionTo('in_execution');

      expect(() => order.update({ vehicleMileageAtEntry: 500 })).toThrow(
        InvalidServiceOrderError,
      );
      expect(() => order.update({ scheduledAt: new Date() })).toThrow(
        InvalidServiceOrderError,
      );
    });

    it('still allows editing notes when finished', () => {
      const order = ServiceOrder.create({ vehicleId });
      order.transitionTo('in_diagnosis');
      order.transitionTo('awaiting_approval');
      order.transitionTo('awaiting_execution');
      order.transitionTo('in_execution');
      order.transitionTo('finished');

      order.update({ notes: 'post-mortem note' });
      expect(order.notes).toBe('post-mortem note');
    });
  });

  describe('delete()', () => {
    it('soft deletes an order in status received', () => {
      const order = ServiceOrder.create({ vehicleId });
      order.delete();
      expect(order.deletedAt).toBeInstanceOf(Date);
    });

    it('refuses to delete after diagnosis started', () => {
      const order = ServiceOrder.create({ vehicleId });
      order.transitionTo('in_diagnosis');
      expect(() => order.delete()).toThrow(ServiceOrderNotDeletableError);
    });
  });
});
