import { Module } from '@nestjs/common';
import { AdoptersController } from './adopters.controller';
import { AdoptersService } from './adopters.service';

@Module({
  controllers: [AdoptersController],
  providers: [AdoptersService],
  exports: [AdoptersService],
})
export class AdoptersModule {}
