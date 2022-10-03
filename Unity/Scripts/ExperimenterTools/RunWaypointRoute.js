//RunWaypointRoute.js
//
// This script is in charge of "Waypoint Routes", in which the user can traverse
// a pre-determined set of waypoints to see images of interest.
//    It is in charge of reading in the text file from the Waypoint route text file, 
// creating and destroying objects, and dishing out variables to other scripts.
//    When a certain object is called to be loaded, this script finds it by name  
// in the "Resources/<categories[i]>" folders.
//    Unlike an active or passive session (when PlaceAll is in charge), the eye tracker is not 
// recording, and no edf file is produced. Instead, a .txt file can be produced with visibility 
// data.
//
// - Created 2/15/13 by DJ based on ReplayTrial (now ReplaySession).
// - Updated 2/25/13 by DJ - removed categoryState variable, overwrite GridHuge with MultiGrid, 
//    give all objects 90deg rotations to avoid upside-down images
// - Updated 11/22/13 by DJ - read in categories from waypoint file, determine is3d automatically
// - Updated 12/17/13 by DJ - removed legacy code for writing log, added comments
// - Updated 1/8/14 by DJ - added RewindLogs function
// - Updated 6/4/14 by DJ - changed from "Tsp" to "Waypoint"
// - Updated 7/28/14 by DJ - resources in NEDE subfolder
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

//Declare Variables
var waypointFilename = "NEDE-99-waypoints.txt";
var objectSize = 0.5;
var offset_x = 0.0;
var offset_y = 0.0;
var gain_x = 1.0;
var gain_y = 1.0;
//~ var pixAround = 0;
private var levelName;
private var t = 0.0; //time in ms
private var categories = new Array(); //the possible target/distractor categories
private var objectsInPlay;
private var camObject;
private var logReadScript;
private var x = 0.0; //current eye pos
private var y = 0.0; //current eye pos
private var startTime = 0;
private var isRecording = false; //are we recording an output log file?
var redSphere: GameObject;


//Open the Waypoint log (for reading in objects and points) 
function OpenLogs(inputFilename:String) {
	//Set up trial log (READ)
	logReadScript = gameObject.GetComponent(ReadLog);
	logReadScript.OpenLog(inputFilename);
	waypointFilename = inputFilename;
	yield; //inform the calling function that we're done
}

//Get the info from the trial log
function GetTrialInfo() {	
	//Read in variables of importance (must be in the order in which they appear in the log!)
	levelName = logReadScript.findValue("level: ");
	if (levelName=="GridHuge") {
		levelName = "MultiGrid";
	}
	//object folders
	objectSize = parseFloat(logReadScript.findValue("objectSize: "));
	var newline = logReadScript.findValue("category: ");	
	var newArray = logReadScript.splitString(newline,": \t");
	categories.Push(newArray[0]);
	newArray[2] = "category";
	while (newArray[2]=="category") {
		// Parse line (example: MSG\t70\tcategory: car_side state: Distractor prevalence: 0.25)
		newline = logReadScript.readLine(); 
		newArray = logReadScript.splitString(newline,": \t"); //split using delimiters		
		categories.Push(newArray[4]); // category name
	}
	
	//pixAround = parseFloat(findValue("pixAround: "));
	offset_x = parseFloat(logReadScript.findValue("offset_x: "));
	offset_y = parseFloat(logReadScript.findValue("offset_y: "));
	gain_x = parseFloat(logReadScript.findValue("gain_x: "));
	gain_y = parseFloat(logReadScript.findValue("gain_y: "));	
	yield; //inform the calling function that we're done
}

//Load the level extracted in GetTrialInfo and start the replay
function StartWaypointRoute() {
	//Initialize array
	objectsInPlay = new Array();
	//Load the appropriate level
	DontDestroyOnLoad(this);
	//print("Loading level " + levelName);
	Application.LoadLevel(levelName);
}

//Deal with starting or ending a replay
function OnLevelWasLoaded() {	
	if (Application.loadedLevelName == "Loader") { //ending a replay
		CloseLogs();
		Destroy(this); //self-destruct!
	} else { //starting a replay
		//Mess with scripts in the actual level to suit our replay needs.
		camObject = GameObject.Find("MainCamera");
		//Disable irrelevant scripts
		var placeAllScript = camObject.GetComponent(PlaceAll);
		placeAllScript.enabled = false; //To prevent updates and such.
		Destroy(placeAllScript); // is this what we want?
		//Set time parameters
		this.enabled = true; //allow updates (reading log)
		
		//READ IN OBJECTS
		redSphere = Resources.Load("NEDE/RedSpherePrefab");
		CreateAllObjects();
		CloseLogs(); //close logs (this doesn't really end the level)
		//READ IN ROUTE
		walkScript = camObject.AddComponent(WaypointWalk);
		walkScript.fileName = waypointFilename;
		//BEGIN ROUTE
		walkScript.StartRoute();
		
		// ADD SNAIL TRAIL SCRIPT
		camObject.AddComponent(LeaveTrail);
		// ADD GUI SCRIPT
		var speedScript = camObject.AddComponent(GuiSpeed); // to include GUI controls
		speedScript.placerScript = this;
	} 
}

