import { Module } from '@nestjs/common';
import { ClinicalModule } from '../clinical/clinical.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [ClinicalModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
