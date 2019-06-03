export interface Aircraft {
    id: string;
    longitude: number;
    latitude: number;
    altitude: number;
    flightNumber: string;
    originCountry: string;
    lastUpdated: number;
    onGround: boolean;
    velocity: number;
    heading: number;
    verticalRate: number;
}
