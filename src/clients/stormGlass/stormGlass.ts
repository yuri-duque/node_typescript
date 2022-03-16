import axios, { AxiosError, AxiosStatic } from 'axios';
import { ForecastPoint } from '@src/clients/modules/forecastPoint';
import { StormGlassForecastResponse } from '@src/clients/modules/stormGlassForecastResponse';
import { StormGlassPoint } from '@src/clients/modules/stormGlassPoint';
import { InternalError } from '@src/util/errors/internal-error';
import config, { IConfig } from 'config';

const stormglassResourceConfig: IConfig = config.get('App.resources.StormGlass');

export class StormGlass {
  readonly stormGlassAPIParams =
    'swellDirection,swellHeight,swellPeriod,waveDirection,waveHeight,windDirection,windSpeed';
  readonly stormGlassAPISource = 'noaa';

  constructor(protected request: AxiosStatic = axios) {}

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
      const axiosError = err as AxiosError;
      if (axiosError instanceof Error && axiosError.response && axiosError.response.status) {
        throw new StormGlassResponseError(
          `Error: ${JSON.stringify(axiosError.response.data)} Code: ${axiosError.response.status}`
        );
      }

      // The type is temporary given we will rework it in the upcoming chapters
      throw new ClientRequestError((err as { message: any }).message);
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

/**
 * This error type is used when something breaks before the request reaches out to the StormGlass API
 * eg: Network error, or request validation error
 */
export class ClientRequestError extends InternalError {
  constructor(message: string) {
    const internalMessage = 'Unexpected error when trying to communicate to StormGlass';
    super(`${internalMessage}: ${message}`);
  }
}

export class StormGlassResponseError extends InternalError {
  constructor(message: string) {
    const internalMessage = 'Unexpected error returned by the StormGlass service';
    super(`${internalMessage}: ${message}`);
  }
}