function CreateAllObjects() {
	var line = "";
	// Fast-forward to object info
	while (line != "----- OBJECT INFO -----") {
		line = logReadScript.readLine();
	}
	// Advance to next line
	line = logReadScript.readLine();
	// Create objects until we're done with the object part
	while (line != "----- END OBJECT INFO -----") {		
		createObject(line, 0);		
		line = logReadScript.readLine();
	}
}


// Update is unused here: WaypointWalk handles camera motion.
//function Update() { 
//}

// OnGUI is unused here: GuiSpeed handles time scale.
//function OnGUI() {
//}

//Clean up so we can access these logs again
function CloseLogs() {
	// close read log
	if (logReadScript!=null) {
		logReadScript.CloseLog();
	}
}

//Rewind logs to beginning
function RewindLogs() {
	if (logReadScript!=null) {
		logReadScript.RewindLog();
	}
	yield; //inform the calling function that we're done
}

// create duplicate function so GuiSpeed can call it.
function EndLevel() {
	CloseLogs();
}

function OnApplicationQuit() { //If the application is aborted manually, clean up first
	CloseLogs();
}

//--------------------------------------------------------------------------//
//----------------------- REPLAY EXECUTION FUNCTIONS -----------------------//
//--------------------------------------------------------------------------//

//Create an object at the position specified.
function createObject(line: String, msgTime: int) {
	//EXAMPLE LINE: Created Object # 1 TeapotPrefab(Clone) DistractorObject Stationary (-2.5, 0.3, -63.1)
	//Parse out the info that was logged in LogPosition.StartObject()
	var values = ReadLog.splitString(line,",() ");	
	var objNum = parseFloat(values[2]);
	var objName = values[3];
	var objTag = values[4];
	var objType = values[5];
	var objPos = Vector3(parseFloat(values[7]),parseFloat(values[8]),parseFloat(values[9]));
	objPos.z = 20 * Mathf.Round(objPos.z/20); // Round z to nearest 20 (to keep on grid center)
	// Get rotation from file (note: this may be overridden for the 2D object case!
	var objRot: Quaternion;
	if (values.Length>=22) { //v5.8 and after log rotations
		objRot = Quaternion(parseFloat(values[12]),parseFloat(values[13]),parseFloat(values[14]),parseFloat(values[15]));
	} else { //v5.7 and before log only positions
		objRot = Quaternion.identity;
	}
		
	//Find the object/texture in our Resources folder
	var resource: Object;
	var newTexture: Texture2D;
	var newObject : GameObject;
	var is3dCategory: boolean;
	for (i=0;i<categories.length;i++) {
		//Try to load from each category's subfolder in Resources folder.
		newTexture = Resources.Load(categories[i] + "/" + objName,Texture2D); //Try to load as a 2d image
		newObject = Resources.Load(categories[i] + "/" + objName,GameObject); //Try to load as a 3d object
		if (newTexture != null) { // if it's a 2d image
			is3dCategory = false;
			break;
		} else if (newObject != null) { // if it's a 3d object
			is3dCategory = true;
			break;
		}
	}
	if (is3dCategory) { // create 3d model
		newObject = Instantiate(newObject, objPos,objRot);
		newObject.tag = objTag;
		if (objTag == "TargetObject") {
			Instantiate(redSphere,objPos,Quaternion.identity);
		}

		//resize and translate object
		var objBounds = ObjectInfo.ObjectBounds(newObject);
		var objLength = ObjectInfo.BoundLength(objBounds);
		newObject.transform.localScale *= (objectSize/objLength); //Resize object (standard size is ~1m)
		objBounds = ObjectInfo.ObjectBounds(newObject); //Update to changed scale
		newObject.transform.Translate(objPos-objBounds.center, Space.World); //Adjust to center of mesh!				
	} else { // create cube and add the texture we just loaded
		//Instantiate and name the object
		var newMaterial = new Material (Shader.Find ("Diffuse"));
		newObject = new GameObject("square");	
		var mainMesh = GameObject.CreatePrimitive(PrimitiveType.Cube); //Mesh1 of object we just created		
		if (objTag == "TargetObject") {
			Instantiate(redSphere,objPos,Quaternion.identity);
		}
		//assemble object
		newMaterial.mainTexture = newTexture;
		mainMesh.renderer.material = newMaterial;
		mainMesh.transform.parent = newObject.transform;	
		//resize and reposition object
		newObject.transform.position = objPos; 
		newObject.transform.localScale = Vector3(0.1,objectSize,objectSize); // to rotate 90deg		
		newObject.transform.rotation = Quaternion.AngleAxis(90,Vector3.up); // rotate 90deg so pic is not upside-down from either side
	}
	
	//add to objectsInPlay
	objectsInPlay.Push(newObject);
	//give name to new object    
	newObject.name = objName;
	
	

}


