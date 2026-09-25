import { IsNotEmpty, IsString, MinLength } from 'class-validator';

// DTO login: kode_sekolah + username + password.
export class LoginDto {
  @IsString()
  @IsNotEmpty()
  kodeSekolah: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
