import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface AdminLastPositionRow {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  batteryLevel: number | null;
  recordedAt: Date;
  userName: string | null;
}

@Injectable()
export class AdminGpsService {
  constructor(private readonly prisma: PrismaService) {}

  async getLastPositions(companyId?: string): Promise<AdminLastPositionRow[]> {
    const whereClause = companyId
      ? Prisma.sql`WHERE gl.company_id = ${companyId}`
      : Prisma.empty;

    return this.prisma.$queryRaw<AdminLastPositionRow[]>`
      SELECT DISTINCT ON (gl.user_id)
        gl.user_id        AS "userId",
        gl.latitude       AS "latitude",
        gl.longitude      AS "longitude",
        gl.accuracy       AS "accuracy",
        gl.speed          AS "speed",
        gl.battery_level  AS "batteryLevel",
        gl.recorded_at    AS "recordedAt",
        CASE
          WHEN u.id IS NOT NULL
          THEN CONCAT(u.first_name, ' ', u.last_name)
          ELSE NULL
        END               AS "userName"
      FROM gps_locations gl
      LEFT JOIN users u ON u.id = gl.user_id
      ${whereClause}
      ORDER BY gl.user_id, gl.recorded_at DESC
    `;
  }
}
