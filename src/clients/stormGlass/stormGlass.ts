import { Request } from '@src/util/request';
import { ForecastPoint } from '@src/clients/modules/forecastPoint';
import { StormGlassForecastResponse } from '@src/clients/modules/stormGlassForecastResponse';
import { StormGlassPoint } from '@src/clients/modules/stormGlassPoint';
import { StormGlassResponseError } from '@src/util/errors/stormGlassResponseError';
import { ClientRequestError } from '@src/util/errors/clientRequestError';

export class StormGlass {
  readonly stormGlassAPIParams =
    'swellDirection,swellHeight,swellPeriod,waveDirection,waveHeight,windDirection,windSpeed';
  readonly stormGlassAPISource = 'noaa';

  constructor(protected request = new Request()) {}

  public async fetchPoints(lat: number, lng: number): Promise<ForecastPoint[]> {
    try {
      const baseUrl = process.env.STORMGLASS_BASE_URL;
      const token = process.env.STORMGLASS_TOKEN;

      const response = await this.request.get<StormGlassForecastResponse>(
        `${baseUrl}/weather/point?lat=${lat}&lng=${lng}&params=${this.stormGlassAPIParams}&source=${this.stormGlassAPISource}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return this.normalizeResponse(response.data);
    } catch (err) {
      // This is handling the Axios errors specifically
      if (err instanceof Error && Request.isRequestError(err)) {
        const error = Request.extractErrorData(err);
        throw new StormGlassResponseError(`Error: ${JSON.stringify(error.data)} Code: ${error.status}`);
      }

      // The type is temporary given we will rework it in the upcoming chapters
      throw new ClientRequestError(JSON.stringify(err));
    }
  }

  private normalizeResponse(points: StormGlassForecastResponse): ForecastPoint[] {
    return points.hours.filter(this.isValidPoint.bind(this)).map((point) => ({
      time: point.time,
      waveHeight: point.waveHeight[this.stormGlassAPISource],
      waveDirection: point.waveDirection[this.stormGlassAPISource],
      swellDirection: point.swellDirection[this.stormGlassAPISource],
      swellHeight: point.swellHeight[this.stormGlassAPISource],
      swellPeriod: point.swellPeriod[this.stormGlassAPISource],
      windDirection: point.windDirection[this.stormGlassAPISource],
      windSpeed: point.windSpeed[this.stormGlassAPISource],
    }));
  }

  private isValidPoint(point: Partial<StormGlassPoint>): boolean {
    return !!(
      point.time &&
      point.waveHeight?.[this.stormGlassAPISource] &&
      point.waveDirection?.[this.stormGlassAPISource] &&
      point.swellDirection?.[this.stormGlassAPISource] &&
      point.swellHeight?.[this.stormGlassAPISource] &&
      point.swellPeriod?.[this.stormGlassAPISource] &&
      point.windDirection?.[this.stormGlassAPISource] &&
      point.windSpeed?.[this.stormGlassAPISource]
    );
  }
}
