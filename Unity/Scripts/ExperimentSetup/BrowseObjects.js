// BrowseObjects.js
//
// This script allows the experimenter to display objects to the subject  
// before starting the experiment, to help familiarize them with the stimuli. 
// The experimenter can select the category by clicking on that category?s 
// button, then page through the objects by right-clicking anywhere on the screen.
//    This is the one and only script in the ObjectBrowser scene.  It is in 
// charge of the GUI and of placing objects in the scene.
//    The variables objectSize and distanceToObject dictate the size of the
// object on screen - these can give you an idea of what these variables 
// ought to be set to in experiments.
//
// - Created ~5/2011 by DJ.
// - Updated 12/16/13 by DJ - cycle through objects, spin objects, comments.
// - Updated 7/29/14 by DJ - Changed Numbers to Constants.
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

var objectSize = 2.0; // (Approximate) height of targets/distractors in meters
var distanceToObject = 4.0; // How far away from the camera should the target pop up?
var categories = Constants.CATEGORIES; //the possible target/distractor categories
var spinObj = true;
var objSpinSpeed = 50.0;
private var is3dCategory = false; // is tje current category full of 3d models or textures?
private var objectArray; //an [nCategories]-element array of arrays. Each element contains all the loaded objects from the corresponding category.
private var iCategory = 0; //the current category index
var folder = ""; //the current object folder
var iObject = 0; //the current object index
private var thisObject : GameObject; //the one and only object currently in the scene
private var cubeObject : GameObject; //cube for 2D textures
private var objPosition : Vector3;
var switchTime = 0.2; //seconds between object switches if you hold down the button
private var nextSwitch = 0.0; //time when the next switch will be made (to avoid double-presses)


// Get categories and objects
function Start() {	
	
	// Get category list and object size from LevelLoader script
	var loaderObject = GameObject.Find("StartupObject");
	if (loaderObject!=null) {
		var loaderScript = loaderObject.GetComponent(LevelLoader);		
		categories = loaderScript.categories; // Get category list		
		objectSize = parseFloat(loaderScript.objectSize); // Get object size
		distanceToObject = parseFloat(loaderScript.distanceToLeader); // Get object distance
	}
	
	//Get position from camera position and distanceToObject parameter
	objPosition = camera.ScreenToWorldPoint(Vector3(camera.pixelWidth*0.5, camera.pixelHeight*0.5,distanceToObject));
	var wallPosition = camera.ScreenToWorldPoint(Vector3(camera.pixelWidth*0.5, camera.pixelHeight*0.5,distanceToObject + 10));
	// Move back wall to (x,z) wallPosition
	var wallObject = GameObject.Find("WALL");
	wallObject.transform.position.x = wallPosition.x;
	wallObject.transform.position.z = wallPosition.z;
	//place an object in the scene
	thisObject = new GameObject("3dobject");
	cubeObject = GameObject.CreatePrimitive(PrimitiveType.Cube);
	cubeObject.transform.localScale = Vector3(0.1,objectSize,objectSize);
	cubeObject.transform.position = objPosition;
	cubeObject.transform.rotation = Quaternion.AngleAxis(45,Vector3.up); // rotate 90deg so pic is not upside-down from either side
	//Put image on object
	UpdateFolder();
}


// Right click (& hold) to cycle through objects
function Update () {
	if (Input.GetButton("Fire2") && Time.time > nextSwitch) { 
		nextSwitch = Time.time + switchTime; //set up next switch
		if (iObject<objectArray.Length-1) { //unless we've reached the end of the array
			iObject++; //go to next object			
		} else {
			iObject = 0;
		}
		if (is3dCategory) {
			UpdateObject();
		} else {
			UpdateTexture();		
		}
		//print((iObject+1) + " of " +thisCategory.Length);
	}
	if (spinObj) {
		// rotate 2d object
		cubeObject.transform.Rotate(Vector3.up * Time.deltaTime * objSpinSpeed, Space.World);
	}
	// rotate 3d object to match 2d one
	if (thisObject!=null) {
		thisObject.transform.rotation = cubeObject.transform.rotation;
		var thisBound = ObjectInfo.ObjectBounds(thisObject);
		thisObject.transform.Translate(objPosition-thisBound.center, Space.World);
	}
	
}

//Handle GUI stuff
function OnGUI() {
	GUILayout.BeginArea(Rect(Screen.width*0.25,Screen.height*0.05,Screen.width*0.5,Screen.height*0.2));
		// Show centered instructions
		GUILayout.BeginHorizontal();
		GUILayout.FlexibleSpace();
			GUILayout.Label("Use right mouse button to move to next object. Use buttons to select a category.");
		GUILayout.FlexibleSpace();
		GUILayout.EndHorizontal();
		// Show button for each category
		var iCategory_OLD = iCategory;
		iCategory = GUILayout.SelectionGrid(iCategory, categories, 4);
		if (iCategory != iCategory_OLD) {
			UpdateFolder();
		}
		// Show "spin" option
		GUILayout.BeginHorizontal();
		GUILayout.FlexibleSpace();
			spinObj = GuiTools.NiceToggle(spinObj,"Spin Object");
		GUILayout.FlexibleSpace();
		GUILayout.EndHorizontal();

		// Show "done" button
		GUILayout.BeginHorizontal();
		GUILayout.FlexibleSpace();
			if (GUILayout.Button("Done Browsing!")) {
				Application.LoadLevel("Loader");
			}
		GUILayout.FlexibleSpace();
		GUILayout.EndHorizontal();
	GUILayout.EndArea();

}

// When a new folder is selected, load that folder's objects
function UpdateFolder() {
	folder = categories[iCategory];
	iObject = 0;
	objectArray = Resources.LoadAll(folder,GameObject); //assume 3d category
	if (objectArray.length>0) { // if it is a 3d category...
		is3dCategory = true;
		cubeObject.renderer.enabled = false;
		UpdateObject();
	} else { // if it's a 2d category...
		//destroy old 3d object
		if (thisObject!=null) {
			Destroy(thisObject); 
		}
		is3dCategory = false;
		objectArray = Resources.LoadAll(folder,Texture2D);
		cubeObject.renderer.enabled = true;
		UpdateTexture();
	}	
	iObject = 0;
}
	

//Place an object in the scene (a clone of a given prefab).
function UpdateObject() {
	//destroy old object
	if (thisObject!=null) {
		Destroy(thisObject); 
	}
	// create new object
	thisObject = Instantiate(objectArray[iObject],objPosition,Quaternion.identity); //instantiate prefab
	var thisBound = ObjectInfo.ObjectBounds(thisObject);
	var thisLength = ObjectInfo.BoundLength(thisBound);
	thisObject.transform.localScale *= (objectSize/thisLength); //Resize object (standard size is ~1m)
	thisBound = ObjectInfo.ObjectBounds(thisObject); //update given new size
	thisObject.transform.Translate(objPosition-thisBound.center, Space.World);
	thisObject.transform.Translate(Vector3(0,-objPosition.y+thisBound.extents.y,0)); // shift so object is sitting on the ground
//	thisObject.transform.Rotate(Vector3.up * -45, Space.World);
}
	
// Change the texture (image) on a 2d object (billboard).
function UpdateTexture() {	
	cubeObject.renderer.material.mainTexture = objectArray[iObject];
	return;
}

