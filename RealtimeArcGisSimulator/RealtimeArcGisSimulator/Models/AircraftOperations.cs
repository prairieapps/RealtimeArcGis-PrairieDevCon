using System.Collections.Generic;

namespace RealtimeArcGisSimulator.Models
{
    public class AircraftOperations
    {
        public IEnumerable<int> AircraftToAdd { get; set; }

        public IEnumerable<int> AircraftToUpdate { get; set; }

        public IEnumerable<int> AircraftToRemove { get; set; }
    }
}
