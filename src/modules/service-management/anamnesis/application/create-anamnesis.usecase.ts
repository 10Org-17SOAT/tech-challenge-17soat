import { Inject, Injectable } from '@nestjs/common';
import { CreateServiceOrderUseCase } from '../../service-orders/application/create-service-order.usecase';
import { Anamnesis } from '../domain/anamnesis.entity';
import type {
  CreateAnamnesisProps,
  HowStarted,
  Frequency,
  Severity,
} from '../domain/anamnesis.entity';
import { ANAMNESIS_REPOSITORY } from '../domain/anamnesis.repository';
import type { AnamnesisRepository } from '../domain/anamnesis.repository';

export interface CreateAnamnesisInput {
  vehicleId: string;
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

@Injectable()
export class CreateAnamnesisUseCase {
  constructor(
    @Inject(ANAMNESIS_REPOSITORY)
    private readonly anamnesisRepository: AnamnesisRepository,
    private readonly createOrder: CreateServiceOrderUseCase,
  ) {}

  async execute(input: CreateAnamnesisInput): Promise<Anamnesis> {
    // The anamnesis is the entry point of the flow: it opens the service
    // order (validating the vehicle via VEHICLE_LOOKUP) and attaches itself
    // to it. Simple orchestration — no cross-aggregate transaction.
    const order = await this.createOrder.execute({
      vehicleId: input.vehicleId,
    });

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
    return anamnesis;
  }
}