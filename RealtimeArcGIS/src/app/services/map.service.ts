import { Injectable, ElementRef } from '@angular/core';
import esri = __esri;
import { loadModules } from 'esri-loader';
import { Aircraft } from '../models/aircraft';
import { DocumentChangeAction } from '@angular/fire/firestore';
import { AircraftFeatures } from '../models/aircraft-features';

@Injectable({
  providedIn: 'root'
})
export class MapService {

  map: esri.Map;
  sceneView: esri.SceneView;
  aircraftLayer: esri.FeatureLayer;

  constructor() { }

  async initializeMap(mapElem: ElementRef, center: number[], zoom: number) {

    const [EsriMap, EsriSceneView] = await loadModules(['esri/Map', 'esri/views/SceneView']);

    this.map = new EsriMap({
      basemap: 'hybrid',
      ground: 'world-elevation'
    });

    const viewProperties: esri.SceneViewProperties = {
      container: mapElem.nativeElement,
      center,
      zoom,
      map: this.map
    };

    this.sceneView = EsriSceneView(viewProperties);

    return this.sceneView;
  }

  async loadSymbolWithSketch() {

    const [GraphicsLayer, SketchViewModel] = await loadModules(['esri/layers/GraphicsLayer', 'esri/widgets/Sketch/SketchViewModel']);

    const graphicsLayer = new GraphicsLayer();
    this.sceneView.map.add(graphicsLayer);

    const sketchVM = new SketchViewModel({
      layer: graphicsLayer,
      view: this.sceneView
    });

    sketchVM.pointSymbol = {
      type: 'point-3d',
        symbolLayers: [
          {
            type: 'object',
            resource: {
              href:
                './assets/plane.glb'
            }
          }
        ]
    };
    sketchVM.create('point');
    sketchVM.on('create', event => {
      if (event.state === 'complete') {
        sketchVM.update(event.graphic);
      }
    });


  }

  async processAircraftSnapshot(aircraft: DocumentChangeAction<Aircraft>[]) {

    const features = await this.mapAircraftToFeatures(aircraft);
    console.log('Features to add', features.featuresToAdd.length);
    console.log('Features to update', features.featuresToUpdate.length);
    console.log('Features to remove', features.featuresToRemove.length);

    if (!this.aircraftLayer) {
      const aircraftRenderer = await this.getAircraftRenderer();
      this.aircraftLayer = await this.createAircraftFeatureLayer(features.featuresToAdd, aircraftRenderer);
      this.map.add(this.aircraftLayer);
    } else {
      this.aircraftLayer.applyEdits({
        addFeatures: features.featuresToAdd,
        updateFeatures: features.featuresToUpdate,
        deleteFeatures: features.featuresToRemove
      });
    }

  }

  private async mapAircraftToFeatures(aircraft: DocumentChangeAction<Aircraft>[]): Promise<AircraftFeatures> {

    const [Graphic] = await loadModules(['esri/Graphic']);
    const featuresToAdd: esri.Graphic[] = [];
    const featuresToUpdate: esri.Graphic[] = [];
    const featuresToRemove: esri.Graphic[] = [];

    for (const snapshot of aircraft) {

      const aircraftData = snapshot.payload.doc.data();
      const feature =  new Graphic({
        geometry: {
          type: 'point',
          x: aircraftData.longitude,
          y: aircraftData.latitude,
          z: aircraftData.altitude,
          hasZ: true
        },
        attributes: {
          ObjectID: aircraftData.id,
          FlightNumber: aircraftData.flightNumber,
          OriginCountry: aircraftData.originCountry,
          LastUpdated: aircraftData.lastUpdated,
          Altitude: aircraftData.altitude,
          OnGround: aircraftData.onGround.toString(),
          Velocity: aircraftData.velocity,
          Heading: aircraftData.heading + 180,
          VerticalRate: aircraftData.verticalRate
        }
      });

      switch (snapshot.type) {
        case 'added':
          featuresToAdd.push(feature);
          break;
        case 'modified':
          featuresToUpdate.push(feature);
          break;
        case 'removed':
          featuresToRemove.push(feature);
          break;
      }

    }

    return {
      featuresToAdd,
      featuresToUpdate,
      featuresToRemove
    };
  }

  private async getAircraftRenderer(): Promise<esri.SimpleRenderer> {

    const [PointSymbol3D, ObjectSymbol3DLayer, SimpleRenderer] =
    await loadModules(['esri/symbols/PointSymbol3D', 'esri/symbols/ObjectSymbol3DLayer', 'esri/renderers/SimpleRenderer']);

    const aircraftRenderer: esri.SimpleRenderer = new SimpleRenderer({
      label: 'Aircraft',
      symbol: new PointSymbol3D({
        symbolLayers: [
          new ObjectSymbol3DLayer({
            resource: {
              href: './assets/plane.glb'
            },
            height: 10000
          })
        ]
      }),
      visualVariables: [
        {
          type: 'rotation',
          field: 'Heading',
          rotationType: 'geographic'
        }
      ]
    });
    return aircraftRenderer;

  }

  private async createAircraftFeatureLayer(aircraftFeatures: esri.Graphic[], aircraftRenderer: esri.SimpleRenderer)
  : Promise<esri.FeatureLayer> {

    const [FeatureLayer] = await loadModules(['esri/layers/FeatureLayer']);

    return new FeatureLayer({
      source: aircraftFeatures,
      renderer: aircraftRenderer,
      objectIdField: 'ObjectID',
      fields: [
        {
          name: 'FlightNumber',
          type: 'string'
        },
        {
          name: 'OriginCountry',
          type: 'string'
        },
        {
          name: 'LastUpdated',
          type: 'date'
        },
        {
          name: 'Altitude',
          type: 'single'
        },
        {
          name: 'OnGround',
          type: 'string'
        },
        {
          name: 'Velocity',
          type: 'single'
        },
        {
          name: 'Heading',
          type: 'single'
        },
        {
          name: 'VerticalRate',
          type: 'single'
        },
      ],
      popupTemplate: {
        title: '{FlightNumber}',
        content: [{
          type: 'fields',
          fieldInfos: [
            {
              fieldName: 'FlightNumber',
              label: 'Flight Number'
            },
            {
              fieldName: 'OriginCountry',
              label: 'Origin Country'
            },
            {
              fieldName: 'Altitude',
              label: 'Altitude (m)',
              format: {
                places: 2
              }
            },
            {
              fieldName: 'Velocity',
              label: 'Velocity (m/s)',
              format: {
                places: 2
              }
            },
            {
              fieldName: 'Heading',
              label: 'Heading (°)',
              format: {
                places: 2
              }
            },
            {
              fieldName: 'VerticalRate',
              label: 'Vertical Rate (m/s)',
              format: {
                places: 2
              }
            },
            {
              fieldName: 'OnGround',
              label: 'On Ground'
            },
            {
              fieldName: 'LastUpdated',
              label: 'Last Updated'
            }
          ]
        }]
      }
    });
  }
}
