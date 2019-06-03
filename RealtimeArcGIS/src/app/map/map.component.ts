import { Component, OnInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { MapService } from '../services/map.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AngularFirestore } from '@angular/fire/firestore';
import { Aircraft } from '../models/aircraft';


@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.less']
})
export class MapComponent implements OnInit, OnDestroy {

  @ViewChild('map') private mapEl: ElementRef;
  ngUnsubscribe = new Subject();

  constructor(private mapService: MapService, private db: AngularFirestore) { }

  ngOnInit() {
    this.mapService.initializeMap(this.mapEl, [-100.382, 40.3], 2)
      .then(() => {
        console.log('Map loaded. Loading 3D symbols...');
        this.sketchExample();
        // this.firestoreExample();
      });
  }

  sketchExample() {
    this.mapService.loadSymbolWithSketch();
  }

  firestoreExample() {
    this.db.collection<Aircraft>('aircraft').stateChanges()
    .pipe(takeUntil(this.ngUnsubscribe))
    .subscribe(aircraftSnapshotChanges => {
      this.mapService.processAircraftSnapshot(aircraftSnapshotChanges);
    });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

}
