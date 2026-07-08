import { Test, TestingModule } from '@nestjs/testing';
import type { CurrentUser } from '../auth/current-user';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { PublishDocumentDto } from './dto/publish-document.dto';

describe('DocumentsController', () => {
  let controller: DocumentsController;

  const documentsService = {
    findAll: jest.fn(),
    findSubmittable: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    publish: jest.fn(),
  };

  const currentUser: CurrentUser = {
    id: 1000n,
    email: 'dev@example.com',
    name: 'Dev User',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        {
          provide: DocumentsService,
          useValue: documentsService,
        },
      ],
    }).compile();

    controller = module.get<DocumentsController>(DocumentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('delegates to service with current user id', async () => {
      await controller.findAll(currentUser);

      expect(documentsService.findAll).toHaveBeenCalledWith();
    });
  });

  describe('findSubmittable', () => {
    it('delegates to service with current user id', async () => {
      await controller.findSubmittable(currentUser);

      expect(documentsService.findSubmittable).toHaveBeenCalledWith();
    });
  });

  describe('findOne', () => {
    it('delegates to service with current user id and document id', async () => {
      await controller.findOne(currentUser, 1n);

      expect(documentsService.findOne).toHaveBeenCalledWith(1n);
    });
  });

  describe('create', () => {
    it('delegates to service with current user id and dto', async () => {
      const dto: CreateDocumentDto = {
        name: 'Expense Request',
        draftContent: {
          fields: [],
        },
      };

      await controller.create(currentUser, dto);

      expect(documentsService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('delegates to service with current user id, document id and dto', async () => {
      const dto: UpdateDocumentDto = {
        name: 'Updated Expense Request',
        draftContent: {},
      };

      await controller.update(currentUser, 1n, dto);

      expect(documentsService.update).toHaveBeenCalledWith(1n, dto);
    });
  });

  describe('remove', () => {
    it('delegates to service with current user id and document id', async () => {
      await controller.remove(currentUser, 1n);

      expect(documentsService.remove).toHaveBeenCalledWith(1n);
    });
  });

  describe('publish', () => {
    it('delegates to service with current user id, document id and dto', async () => {
      const dto: PublishDocumentDto = {
        name: 'Updated Expense Request',
        draftContent: {
          groups: [
            {
              key: 'basic',
              label: '基本情報',
              repeatable: false,
              minRows: 1,
              fields: [
                {
                  key: 'price',
                  label: '申請額',
                  fieldType: 'number',
                  required: true,
                  settings: {},
                },
              ],
            },
          ],
          workflow: {
            policies: [
              {
                name: 'Example Policy',
                condition: null,
                operator: 'all',
                requirements: [
                  {
                    name: 'Require 3 users',
                    departmentScope: 'same_tree',
                    positionOperator: 'eq',
                    positionId: 1n,
                    requiredCount: 3,
                  },
                ],
              },
            ],
          },
        },
      };

      await controller.publish(currentUser, 1n, dto);

      expect(documentsService.publish).toHaveBeenCalledWith(
        1n,
        dto,
        currentUser.id,
      );
    });
  });
});
