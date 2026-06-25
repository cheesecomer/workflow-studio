import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import type { CurrentUser } from '../auth/current-user';
import { CurrentUser as CurrentUserDecorator } from '../auth/current-user.decorator';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { CreateDocumentDto } from './dto/create-document.dto';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  findAll(@CurrentUserDecorator() user: CurrentUser) {
    void user;

    return this.documentsService.findAll();
  }

  @Get(':id')
  findOne(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: bigint) {
    void user;

    return this.documentsService.findOne(id);
  }

  @Post()
  create(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() dto: CreateDocumentDto,
  ) {
    void user;

    return this.documentsService.create(dto);
  }

  @Patch(':id')
  update(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: bigint,
    @Body() dto: UpdateDocumentDto,
  ) {
    void user;

    return this.documentsService.update(id, dto);
  }

  @Delete(':id')
  remove(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: bigint) {
    void user;

    return this.documentsService.remove(id);
  }
}
