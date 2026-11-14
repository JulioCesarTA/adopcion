import { Module } from '@nestjs/common';
import { AnimalsController } from './animals.controller';
import { AnimalsService } from './animals.service';
import { AnimalStatusService } from './animal-status.service';

@Module({
  controllers: [AnimalsController],
  providers: [AnimalsService, AnimalStatusService],
  exports: [AnimalsService, AnimalStatusService],
})
export class AnimalsModule {}
