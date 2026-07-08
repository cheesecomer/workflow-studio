import { Test, TestingModule } from '@nestjs/testing';
import { PositionsController } from './positions.controller';
import { PositionsService } from './positions.service';

describe('PositionsController', () => {
  let controller: PositionsController;

  const positionsService = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PositionsController],
      providers: [
        {
          provide: PositionsService,
          useValue: positionsService,
        },
      ],
    }).compile();

    controller = module.get<PositionsController>(PositionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('delegates to service', async () => {
      await controller.findAll();

      expect(positionsService.findAll).toHaveBeenCalledWith();
    });
  });
});
