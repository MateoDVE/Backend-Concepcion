import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { SetSpecialPriceDto } from './dto/set-special-price.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('clients')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @Roles('admin', 'vendedor')
  async findAll(@Query('search') search?: string) {
    return this.clientsService.findAll(search);
  }

  @Get(':id')
  @Roles('admin', 'vendedor')
  async findById(@Param('id') id: string) {
    return this.clientsService.findById(id);
  }

  @Post()
  @Roles('admin')
  async create(@Body() dto: CreateClientDto) {
    return this.clientsService.create(dto);
  }

  @Put(':id')
  @Roles('admin')
  async update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  async delete(@Param('id') id: string) {
    return this.clientsService.delete(id);
  }

  @Get(':id/orders')
  @Roles('admin', 'vendedor')
  async findHistory(@Param('id') id: string) {
    return this.clientsService.findHistory(id);
  }

  @Get(':id/special-prices')
  @Roles('admin', 'vendedor')
  async getSpecialPrices(@Param('id') id: string) {
    return this.clientsService.getSpecialPrices(id);
  }

  @Post(':id/special-prices')
  @Roles('admin')
  async setSpecialPrice(@Param('id') id: string, @Body() dto: SetSpecialPriceDto) {
    return this.clientsService.setSpecialPrice(id, dto);
  }

  @Delete(':id/special-prices/:productId')
  @Roles('admin')
  async deleteSpecialPrice(@Param('id') id: string, @Param('productId') productId: string) {
    return this.clientsService.deleteSpecialPrice(id, productId);
  }
}
