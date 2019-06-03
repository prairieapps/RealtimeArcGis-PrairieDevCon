using System.Collections.Generic;

namespace RealtimeArcGisSimulator.Models
{
    public class OpenSkyResult
    {
        public int time { get; set; }
        public List<List<string>> states { get; set; }
    }
}
