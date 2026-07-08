import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { ApproveSubmissionDto } from './dto/approve-submission.dto';
import { RejectSubmissionDto } from './dto/reject-submission.dto';
import type { CurrentUser } from '../auth/current-user';
import { CurrentUser as CurrentUserDecorator } from '../auth/current-user.decorator';

@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  create(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() createSubmissionDto: CreateSubmissionDto,
  ) {
    return this.submissionsService.create(createSubmissionDto, user.id);
  }

  @Get()
  findAll(
    @CurrentUserDecorator() user: CurrentUser,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.submissionsService.findAll(user.id, status, { page, limit });
  }

  @Get('/approvable')
  findApprovable(@CurrentUserDecorator() user: CurrentUser) {
    return this.submissionsService.findApprovable(user.id);
  }

  @Get(':id')
  findOne(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: bigint) {
    return this.submissionsService.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: bigint,
    @Body() updateSubmissionDto: UpdateSubmissionDto,
  ) {
    return this.submissionsService.update(id, updateSubmissionDto, user.id);
  }

  @Delete(':id')
  remove(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: bigint) {
    return this.submissionsService.remove(id, user.id);
  }

  @Post(':id/submit')
  submit(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: bigint) {
    return this.submissionsService.submit(id, user.id);
  }

  @Post(':id/approve')
  approve(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: bigint,
    @Body() approveSubmissionDto: ApproveSubmissionDto,
  ) {
    return this.submissionsService.approve(id, user.id, approveSubmissionDto);
  }

  @Post(':id/reject')
  reject(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: bigint,
    @Body() rejectSubmissionDto: RejectSubmissionDto,
  ) {
    return this.submissionsService.reject(id, user.id, rejectSubmissionDto);
  }

  @Post(':id/withdraw')
  withdraw(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: bigint) {
    return this.submissionsService.withdraw(id, user.id);
  }
}
