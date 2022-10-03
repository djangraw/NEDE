// PlaceAll.js
//
// This script runs each session.  It is in charge of creating and destroying 
// objects, starting and stopping the eyetracker and logger, and sending various 
// object-related messages to the log and EEG (via the Logger/eyelink scripts).
//    Loads all assets in the "Resources/<Category>" folders, for each category that's
// turned on.  When a trial is started (through the variables reset and presentationType
// as set in GuiSpeed or in the Loader scene), this script places an object in each of 
// the locations designated by Location objects that are the children of Cubby objects.
//    It then picks a random object and places it according to the category and object 
// prevalences specified in the loader GUI.
//
// - Created ~5/2011 by DJ.
// - Updated 9/13/12 by DJ for v7.0 - removed Moving and Popup presentationType functionality 
//   (for code simplicity).
// - Updated 1/8/13 by DJ - Add GetScreenBounds_fast to every object (log approx positions w/o replay)
// - Updated 11/22/13 by DJ - updated options, switched to GetScreenBounds_cubby, cleaned up code.
// - Updated 12/18/13 by DJ - adjusted for GetScreenBounds_cubby
// - Updated 1/7/14 by DJ - log eye position (fixupdate) each frame
// - Updated 1/8/14 by DJ - route files in NedeConfig folder
// - Updated 7/29/14 by DJ - resources in NEDE subfolder, changed Numbers to Constants.
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

//---DECLARE GLOBAL VARIABLES
var subject = 0;
var session = 0;
var record_EDF_file = false; //set to true to tell the EyeLink to record an .edf file
var EDF_filename: String; //Filename of the EyeLink EDF file when it's transfered to Display (Unity) computer

//WHAT
var objectPrevalence = 1.0; //chance that an object placement will have no object
var categories : String[]; //the possible target/distractor categories
var categoryState : int[];
var categoryPrevalence : float[];
var nCategories = 0;
var nObjToSee = 20;
//WHERE
var locations = "Locations"; //the Tag that contains the available target locations
var objectSize = 2.0; //(Approximate) height of targets/distractors in meters
var distanceToLeader = 2.5; // How far away from the camera should the target pop up?
//WHEN
var trialTime = Mathf.Infinity;
var minBrakeDelay = 3.0; //min time between brake events
var maxBrakeDelay = 10.0; //max time between brake events
var objectMoveTime = 2.0; // how quickly should the moving objects move?
var recordObjBox = true; //send object bounding box to eyelink every frame
var syncDelay = 1.0; //time between Eye/EEG sync signals
//HOW
var presentationType = 0; //trial type: 0=stationary, 1=follow
var reset = false; //the GUI can use this to start a new trial

// PHOTODIODE variables
var isPhotodiodeUsed = true;
var photodiodeSize = 100;
private var WhiteSquare : Texture2D;
private var BlackSquare : Texture2D;

//To Dish Out to Other Scripts
var isActiveSession = 1; //use ArrowControl (1) or RobotWalk (0)?
var moveSpeed = 5.0; //for ArrowControl/RobotWalk
var spinSpeed = 50.0; //for ArrowControl
var offset_x = 50; //for eyelink calibration
var offset_y = 150; //for eyelink calibration
var gain_x = 1.0; //for eyelink calibration
var gain_y = 1.0; //for eyelink calibration

private var cubbies : GameObject[]; // loaded from <cubbies> tagged objects
private var positions : Array; //loaded from the <locations> tagged objects
private var rotations : Array; //loaded from the "Cubbies" tagged objects
private var prefabs : Array; //loaded from all target and distractor folders
private var categoryThresholds : float[]; //random number range for each category
private var is3dCategory: boolean[]; //does this category have 3d objects or 2d images?
private var objectsInPlay : Array; //The objects currently in the field
private var nObjects = 0; //how many objects have been created so far in the trial?
private var nextBrakeTime = Mathf.Infinity; //Time when a target should pop or move into view
private var trialEndTime = Mathf.Infinity; //Time when the current trial will end
private var syncTime = 0.0; //time of next Eye/EEG sync signal
private var eyelinkScript; //the script that passes messages to and receives eye positions from the eyetracker
private var portIsSync = false; //is parallel port sending Constants.SYNC?
private var walkScript; //the script that makes this object move
private var leaderWalkScript; //the script that makes a truck move
private var leaderFlashScript; //the script that makes a truck's lights turn on and off
private var brakeFactor = 0.2; // % of speed during braking
private var zoomFactor = 1.5;  // % of speed during acceleration

