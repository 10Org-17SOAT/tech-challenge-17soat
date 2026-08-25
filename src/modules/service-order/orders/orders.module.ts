import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../shared/config/database/database.module';
import { CreateOrderUseCase } from './application/create-order.usecase';
import { DeleteOrderUseCase } from './application/delete-order.usecase';
import { GetOrderUseCase } from './application/get-order.usecase';
import { ListOrdersUseCase } from './application/list-orders.usecase';
import { UpdateOrderStatusUseCase } from './application/update-order-status.usecase';
import { UpdateOrderUseCase } from './application/update-order.usecase';
import { ORDER_REPOSITORY } from './domain/order.repository';
import { DrizzleOrderRepository } from './infrastructure/persistence/drizzle-order.repository';
import { OrdersController } from './presentation/orders.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [OrdersController],
  providers: [
    { provide: ORDER_REPOSITORY, useClass: DrizzleOrderRepository },
    CreateOrderUseCase,
    GetOrderUseCase,
    ListOrdersUseCase,
    UpdateOrderUseCase,
    UpdateOrderStatusUseCase,
    DeleteOrderUseCase,
  ],
})
export class OrdersModule {}
