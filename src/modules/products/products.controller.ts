import { Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards, Query, BadRequestException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('products')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Roles('admin', 'vendedor', 'almacen')
  async findAll() {
    return this.productsService.findAll();
  }

  @Get('reports/production')
  @Roles('admin', 'almacen')
  async getDailyProductionReport(@Query('fecha') dateStr?: string) {
    return this.productsService.getProductionReport(dateStr);
  }

  @Get(':id')
  @Roles('admin', 'vendedor', 'almacen')
  async findById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Post()
  @Roles('admin')
  async create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Put(':id')
  @Roles('admin')
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  async delete(@Param('id') id: string) {
    return this.productsService.delete(id);
  }

  @Patch(':id/stock')
  @Roles('admin', 'almacen')
  async updateStock(
    @Param('id') id: string,
    @Body() dto: UpdateStockDto,
    @CurrentUser() user: any,
  ) {
    if (user.rol === 'almacen' && dto.cantidad <= 0) {
      throw new BadRequestException('El encargado de almacén solo puede sumar al stock de los productos.');
    }
    return this.productsService.updateStockAndLog(id, dto.cantidad, user.id);
  }
}
