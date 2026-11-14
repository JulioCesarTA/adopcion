import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { ClinicalService } from './clinical.service';
import {
  ClosePeriodDto,
  CreateConsultationDto,
  CreateControlDto,
  CreateDiagnosisDto,
  CreateMedicationDto,
  CreatePeriodDto,
  CreateTreatmentDto,
  CreateVaccinationDto,
  PeriodsQueryDto,
  UpcomingQueryDto,
  UpdateConsultationDto,
  UpdateTreatmentDto,
  UpdateVaccinationDto,
} from './dto/clinical.dto';

const { ADMIN, VETERINARIO, GESTION, DIRECTIVO } = UserRole;
const HCD_READERS = [ADMIN, VETERINARIO, GESTION, DIRECTIVO];

@ApiTags('clinical')
@ApiBearerAuth()
@Controller()
export class ClinicalController {
  constructor(private readonly clinical: ClinicalService) {}

  // ---------- Consultas ----------

  @Roles(...HCD_READERS)
  @Get('animals/:id/consultations')
  listConsultations(@Param('id', ParseUUIDPipe) id: string) {
    return this.clinical.listConsultations(id);
  }

  @Roles(VETERINARIO)
  @Post('animals/:id/consultations')
  createConsultation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateConsultationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.clinical.createConsultation(id, dto, user);
  }

  @Roles(...HCD_READERS)
  @Get('consultations/:id')
  getConsultation(@Param('id', ParseUUIDPipe) id: string) {
    return this.clinical.getConsultation(id);
  }

  @Roles(VETERINARIO, ADMIN)
  @Patch('consultations/:id')
  updateConsultation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConsultationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.clinical.updateConsultation(id, dto, user);
  }

  @Roles(VETERINARIO)
  @Post('consultations/:id/diagnoses')
  addDiagnosis(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateDiagnosisDto) {
    return this.clinical.addDiagnosis(id, dto);
  }

  @Roles(VETERINARIO)
  @Post('consultations/:id/treatments')
  addTreatment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateTreatmentDto) {
    return this.clinical.addTreatment(id, dto);
  }

  @Roles(VETERINARIO, ADMIN)
  @Patch('treatments/:id')
  updateTreatment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTreatmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.clinical.updateTreatment(id, dto, user);
  }

  @Roles(VETERINARIO)
  @Post('treatments/:id/medications')
  addMedication(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateMedicationDto) {
    return this.clinical.addMedication(id, dto);
  }

  // ---------- Vacunas ----------

  @Roles(ADMIN, VETERINARIO)
  @Get('vaccinations/upcoming')
  upcoming(@Query() q: UpcomingQueryDto) {
    return this.clinical.upcomingVaccinations(q.days);
  }

  @Roles(...HCD_READERS)
  @Get('animals/:id/vaccinations')
  listVaccinations(@Param('id', ParseUUIDPipe) id: string) {
    return this.clinical.listVaccinations(id);
  }

  @Roles(VETERINARIO)
  @Post('animals/:id/vaccinations')
  createVaccination(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateVaccinationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.clinical.createVaccination(id, dto, user);
  }

  @Roles(VETERINARIO, ADMIN)
  @Patch('vaccinations/:id')
  updateVaccination(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVaccinationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.clinical.updateVaccination(id, dto, user);
  }

  // ---------- Observación / cuarentena ----------

  @Roles(ADMIN, VETERINARIO, GESTION)
  @Get('periods')
  listAllPeriods(@Query() q: PeriodsQueryDto) {
    return this.clinical.listAllPeriods(q.status);
  }

  @Roles(...HCD_READERS)
  @Get('animals/:id/periods')
  listPeriods(@Param('id', ParseUUIDPipe) id: string) {
    return this.clinical.listPeriods(id);
  }

  @Roles(VETERINARIO, GESTION)
  @Post('animals/:id/periods')
  startPeriod(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePeriodDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.clinical.startPeriod(id, dto, user);
  }

  @Roles(VETERINARIO)
  @Post('periods/:id/controls')
  addControl(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateControlDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.clinical.addControl(id, dto, user);
  }

  @Roles(VETERINARIO)
  @Post('periods/:id/close')
  @HttpCode(HttpStatus.OK)
  closePeriod(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ClosePeriodDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.clinical.closePeriod(id, dto, user);
  }
}