//---STARTUP SCRIPT
function Start () {
	
	// Set up scripts
	this.enabled = false; // wait until this is done before we start updates
	gameObject.AddComponent(eyelink); // to interface with eye tracker
	gameObject.AddComponent(Constants); // to get constants
	var speedScript = gameObject.AddComponent(GuiSpeed); // to include GUI controls
	speedScript.placerScript = this;
	
	var i=0; //loop index
	var j=0; //loop index
	if (categories.length==0) {
		categories = Constants.CATEGORIES;		
		nCategories = categories.length;
		categoryState = new int[nCategories];
		categoryPrevalence = new float[nCategories];
		for(j=0;j<nCategories;j++) { categoryPrevalence[j] = 1/parseFloat(nCategories); }
	} 
	nCategories = categories.length;
	
	if (!isActiveSession) { //if the robot is driving
		trialTime = 999; //set this high to allow RobotWalk script to end the trial (whenever it finishes navigating.)
	}
 	//------- SCRIPTS
 	//Dish out variables to the other scripts (this one is in control!)	
	var startPoint = 0;
	if (isActiveSession) {
		var arrowScript = gameObject.AddComponent(ArrowControl); //moves the user actively from joystick input
		arrowScript.moveSpeed = moveSpeed;
		arrowScript.spinSpeed = spinSpeed; 	
	} else {
		walkScript = gameObject.AddComponent(RobotWalk); //moves the user passively on a predefined path
		yield walkScript.ParseRouteFile("NedeConfig/" + Application.loadedLevelName + ".txt"); //wait for this to finish before moving on
		walkScript.nObjToSee = nObjToSee;
		var lastOkStartPoint = walkScript.FindLastOkStartPoint();
		startPoint = Mathf.FloorToInt(Random.Range(0,lastOkStartPoint)); //choose starting point randomly between 0 and lastOkStartPt-1
		walkScript.moveSpeed = moveSpeed;
		walkScript.StartRoute(startPoint);
		if (presentationType==Constants.FOLLOW) {
			//If this is a "follow" trial, place object we are following
			var leaderLoc = Vector3(walkScript.points[startPoint+1].x, walkScript.points[startPoint+1].y, 0);
			//~ var leaderPrefab = Resources.Load("Truck/TruckPrefab"); //LOAD specified item from Resources folder
			var leaderObj = Instantiate(Resources.Load("NEDE/LeaderPrefab"));	//create object from prefab	
			leaderWalkScript = leaderObj.AddComponent(RobotWalk); //moves the user passively on a predefined path
			leaderWalkScript.moveSpeed = moveSpeed;
			leaderWalkScript.nObjToSee = 999; // make this number high so the camera's walkScript will end the level first
			leaderWalkScript.StartRoute(startPoint);
			leaderObj.transform.position = transform.position + transform.forward * distanceToLeader;
			leaderObj.transform.position.y = 0;
			//Save location of FlashLights script
			leaderFlashScript = leaderObj.GetComponentInChildren(FlashLights);			
		}
	}
	eyelinkScript = gameObject.GetComponent(eyelink); //gets eye position and records messages
	
	//------- EYELINK
	// Decide on filename
	var temp_filename;
	if (record_EDF_file) {
		temp_filename = "NEDElast.edf"; //temporary filename on EyeLink computer - must be <=8 characters (not counting .edf)!	
	} else {
		temp_filename = ""; //means "do not record an edf file"
		EDF_filename = ""; //means "do not transfer an edf file to this computer"
	}
	
	//Start eye tracker
	//print("--- subject: " + subject + "  session: " + session + " ---"); //print commands act as backup to eyelink logging/commands 
	var startOut = eyelinkScript.StartTracker(temp_filename); 
	eyelinkScript.SendToEEG(Constants.START_RECORDING);
	
	//Log experiment parameters
	eyelinkScript.write("----- SESSION PARAMETERS -----");
	eyelinkScript.write("subject: " + subject);
	eyelinkScript.write("session: " + session);
	eyelinkScript.write("Date: " + System.DateTime.Now);
	eyelinkScript.write("isActiveSession: " + isActiveSession);
	eyelinkScript.write("EDF_filename: " + EDF_filename);
	eyelinkScript.write("level: " + Application.loadedLevelName);
	eyelinkScript.write("trialTime: " + trialTime);
	eyelinkScript.write("presentationType: " + presentationType);
	eyelinkScript.write("locations: " + locations);
	eyelinkScript.write("objectSize: " + objectSize);
	eyelinkScript.write("distanceToLeader: " + distanceToLeader);
	eyelinkScript.write("objectPrevalence: " + objectPrevalence);
	eyelinkScript.write("minBrakeDelay: " + minBrakeDelay);
	eyelinkScript.write("maxBrakeDelay: " + maxBrakeDelay);
	eyelinkScript.write("objectMoveTime: " + objectMoveTime);
	eyelinkScript.write("recordObjBox: " + recordObjBox);
	eyelinkScript.write("isPhotodiodeUsed: " + isPhotodiodeUsed);
	eyelinkScript.write("photodiodeSize: " + photodiodeSize);
	eyelinkScript.write("syncDelay: " + syncDelay);
	eyelinkScript.write("nCategories: " + nCategories);
	for (i=0; i<nCategories; i++) {
		eyelinkScript.write("category: " + categories[i] + " state: " + Constants.CATEGORYSTATES[categoryState[i]] + " prevalence: " + categoryPrevalence[i]); 
	}
	eyelinkScript.write("startPoint: " + startPoint);
	eyelinkScript.write("nObjToSee: " + nObjToSee);
	eyelinkScript.write("moveSpeed: " + moveSpeed);
	eyelinkScript.write("spinSpeed: " + spinSpeed);
	eyelinkScript.write("screen.width: " + Screen.width);
	eyelinkScript.write("screen.height: " + Screen.height);
	eyelinkScript.write("eyelink.offset_x: " + offset_x);
	eyelinkScript.write("eyelink.offset_y: " + offset_y);
	eyelinkScript.write("eyelink.gain_x: " + gain_x);
	eyelinkScript.write("eyelink.gain_y: " + gain_y);
	eyelinkScript.write("----- END SESSION PARAMETERS -----");

 	//------- LOCATIONS
 	//Set up arrays
 	positions = new Array();
 	rotations = new Array();
 	objectsInPlay = new Array(); 	
 	var position_y = objectSize/2; // this puts tall objects on the ground, wide objects above it.

 	//Load all the possible positions for objects
 	//for each cubby, find the spheres that are its children, pick one of them, and add it to locations.

 	cubbies = GameObject.FindGameObjectsWithTag("Cubbies");
	var locsAll = GameObject.FindGameObjectsWithTag("Locations");
	var locsInCubby = new Array();
 	if (cubbies.Length>0) {
 		for (i=0;i<cubbies.Length;i++) {
 			//get sphere children
 			locsInCubby.Clear();
 			for (j=0;j<locsAll.Length;j++) {
 				if (locsAll[j].transform.IsChildOf(cubbies[i].transform)) {
 					locsAll[j].transform.position.y = position_y;
 					locsInCubby.Add(locsAll[j]);
 				}
 			} 				
 			//pick one randomly and add to array 
 			positions.Push(locsInCubby[Random.Range(0,locsInCubby.length)].transform.position);
 			rotations.Push(cubbies[i].transform.rotation);
 		}
 	} else {
 		eyelinkScript.write("WARNING: No cubbies found!  Make sure scene contains areas tagged Cubbies with children tagged Locations.");
 	}

	//------- OBJECTS	
	//Calculate thresholds for random number deciding the category
	categoryThresholds = new float[nCategories];
	categoryThresholds[0] = categoryPrevalence[0];
	for (i=1; i<nCategories; i++) {
		categoryThresholds[i] = categoryThresholds[i-1] + categoryPrevalence[i];			
	}
	//Load prefabs
	prefabs = new Array();
	is3dCategory = new boolean[nCategories];
	for (i=0; i<nCategories; i++) {
		if (categoryPrevalence[i]>0) {
			prefabs[i] = Resources.LoadAll(categories[i],GameObject);				
			if (prefabs[i].length==0) {
				prefabs[i] = Resources.LoadAll(categories[i],Texture2D);
				is3dCategory[i] = false;			
			} else {
				is3dCategory[i] = true;
			}
			// print(categories[i] + ": " + prefabs[i].length " items found");
		}
	}
	
	//Load Photodiode textures
	WhiteSquare = Resources.Load("NEDE/WHITESQUARE");
	BlackSquare = Resources.Load("NEDE/BLACKSQUARE");

	this.enabled = true;
}

