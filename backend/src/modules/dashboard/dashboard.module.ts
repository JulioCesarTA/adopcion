import { Module } from '@nestjs/common';
import { ClinicalModule } from '../clinical/clinical.module';
import { AlertsService } from './alerts.service';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [ClinicalModule],
  controllers: [DashboardController],
  providers: [DashboardService, AlertsService],
  exports: [DashboardService],
})
export class DashboardModule {}
