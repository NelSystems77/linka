import { IsIn } from 'class-validator'

export class RenewUserDto {
  @IsIn([3, 6, 9, 12])
  cycleMonths!: 3 | 6 | 9 | 12
}
