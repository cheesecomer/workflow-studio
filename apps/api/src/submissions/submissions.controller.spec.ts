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
    submit: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    withdraw: jest.fn(),
    findApprovable: jest.fn(),
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
    it('delegates to service with current user id and submission id', async () => {
      await controller.findOne(currentUser, 1n);

      expect(submissionService.findOne).toHaveBeenCalledWith(
        1n,
        currentUser.id,
      );
    });
  });

  describe('create', () => {
    it('delegates to service with current user id and dto', async () => {
      const dto: CreateSubmissionDto = {
        documentDefinitionId: 1n,
        fieldGroupRows: [],
      };

      await controller.create(currentUser, dto);

      expect(submissionService.create).toHaveBeenCalledWith(
        dto,
        currentUser.id,
      );
    });
  });

  describe('update', () => {
    it('delegates to service with current user id, submission id and dto', async () => {
      const dto: UpdateSubmissionDto = {
        fieldGroupRows: [],
      };

      await controller.update(currentUser, 1n, dto);

      expect(submissionService.update).toHaveBeenCalledWith(1n, dto);
    });
  });

  describe('remove', () => {
    it('delegates to service with current user id and submission id', async () => {
      await controller.remove(currentUser, 1n);

      expect(submissionService.remove).toHaveBeenCalledWith(1n);
    });
  });

  describe('submit', () => {
    it('delegates to service with current user id and submission id', async () => {
      await controller.submit(currentUser, 1n);

      expect(submissionService.submit).toHaveBeenCalledWith(1n, currentUser.id);
    });
  });

  describe('approve', () => {
    it('delegates to service with current user id and submission id', async () => {
      await controller.approve(currentUser, 1n);

      expect(submissionService.approve).toHaveBeenCalledWith(
        1n,
        currentUser.id,
      );
    });
  });

  describe('reject', () => {
    it('delegates to service with current user id and submission id', async () => {
      await controller.reject(currentUser, 1n);

      expect(submissionService.reject).toHaveBeenCalledWith(1n, currentUser.id);
    });
  });

  describe('withdraw', () => {
    it('delegates to service with current user id and submission id', async () => {
      await controller.withdraw(currentUser, 1n);

      expect(submissionService.withdraw).toHaveBeenCalledWith(
        1n,
        currentUser.id,
      );
    });
  });

  describe('remove', () => {
    it('delegates to service with current user id', async () => {
      await controller.findApprovable(currentUser);

      expect(submissionService.findApprovable).toHaveBeenCalledWith(
        currentUser.id,
      );
    });
  });
});
