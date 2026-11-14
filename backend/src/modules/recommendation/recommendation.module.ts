import { Module } from '@nestjs/common';
import { CatalogsModule } from '../catalogs/catalogs.module';
import { RecommendationController } from './recommendation.controller';
import { RecommendationService } from './recommendation.service';
import { MlController } from './ml/ml.controller';
import { MlService } from './ml/ml.service';

@Module({
  imports: [CatalogsModule],
  controllers: [RecommendationController, MlController],
  providers: [RecommendationService, MlService],
  exports: [MlService],
})
export class RecommendationModule {}
