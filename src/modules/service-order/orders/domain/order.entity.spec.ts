import { InvalidOrderError } from './errors/invalid-order.error';
import { InvalidOrderTransitionError } from './errors/invalid-order-transition.error';
import { OrderNotDeletableError } from './errors/order-not-deletable.error';
import { Order } from './order.entity';

describe('Order', () => {
  it('creates an order with defaults', () => {
    const order = Order.create({});

    expect(order.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
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
    expect(Order.create({ notes: '  keep me  ' }).notes).toBe('keep me');
    expect(Order.create({ notes: '   ' }).notes).toBeNull();
  });

  it('rejects negative or non-integer mileage', () => {
    expect(() => Order.create({ vehicleMileageAtEntry: -1 })).toThrow(
      InvalidOrderError,
    );
    expect(() => Order.create({ vehicleMileageAtEntry: 10.5 })).toThrow(
      InvalidOrderError,
    );
  });

  describe('state machine', () => {
    it('walks the happy path and stamps timestamps + approval', () => {
      const order = Order.create({});

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
      const order = Order.create({});
      expect(() => order.transitionTo('in_execution')).toThrow(
        InvalidOrderTransitionError,
      );
    });

    it('rejects going backwards', () => {
      const order = Order.create({});
      order.transitionTo('in_diagnosis');
      expect(order.status).toBe('in_diagnosis');
      expect(() => order.transitionTo('received')).toThrow(
        InvalidOrderTransitionError,
      );
    });

    it('rejects transitioning to the same status', () => {
      const order = Order.create({});
      expect(() => order.transitionTo('received')).toThrow(
        InvalidOrderTransitionError,
      );
    });

    it('rejects transitioning out of the terminal status', () => {
      const order = Order.create({});
      order.transitionTo('in_diagnosis');
      order.transitionTo('awaiting_approval');
      order.transitionTo('awaiting_execution');
      order.transitionTo('in_execution');
      order.transitionTo('finished');
      expect(() => order.transitionTo('received')).toThrow(
        InvalidOrderTransitionError,
      );
    });
  });

  describe('update()', () => {
    it('updates only the provided fields', () => {
      const order = Order.create({ notes: 'old', vehicleMileageAtEntry: 100 });
      order.update({ notes: 'new', vehicleMileageAtEntry: 200 });

      expect(order.notes).toBe('new');
      expect(order.vehicleMileageAtEntry).toBe(200);
    });

    it('allows nulling notes and stripping whitespace', () => {
      const order = Order.create({ notes: 'x' });
      order.update({ notes: null });
      expect(order.notes).toBeNull();

      order.update({ notes: '   ' });
      expect(order.notes).toBeNull();
    });

    it('blocks mileage/scheduledAt updates once in_execution', () => {
      const order = Order.create({});
      order.transitionTo('in_diagnosis');
      order.transitionTo('awaiting_approval');
      order.transitionTo('awaiting_execution');
      order.transitionTo('in_execution');

      expect(() => order.update({ vehicleMileageAtEntry: 500 })).toThrow(
        InvalidOrderError,
      );
      expect(() => order.update({ scheduledAt: new Date() })).toThrow(
        InvalidOrderError,
      );
    });

    it('still allows editing notes when finished', () => {
      const order = Order.create({});
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
      const order = Order.create({});
      order.delete();
      expect(order.deletedAt).toBeInstanceOf(Date);
    });

    it('refuses to delete after diagnosis started', () => {
      const order = Order.create({});
      order.transitionTo('in_diagnosis');
      expect(() => order.delete()).toThrow(OrderNotDeletableError);
    });
  });
});
