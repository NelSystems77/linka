import { IsEmail, IsEnum, IsIn, IsString, MinLength, MaxLength } from 'class-validator'

export class CreateUserDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  displayName!: string

  @IsEnum(['admin', 'user'])
  role!: 'admin' | 'user'

  @IsEnum(['free', 'full'])
  plan!: 'free' | 'full'

  @IsIn([3, 6, 9, 12])
  cycleMonths!: 3 | 6 | 9 | 12

  @IsString()
  @MinLength(8)
  temporaryPassword!: string
}