// Place photodiode square in upper right corner
function OnGUI () {
	if (isPhotodiodeUsed) {
		if (portIsSync) {
			GUI.DrawTexture(Rect(Screen.width-photodiodeSize,-3,photodiodeSize,photodiodeSize), WhiteSquare, ScaleMode.ScaleToFit, false);
		} else {
			GUI.DrawTexture(Rect(Screen.width-photodiodeSize,-3,photodiodeSize,photodiodeSize), BlackSquare, ScaleMode.ScaleToFit, false);
		}
	}
}


//---NEW TRIAL SCRIPT
function Update () {
	
	//UPDATE TIME FOR THIS FRAME
	var t = eyelinkScript.getTime();
	//-------
	// When the specified trial time has elapsed, end the trial.
	if (t > trialEndTime) {
		EndLevel();
		Application.LoadLevel("Loader"); //Go back to the Loader Scene
		return; //stop executing Update (to avoid, e.g., destroying things twice)
	}

	//SYNC EYELINK AND EEG
	if (t>syncTime) {
		//toggle parallel port output
		portIsSync = !portIsSync; 
		if (portIsSync) {
			eyelinkScript.SendToEEG(Constants.SYNC);
		} else {
			eyelinkScript.SendToEEG(0);
		}
		//get next sync time
		syncTime = t + syncDelay;
	}
	
	//-------
	//When it's time for a new trial, place targets and distractors.
	if (reset) {		
		reset = false;

		//If there exists a current trial, end it and destroy all the objects
		if (objectsInPlay.length>0) {
			eyelinkScript.write("----- END TRIAL -----");
			//Destroy all objects in the scene to start anew
			DestroyAll();
		}

		//log what we're doing
		eyelinkScript.write("----- LOAD TRIAL -----");
		//Place distractors in the specified locations
		PlaceObjects();		 
		 
		//Determine times when the moving or pop-up object should be placed
		if (presentationType==Constants.STATIONARY) {
			nextBrakeTime = Mathf.Infinity; //No pop-ups
		} else if (presentationType==Constants.FOLLOW) {
			nextBrakeTime = t + Random.Range(minBrakeDelay,maxBrakeDelay);
		}
		
		//Start the trial
		eyelinkScript.FlushBuffer(); //Disregard the saccades that took place during loading;
		eyelinkScript.write("----- START TRIAL -----");
		trialEndTime = t + trialTime;
	}
	

	//-------
	//Truck-handling code for "Follow" trials
	if (presentationType==Constants.FOLLOW) { 
		if (t > nextBrakeTime) { //nextBrakeTime was set during the reset cycle
			nextBrakeTime = Mathf.Infinity; //so we only run this code once
			leaderFlashScript.LightsOn();
			leaderWalkScript.moveSpeed = moveSpeed * brakeFactor;
			eyelinkScript.write("Leader Slow");
		}
		//If the subject presses a key and the brakes are on, turn the brakes off
		if (eyelinkScript.UpdateButton()==Constants.BRAKEBUTTON) {
			if (leaderWalkScript.moveSpeed < moveSpeed) { //but only if we're braking
				leaderFlashScript.LightsOff(); //turn the lights off
				leaderWalkScript.moveSpeed = moveSpeed * zoomFactor; //have truck speed up until it's at desired distance.
				eyelinkScript.write("Leader Fast"); //inform the data log
			}
		}
		// If the truck is speeding and has reached the desired distance, make it stop speeding
		if (leaderWalkScript.moveSpeed > moveSpeed && leaderWalkScript.distanceTraveled >= walkScript.distanceTraveled) {
			leaderWalkScript.moveSpeed = moveSpeed; //set back to normal speed
			eyelinkScript.write("Leader Normal"); //inform the data log
			nextBrakeTime = t + Random.Range(minBrakeDelay,maxBrakeDelay); //set next brake time
		}
	}
	
	
}

