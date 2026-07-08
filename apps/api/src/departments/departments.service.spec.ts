import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { DepartmentsService } from './departments.service';

describe('DepartmentsService', () => {
  let service: DepartmentsService;

  const prisma = {
    department: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<DepartmentsService>(DepartmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('finds departments ordered by id', async () => {
      const departments = [
        { id: 1n, parentId: null, name: '本部' },
        { id: 2n, parentId: 1n, name: '開発部' },
      ];
      prisma.department.findMany.mockResolvedValue(departments);

      await expect(service.findAll()).resolves.toBe(departments);

      expect(prisma.department.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          parentId: true,
          name: true,
        },
        orderBy: { id: 'asc' },
      });
    });
  });
});
