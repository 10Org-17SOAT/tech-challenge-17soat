import { randomUUID } from 'node:crypto';
import { InvalidDiagnosisError } from './errors/invalid-diagnosis.error';

export interface DiagnosisProps {
  id: string;
  serviceOrderId: string;
  findings: string;
  createdAt: Date;
}

export interface CreateDiagnosisProps {
  serviceOrderId: string;
  findings: string;
}

/**
 * What the mechanic found on the vehicle. Immutable once recorded: the scope
 * it produced lives on the service order's items, and the price the customer
 * agreed to lives on the quotation.
 */
export class Diagnosis {
  private constructor(private readonly props: DiagnosisProps) {}

  static create(props: CreateDiagnosisProps): Diagnosis {
    return new Diagnosis({
      id: randomUUID(),
      serviceOrderId: props.serviceOrderId,
      findings: Diagnosis.validateFindings(props.findings),
      createdAt: new Date(),
    });
  }

  static restore(props: DiagnosisProps): Diagnosis {
    return new Diagnosis({ ...props });
  }

  private static validateFindings(findings: string): string {
    const trimmed = findings.trim();
    if (trimmed.length === 0) {
      throw new InvalidDiagnosisError('Diagnosis findings must not be empty');
    }
    return trimmed;
  }

  get id(): string {
    return this.props.id;
  }

  get serviceOrderId(): string {
    return this.props.serviceOrderId;
  }

  get findings(): string {
    return this.props.findings;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
