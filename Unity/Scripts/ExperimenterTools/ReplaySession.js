// ReplaySession.js
//
// This script is in charge of "Replays," in which the experimenter can view
// a pre-recorded session including the subject's eye position.
//    It is in charge of reading in the text file from the pre-recorded session, 
// creating and destroying objects, and dishing out variables to other scripts.
//    When a certain object is called to be loaded, this script finds it by name  
// in the "Resources/<Categories[i]>" folders.
//    A .txt file is created that reports raycast-requiring (computationally expensive) events:
// i.e., when an object is visible and how much is occluded.
//    Unlike an active or passive session (when PlaceAll is in charge), the eye tracker is not 
// recording, and no edf file is produced. Instead, a .txt file can be produced with visibility 
// data.
//
// - Created (date?) by DJ.
// - Updated 3/13/12 by DJ - got rid of mainMesh
// - Updated 11/22/13 by DJ - allow dynamic category list, cleaned up & commented code
// - Updated 12/17/13 by DJ - switched to GetScreenBounds_cubby
// - Updated 12/19/13 by DJ - fixed level load
// - Updated 1/7/14 by DJ - still calculate screen bounds when not recording but GUI is on. 
//    Added eyePosTexture, highlightTexture.
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
var objectSize = 0.5;
var offset_x = 0.0;
var offset_y = 0.0;
var gain_x = 1.0;
var gain_y = 1.0;
// gui constants
var GuiIsOn = true;
var doGuiWindow = true;
// private variables
private var levelName;
private var t = 0.0; //time in ms
private var categories = new Array(); //the possible target/distractor categories

private var buttonOn = false;
private var blinkOn = false;
private var endBlinkTime = 0;
private var saccOn = false;
private var endSaccTime = 0;
private var objectsInPlay;
private var camObject;
private var logReadScript;
private var logWriteScript;
private var x = 0.0; //current eye pos
private var y = 0.0; //current eye pos
private var startTime = 0;
private var isRecording = false; //are we recording an output log file?
var brightMaterial: Material; //render-only material that will stand out from background
private var eyePosTexture: Texture2D;
var highlightTexture: Texture2D;

//Open both the trial log (for reading) and event log (for writing)
function OpenLogs(inputFilename:String, outputFilename:String) {
	//Set up trial log (READ)
	logReadScript = gameObject.GetComponent(ReadLog);
	logReadScript.OpenLog(inputFilename);

	//Set up event log (WRITE)
	logWriteScript = gameObject.GetComponent(WriteLog);
	logWriteScript.StartLog(outputFilename);
	// Determine if we're recording
	if (outputFilename!="") { // if we are getting precise location info for an output file...	
		isRecording = true;
		brightMaterial = Resources.Load("NEDE/GREEN"); //load material that will stand out from background
	} else {
		isRecording = false;
	}
	yield; //inform the calling function that we're done
}

//Get the info from the trial log
function GetTrialInfo() {	
	//Read in variables of importance (must be in the order in which they appear in the log!)
	var firstMsg = logReadScript.findValue("MSG\t");
	var values = ReadLog.splitString(firstMsg,"\t");
	startTime = parseInt(values[0]);
	levelName = logReadScript.findValue("level: ");
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
	
	//eyelink calibration params
	offset_x = parseFloat(logReadScript.findValue("offset_x: "));
	offset_y = parseFloat(logReadScript.findValue("offset_y: "));
	gain_x = parseFloat(logReadScript.findValue("gain_x: "));
	gain_y = parseFloat(logReadScript.findValue("gain_y: "));	
	yield; //inform the calling function that we're done
}

//Load the level extracted in GetTrialInfo and start the replay
function StartReplay() {
	//Initialize array
	objectsInPlay = new Array();
	//Write log stuff
	logWriteScript.write("eyelink.offset_x: " + offset_x);
	logWriteScript.write("eyelink.offset_y: " + offset_y);
	logWriteScript.write("eyelink.gain_x: " + gain_x);
	logWriteScript.write("eyelink.gain_y: " + gain_y);
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
		Destroy(placeAllScript);
		//Set time parameters
		this.enabled = true; //allow updates (reading log)
		// ADD GUI SCRIPT
		var speedScript = camObject.AddComponent(GuiSpeed); // to include GUI controls
		speedScript.placerScript = this;
		// Get eye position box
		eyePosTexture = Resources.Load("NEDE/EyePosCross");
	} 
}

