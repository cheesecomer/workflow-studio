import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { CurrentUser } from '../auth/current-user';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';

describe('SubmissionsController', () => {
  let controller: SubmissionsController;

  const submissionService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const currentUser: CurrentUser = {
    id: 1000n,
    email: 'dev@example.com',
    name: 'Dev User',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubmissionsController],
      providers: [
        {
          provide: SubmissionsService,
          useValue: submissionService,
        },
      ],
    }).compile();

    controller = module.get<SubmissionsController>(SubmissionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('delegates to service with current user id', async () => {
      await controller.findAll(currentUser);

      expect(submissionService.findAll).toHaveBeenCalledWith(currentUser.id);
    });
  });

  describe('findOne', () => {
    it('delegates to service with current user id and document id', async () => {
      await controller.findOne(currentUser, 1n);

      expect(submissionService.findOne).toHaveBeenCalledWith(1n);
    });
  });

  describe('create', () => {
    it('delegates to service with current user id and dto', async () => {
      const dto: CreateSubmissionDto = {
        documentDefinitionId: 1n,
        fieldValues: [],
      };

      await controller.create(currentUser, dto);

      expect(submissionService.create).toHaveBeenCalledWith(
        dto,
        currentUser.id,
      );
    });
  });

  describe('update', () => {
    it('delegates to service with current user id, document id and dto', async () => {
      const dto: UpdateSubmissionDto = {
        fieldValues: [],
      };

      await controller.update(currentUser, 1n, dto);

      expect(submissionService.update).toHaveBeenCalledWith(1n, dto);
    });
  });

  describe('remove', () => {
    it('delegates to service with current user id and document id', async () => {
      await controller.remove(currentUser, 1n);

      expect(submissionService.remove).toHaveBeenCalledWith(1n);
    });
  });
});