function LateUpdate() {
	//Update object screen bounds
	if (recordObjBox) {
		var thisObj; var boundsScript; var fractionVisible;
		for (var i=0; i<objectsInPlay.length; i++) {		
			thisObj = objectsInPlay[i];
			if (thisObj != null) {
				//Get the bounding script
				boundsScript = thisObj.GetComponent(GetScreenBounds_cubby);
				fractionVisible = boundsScript.UpdateObject();
				//Record visibility
				if (fractionVisible>0) {
					eyelinkScript.write("Object\t" + (i+1) + "\tvisible at \t" + boundsScript.boundsRect + "\tfracVisible\t" + fractionVisible);
				}
			}
		}
	}

	//Log Camera Position
	eyelinkScript.write("Camera at (" + transform.position.x + ", " + transform.position.y + ", " + transform.position.z + ")  rotation (" + transform.rotation.x + ", " + transform.rotation.y + ", " + transform.rotation.z +", " + transform.rotation.w + ")");	
	
	//Log Eye Position
	eyelinkScript.UpdateEye_fixupdate();	
	eyelinkScript.write("Eye at (" + eyelinkScript.x + ", " + eyelinkScript.y + ")");
}

//---DESTROY ALL TARGETS AND DISTRACTORS
function DestroyAll() {
	var thisObject: Object;
	//Pick all objects out of the objectsInPlay array and destroy them
	while (objectsInPlay != null && objectsInPlay.length>0) { //until we clear the list
		thisObject = objectsInPlay.Pop();
		Destroy(thisObject); //destroy object and remove it from the list
	}
	eyelinkScript.write("Destroyed All Objects");
	nObjects = 0;
}


