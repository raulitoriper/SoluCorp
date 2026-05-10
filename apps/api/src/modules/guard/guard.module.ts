import { Module } from '@nestjs/common';
import { GuardShiftService } from './guard.service';
import { GuardShiftController } from './guard.controller';
@Module({ controllers: [GuardShiftController], providers: [GuardShiftService] })
export class GuardModule {}
