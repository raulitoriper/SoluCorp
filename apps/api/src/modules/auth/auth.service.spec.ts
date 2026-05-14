import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../../common/prisma/prisma.service';

// Mock a nivel de módulo para evitar el problema de "Cannot redefine property"
// que ocurre con bcrypt cuando jest.spyOn intenta redefinir propiedades non-configurable
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require('bcrypt') as { compare: jest.Mock; hash: jest.Mock };

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock };
    refreshToken: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
  };
  let jwtService: { sign: jest.Mock };

  const mockUser = {
    id: 'user-1',
    email: 'test@empresa.com',
    passwordHash: '$bcrypt$hashed',
    isActive: true,
    firstName: 'Juan',
    lastName: 'Perez',
    role: 'FIELD_WORKER',
    companyId: 'cmp-1',
    company: {
      name: 'Empresa Test',
      subscription: { status: 'ACTIVE' },
      modules: [{ module: 'VISITS' }],
      settings: {
        gpsTrackingIntervalMs: 300000,
        timezone: 'America/Asuncion',
        currency: 'PYG',
      },
    },
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    jwtService = { sign: jest.fn().mockReturnValue('access_token_mock') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-secret') },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('con credenciales válidas → retorna access_token y refresh_token con companyId en payload', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt-1', token: 'refresh-tok' });
      prisma.user.update.mockResolvedValue({});

      bcrypt.compare.mockResolvedValue(true);

      const result = await service.login({ email: 'test@empresa.com', password: 'Password123!' });

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result.user.companyId).toBe('cmp-1');

      // Verifica que el payload del JWT incluya companyId
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 'cmp-1' }),
        expect.any(Object),
      );
    });

    it('con email inexistente → lanza UnauthorizedException', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'noexiste@empresa.com', password: 'cualquier' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('con usuario inactivo → lanza UnauthorizedException', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(
        service.login({ email: 'test@empresa.com', password: 'Password123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('con password incorrecta → lanza UnauthorizedException', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@empresa.com', password: 'wrongpass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('con suscripción suspendida → lanza ForbiddenException', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        company: { ...mockUser.company, subscription: { status: 'SUSPENDED' } },
      });
      bcrypt.compare.mockResolvedValue(true);

      await expect(
        service.login({ email: 'test@empresa.com', password: 'Password123!' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('refresh', () => {
    const mockStoredToken = {
      id: 'rt-stored',
      userId: 'user-1',
      token: 'valid-refresh-token',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 86400000), // mañana
    };

    it('con token válido → retorna nuevo access_token y refresh_token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(mockStoredToken);
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.refreshToken.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt-2' });

      const result = await service.refresh('valid-refresh-token');

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
    });

    it('con token revocado → lanza UnauthorizedException', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        ...mockStoredToken,
        revokedAt: new Date(),
      });

      await expect(service.refresh('revoked-token')).rejects.toThrow(UnauthorizedException);
    });

    it('con token expirado → lanza UnauthorizedException', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        ...mockStoredToken,
        expiresAt: new Date(Date.now() - 86400000), // ayer
      });

      await expect(service.refresh('expired-token')).rejects.toThrow(UnauthorizedException);
    });

    it('con token inexistente → lanza UnauthorizedException', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh('nonexistent-token')).rejects.toThrow(UnauthorizedException);
    });
  });
});
