import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

// Update model AI: bila apiKey diisi (plaintext), key dienkripsi ulang;
// bila dikosongkan, key lama tetap dipakai.
export class UpdateAiModelDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  apiKey?: string;
}
