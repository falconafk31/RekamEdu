import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

// Parameter paginasi standar untuk seluruh endpoint list modul perpus.
// Global ValidationPipe (transform: true) mengonversi string query
// menjadi number lewat @Type(() => Number).
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page harus bilangan bulat.' })
  @Min(1, { message: 'page minimal 1.' })
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit harus bilangan bulat.' })
  @Min(1, { message: 'limit minimal 1.' })
  @Max(100, { message: 'limit maksimal 100.' })
  limit = 20;
}

// Mengubah query paginasi menjadi skip/take Prisma.
export function toPagination(query: PaginationQueryDto): {
  skip: number;
  take: number;
} {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  return { skip: (page - 1) * limit, take: limit };
}
