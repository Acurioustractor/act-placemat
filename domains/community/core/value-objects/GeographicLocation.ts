/**
 * Geographic Location Value Object
 *
 * Represents a geographic location with coordinates and address.
 * Implements validation for latitude/longitude ranges and address format.
 */

import { ValueObject, ValidationError } from '../../../shared/types';

interface LocationProps {
  lat: number;
  lng: number;
  address: string;
}

export class GeographicLocation implements ValueObject {
  private static readonly MIN_LATITUDE = -90;
  private static readonly MAX_LATITUDE = 90;
  private static readonly MIN_LONGITUDE = -180;
  private static readonly MAX_LONGITUDE = 180;
  private static readonly MIN_ADDRESS_LENGTH = 5;
  private static readonly MAX_ADDRESS_LENGTH = 200;

  private constructor(private readonly props: LocationProps) {
    this.validate(props);
  }

  public static create(lat: number, lng: number, address: string): GeographicLocation {
    return new GeographicLocation({ lat, lng, address });
  }

  get latitude(): number {
    return this.props.lat;
  }

  get longitude(): number {
    return this.props.lng;
  }

  get address(): string {
    return this.props.address;
  }

  public equals(other: ValueObject): boolean {
    if (!(other instanceof GeographicLocation)) return false;

    return (
      Math.abs(this.props.lat - other.props.lat) < 0.0001 &&
      Math.abs(this.props.lng - other.props.lng) < 0.0001 &&
      this.props.address === other.props.address
    );
  }

  public toString(): string {
    return `${this.props.address} (${this.props.lat}, ${this.props.lng})`;
  }

  public toPlainObject(): LocationProps {
    return {
      lat: this.props.lat,
      lng: this.props.lng,
      address: this.props.address,
    };
  }

  private validate(props: LocationProps): void {
    // Validate latitude
    if (typeof props.lat !== 'number' || isNaN(props.lat)) {
      throw new ValidationError('Latitude must be a valid number');
    }

    if (
      props.lat < GeographicLocation.MIN_LATITUDE ||
      props.lat > GeographicLocation.MAX_LATITUDE
    ) {
      throw new ValidationError(
        `Latitude must be between ${GeographicLocation.MIN_LATITUDE} and ${GeographicLocation.MAX_LATITUDE}`
      );
    }

    // Validate longitude
    if (typeof props.lng !== 'number' || isNaN(props.lng)) {
      throw new ValidationError('Longitude must be a valid number');
    }

    if (
      props.lng < GeographicLocation.MIN_LONGITUDE ||
      props.lng > GeographicLocation.MAX_LONGITUDE
    ) {
      throw new ValidationError(
        `Longitude must be between ${GeographicLocation.MIN_LONGITUDE} and ${GeographicLocation.MAX_LONGITUDE}`
      );
    }

    // Validate address
    if (!props.address || typeof props.address !== 'string') {
      throw new ValidationError('Address must be a non-empty string');
    }

    const trimmedAddress = props.address.trim();

    if (trimmedAddress.length < GeographicLocation.MIN_ADDRESS_LENGTH) {
      throw new ValidationError(
        `Address must be at least ${GeographicLocation.MIN_ADDRESS_LENGTH} characters long`
      );
    }

    if (trimmedAddress.length > GeographicLocation.MAX_ADDRESS_LENGTH) {
      throw new ValidationError(
        `Address cannot exceed ${GeographicLocation.MAX_ADDRESS_LENGTH} characters`
      );
    }
  }

  // Business logic methods
  public distanceTo(other: GeographicLocation): number {
    // Haversine formula for calculating distance between two points on Earth
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(other.latitude - this.latitude);
    const dLng = this.toRadians(other.longitude - this.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(this.latitude)) *
        Math.cos(this.toRadians(other.latitude)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  public isNearby(other: GeographicLocation, radiusKm: number = 50): boolean {
    return this.distanceTo(other) <= radiusKm;
  }

  public get region(): string {
    // Simple region detection based on coordinates (Australia-focused)
    const { lat, lng } = this.props;

    // Australian mainland bounds approximately
    if (lat >= -44 && lat <= -10 && lng >= 113 && lng <= 154) {
      if (lat >= -29 && lng >= 138 && lng <= 142) return 'South Australia';
      if (lat >= -26 && lng >= 152 && lng <= 154) return 'Queensland';
      if (lat >= -38 && lng >= 140 && lng <= 150) return 'Victoria';
      if (lat >= -36 && lng >= 140 && lng <= 151) return 'New South Wales';
      if (lat >= -26 && lng >= 113 && lng <= 129) return 'Western Australia';
      if (lat >= -26 && lng >= 129 && lng <= 138) return 'Northern Territory';
      if (lat >= -44 && lng >= 144 && lng <= 149) return 'Tasmania';
    }

    return 'Other';
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
