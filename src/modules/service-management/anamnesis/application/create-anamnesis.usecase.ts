import { Inject, Injectable } from '@nestjs/common';
import { CONSULTANT_DIRECTORY_QUERY } from '../../../onboarding/consultant/public/consultant-directory.query';
import type { ConsultantDirectoryQuery } from '../../../onboarding/consultant/public/consultant-directory.query';
import { ServiceOrderNotFoundError } from '../../service-orders/domain/errors/service-order-not-found.error';
import { SERVICE_ORDER_REPOSITORY } from '../../service-orders/domain/service-order.repository';
import type { ServiceOrderRepository } from '../../service-orders/domain/service-order.repository';
import { Anamnesis } from '../domain/anamnesis.entity';
import type {
  CreateAnamnesisProps,
  HowStarted,
  Frequency,
  Severity,
} from '../domain/anamnesis.entity';
import { ANAMNESIS_REPOSITORY } from '../domain/anamnesis.repository';
import type { AnamnesisRepository } from '../domain/anamnesis.repository';
import {
  AnamnesisAlreadyExistsException,
  AnamnesisConsultantNotFoundException,
  AnamnesisLockedException,
} from '../domain/exceptions/anamnesis.exceptions';

export interface CreateAnamnesisInput {
  serviceOrderId: string;
  consultantId: string;
  mainComplaint: string;
  problemDescription: string;
  problemStartedAt?: string | null;
  howStarted?: HowStarted | null;
  evolution?: string | null;
  occurrenceConditions?: string | null;
  frequency?: Frequency | null;
  severity?: Severity | null;
  previousOccurrences?: string | null;
  recentMaintenance?: string | null;
  warningLights?: boolean | null;
  unusualNoisesSmells?: string | null;
  behaviorChanges?: string | null;
  usageConditions?: string | null;
  customerObservations?: string | null;
}

export interface CreateAnamnesisResult {
  anamnesis: Anamnesis;
  vehicleId: string;
}

@Injectable()
export class CreateAnamnesisUseCase {
  constructor(
    @Inject(ANAMNESIS_REPOSITORY)
    private readonly anamnesisRepository: AnamnesisRepository,
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepository: ServiceOrderRepository,
    @Inject(CONSULTANT_DIRECTORY_QUERY)
    private readonly consultants: ConsultantDirectoryQuery,
  ) {}

  async execute(input: CreateAnamnesisInput): Promise<CreateAnamnesisResult> {
    // The order is opened first, by POST /service-orders; the anamnesis is
    // the customer's account of the problem, attached to it while it is still
    // at reception.
    const order = await this.orderRepository.findById(input.serviceOrderId);
    if (!order) {
      throw new ServiceOrderNotFoundError(input.serviceOrderId);
    }
    // Same lock as update and delete: once the order leaves reception the
    // account of the problem is history, not something to start writing.
    if (order.status !== 'received') {
      throw new AnamnesisLockedException(order.id, order.status);
    }

    const existing = await this.anamnesisRepository.findByServiceOrderId(
      order.id,
    );
    if (existing) {
      throw new AnamnesisAlreadyExistsException(order.id);
    }

    const consultant = await this.consultants.findById(input.consultantId);
    if (!consultant) {
      throw new AnamnesisConsultantNotFoundException(input.consultantId);
    }

    const props: CreateAnamnesisProps = {
      serviceOrderId: order.id,
      consultantId: input.consultantId,
      mainComplaint: input.mainComplaint,
      problemDescription: input.problemDescription,
      problemStartedAt: input.problemStartedAt,
      howStarted: input.howStarted,
      evolution: input.evolution,
      occurrenceConditions: input.occurrenceConditions,
      frequency: input.frequency,
      severity: input.severity,
      previousOccurrences: input.previousOccurrences,
      recentMaintenance: input.recentMaintenance,
      warningLights: input.warningLights,
      unusualNoisesSmells: input.unusualNoisesSmells,
      behaviorChanges: input.behaviorChanges,
      usageConditions: input.usageConditions,
      customerObservations: input.customerObservations,
    };

    const anamnesis = Anamnesis.create(props);
    await this.anamnesisRepository.save(anamnesis);
    // vehicleId is derived from the OS (join), not stored on the anamnesis.
    return { anamnesis, vehicleId: order.vehicleId };
  }
}
