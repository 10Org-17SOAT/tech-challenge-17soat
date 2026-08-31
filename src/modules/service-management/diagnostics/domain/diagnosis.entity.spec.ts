import { Diagnosis } from './diagnosis.entity';
import { InvalidDiagnosisError } from './errors/invalid-diagnosis.error';

const serviceOrderId = '11111111-1111-1111-1111-111111111111';

describe('Diagnosis', () => {
  it('records trimmed findings against the order', () => {
    const diagnosis = Diagnosis.create({
      serviceOrderId,
      findings: '  Pastilhas de freio gastas  ',
    });

    expect(diagnosis.findings).toBe('Pastilhas de freio gastas');
    expect(diagnosis.serviceOrderId).toBe(serviceOrderId);
    expect(diagnosis.createdAt).toBeInstanceOf(Date);
  });

  it('rejects blank findings', () => {
    expect(() => Diagnosis.create({ serviceOrderId, findings: '   ' })).toThrow(
      InvalidDiagnosisError,
    );
  });
});
