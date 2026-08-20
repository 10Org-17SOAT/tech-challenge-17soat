import { randomUUID } from 'node:crypto';
import { InvalidStockMovementError } from './errors/invalid-stock-movement.error';
import { MovementType, StockMovement } from './stock-movement.entity';

describe('StockMovement', () => {
  const supplyId = randomUUID();

  it('creates an IN movement with a positive quantity', () => {
    const movement = StockMovement.in(supplyId, 5);

    expect(movement.type).toBe(MovementType.In);
    expect(movement.supplyId).toBe(supplyId);
    expect(movement.quantity).toBe(5);
    expect(movement.serviceOrderReference).toBeNull();
    expect(movement.id).toEqual(expect.any(String));
    expect(movement.createdAt).toBeInstanceOf(Date);
  });

  it('rejects a movement with zero quantity', () => {
    expect(() => StockMovement.in(supplyId, 0)).toThrow(
      InvalidStockMovementError,
    );
  });

  it('rejects a movement with a negative quantity', () => {
    expect(() => StockMovement.in(supplyId, -3)).toThrow(
      InvalidStockMovementError,
    );
  });

  it('creates a RESERVE movement carrying the service order reference', () => {
    const movement = StockMovement.reserve(supplyId, 2, 'OS-1234');

    expect(movement.type).toBe(MovementType.Reserve);
    expect(movement.quantity).toBe(2);
    expect(movement.serviceOrderReference).toBe('OS-1234');
  });

  it('creates a CONSUME movement carrying the service order reference', () => {
    const movement = StockMovement.consume(supplyId, 2, 'OS-1234');

    expect(movement.type).toBe(MovementType.Consume);
    expect(movement.serviceOrderReference).toBe('OS-1234');
  });

  it('rejects a reservation without a service order reference', () => {
    expect(() => StockMovement.reserve(supplyId, 1, '  ')).toThrow(
      InvalidStockMovementError,
    );
  });
});