//---PLACE A SINGLE OBJECT AT THE GIVEN LOCATION, CHOSEN RANDOMLY
function PlaceObject(location: Vector3, newrotation: Quaternion, parentcubby: GameObject, objType: String) {
	//Set up
	var i; //category number
	var newTexture : Texture2D; //To be set multiple times in loop	
	var newMaterial : Material;
	var newObject : GameObject;
	var mesh1 : Transform; //type depends on 3D-ness
	var mainMesh : GameObject;
	
	// Determine the object category
	var categoryRand = Random.value;
	for (i=0; i<nCategories; i++) { //category index
		if (categoryRand<categoryThresholds[i]) { //first category whose threshold is above the random value will be chosen
			break; //leave the loop with the selected category remaining in i
		}
	}
	
	// Create the object
	j = Random.Range(0, prefabs[i].Length); //object index
	if (is3dCategory[i]) {
		//Instantiate the object		
		newObject = Instantiate(prefabs[i][j],location,newrotation);	//create object from prefab	(NEW in v6.5: IN SPECIFIED ROTATION)
		newObject.name = ReadLog.substring(newObject.name,0,newObject.name.length-7); // get rid of (Clone) part of name
		newObject.tag = Constants.CATEGORYSTATES[categoryState[i]] + "Object"; //TargetObject or DistractorObject
		
		//Scale and position new object    
		var objBounds = ObjectInfo.ObjectBounds(newObject);
		var objLength = ObjectInfo.BoundLength(objBounds);
		newObject.transform.localScale *= (objectSize/objLength); //Resize object (standard size is ~1m)
		objBounds = ObjectInfo.ObjectBounds(newObject); // update given new center
		newObject.transform.Translate(location-objBounds.center, Space.World); //Adjust to center of mesh!				
		newObject.transform.Translate(Vector3(0,-location.y+objBounds.extents.y,0)); // shift so object is sitting on the ground
			
	} else {
		//Create the object				
		newTexture = prefabs[i][j]; //select the distractor randomly (w/ replacement)				
		newMaterial = new Material (Shader.Find ("Diffuse"));
		newObject = new GameObject("square");
		mainMesh = GameObject.CreatePrimitive(PrimitiveType.Cube); //Mesh1 of object we just created		
		newObject.tag = Constants.CATEGORYSTATES[categoryState[i]] + "Object"; //TargetObject or DistractorObject

		//Assemble the object
		newMaterial.mainTexture = newTexture;
		mainMesh.renderer.material = newMaterial;
		mainMesh.transform.parent = newObject.transform;
		
		//transform object
		newObject.transform.position = location;
		newObject.transform.localScale = Vector3(0.1,objectSize,objectSize); // to use 90deg rotation
		newObject.transform.rotation = newrotation*Quaternion.AngleAxis(90,Vector3.up); // rotate 90deg so pic is not upside-down from either side
		newObject.name = newTexture.name;
	}

	//Log object
	nObjects++; //increment number of objects in the trial so far
	//Add a script to the object we just created
	var posScript = newObject.AddComponent(LogPosition);
	posScript.objType = objType;
	posScript.eyelinkScript = eyelinkScript; // for writing info to file
	if (objType=="Stationary") posScript.enabled = false; //No need to update stationary objects every frame.
	posScript.objNumber = nObjects;			
	posScript.StartObject(); //runs the "StartObject" function
	
	//Add GetScreenBounds_cubby script
	if (recordObjBox) {
		var boundsScript = newObject.AddComponent(GetScreenBounds_cubby);
		boundsScript.objNumber = nObjects;
		boundsScript.cubby = parentcubby.transform;
		boundsScript.enabled = false; // if true -> draw a box around the object
//		boundsScript.objType = objType;
		boundsScript.StartObject();
	}
	
	//Log new object in array
	objectsInPlay.Push(newObject);
	//Return the object we created
	return newObject;
}


