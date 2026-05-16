import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GpsPointDto } from './dto/create-gps-batch.dto';

@Injectable()
export class GpsService {
  constructor(private prisma: PrismaService) {}

  async createBatch(companyId: string, userId: string, points: GpsPointDto[]) {
    if (!points?.length)
      throw new BadRequestException('Se requiere al menos un punto GPS');
    if (points.length > 50)
      throw new BadRequestException('Máximo 50 puntos por batch');

    const data = points.map((p) => ({
      companyId,
      userId,
      latitude: p.latitude,
      longitude: p.longitude,
      accuracy: p.accuracy,
      altitude: p.altitude,
      speed: p.speed,
      heading: p.heading,
      batteryLevel: p.batteryLevel,
      recordedAt: new Date(p.recordedAt),
    }));

    const result = await this.prisma.gpsLocation.createMany({ data });
    return { inserted: result.count };
  }

  findByUser(companyId: string, userId: string, from: string, to: string) {
    return this.prisma.gpsLocation.findMany({
      where: {
        companyId,
        userId,
        recordedAt: { gte: new Date(from), lt: new Date(to) },
      },
      orderBy: { recordedAt: 'asc' },
    });
  }

  async getLastPositions(companyId: string) {
    return this.prisma.$queryRaw`
      SELECT DISTINCT ON (user_id) user_id as "userId", latitude, longitude, accuracy, speed, battery_level as "batteryLevel", recorded_at as "recordedAt"
      FROM gps_locations
      WHERE company_id = ${companyId}
      ORDER BY user_id, recorded_at DESC
    `;
  }
}
