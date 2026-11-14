import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { AlertsService } from './alerts.service';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller()
export class DashboardController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly alertsService: AlertsService,
  ) {}

  @Get('dashboard')
  get(@CurrentUser() user: AuthUser) {
    return this.dashboard.dashboard(user.role);
  }

  @Get('alerts')
  alerts() {
    return this.alertsService.alerts();
  }
}
