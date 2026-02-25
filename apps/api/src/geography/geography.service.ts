import { loadApiEnv } from '@adottaungatto/config';
import type { LocationIntent, LocationIntentScope } from '@adottaungatto/types';
import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

export type GeographyRegion = {
  id: string;
  istatCode: string;
  name: string;
};

export type GeographyProvince = {
  id: string;
  regionId: string;
  istatCode: string;
  name: string;
  sigla: string;
};

export type GeographyComune = {
  id: string;
  regionId: string;
  provinceId: string;
  istatCode: string;
  name: string;
  codeCatastale: string | null;
};

export type GeographySearchItem = {
  type: LocationIntentScope;
  id: string;
  name: string;
  label: string;
  secondaryLabel: string | null;
  istatCode: string | null;
  regionId: string | null;
  provinceId: string | null;
  comuneId: string | null;
  regionName: string | null;
  provinceName: string | null;
  sigla: string | null;
  locationIntent: LocationIntent;
};

type GeographySearchRow = {
  suggestionType: LocationIntentScope;
  entityId: string;
  istatCode: string | null;
  name: string;
  regionId: string | null;
  provinceId: string | null;
  comuneId: string | null;
  regionName: string | null;
  provinceName: string | null;
  sigla: string | null;
};

@Injectable()
export class GeographyService implements OnModuleDestroy {
  private readonly env = loadApiEnv();
  private readonly pool = new Pool({
    connectionString: this.env.DATABASE_URL,
  });

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async findRegions(): Promise<GeographyRegion[]> {
    const result = await this.pool.query<GeographyRegion>(
      `
        SELECT
          id::text AS "id",
          istat_code AS "istatCode",
          name
        FROM regions
        ORDER BY name ASC;
      `,
    );

    return result.rows;
  }

  async findProvincesByRegionId(regionId: string): Promise<GeographyProvince[]> {
    const result = await this.pool.query<GeographyProvince>(
      `
        SELECT
          id::text AS "id",
          region_id::text AS "regionId",
          istat_code AS "istatCode",
          name,
          sigla
        FROM provinces
        WHERE region_id = $1::bigint
        ORDER BY name ASC;
      `,
      [regionId],
    );

    return result.rows;
  }

  async findComuniByProvinceId(provinceId: string): Promise<GeographyComune[]> {
    const result = await this.pool.query<GeographyComune>(
      `
        SELECT
          id::text AS "id",
          region_id::text AS "regionId",
          province_id::text AS "provinceId",
          istat_code AS "istatCode",
          name,
          code_catastale AS "codeCatastale"
        FROM comuni
        WHERE province_id = $1::bigint
        ORDER BY name ASC;
      `,
      [provinceId],
    );

    return result.rows;
  }

