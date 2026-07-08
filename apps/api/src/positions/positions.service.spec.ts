import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { PositionsService } from './positions.service';

describe('PositionsService', () => {
  let service: PositionsService;

  const prisma = {
    position: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PositionsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<PositionsService>(PositionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('finds positions ordered by rank', async () => {
      const positions = [
        { id: 1n, name: '社員', rank: 10 },
        { id: 2n, name: '主任', rank: 20 },
      ];
      prisma.position.findMany.mockResolvedValue(positions);

      await expect(service.findAll()).resolves.toBe(positions);

      expect(prisma.position.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          name: true,
          rank: true,
        },
        orderBy: { rank: 'asc' },
      });
    });
  });
});
