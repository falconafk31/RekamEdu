import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

// apiKey diisi sebagai PLAINTEXT saat input — langsung dienkripsi di service
// dengan encrypt() dan TIDAK PERNAH disimpan dalam bentuk plaintext.
export class CreateAiModelDto {
  @IsString()
  @MaxLength(50)
  provider: string; // mis. "openai"

  @IsString()
  @MaxLength(100)
  model: string; // mis. "gpt-4o-mini"

  @IsString()
  @MaxLength(100)
  displayName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  apiKey: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
