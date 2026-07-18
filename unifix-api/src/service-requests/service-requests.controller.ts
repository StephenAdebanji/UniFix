import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '../../generated/prisma/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { AssignRequestDto } from './dto/assign-request.dto';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { QueryServiceRequestsDto } from './dto/query-service-requests.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ServiceRequestsService } from './service-requests.service';

@ApiTags('service-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('requests')
export class ServiceRequestsController {
  constructor(private readonly service: ServiceRequestsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a new maintenance request' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateServiceRequestDto,
  ) {
    return this.service.create(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List requests scoped to the current role' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryServiceRequestsDto,
  ) {
    return this.service.findAll(user, query);
  }

  @Get('export')
  @Roles(RoleName.ADMINISTRATOR)
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="service-requests.csv"')
  @ApiOperation({ summary: 'Export all requests as CSV (administrator only)' })
  exportCsv(@CurrentUser() user: AuthenticatedUser) {
    return this.service.exportCsv(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single request with its activity log' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.findOne(user, id);
  }

  @Patch(':id/assign')
  @Roles(RoleName.ADMINISTRATOR)
  @ApiOperation({ summary: 'Assign a request to a maintenance officer' })
  assign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignRequestDto,
  ) {
    return this.service.assign(user, id, dto);
  }

  @Patch(':id/status')
  @Roles(RoleName.MAINTENANCE_OFFICER, RoleName.ADMINISTRATOR)
  @ApiOperation({ summary: 'Update the status of a request' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.service.updateStatus(user, id, dto);
  }
}
