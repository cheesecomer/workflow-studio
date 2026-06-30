import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
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
  findAll(@CurrentUserDecorator() user: CurrentUser) {
    return this.submissionsService.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: bigint) {
    void user;
    return this.submissionsService.findOne(id);
  }

  @Patch(':id')
  update(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: bigint,
    @Body() updateSubmissionDto: UpdateSubmissionDto,
  ) {
    void user;
    return this.submissionsService.update(id, updateSubmissionDto);
  }

  @Delete(':id')
  remove(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: bigint) {
    void user;
    return this.submissionsService.remove(id);
  }
}