//Keep reading in lines until the replay time has passed the read time.
//Using Time.time allows us to use Time.timeScale to do pause and slow-mo
// (see OnGUI function).
function Update() { 
	while(((Time.timeSinceLevelLoad)*1000)>t) { //if the level time is greater than the current time in the recording
		readLogLine(); // read in the next line of the recording
	}
}


// GUI Window
function DoGuiWindow() {
	// Speed controls and saccade/blink indicators
	GUILayout.Label("Time = "+t);
	GUILayout.Label("   (Eyelink: " + (t+startTime) + ")");
//	Time.timeScale = GUILayout.HorizontalSlider(Time.timeScale,0.0,2.0);
//	GUILayout.Label("Time scale = " + Time.timeScale);
//	GUILayout.BeginHorizontal();
//		if(GUILayout.Button("Pause")) Time.timeScale=0;
//		if(GUILayout.Button("Run")) Time.timeScale=1;
		if(GUILayout.Button("Step")) {readLogLine();} 
//	GUILayout.EndHorizontal();
//	if(GUILayout.Button("END")) Application.LoadLevel("Loader");
	GUILayout.Label("Last SaccadeEnd = " + (endSaccTime-startTime));
	GUILayout.Label("   (Eyelink: " + endSaccTime + ")");
	GUILayout.BeginHorizontal();
		if(buttonOn) GUILayout.Box("BUTTON");
		if(saccOn) GUILayout.Box("SACCADE");
		if(blinkOn) GUILayout.Box("BLINK");
	GUILayout.EndHorizontal();
}

// Handle the controls in the upper left corner of the screen
function OnGUI() {
	// Make a toggle button for hiding and showing the window
	doGuiWindow = GUI.Toggle (Rect(200,0,Screen.width-200,Screen.height), doGuiWindow, "More");
	//When the user clicks the toggle button, doWindow is set to true.
	//Then create the trial type window with GUILayout and specify the contents with function DoWindow
	if (doGuiWindow) {
		GUILayout.Window (1, Rect (200,20,200,120), DoGuiWindow, "Replay Controls");
	}
	
	// Eye position dot
	if (GuiIsOn) {
		//place a tiny box on the screen where the user's eyes are
//		GUI.Box(Rect(x-1,y-1,2,2),"");
		GUI.DrawTexture(Rect(x-10,y-10,20,20), eyePosTexture, ScaleMode.ScaleToFit, false);
	}
}

//Clean up so we can access these logs again
function CloseLogs() {
	// close read log
	if (logReadScript!=null) {
		logReadScript.CloseLog();
	}
	//close write log
	if (logWriteScript!=null) {
		logWriteScript.StopLog();
	}
}

// create duplicate function so GuiSpeed can call it.
function EndLevel() {
//	CloseLogs();
}

function OnApplicationQuit() { //If the application is aborted manually, clean up first
	CloseLogs();
}

//--------------------------------------------------------------------------//
//----------------------- REPLAY EXECUTION FUNCTIONS -----------------------//
//--------------------------------------------------------------------------//

//Read in the next line from the log, classify it, and send it off to the appropriate
//function.
function readLogLine() {
	var msgTime = t;
	//Read in line
	var line = logReadScript.readLine();
	//Check for end of log
	if (line == null) {
		t = Mathf.Infinity; //to stop Update from calling readLogLine
		yield WaitForSeconds(2); //pause to allow scripts to finish
		Application.LoadLevel("Loader"); //end replay
	} else { //execute the line!
		//Parse out message type
		var values = ReadLog.splitString(line,"\t");		
		if (line=="" || values.length<3) return; //Skip empty or weird lines
		var msgType = values[0]; //get message type
		//Execute line by handing off to the appropriate function
		if (msgType=="MSG") { //Logged message
			msgTime = parseInt(values[1]);
			line = values[2];
			executeMsg(line, msgTime);  
		} else if (msgType=="ESACC") { //Saccade event
			msgTime = parseInt(values[2]); //saccade START time
			saccOn = true; //set here and used in GUI display
			endSaccTime = parseInt(values[3]);	//saccade END time
			if (values[7] != "   .") { // make sure event was logged properly
				var raw_x = parseFloat(values[7]);
				var raw_y = parseFloat(values[8]);
//				moveEye(raw_x, raw_y,endSaccTime);
			}
		} else if (msgType=="EBLINK") {
			msgTime = parseInt(values[2]); //blink START time
			blinkOn = true;  //set here and used in GUI display
			endBlinkTime = parseInt(values[3]); //blink END time
		} else if (msgType=="BUTTON") {
			msgTime = parseInt(values[1]);
			buttonOn = (values[3] == "true"); //set here and used in GUI display
		}
		
		//End blinks or saccades if the time has passed
		if (msgTime > endBlinkTime)
			blinkOn = false;
		if (msgTime > endSaccTime)
			saccOn = false;

		//Set the new offical time	
		t = msgTime - startTime;
	}
	
}




