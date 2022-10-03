//FlashLights.js
//
// This script controls the brake lights on the back of the "leader" truck.  
// It is hardcoded to be specific to the DeliveryTruck model downloaded 
// from Google 3D Warehouse (In Unity, the prefab is called TruckPrefab).
//
// - Created 6/2011 by DJ.
//
//---------------------------------------------------------------
// Copyright (C) 2014 David Jangraw, <github.com/djangraw/nede>
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//    
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <http://www.gnu.org/licenses/>.
//---------------------------------------------------------------

// Initialize variables
private var isOn;
private var lights;

// Set up by finding "lights" material of truck object
function Start() {
	// find the material used for the truck's brake lights
	var mats = this.renderer.materials;
	for (var i=0; i<mats.length; i++) {
		if (mats[i].color == Color.red) {
			lights = mats[i]; //HARDCODED HACK!
			break;
		}
	}	
	//initialize lights to "off"
	LightsOff();
}

// change lights color to red
function LightsOn() { 
	lights.color = Color.red;
	isOn = true;
}

//change lights color to black
function LightsOff() { 
	lights.color = Color.black;
	isOn = false;
}

// Switch color of lights
function ToggleLights() {
	if (isOn) {
		LightsOff();
	} else {
		LightsOn();
	}
}