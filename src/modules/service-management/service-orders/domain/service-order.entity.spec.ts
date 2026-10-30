import { InvalidServiceOrderError } from './errors/invalid-service-order.error';
import { InvalidServiceOrderTransitionError } from './errors/invalid-service-order-transition.error';
import { ServiceOrderNotDeletableError } from './errors/service-order-not-deletable.error';
import { ServiceOrderStatusChanged } from './events/service-order-status-changed.event';
import { ServiceOrder } from './service-order.entity';

// Orders always reference a vehicle; which one is irrelevant here.
const VEHICLE_ID = '9f1d3c40-5f0e-4a1e-9a1b-6c2d7e8f0a11';
const OPENED_BY_ID = '3a6e9f2b-1c4d-4e5a-8f6b-2d9c0e1f3a5b';
const OPENED_BY_NAME = 'Consultant Fixture';

describe('ServiceOrder', () => {
  it('creates an order with defaults', () => {
    const order = ServiceOrder.create({
      vehicleId: VEHICLE_ID,
      openedById: OPENED_BY_ID,
      openedByName: OPENED_BY_NAME,
    });

    expect(order.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(order.vehicleId).toBe(VEHICLE_ID);
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
    expect(
      ServiceOrder.create({
        vehicleId: VEHICLE_ID,
        openedById: OPENED_BY_ID,
        openedByName: OPENED_BY_NAME,
        notes: '  keep me  ',
      }).notes,
    ).toBe('keep me');
    expect(
      ServiceOrder.create({
        vehicleId: VEHICLE_ID,
        openedById: OPENED_BY_ID,
        openedByName: OPENED_BY_NAME,
        notes: '   ',
      }).notes,
    ).toBeNull();
  });

  it('restores vehicleId from persisted props', () => {
    const createdAt = new Date('2026-08-30T10:00:00Z');
    const order = ServiceOrder.restore({
      id: '33333333-3333-3333-3333-333333333333',
      vehicleId: VEHICLE_ID,
      openedById: OPENED_BY_ID,
      openedByName: OPENED_BY_NAME,
      status: 'received',
      approvedByCustomer: false,
      notes: null,
      vehicleMileageAtEntry: null,
      scheduledAt: null,
      startedAt: null,
      completedAt: null,
      deliveredAt: null,
      createdAt,
      updatedAt: createdAt,
      deletedAt: null,
    });

    expect(order.vehicleId).toBe(VEHICLE_ID);
  });

  it('rejects negative or non-integer mileage', () => {
    expect(() =>
      ServiceOrder.create({
        vehicleId: VEHICLE_ID,
        openedById: OPENED_BY_ID,
        openedByName: OPENED_BY_NAME,
        vehicleMileageAtEntry: -1,
      }),
    ).toThrow(InvalidServiceOrderError);
    expect(() =>
      ServiceOrder.create({
        vehicleId: VEHICLE_ID,
        openedById: OPENED_BY_ID,
        openedByName: OPENED_BY_NAME,
        vehicleMileageAtEntry: 10.5,
      }),
    ).toThrow(InvalidServiceOrderError);
  });

  describe('state machine', () => {
    it('walks the happy path and stamps timestamps + approval', () => {
      const order = ServiceOrder.create({
        vehicleId: VEHICLE_ID,
        openedById: OPENED_BY_ID,
        openedByName: OPENED_BY_NAME,
      });

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
      const order = ServiceOrder.create({
        vehicleId: VEHICLE_ID,
        openedById: OPENED_BY_ID,
        openedByName: OPENED_BY_NAME,
      });
      expect(() => order.transitionTo('in_execution')).toThrow(
        InvalidServiceOrderTransitionError,
      );
    });

    it('rejects going backwards', () => {
      const order = ServiceOrder.create({
        vehicleId: VEHICLE_ID,
        openedById: OPENED_BY_ID,
        openedByName: OPENED_BY_NAME,
      });
      order.transitionTo('in_diagnosis');
      expect(order.status).toBe('in_diagnosis');
      expect(() => order.transitionTo('received')).toThrow(
        InvalidServiceOrderTransitionError,
      );
    });

    // A rejected quotation reopens the diagnosis — the one way back.
    it('returns from awaiting_approval to in_diagnosis, without approval', () => {
      const order = ServiceOrder.create({
        vehicleId: VEHICLE_ID,
        openedById: OPENED_BY_ID,
        openedByName: OPENED_BY_NAME,
      });
      order.transitionTo('in_diagnosis');
      order.transitionTo('awaiting_approval');

      order.transitionTo('in_diagnosis');

      expect(order.status).toBe('in_diagnosis');
      expect(order.approvedByCustomer).toBe(false);
      order.transitionTo('awaiting_approval');
      expect(order.status).toBe('awaiting_approval');
    });

    it('does not reopen the diagnosis once the quotation is approved', () => {
      const order = ServiceOrder.create({
        vehicleId: VEHICLE_ID,
        openedById: OPENED_BY_ID,
        openedByName: OPENED_BY_NAME,
      });
      order.transitionTo('in_diagnosis');
      order.transitionTo('awaiting_approval');
      order.transitionTo('awaiting_execution');

      expect(() => order.transitionTo('in_diagnosis')).toThrow(
        InvalidServiceOrderTransitionError,
      );
    });

    it('rejects transitioning to the same status', () => {
      const order = ServiceOrder.create({
        vehicleId: VEHICLE_ID,
        openedById: OPENED_BY_ID,
        openedByName: OPENED_BY_NAME,
      });
      expect(() => order.transitionTo('received')).toThrow(
        InvalidServiceOrderTransitionError,
      );
    });

    it('rejects transitioning out of the terminal status', () => {
      const order = ServiceOrder.create({
        vehicleId: VEHICLE_ID,
        openedById: OPENED_BY_ID,
        openedByName: OPENED_BY_NAME,
      });
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

  describe('status change events', () => {
    const open = () =>
      ServiceOrder.create({
        vehicleId: VEHICLE_ID,
        openedById: OPENED_BY_ID,
        openedByName: OPENED_BY_NAME,
      });

    it('records the opening as a change from nothing to received', () => {
      const order = open();

      const events = order.pullEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ServiceOrderStatusChanged);
      expect(events[0]).toMatchObject({
        name: 'service-order.status-changed',
        serviceOrderId: order.id,
        from: null,
        to: 'received',
      });
    });

    it('records one event per transition, in order', () => {
      const order = open();
      order.transitionTo('in_diagnosis');
      order.transitionTo('awaiting_approval');
      order.transitionTo('awaiting_execution');
      order.transitionTo('in_execution');
      order.transitionTo('finished');
      order.transitionTo('delivered');

      const changes = order
        .pullEvents()
        .map((event) => event as ServiceOrderStatusChanged)
        .map(({ from, to }) => [from, to]);

      expect(changes).toEqual([
        [null, 'received'],
        ['received', 'in_diagnosis'],
        ['in_diagnosis', 'awaiting_approval'],
        ['awaiting_approval', 'awaiting_execution'],
        ['awaiting_execution', 'in_execution'],
        ['in_execution', 'finished'],
        ['finished', 'delivered'],
      ]);
    });

    it('hands each event over only once', () => {
      const order = open();
      order.pullEvents();

      expect(order.pullEvents()).toEqual([]);
    });

    it('records nothing for a rejected transition', () => {
      const order = open();
      order.pullEvents();

      expect(() => order.transitionTo('finished')).toThrow(
        InvalidServiceOrderTransitionError,
      );
      expect(order.pullEvents()).toEqual([]);
    });

    it('records nothing for an order restored from storage', () => {
      const order = open();
      const restored = ServiceOrder.restore({
        id: order.id,
        vehicleId: order.vehicleId,
        openedById: order.openedById,
        openedByName: order.openedByName,
        status: order.status,
        approvedByCustomer: order.approvedByCustomer,
        notes: order.notes,
        vehicleMileageAtEntry: order.vehicleMileageAtEntry,
        scheduledAt: order.scheduledAt,
        startedAt: order.startedAt,
        completedAt: order.completedAt,
        deliveredAt: order.deliveredAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        deletedAt: order.deletedAt,
      });

      expect(restored.pullEvents()).toEqual([]);
    });
  });

  describe('update()', () => {
    it('updates only the provided fields', () => {
      const order = ServiceOrder.create({
        vehicleId: VEHICLE_ID,
        openedById: OPENED_BY_ID,
        openedByName: OPENED_BY_NAME,
        notes: 'old',
        vehicleMileageAtEntry: 100,
      });
      order.update({ notes: 'new', vehicleMileageAtEntry: 200 });

      expect(order.notes).toBe('new');
      expect(order.vehicleMileageAtEntry).toBe(200);
    });

    it('allows nulling notes and stripping whitespace', () => {
      const order = ServiceOrder.create({
        vehicleId: VEHICLE_ID,
        openedById: OPENED_BY_ID,
        openedByName: OPENED_BY_NAME,
        notes: 'x',
      });
      order.update({ notes: null });
      expect(order.notes).toBeNull();

      order.update({ notes: '   ' });
      expect(order.notes).toBeNull();
    });

    it('blocks mileage/scheduledAt updates once in_execution', () => {
      const order = ServiceOrder.create({
        vehicleId: VEHICLE_ID,
        openedById: OPENED_BY_ID,
        openedByName: OPENED_BY_NAME,
      });
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
      const order = ServiceOrder.create({
        vehicleId: VEHICLE_ID,
        openedById: OPENED_BY_ID,
        openedByName: OPENED_BY_NAME,
      });
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
      const order = ServiceOrder.create({
        vehicleId: VEHICLE_ID,
        openedById: OPENED_BY_ID,
        openedByName: OPENED_BY_NAME,
      });
      order.delete();
      expect(order.deletedAt).toBeInstanceOf(Date);
    });

    it('refuses to delete after diagnosis started', () => {
      const order = ServiceOrder.create({
        vehicleId: VEHICLE_ID,
        openedById: OPENED_BY_ID,
        openedByName: OPENED_BY_NAME,
      });
      order.transitionTo('in_diagnosis');
      expect(() => order.delete()).toThrow(ServiceOrderNotDeletableError);
    });
  });
});