//---INSTANTIATE AN OBJECT IN EACH LOCATION
function PlaceObjects() {
	//Set up
	var newObject : Object; //object we just created
	
	//Main loop: creates a randomly chosen target or distractor at each location
	for (var i=0; i<positions.length; i++) {		
		//Decide if there will be an object at this location
		var isObject = (Random.value < objectPrevalence); //There is an objectPrevalence*100% chance that each location will contain an object
		if (isObject) {
			//Place a target or distractor
			newObject = PlaceObject(positions[i],rotations[i],cubbies[i],"Stationary");
		}
	}
}


//---END THE LEVEL AND DO CLEANUP
//This function is called during the Update function, or by GuiSpeed script.
function EndLevel() {
	//disable updates
	this.enabled=false;
	//Log what we're doing
	eyelinkScript.write("----- END TRIAL -----");
	eyelinkScript.SendToEEG(Constants.END_RECORDING);
	DestroyAll(); //Clean up objects
	// Close the tracker and log files (important for saving!)
	eyelinkScript.StopTracker(EDF_filename); //transfer file to current directory with given filename
}

//---END THE LEVEL MANUALLY
//This program is called if the user ends the level by pressing the play button or closing the window
function OnApplicationQuit() { 
	EndLevel(); //Still do cleanup/exit script so our data is saved properly.
}