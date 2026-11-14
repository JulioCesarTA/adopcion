import { Controller, Get, Header, Param, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { ReportsService } from './reports.service';
import { ReportFiltersDto } from './dto/reports.dto';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  available(@CurrentUser() user: AuthUser) {
    return this.reports.available(user.role);
  }

  @Get(':type')
  run(@Param('type') type: string, @Query() f: ReportFiltersDto, @CurrentUser() user: AuthUser) {
    return this.reports.run(type, f, user.role);
  }

  @Get(':type/csv')
  @ApiProduces('text/csv')
  @Header('Cache-Control', 'no-store')
  async csv(
    @Param('type') type: string,
    @Query() f: ReportFiltersDto,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const report = await this.reports.run(type, f, user.role);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${report.type}_${report.filters.from}_${report.filters.to}.csv"`,
    );
    res.send(this.reports.toCsv(report));
  }
}
