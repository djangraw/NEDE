//LeaveTrail.js
//
// Leaves a trail of dots behind the subject (to illustrate subject route
// for demo purposes). These can be made visible or invisible to the subject. 
//
// - Created 2/26/13 by DJ.
// - Updated 12/17/13 by DJ - added automatic locationsLayer finder, comments.
// - Updated 7/29/14 by DJ - resources in NEDE subfolder
//
//---------------------------------------------------------------
// Copyright (C) 2014 David Jangraw, <www.nede-neuro.org>
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

// Set up
private var tLast = 0.0; // time of last dot
public var tBetween = 1.0; // Interval between laying down dots
public var spherePrefab: GameObject; // the dot to lay down
public var isVisibleToCamera = false; // can the subject see the dots?
public var locationsLayer: int; // the number of the layer to add the dots to

// Load the green dot we'll place in subject trail
function Start() {
	spherePrefab = Resources.Load("NEDE/GreenSpherePrefab");
	locationsLayer = LayerMask.NameToLayer("Locations");
}


// Place dots
function Update () {
	var tNow = Time.time; // get frame time right away
	if ((tNow-tLast)>tBetween) { // if enough time has elapsed
		tLast = tNow;
		var newObject = Instantiate(spherePrefab,transform.position,Quaternion.identity); // make the sphere
		if (!isVisibleToCamera) {
			newObject.layer = locationsLayer; // Locations Layer			
		}
	}

}