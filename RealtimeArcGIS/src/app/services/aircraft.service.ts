import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { Aircraft } from '../models/aircraft';

@Injectable({
  providedIn: 'root'
})
export class AircraftService {

  constructor(private db: AngularFirestore) { }

  getAircraft() {
    return this.db.collection<Aircraft>('aircraft').snapshotChanges();
  }

}
