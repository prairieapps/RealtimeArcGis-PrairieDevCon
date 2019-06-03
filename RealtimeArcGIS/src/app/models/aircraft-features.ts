import esri = __esri;

export interface AircraftFeatures {
    featuresToAdd: esri.Graphic[];
    featuresToUpdate: esri.Graphic[];
    featuresToRemove: esri.Graphic[];
}
