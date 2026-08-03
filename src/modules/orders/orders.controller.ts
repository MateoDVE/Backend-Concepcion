import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('orders')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @Roles('admin', 'vendedor', 'almacen')
  async findAll(
    @Query('estado') estado?: string,
    @Query('vendedor_id') vendedorId?: string,
    @Query('cliente_id') clienteId?: string
  ) {
    return this.ordersService.findAll({ estado, vendedor_id: vendedorId, cliente_id: clienteId });
  }

  @Get('suggested-price')
  @Roles('admin', 'vendedor')
  async getSuggestedPrice(
    @Query('clientId', ParseUUIDPipe) clientId: string,
    @Query('productId', ParseUUIDPipe) productId: string
  ) {
    const price = await this.ordersService.getSuggestedPrice(clientId, productId);
    return { suggestedPrice: price };
  }

  @Get(':id')
  @Roles('admin', 'vendedor', 'almacen')
  async findById(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Post()
  @Roles('admin', 'vendedor')
  async create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Put(':id')
  @Roles('admin', 'vendedor')
  async update(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.ordersService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles('admin', 'vendedor')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  async delete(@Param('id') id: string) {
    return this.ordersService.delete(id);
  }
}
