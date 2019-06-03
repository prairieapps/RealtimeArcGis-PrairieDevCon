using Google.Cloud.Firestore;
using MoreLinq;
using Newtonsoft.Json;
using RealtimeArcGisSimulator.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace RealtimeArcGisSimulator
{
    class Program
    {
        async static Task Main(string[] args)
        {
            Environment.SetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS", ".\\RealtimeArcGIS-f8e24d690649.json");
            FirestoreDb db = FirestoreDb.Create("realtimearcgis");

            Console.WriteLine("Starting telemetry simulator");

            while (true)
            {
                Console.WriteLine("Updating aircraft...");
                await UpdateAircraft(db);
            }
        }

        private static async Task UpdateAircraft(FirestoreDb db)
        {
            var aircraft = await RetrieveAndParseAircraft();
            var operations = await DetermineFirestoreOperations(db, aircraft);
            await BatchFirestoreOperations(db, aircraft, operations);
        }

        private static async Task<IEnumerable<Aircraft>> RetrieveAndParseAircraft()
        {
            using (var http = new HttpClient())
            {
                var response = await http.GetAsync("https://opensky-network.org/api/states/all?lamin=47.7836&lamax=57.0646&lomin=-129.8144&lomax=-92.9443");
                var content = await response.Content.ReadAsStringAsync();
                var openSkyResult = JsonConvert.DeserializeObject<OpenSkyResult>(content);

                return openSkyResult.states.Select(state =>
                {
                    return new Aircraft
                    {
                        Id = (int)Convert.ToUInt32(state[(int)OpenSkyFields.Id], 16),
                        Longitude = state[(int)OpenSkyFields.Longitude] != null ? double.Parse(state[(int)OpenSkyFields.Longitude]) : (double?)null,
                        Latitude = state[(int)OpenSkyFields.Latitude] != null ? double.Parse(state[(int)OpenSkyFields.Latitude]) : (double?)null,
                        Altitude = state[(int)OpenSkyFields.GeometricAltitude] != null ? float.Parse(state[(int)OpenSkyFields.GeometricAltitude]) : (float?)null,
                        FlightNumber = state[(int)OpenSkyFields.FlightNumber],
                        OriginCountry = state[(int)OpenSkyFields.OriginCountry],
                        LastUpdated = int.Parse(state[(int)OpenSkyFields.LastContact]),
                        OnGround = bool.TryParse(state[(int)OpenSkyFields.OnGround], out bool onGround) ? onGround : (bool?)null,
                        Velocity = float.TryParse(state[(int)OpenSkyFields.Velocity], out float velocity) ? velocity : (float?)null,
                        Heading = float.TryParse(state[(int)OpenSkyFields.Heading], out float heading) ? heading : (float?)null,
                        VerticalRate = float.TryParse(state[(int)OpenSkyFields.VerticalRate], out float verticalRate) ? verticalRate : (float?)null
                    };
                });
            }
        }

        private static async Task<AircraftOperations> DetermineFirestoreOperations(FirestoreDb db, IEnumerable<Aircraft> newAircraft)
        {
            // Get existing ids
            var aircraftSnapshot = await db.Collection("aircraft").GetSnapshotAsync();
            var existingAircraftIds = aircraftSnapshot.Documents.Select(m => int.Parse(m.Id));

            // Get new ids
            var newAircraftIds = newAircraft.Select(m => m.Id);

            var aircraftToAdd = newAircraftIds.Where(m => !existingAircraftIds.Contains(m));
            var aircraftToUpdate = existingAircraftIds.Where(m => newAircraftIds.Contains(m));
            var aircraftToRemove = existingAircraftIds.Where(m => !newAircraftIds.Contains(m));

            return new AircraftOperations
            {
                AircraftToAdd = aircraftToAdd,
                AircraftToUpdate = aircraftToUpdate,
                AircraftToRemove = aircraftToRemove
            };
        }

        private static async Task BatchFirestoreOperations(FirestoreDb db, IEnumerable<Aircraft> aircraft, AircraftOperations operations)
        {
            var batches = new List<WriteBatch>();
            // Adds
            var splitAdds = operations.AircraftToAdd.Batch(500);
            foreach(var split in splitAdds)
            {
                var batch = db.StartBatch();
                foreach(var aircraftId in split)
                {
                    var plane = aircraft.First(m => m.Id == aircraftId);
                    if(plane.Latitude.HasValue && plane.Longitude.HasValue)
                    {
                        batch.Create(db.Collection("aircraft").Document(aircraftId.ToString()), new {
                            id = plane.Id,
                            longitude = plane.Longitude,
                            latitude = plane.Latitude,
                            altitude = plane.Altitude,
                            flightNumber = plane.FlightNumber,
                            originCountry = plane.OriginCountry,
                            lastUpdated = plane.LastUpdated,
                            onGround = plane.OnGround,
                            velocity = plane.Velocity,
                            heading = plane.Heading,
                            verticalRate = plane.VerticalRate
                        });
                    }    
                }
                batches.Add(batch);
            }

            var splitUpdates = operations.AircraftToUpdate.Batch(500);
            foreach (var split in splitUpdates)
            {
                var batch = db.StartBatch();
                foreach (var aircraftId in split)
                {
                    var plane = aircraft.First(m => m.Id == aircraftId);
                    var planeDict = new Dictionary<string, object>
                        {
                            { "id", plane.Id },
                            { "altitude", plane.Altitude },
                            { "flightNumber", plane.FlightNumber },
                            { "originCountry", plane.OriginCountry },
                            { "lastUpdated", plane.LastUpdated },
                            { "onGround", plane.OnGround },
                            { "velocity", plane.Velocity },
                            { "heading", plane.Heading },
                            { "verticalRate", plane.VerticalRate }
                        };
                    // We don't want to update position if it comes in null, we'll use last position
                    if (plane.Latitude.HasValue && plane.Longitude.HasValue)
                    {
                        planeDict.Add("longitude", plane.Longitude);
                        planeDict.Add("latitude", plane.Latitude);
                    }
                    batch.Update(db.Collection("aircraft").Document(aircraftId.ToString()), planeDict);
                }
                batches.Add(batch);
            }

            var splitRemoves = operations.AircraftToRemove.Batch(500);
            foreach (var split in splitRemoves)
            {
                var batch = db.StartBatch();
                foreach (var aircraftId in split)
                {
                    batch.Delete(db.Collection("aircraft").Document(aircraftId.ToString()));
                }
                batches.Add(batch);
            }

            foreach(var batch in batches)
            {
                await batch.CommitAsync();
            }

        }
    }
}