//Figures out what kind of line we've read in and hands it off to the appropriate function
function executeMsg(line: String, msgTime : int) {
	if (ReadLog.findIndex("Created",line) != -1) {
		createObject(line, msgTime);
	}else if (ReadLog.findIndex("Destroyed",line) != -1) {
		destroyObject(line, msgTime);
	} else if (ReadLog.findIndex("Object #",line) != -1) {
		moveObject(line,msgTime);
	} else if (ReadLog.findIndex("Camera",line) != -1) {
		moveCamera(line,msgTime);
	} else if (ReadLog.findIndex("TRIAL",line) != -1) {
		logWriteScript.write(line); //just pass it on to the new log
	} else if (ReadLog.findIndex("Eye",line) != -1) { // fixation update (imperfectly-timed gaze estimate)
		moveFixation(line,msgTime); 
	}
}

//Create an object at the position specified.
function createObject(line: String, msgTime: int) {
	//EXAMPLE LINE: Created Object # 1 TeapotPrefab(Clone) DistractorObject Stationary (-2.5, 0.3, -63.1)
	//Parse out the info that was logged in LogPosition.StartObject()
	var values = ReadLog.splitString(line,",() ");	
	var objNum = parseFloat(values[3]);
	var objName = values[4];
	var objTag = values[5];
	var objType = values[6];
	var objPos = Vector3(parseFloat(values[8]),parseFloat(values[10]),parseFloat(values[12]));
	var objRot: Quaternion;
	if (values.Length>=22) { 
		objRot = Quaternion(parseFloat(values[15]),parseFloat(values[17]),parseFloat(values[19]),parseFloat(values[21]));
	} else { //catch if rotation isn't logged (3DS v5.7 and earlier)
		objRot = Quaternion.identity;
	}
		
	//Find the object/texture in our Resources folder
	var resource: Object;
	var newTexture: Texture2D;
	var newObject : GameObject;
	var is3dCategory: boolean;
	for (i=0;i<categories.length;i++) { //Check each category
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
	// Instantiate the object
	if (is3dCategory) { // create 3d model
//		newObject = Instantiate(resource, objPos,objRot);
		newObject = Instantiate(newObject, objPos,objRot);
		newObject.tag = objTag;
		// rescale and translate object
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

		//assemble object
		newMaterial.mainTexture = newTexture;
		mainMesh.renderer.material = newMaterial;
		mainMesh.transform.parent = newObject.transform;	
		//resize and reposition object
		newObject.transform.localScale = Vector3(0.1,objectSize,objectSize);
		newObject.transform.position = objPos; 
		newObject.transform.rotation = objRot; 
	}
	
	//add to objectsInPlay
	objectsInPlay.Push(newObject);
	//give name to new object    
	newObject.name = objName;
	
	//Change materials to brightMaterial so they stand out from background
	if (isRecording) { // if we're recording, change the materials.  If not, leave it as an exact replay of the trial.
		var myRenderers = newObject.GetComponentsInChildren(Renderer); //find all the mesh renderers in this object
		for (var rend in myRenderers) {
			rend.material = brightMaterial; //change its main material to brightMaterial		
		}
	}
	
	//Add scripts to object
	var boundsScript = newObject.AddComponent(GetScreenBounds_cubby);
	boundsScript.objNumber = objNum;
	// Find parent cubby and assign to object
	var hitInfo: RaycastHit;
	Physics.Raycast(objPos , -transform.up, hitInfo); // send ray down; the floor it hits will be the cubby we're interested in
	parentcubby = hitInfo.transform.parent; //We assume that the floor hit is one of the prefabs "DoubleCubby", "CubbyL" or "CubbyR".
	boundsScript.cubby = parentcubby.transform;
	
	boundsScript.enabled = GuiIsOn; // draw a box around the object?
	boundsScript.StartObject();
	
}

function destroyObject(line: String, msgTime: int) {
	//EXAMPLE LINE: Destroyed Object # 1TeapotPrefab(Clone) DistractorObject Stationary (-2.5, 0.3, -63.1)
	//Special Case: Destroy all objects!
	if (ReadLog.findIndex("Destroyed All Objects",line) != -1){
		while (objectsInPlay.length>0) {
			var thisObj = objectsInPlay.Pop();
			if (thisObj != null) {
				Destroy(thisObj);				
			}
		}
		return;
	}
	
	//Parse out the info
	var values = ReadLog.splitString(line,",() ");	
	var objNum = parseFloat(values[3]);
	//Destroy the object
	Destroy(objectsInPlay[objNum-1]);
}

function moveObject(line: String, msgTime: int) {
	//Parse out the info
	var values = ReadLog.splitString(line,",() ");
	var objNum = parseFloat(values[2]);
	var objPos = Vector3(parseFloat(values[5]),parseFloat(values[7]),parseFloat(values[9]));
	//Place the object
	var objToMove = objectsInPlay[objNum-1];
	var objBounds = ObjectInfo.ObjectBounds(objToMove);
	objToMove.transform.Translate(objPos-objBounds.center, Space.World); //Adjust to center of mesh!	
	
}

function moveCamera(line: String, msgTime: int) {
	//Parse out the info
	var values = ReadLog.splitString(line,",() ");
	var camPos = Vector3(parseFloat(values[3]),parseFloat(values[5]),parseFloat(values[7]));
	var camRot = Quaternion(parseFloat(values[12]),parseFloat(values[14]),parseFloat(values[16]),parseFloat(values[18]));
	//Move the camera
	camObject.transform.position = camPos;
	camObject.transform.rotation = camRot;
	//Update all screen positions
	CheckAll(msgTime);
}

function moveFixation(line: String, msgTime: int) {
	//Parse out the info
	var values = ReadLog.splitString(line,",() ");
	var eyePos = Vector2(parseFloat(values[3]),parseFloat(values[5]));
	//Move the eye position record
	moveEye(eyePos.x,eyePos.y,msgTime);
}

function moveEye(raw_x: float, raw_y: float, esTime: int) {
	//Move the raw eye position
	x = (raw_x - offset_x) * gain_x;
	y = (raw_y - offset_y) * gain_y;
}


//Use current positions of an object to decide if it is visible.
//The GetScreenBounds_cubby script attached to each object recalculates its
//position on-screen every frame during its UpdateObject function.
function CheckObject(objNum: int, msgTime: int) {
	//Figure out whether each object is visible
	var thisObj = objectsInPlay[objNum-1];
	if (thisObj != null) {
		//Get the bounding script
		var boundsScript = thisObj.GetComponent(GetScreenBounds_cubby);
		fractionVisible = boundsScript.UpdateObject();
		
		if (fractionVisible>0 && isRecording) {
			logWriteScript.write("Object\t" + objNum + "\tvisible at \t" + boundsScript.boundsRect + "\t at time\t" + msgTime + "\tfracVisible\t" + fractionVisible);
		}
		var exp = 50;
		if (fractionVisible>0) {
			if (boundsScript.boundsRect.xMin-exp<x && boundsScript.boundsRect.xMax+exp>x && boundsScript.boundsRect.yMin-exp<y && boundsScript.boundsRect.yMax+exp>y) {
				boundsScript.highlight = true;
				boundsScript.highlightTexture = highlightTexture;
			}
		} 
		
		
	}
		
	  
}


//Use current positions of all objects to decide if they are visible.
function CheckAll(msgTime: int) {
	//Figure out whether each object is visible
	for (var i=1; i<=objectsInPlay.length; i++) {
		CheckObject(i, msgTime);
	}
}

