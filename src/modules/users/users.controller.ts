import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('users')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @Roles('admin', 'vendedor', 'almacen')
  async getMe(@Request() req) {
    return req.user;
  }

  @Get('vendors')
  @Roles('admin', 'vendedor', 'almacen')
  async findAllVendors() {
    return this.usersService.findAllVendors();
  }

  @Get('vendors/:id')
  @Roles('admin', 'vendedor', 'almacen')
  async findVendorById(@Param('id') id: string) {
    return this.usersService.findVendorById(id);
  }

  @Post('vendors')
  @Roles('admin')
  async createVendor(@Body() dto: CreateVendorDto) {
    return this.usersService.createVendor(dto);
  }

  @Put('vendors/:id')
  @Roles('admin')
  async updateVendor(@Param('id') id: string, @Body() dto: UpdateVendorDto) {
    return this.usersService.updateVendor(id, dto);
  }
}
