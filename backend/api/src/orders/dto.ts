/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  cartToken: string;

  @IsString()
  @MinLength(2)
  customerName: string;

  @IsString()
  phone: string;

  @IsString()
  addressLine: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsString()
  settlement?: string;
}
