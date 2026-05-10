import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        company: {
          include: {
            subscription: true,
            modules: { where: { isEnabled: true } },
            settings: true,
          },
        },
      },
    });

    if (!user || !user.isActive) throw new UnauthorizedException('Credenciales inválidas');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    // Verificar suscripción de la empresa (no aplica a SUPER_ADMIN)
    if (user.company?.subscription?.status === 'SUSPENDED') {
      throw new ForbiddenException('Suscripción suspendida. Contacte a SoluCorp.');
    }

    // Generar tokens
    const payload = { sub: user.id, email: user.email, role: user.role, companyId: user.companyId };
    const access_token = this.jwtService.sign(payload, { expiresIn: '8h' });
    const refresh_token = crypto.randomBytes(64).toString('hex');

    // Guardar refresh token
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refresh_token,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
      },
    });

    // Actualizar último login
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId,
        companyName: user.company?.name ?? null,
      },
      enabledModules: user.company?.modules.map((m) => m.module) ?? [],
      config: user.company?.settings ? {
        gpsTrackingIntervalMs: user.company.settings.gpsTrackingIntervalMs,
        timezone: user.company.settings.timezone,
        currency: user.company.settings.currency,
      } : { gpsTrackingIntervalMs: 300000, timezone: 'America/Asuncion', currency: 'PYG' },
    };
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Token de refresco inválido o expirado');
    }

    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || !user.isActive) throw new UnauthorizedException('Usuario inválido');

    // Revocar token anterior
    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });

    // Generar nuevos tokens
    const payload = { sub: user.id, email: user.email, role: user.role, companyId: user.companyId };
    const access_token = this.jwtService.sign(payload, { expiresIn: '8h' });
    const new_refresh = crypto.randomBytes(64).toString('hex');

    await this.prisma.refreshToken.create({
      data: { userId: user.id, token: new_refresh, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    });

    return { access_token, refresh_token: new_refresh };
  }
}
