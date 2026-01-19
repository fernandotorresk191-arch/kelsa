/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsInt, IsString, Min } from 'class-validator';

export class AddItemDto {
  @IsString()
  cartToken: string;

  @IsString()
  productId: string;

  @IsInt()
  @Min(1)
  qty: number;
}

export class UpdateQtyDto {
  @IsString()
  cartToken: string;

  @IsInt()
  @Min(1)
  qty: number;
}

export class RemoveItemDto {
  @IsString()
  cartToken: string;
}
