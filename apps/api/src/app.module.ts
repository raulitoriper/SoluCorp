import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { UsersModule } from './modules/users/users.module';
import { MetadataModule } from './modules/metadata/metadata.module';
import { VisitsModule } from './modules/visits/visits.module';
import { OrdersModule } from './modules/orders/orders.module';
import { GpsModule } from './modules/gps/gps.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { GuardModule } from './modules/guard/guard.module';
import { MedicalVisitsModule } from './modules/medical-visits/medical-visits.module';
import { CourierModule } from './modules/courier/courier.module';
import { SyncModule } from './modules/sync/sync.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CompaniesModule,
    UsersModule,
    MetadataModule,
    // Módulos de servicio (9)
    VisitsModule,
    OrdersModule,
    GpsModule,
    InventoryModule,
    AttendanceModule,
    GuardModule,
    MedicalVisitsModule,
    CourierModule,
    SyncModule,
  ],
})
export class AppModule {}
