namespace RealtimeArcGisSimulator.Models
{
    public class Aircraft
    {
        public int Id { get; set; }
        public double? Longitude { get; set; }
        public double? Latitude { get; set; }
        public float? Altitude { get; set; }
        public string FlightNumber { get; set; }
        public string OriginCountry { get; set; }
        public int LastUpdated { get; set; }
        public bool? OnGround { get; set; }
        public float? Velocity { get; set; }
        public float? Heading { get; set; }
        public float? VerticalRate { get; set; }
    }
}