  async search(queryText: string, limit: number): Promise<GeographySearchItem[]> {
    const result = await this.pool.query<GeographySearchRow>(
      `
        SELECT
          scope.type AS "suggestionType",
          scope.id AS "entityId",
          scope."istatCode",
          scope.name,
          scope."regionId",
          scope."provinceId",
          scope."comuneId",
          scope."regionName",
          scope."provinceName",
          scope.sigla
        FROM (
          SELECT
            'comune'::text AS type,
            c.id::text AS id,
            c.istat_code AS "istatCode",
            c.name,
            c.region_id::text AS "regionId",
            c.province_id::text AS "provinceId",
            c.id::text AS "comuneId",
            r.name AS "regionName",
            p.name AS "provinceName",
            p.sigla,
            CASE
              WHEN LOWER(c.name) = LOWER($1) THEN 0
              WHEN LOWER(c.name) LIKE LOWER($1) || '%' THEN 1
              ELSE 2
            END AS match_rank,
            1 AS type_rank
          FROM comuni c
          JOIN provinces p ON p.id = c.province_id
          JOIN regions r ON r.id = c.region_id
          WHERE c.name ILIKE '%' || $1 || '%'

          UNION ALL

          SELECT
            'comune_plus_province'::text AS type,
            c.id::text AS id,
            c.istat_code AS "istatCode",
            c.name,
            c.region_id::text AS "regionId",
            c.province_id::text AS "provinceId",
            c.id::text AS "comuneId",
            r.name AS "regionName",
            p.name AS "provinceName",
            p.sigla,
            CASE
              WHEN LOWER(c.name) = LOWER($1) THEN 0
              WHEN LOWER(c.name) LIKE LOWER($1) || '%' THEN 1
              ELSE 2
            END AS match_rank,
            2 AS type_rank
          FROM comuni c
          JOIN provinces p ON p.id = c.province_id
          JOIN regions r ON r.id = c.region_id
          WHERE c.name ILIKE '%' || $1 || '%'

          UNION ALL

          SELECT
            'province'::text AS type,
            p.id::text AS id,
            p.istat_code AS "istatCode",
            p.name,
            p.region_id::text AS "regionId",
            p.id::text AS "provinceId",
            NULL::text AS "comuneId",
            r.name AS "regionName",
            p.name AS "provinceName",
            p.sigla,
            CASE
              WHEN LOWER(p.name) = LOWER($1) THEN 0
              WHEN LOWER(p.name) LIKE LOWER($1) || '%' THEN 1
              ELSE 2
            END AS match_rank,
            3 AS type_rank
          FROM provinces p
          JOIN regions r ON r.id = p.region_id
          WHERE p.name ILIKE '%' || $1 || '%' OR p.sigla ILIKE $1 || '%'

          UNION ALL

          SELECT
            'region'::text AS type,
            r.id::text AS id,
            r.istat_code AS "istatCode",
            r.name,
            r.id::text AS "regionId",
            NULL::text AS "provinceId",
            NULL::text AS "comuneId",
            r.name AS "regionName",
            NULL::text AS "provinceName",
            NULL::text AS sigla,
            CASE
              WHEN LOWER(r.name) = LOWER($1) THEN 0
              WHEN LOWER(r.name) LIKE LOWER($1) || '%' THEN 1
              ELSE 2
            END AS match_rank,
            4 AS type_rank
          FROM regions r
          WHERE r.name ILIKE '%' || $1 || '%'

          UNION ALL

          SELECT
            'italy'::text AS type,
            'italy'::text AS id,
            NULL::text AS "istatCode",
            'Tutta Italia'::text AS name,
            NULL::text AS "regionId",
            NULL::text AS "provinceId",
            NULL::text AS "comuneId",
            NULL::text AS "regionName",
            NULL::text AS "provinceName",
            NULL::text AS sigla,
            0 AS match_rank,
            5 AS type_rank
          WHERE 'italia' ILIKE '%' || $1 || '%' OR 'tutta italia' ILIKE '%' || $1 || '%'
        ) scope
        ORDER BY scope.match_rank ASC, scope.type_rank ASC, scope.name ASC
        LIMIT $2;
      `,
      [queryText, limit],
    );

    return result.rows.map((row) => this.mapSearchRow(row));
  }

  private mapSearchRow(row: GeographySearchRow): GeographySearchItem {
    const siglaSuffix = row.sigla ? ` (${row.sigla})` : '';

    if (row.suggestionType === 'italy') {
      return this.createSearchItem(row, {
        label: 'Tutta Italia',
        secondaryLabel: 'Ricerca nazionale',
        scope: 'italy',
      });
    }

    if (row.suggestionType === 'region') {
      return this.createSearchItem(row, {
        label: row.name,
        secondaryLabel: 'Regione',
        scope: 'region',
      });
    }

    if (row.suggestionType === 'province') {
      return this.createSearchItem(row, {
        label: `${row.name}${siglaSuffix}`,
        secondaryLabel: row.regionName ? `Provincia - ${row.regionName}` : 'Provincia',
        scope: 'province',
      });
    }

    if (row.suggestionType === 'comune_plus_province') {
      const provinceLabel = row.provinceName ?? row.name;
      return this.createSearchItem(row, {
        label: `${row.name} e provincia${siglaSuffix}`,
        secondaryLabel: row.regionName
          ? `Provincia - ${provinceLabel}, ${row.regionName}`
          : `Provincia - ${provinceLabel}`,
        scope: 'comune_plus_province',
      });
    }

    const comuneLabel = `${row.name}${siglaSuffix}`;
    return this.createSearchItem(row, {
      label: comuneLabel,
      secondaryLabel:
        row.provinceName && row.regionName
          ? `Comune - ${row.provinceName}, ${row.regionName}`
          : 'Comune',
      scope: 'comune',
    });
  }

  private createSearchItem(
    row: GeographySearchRow,
    context: {
      label: string;
      secondaryLabel: string | null;
      scope: LocationIntentScope;
    },
  ): GeographySearchItem {
    const locationIntent: LocationIntent = {
      scope: context.scope,
      regionId: row.regionId,
      provinceId: row.provinceId,
      comuneId: row.comuneId,
      label: context.label,
      secondaryLabel: context.secondaryLabel,
    };

    return {
      type: context.scope,
      id: row.entityId,
      name: row.name,
      label: context.label,
      secondaryLabel: context.secondaryLabel,
      istatCode: row.istatCode,
      regionId: row.regionId,
      provinceId: row.provinceId,
      comuneId: row.comuneId,
      regionName: row.regionName,
      provinceName: row.provinceName,
      sigla: row.sigla,
      locationIntent,
    };
  }
}
