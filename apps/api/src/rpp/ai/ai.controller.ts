import {
  BadGatewayException,
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { decrypt } from '../../common/crypto/aes-gcm';
import { PrismaService } from '../../prisma/prisma.service';
import { RPP_ROLES } from '../common/roles';
import { AuthenticatedRequest } from '../common/authenticated-request';
import { RequestUser } from '../common/request-user';
import { denganTenant } from '../common/tenant-data';
import { AiProviderService, baseUrlUntukProvider } from './ai-provider.service';
import { AiQuotaService } from './ai-quota.service';
import { GenerateRppDto } from './dto/generate-rpp.dto';
import { buildRppPrompt } from './rpp-prompt';
import {
  KodeNaungan,
  masterDataUntukKlien,
  validasiKonteksRpp,
} from './master-data';

function tenantIdDari(user: RequestUser): string {
  if (!user.tenantId) {
    throw new ForbiddenException('Konteks tenant tidak ditemukan.');
  }
  return user.tenantId;
}

@Controller('rpp/ai')
@UseGuards(JwtAuthGuard, TenantGuard, SubscriptionGuard, RolesGuard)
@Roles(...RPP_ROLES)
export class AiController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quota: AiQuotaService,
    private readonly provider: AiProviderService,
  ) {}

  // Daftar model AI yang diizinkan untuk paket tenant ini.
  // TIDAK PERNAH mengembalikan encryptedKey ke frontend.
  @Get('models')
  async listModels(@Request() req: AuthenticatedRequest) {
    const tenantId = tenantIdDari(req.user);
    const plan = await this.quota.planForTenant(tenantId);
    const tautan = await this.prisma.planAiModel.findMany({
      where: { plan, aiModel: { isActive: true } },
      include: { aiModel: true },
      orderBy: { aiModel: { displayName: 'asc' } },
    });
    return tautan.map((t) => ({
      id: t.aiModel.id,
      provider: t.aiModel.provider,
      model: t.aiModel.model,
      displayName: t.aiModel.displayName,
    }));
  }

  // Master data naungan → jenjang → mapel (sumber kebenaran tunggal).
  // Dipakai frontend untuk dropdown berjenjang; TANPA data sensitif.
  @Get('master-data')
  masterData() {
    return { naungan: masterDataUntukKlien() };
  }

  // Generate RPP dengan streaming SSE manual: chunk upstream diteruskan
  // apa adanya ke klien, usage diakumulasi dari baris "data:" terakhir.
  @Post('generate')
  async generate(
    @Request() req: AuthenticatedRequest,
    @Body() dto: GenerateRppDto,
    @Res() res: ExpressResponse,
  ): Promise<void> {
    const user = req.user;
    const tenantId = tenantIdDari(user);

    // (a0) Validasi kombinasi naungan → jenjang → kelas → mapel terhadap
    // master data (DTO hanya memvalidasi bentuk, bukan isi).
    const galatKonteks = validasiKonteksRpp(
      dto.naungan,
      dto.jenjang,
      dto.kelas,
      dto.mapel,
    );
    if (galatKonteks.length > 0) {
      throw new BadRequestException(galatKonteks.join(' '));
    }

    // (a) Kuota: ForbiddenException -> Nest mengubah jadi respons 403 JSON.
    const plan = await this.quota.planForTenant(tenantId);
    await this.quota.checkAndReserve(tenantId, plan);

    // (b) Model harus terdaftar DAN diizinkan untuk paket tenant ini.
    const model = await this.prisma.aiModel.findFirst({
      where: {
        id: dto.aiModelId,
        isActive: true,
        planLinks: { some: { plan } },
      },
    });
    if (!model) {
      throw new NotFoundException(
        'Model AI tidak ditemukan atau tidak diizinkan untuk paket sekolah ini.',
      );
    }

    let apiKey: string;
    try {
      apiKey = decrypt(model.encryptedKey);
    } catch {
      throw new BadGatewayException(
        'Kunci API model AI bermasalah. Hubungi admin platform.',
      );
    }

    const { system, user: promptUser } = buildRppPrompt({
      naungan: dto.naungan as KodeNaungan,
      kurikulum: dto.kurikulum,
      jenjang: dto.jenjang,
      kelas: dto.kelas,
      mapel: dto.mapel,
      materiPokok: dto.materiPokok,
      modelPembelajaran: dto.modelPembelajaran,
      durasiMenit: dto.durasiMenit,
      tujuanTambahan: dto.tujuanTambahan,
    });

    let upstream: Response;
    try {
      upstream = await this.provider.chatCompletion({
        baseUrl: baseUrlUntukProvider(model.provider),
        apiKey,
        model: model.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: promptUser },
        ],
        stream: true,
      });
    } catch {
      throw new BadGatewayException(
        'Tidak dapat menghubungi layanan AI. Coba lagi beberapa saat.',
      );
    }

    // (d) Header SSE — mulai dari sini semua error dikirim sebagai event.
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    const kirimEvent = (obj: unknown): void => {
      res.write(`data: ${JSON.stringify(obj)}\n\n`);
    };
    const kirimError = (pesan: string): void => {
      kirimEvent({ type: 'error', message: pesan });
      res.end();
    };

    // (c/d) Batalkan pembacaan bila klien menutup koneksi lebih dulu.
    let selesai = false;
    req.on('close', (): void => {
      selesai = true;
    });

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => '');
      kirimError(
        `Layanan AI mengembalikan galat (${upstream.status}). ${
          detail ? 'Coba lagi beberapa saat.' : ''
        }`.trim(),
      );
      return;
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      for (;;) {
        if (selesai) {
          await reader.cancel().catch((): void => undefined);
          break;
        }
        const { done, value } = await reader.read();
        if (done) break;

        // Teruskan bytes upstream apa adanya ke klien.
        res.write(value);

        // Akumulasi teks & usage dari baris "data:" JSON.
        const teks = decoder.decode(value, { stream: true });
        for (const baris of teks.split('\n')) {
          const rapi = baris.trim();
          if (!rapi.startsWith('data:')) continue;
          const muatan = rapi.slice(5).trim();
          if (!muatan || muatan === '[DONE]') continue;
          try {
            const json = JSON.parse(muatan) as {
              usage?: {
                prompt_tokens?: number;
                completion_tokens?: number;
                input_tokens?: number;
                output_tokens?: number;
              };
            };
            const u = json.usage;
            if (u) {
              const masuk = u.prompt_tokens ?? u.input_tokens;
              const keluar = u.completion_tokens ?? u.output_tokens;
              if (typeof masuk === 'number' && masuk > inputTokens) inputTokens = masuk;
              if (typeof keluar === 'number' && keluar > outputTokens) outputTokens = keluar;
            }
          } catch {
            // Baris SSE non-JSON (mis. komentar keep-alive): abaikan.
          }
        }
      }
    } catch {
      kirimError('Koneksi ke layanan AI terputus di tengah jalan. Coba lagi.');
      return;
    }

    // (e) Catat pemakaian kuota + log audit AI, lalu tutup stream.
    try {
      await this.quota.recordUsage(tenantId, inputTokens, outputTokens);
      await this.prisma.aiUsageLog.create({
        data: denganTenant(user, {
          userId: user.userId,
          aiModelId: model.id,
          tokensInput: inputTokens,
          tokensOutput: outputTokens,
        }),
      });
    } catch {
      // Kegagalan pencatatan tidak boleh menggagalkan hasil yang
      // sudah diterima klien.
    }

    kirimEvent({
      type: 'done',
      aiModelId: model.id,
      tokensInput: inputTokens,
      tokensOutput: outputTokens,
    });
    res.end();
  }
}
