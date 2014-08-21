// LogPosition.js
//
// Logs the properties, position, and rotation of the object when the object is created.
// Also logs the position (if enabled) every frame, and logs the time when the object 
// was destroyed.
//
// - Created ~5/2011 by DJ.
// - Updated 3/13/12 by DJ - got rid of mainMesh
// - Updated 11/22/13 by DJ - switched popupType to objType, cleaned up & commented code
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

// Declare constants
var objNumber = 0;
var objType = "Stationary";
var eyelinkScript: eyelink;

//Tell the logger we created the object.
function StartObject() {
	// Get position of object center
	var objBounds = ObjectInfo.ObjectBounds(gameObject);
	var center = objBounds.center;
	// Write info about object into eyelink log
	eyelinkScript.write("Created Object # "+ objNumber +" "+ gameObject.name +" "+ gameObject.tag +" "+ objType +" (" + center.x + ", " + center.y + ", " + center.z + ") (" + transform.rotation.x + ", "  + transform.rotation.y + ", "  + transform.rotation.z + ", "  + transform.rotation.w + ")");
}
	
// For moving objects: log the new position.
function Update () {
	// Get position of object center
	var objBounds = ObjectInfo.ObjectBounds(gameObject);
	var center = objBounds.center;
	// Write new position into eyelink log
	eyelinkScript.write("Object # " + objNumber + " at (" + center.x + ", " + center.y + ", " + center.z + ")");
}

//Tell the Logger that we destroyed the object.
function StopObject() { //runs when the object is destroyed
	//Log the destruction of this object
	if (gameObject != null) {
		eyelinkScript.write("Destroyed Object # "+ objNumber +" "+ gameObject.name +" "+ gameObject.tag +" "+ objType);
	}

}