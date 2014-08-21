// LevelLoader.js
//
// This script handles the loading GUI and all messages displayed to the subject.
// When the parameters have all been chosen, it loads the selected level and 
// passes all the major variables to the proper scripts.
//    In Level 0 ("Loader"), this script should be attached to an empty 
// GameObject (which we've called StartupObject). This object will not be destroyed
// when we switch levels, and so this script will retain the "official versions" of 
// all the major variables.
//    To switch levels, we must have the build settings set up properly. This means
// choosing File -> Build Settings and placing the available levels in the list.  
// Loader (in which this script appears) should be level 0 so it will appear
// on startup.
//    This script passes variables from the GUI input to session-running scripts like 
// PlaceAll. Those scripts will then pass on some of these variables to other scripts.
//
//  - Created ~5/2011 by DJ
//  - Updated 1/8/13 by DJ - Added recordObjBox option (log approx positions w/o replay)
//  - Updated 11/20/13 by DJ - added many new controls and options.
//  - Updated 12/17/13 by DJ - comments.
//  - Updated 1/8/14 by DJ - bug fixes (public categories, rewind logs)
//  - Updated 7/29/14 by DJ - resources in NEDE subfolder, changed Numbers to Constants.
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

//---DECLARE VARIABLES
//PlaceAll variables
var subject = "0";
var session = "0";
var recordOutputFile = false;
var sessions;
var nSessions = 1;
var iSession = 0;

var objectPrevalence = "1.0";
var targetPrevalence = 0.0; //"0.25";
var objectSize = "1.5";
var distanceToLeader = "10.0";
var minBrakeDelay = "5.0";
var maxBrakeDelay = "9.0";
var recordObjBox = true;

var isPhotodiodeUsed = true;
var photodiodeSize = "50";

var presentationType = 3;
var levelNumber = 0;
var replayNumber = 0;
var sessionTime = "120";
var nObjToSee = "20";

var GuiIsOn = false;

//Behavior variables
var responseType = 0;
var isActiveSession = 0;
var moveSpeed = "5";
var spinSpeed = "60";
//Eyelink variables
var offset_x = "0";
var offset_y = "0";
var gain_x = "1.0";
var gain_y = "1.0";

//filenames
var projectName = "";
var experimentName = "";
var inputFilename = "";
var outputFilename = "";
var keepCalibration = true;

//Internal variables
var loadingSkin : GUISkin;
var headingSkin : GUISkin;
var instructionsSkin : GUISkin;
var logoImage : Texture2D;
var fixationCross : Texture2D;
var highlightTexture : Texture2D;
var fixationTime = 2.0; // time (in s) the fixation cross will be displayed
private var loadTime = Mathf.Infinity; //time when the level will be loaded
// Category variables
var categories: Array; // names of categories
private var nCategories: int; //number of object categories
private var categoryState : Array;//int[]; //0 for distractor, 1 for target, 2 for neither
private var categoryPrevalenceString : Array;// String[]; //input RELATIVE prevalence of each category
private var categoryPrevalence : Array;//float[]; //ABSOLUTE prevalence of each category in scene (sum to 1)
private var newCategory = ""; //any new category the user wants to add
private var levelNames: Array; //must match the names of scenes in our project
private var nLevels: int;
private var newLevel = "";
private var replayNames = ["1", "2"];

//Instructions Variables
var promptFilename = "DefaultPrompt.txt";
private var promptText : String[];
private var nPrompts = 0;
private var promptStatus = "No Prompts Loaded.";

//InstructionsPage Constants
static var SESSIONOVER = -1;
static var LOADGUI = 0;
static var FILENOTFOUND = -5;
static var OVERWRITEFILE = -6;
private var InstructionsPage = LOADGUI;

//SessionType Constants
static var NORMALSESSION = 0;
static var WAYPOINTROUTESESSION = 1;
static var REPLAYSESSION = 2;
private var SessionType = NORMALSESSION;


//---STARTUP
//This script, and the Object it's attached to ("StartupObject") will stay with us no matter what level we're on
function Start() {
	Screen.fullScreen = true; // toggle FullScreen mode
	DontDestroyOnLoad(this); //don't destroy the object this script is attached to just because we switch levels
	sessions = new String[10];
	for (var i=0;i<10;i++) {
		sessions[i] = "";
	}	

	// Initialize categories
	categories = Constants.CATEGORIES;
	nCategories = categories.length;
	categoryState = new Array();
	categoryPrevalenceString = new Array();
	categoryPrevalence = new Array();
	// Populate state and prevalence arrays
	for (i=0; i<nCategories; i++) {
		categoryState.Push(Constants.UNUSED);
		categoryPrevalenceString.Push("1");
		categoryPrevalence.Push(1/categories.length);
	}
	
	//Initialize Level names
	levelNames = Constants.LEVELS;
	nLevels = levelNames.length;	
	
	// Get project/experiment name
	var dp : String = Application.dataPath; //get path of project
    var s : Array; //split it up by folder
    s = dp.Split("/"[0]);
    projectName = s[s.length - 2]; // project folder is 3rd to last
	experimentName = projectName;

	// Get default prompts
	LoadPrompts(promptFilename);
	
}


//---LOAD NEW LEVEL
//This function transfers the relevant variables from this script, which runs the show on level 0 (the loading level), to PlaceAll, which runs the show on all other levels.  When level 0 is loaded, it prevents a new LevelLoader script from being created and sets up the next session.
//NOTE: this script will not be run on the first run of Level 0 - only when a new level is loaded but this script already exists.
function OnLevelWasLoaded() { 
	var camObject = GameObject.Find("MainCamera");
	if (Application.loadedLevelName == "Calibration") {
		this.enabled = false; //turn off GUI
		// pass the object size and distance parameters to the browser script
		var calibrationScript = camObject.GetComponent(CalibrateEye);
		calibrationScript.offset_x = parseFloat(offset_x);
		calibrationScript.offset_y = parseFloat(offset_y);
		calibrationScript.gain_x = parseFloat(gain_x);
		calibrationScript.gain_y = parseFloat(gain_y);
	} else if (Application.loadedLevelName == "ObjectBrowser") {
		this.enabled = false;
		
	} else if (Application.loadedLevelName == "Loader") { //if coming back from a level or utility	
		// check if we're done with all the replays
		if (SessionType==REPLAYSESSION) {
			iSession = iSession+1;
			if (iSession < nSessions) { //if there are still more replays to go...
				session = sessions[iSession];
				inputFilename = experimentName + "-" + subject + "-" + session + ".asc";
				outputFilename = experimentName + "-" + subject + "-" + session + "-post.txt";
				//this.enabled = true;
				yield WaitForSeconds (2); //wait for ReplayScript to clean up logs
				StartReplay();
			} else { // if we've just replayed the last replay
				iSession = 0;
				this.enabled = true; //turn GUI back on
			}
		} else { //if this isn't a replay
			this.enabled = true; //turn GUI back on
		}
	} else { //A maze scene
		this.enabled = false; //turn off GUI
		if (SessionType==REPLAYSESSION) {
			InstructionsPage = LOADGUI;
		} else {
			InstructionsPage = SESSIONOVER; //Start on the good job page when you've finished a trial
		}
		if (SessionType==NORMALSESSION) {
			yield HandOffParameters(); //start trial (and wait for this fn to finish before continuing)
		} 
		//Increment the session number automatically so we don't overwrite next time.
		var floatSession = parseFloat(session); //make it a number
		floatSession++; //add one
		session = floatSession + ""; //make it a string
	} 
	
}

//Once a level has has been loaded in an active trial, give the PlaceAll script 
//the information it needs to begin the trial.
function HandOffParameters() {
	var camObject = GameObject.Find("MainCamera");
	//Transfer all relevant variable values to the PlaceAll script
	var placerScript = camObject.GetComponent(PlaceAll);
	placerScript.subject = parseFloat(subject);
	placerScript.session = parseFloat(session);
	placerScript.record_EDF_file = recordOutputFile;
	placerScript.EDF_filename = outputFilename;
	placerScript.isActiveSession = isActiveSession;
	
	placerScript.categories = categories.ToBuiltin(String) as String[];
	placerScript.categoryState = categoryState.ToBuiltin(int) as int[];
	placerScript.categoryPrevalence = categoryPrevalence.ToBuiltin(float) as float[];
	placerScript.nObjToSee = parseFloat(nObjToSee);
	
	placerScript.objectPrevalence = parseFloat(objectPrevalence);
	placerScript.objectSize = parseFloat(objectSize);
	placerScript.distanceToLeader = parseFloat(distanceToLeader);
	placerScript.minBrakeDelay = parseFloat(minBrakeDelay);
	placerScript.maxBrakeDelay = parseFloat(maxBrakeDelay);
	
	placerScript.presentationType = presentationType;
	placerScript.trialTime = parseFloat(sessionTime);
	placerScript.reset = true;
	
	placerScript.moveSpeed = parseFloat(moveSpeed);
	placerScript.spinSpeed = parseFloat(spinSpeed);
	placerScript.offset_x = parseFloat(offset_x);
	placerScript.offset_y = parseFloat(offset_y);
	placerScript.gain_x = parseFloat(gain_x);
	placerScript.gain_y = parseFloat(gain_y);
	placerScript.recordObjBox = recordObjBox;
	
	placerScript.isPhotodiodeUsed = isPhotodiodeUsed;
	placerScript.photodiodeSize = parseFloat(photodiodeSize);
	
	yield;
}

//Create a RunWaypointRoute script and start replaying a trial.
function StartWaypointRoute() {
	//Set up RunWaypointRoute script
	var replayScript = gameObject.AddComponent(RunWaypointRoute);
	replayScript.enabled = false;
	yield replayScript.OpenLogs(inputFilename);
	yield replayScript.GetTrialInfo(); //Even if we don't want to keepCalibration, we need the level name from this function.
	yield replayScript.RewindLogs(); // go back to start of logs

	//Start the replay
	replayScript.StartWaypointRoute();
}

//Create a ReplaySession script and start replaying a trial.
function StartReplay() {
	// Set up ReplaySession script
	var replayScript = gameObject.AddComponent(ReplaySession);
	replayScript.enabled = false;
	if(recordOutputFile)	yield replayScript.OpenLogs(inputFilename,outputFilename); //read and write
	else					yield replayScript.OpenLogs(inputFilename,""); //read only
	yield replayScript.GetTrialInfo(); //Even if we don't want to keepCalibration, we need the level name from this function.
	//Transfer the data	from the GUI	
	if (!keepCalibration) { //if we don't want to use the info we just got in GetTrialInfo		
		replayScript.offset_x = parseFloat(offset_x);
		replayScript.offset_y = parseFloat(offset_y);
		replayScript.gain_x = parseFloat(gain_x);
		replayScript.gain_y = parseFloat(gain_y);
	}
	// Specify whether to superimpose eye position
	replayScript.GuiIsOn = GuiIsOn;
	replayScript.highlightTexture = highlightTexture;
	// Start the replay
	replayScript.StartReplay();
}

//Populate list of eye information from the log (using a temporary ReplaySession script)
function GetInfo() {
	//Create a ReplaySession script to read from the log
	var replayScript;
	if (SessionType==WAYPOINTROUTESESSION) {
		replayScript = gameObject.AddComponent(RunWaypointRoute);
	} else if (SessionType==REPLAYSESSION) {
		replayScript = gameObject.AddComponent(ReplaySession);
	}
	replayScript.enabled = false;
	yield replayScript.OpenLogs(inputFilename,""); //read only
	yield replayScript.GetTrialInfo();
	//get eye info for reproducing calibration
	offset_x = replayScript.offset_x+"";
	offset_y = replayScript.offset_y+"";
	gain_x = replayScript.gain_x+"";
	gain_y = replayScript.gain_y+"";

	replayScript.CloseLogs();
	Destroy(replayScript);
}


// Save GUI parameters to a text file
function SaveParams(paramsFilename: String) {
	// Add prefix
	paramsFilename = "NedeConfig/" + paramsFilename;
	// Set up ini file (WRITE)
	logWriteScript = gameObject.GetComponent(WriteLog);
	logWriteScript.StartLog(paramsFilename);

	// Write header
	logWriteScript.write(projectName + ": Parameters");
	// session parameters
	logWriteScript.write("experimentName = " + experimentName);
	logWriteScript.write("subject = " + subject);
	logWriteScript.write("session = " + session);
	logWriteScript.write("recordOutputFile = " + recordOutputFile);
	logWriteScript.write("promptFilename = " + promptFilename);
	// category parameters	
	var categoriesString = categories[0];
	var catStateString = categoryState[0] + "";
	var catPrevString = categoryPrevalence[0] + "";
	var catPrevStrString = categoryPrevalenceString[0];
	for (i=1;i<nCategories;i++) {
		categoriesString = categoriesString + "," + categories[i];
		catStateString = catStateString + "," + categoryState[i];
		catPrevString = catPrevString + "," + categoryPrevalence[i];		
		catPrevStrString = catPrevStrString + "," + categoryPrevalenceString[i];		
	}
	logWriteScript.write("categories = " + categoriesString);
	logWriteScript.write("categoryState = " + catStateString);
	logWriteScript.write("categoryPrevalence = " + catPrevString);
	logWriteScript.write("categoryPrevalenceString = " + catPrevStrString);
	logWriteScript.write("objectPrevalence = " + objectPrevalence);
	// object parameters
	logWriteScript.write("objectSize = " + objectSize);
	logWriteScript.write("distanceToLeader = " + distanceToLeader);
	logWriteScript.write("minBrakeDelay = " + minBrakeDelay);
	logWriteScript.write("maxBrakeDelay = " + maxBrakeDelay);
	logWriteScript.write("recordObjBox = " + recordObjBox);
	// photodiode parameters
	logWriteScript.write("isPhotodiodeUsed = " + isPhotodiodeUsed);
	logWriteScript.write("photodiodeSize = " + photodiodeSize);
	// level parameters
	logWriteScript.write("presentationType = " + presentationType);
	var levelsString = levelNames[0];
	for (i=1;i<nLevels;i++) {
		levelsString = levelsString + "," + levelNames[i];
	}
	logWriteScript.write("levelNames = " + levelsString);
	logWriteScript.write("levelNumber = " + levelNumber);
	// behavior parameters
	logWriteScript.write("moveSpeed = " + moveSpeed);
	logWriteScript.write("spinSpeed = " + spinSpeed);
	logWriteScript.write("isActiveSession = " + isActiveSession);
	logWriteScript.write("sessionTime = " + sessionTime);
	logWriteScript.write("responseType = " + responseType);	
	logWriteScript.write("nObjToSee = " + nObjToSee);
	// eyelink parameters
	logWriteScript.write("offset_x = " + offset_x);
	logWriteScript.write("offset_y = " + offset_y);
	logWriteScript.write("gain_x = " + gain_x);
	logWriteScript.write("gain_y = " + gain_y);
	// CLOSE INI FILE
	logWriteScript.StopLog();

}

// Load GUI parameters from a text file
function LoadParams(paramsFilename: String) {
	// Add prefix
	paramsFilename = "NedeConfig/" + paramsFilename;
	//Set up ini file (READ)
	if(!ReadLog.FileExists(paramsFilename)) { //if we're asked to read a file that doesn't exist
		inputFilename = paramsFilename;
		InstructionsPage = FILENOTFOUND;
	} else {
		var logReadScript = gameObject.GetComponent(ReadLog);
		
		logReadScript.OpenLog(paramsFilename);
		
		// session parameters
		experimentName = logReadScript.findValue("experimentName = ");
		subject = logReadScript.findValue("subject = ");
		session = logReadScript.findValue("session = ");
		var recordOutputStr = logReadScript.findValue("recordOutputFile = ");
		if (recordOutputStr=="True") {
			recordOutputFile = true;
		} else {
			recordOutputFile = false;
		}
		promptFilename = logReadScript.findValue("promptFilename = ");
		// category parameters
		var catString = logReadScript.findValue("categories = ");	
		var catStateString = logReadScript.findValue("categoryState = ");	
		var catPrevString = logReadScript.findValue("categoryPrevalence = ");
		var catPrevStrString = logReadScript.findValue("categoryPrevalenceString = ");
		var catStrArray = logReadScript.splitString(catString,",");
		var catStateStrArray = logReadScript.splitString(catStateString,",");
		var catPrevStrArray = logReadScript.splitString(catPrevString,",");	
		var catPrevStrStrArray = logReadScript.splitString(catPrevStrString,",");
		// empty arrays
		nCategories = catStrArray.length;
		categories = [];
		categoryState = [];
		categoryPrevalence = [];
		categoryPrevalenceString = [];	
		// fill arrays
		for (i=0;i<nCategories;i++) {
			categories.Push(catStrArray[i]);
			categoryState.Push(parseFloat(catStateStrArray[i]));
			categoryPrevalence.Push(parseFloat(catPrevStrArray[i]));
			categoryPrevalenceString.Push(catPrevStrStrArray[i]);			
		}
		objectPrevalence = logReadScript.findValue("objectPrevalence = ");
		// object parameters
		objectSize = logReadScript.findValue("objectSize = ");
		distanceToLeader = logReadScript.findValue("distanceToLeader = ");
		minBrakeDelay = logReadScript.findValue("minBrakeDelay = ");
		maxBrakeDelay = logReadScript.findValue("maxBrakeDelay = ");
		var recordObjBoxStr = logReadScript.findValue("recordObjBox = ");
		if (recordObjBoxStr=="True") {
			recordObjBox = true;
		} else {
			recordObjBox = false;
		}
		// photodiode parameters
		isPhotodiodeUsed = (logReadScript.findValue("isPhotodiodeUsed = ")=="True");
		photodiodeSize = logReadScript.findValue("photodiodeSize = ");
		// level parameters
		presentationType = parseFloat(logReadScript.findValue("presentationType = "));
		
		// category parameters
		var levString = logReadScript.findValue("levelNames = ");	
		var levStrArray = logReadScript.splitString(levString,",");
		// empty arrays
		nLevels = levStrArray.length;
		levelNames = [];
		// fill arrays
		for (i=0;i<nLevels;i++) {
			levelNames.Push(levStrArray[i]);
		}
		
		
		levelNumber = parseFloat(logReadScript.findValue("levelNumber = "));
		// behavior parameters
		moveSpeed = logReadScript.findValue("moveSpeed = ");
		spinSpeed = logReadScript.findValue("spinSpeed = ");
		isActiveSession = parseFloat(logReadScript.findValue("isActiveSession = "));
		sessionTime = logReadScript.findValue("sessionTime = ");
		responseType = parseFloat(logReadScript.findValue("responseType = "));
		nObjToSee = logReadScript.findValue("nObjToSee = ");
		// eyelink parameters
		offset_x = logReadScript.findValue("offset_x = ");
		offset_y = logReadScript.findValue("offset_y = ");
		gain_x = logReadScript.findValue("gain_x = ");
		gain_y = logReadScript.findValue("gain_y = ");
		// CLOSE INI FILE	
		logReadScript.CloseLog();
		// Load in prompts from another file (this must be done AFTER closing the .ini file).
		LoadPrompts(promptFilename);
	}
}


// Load in task prompts from a specified text file.
function LoadPrompts(promptFilename: String) {
	// Add prefix
	promptFilename = "NedeConfig/" + promptFilename;
	// if we're asked to read a file that doesn't exist
	if(!ReadLog.FileExists(promptFilename)) { 
		inputFilename = promptFilename;
		InstructionsPage = FILENOTFOUND;
	} else {
		// Read in prompt file
		var logReadScript = gameObject.GetComponent(ReadLog);
		promptText = GuiTools.ParsePromptFile(logReadScript, promptFilename);
		// update variables
		nPrompts = promptText.length;								
		promptStatus = nPrompts + " prompts loaded from \n" + promptFilename + ".";
	}
}


//----------------------------//
// ------- GUI BOXES -------- //
//----------------------------//

// Box 1: High-level Experimental Parameters
function doExperimentParams() {
	GUILayout.Label("Experiment Name");		
	experimentName = GUILayout.TextField(experimentName,GUILayout.Width(150)); 		
	GUILayout.Label("Params file: " + experimentName + ".ini");		
	GUILayout.BeginHorizontal();
		if (GUILayout.Button("Save")) {
			SaveParams(experimentName + ".ini");
		}
		if (GUILayout.Button("Load")) {
			LoadParams(experimentName + ".ini");
		}
	GUILayout.EndHorizontal();
	GUILayout.Space(20);	
	// session parameters
	GUILayout.Label("Session Parameters");				
	subject = GuiTools.NumberBox("Subject",subject);
	session = GuiTools.NumberBox("Session",session);
	recordOutputFile = GuiTools.NiceToggle(recordOutputFile,"Record EDF File");
	outputFilename = experimentName + "-" + subject + "-" + session + ".edf";
	if (recordOutputFile) {
		GUILayout.Label("   Output Filename is \n   " + outputFilename + ".");
	} else {
		GUILayout.Label("\n");
	}
	GUILayout.Space(20);
	
	// READ TASK PROMPTS
	GUILayout.Label("Task Prompts");
	promptFilename = GUILayout.TextField(promptFilename,GUILayout.Width(150)); 	
		if (GUILayout.Button("Load")) {
			LoadPrompts(promptFilename);
		}
	GUILayout.Label(promptStatus);
}

// Box 2: Category Info
function doCategoryParams() {
	GUILayout.Label("Target Parameters");						
	// Display category info
	var killCategory = new boolean[nCategories];
	for (i=0;i<nCategories;i++) {
		GUILayout.BeginHorizontal();
		if (GUILayout.Button("-",GUILayout.Width(20))) {
			killCategory[i] = true;
		}
		GUILayout.Label(categories[i],GUILayout.Width(120));
		categoryState[i] = GUILayout.SelectionGrid(categoryState[i],["Dist","Targ","None"],3);
		if (categoryState[i]==Constants.UNUSED) { //not placed in scene
			categoryPrevalenceString[i] = "0";
		} else if (categoryPrevalence[i]==0.0) { //newly placed in scene
			categoryPrevalenceString[i] = "1";
		}
		categoryPrevalenceString[i] = GUILayout.TextField(categoryPrevalenceString[i],5,GUILayout.Width(50));							
		GUILayout.Label("" + Mathf.Round(categoryPrevalence[i]*100)/100, GUILayout.Width(50));
		GUILayout.EndHorizontal();
	}									
	GUILayout.BeginHorizontal();	
	if (GUILayout.Button("+ New Category:",GUILayout.Width(110)) && newCategory!="") {
		categories.Push(newCategory);
		categoryState.Push(Constants.UNUSED);
		categoryPrevalence.Push(0);
		categoryPrevalenceString.Push(0);
	}
	newCategory = GUILayout.TextField(newCategory,40,GUILayout.Width(100));
	GUILayout.EndHorizontal();
	
	//Extract new prevalences from user string inputs
	var prevs = new float[nCategories];						
	var sumPrevs = 0.0;
	var sumTargetPrevs = 0.0;
	for (i=0; i<nCategories; i++) {
		if (categoryPrevalenceString[i]=="") {
			prevs[i] = 0.0;
		} else {
			prevs[i] = parseFloat(categoryPrevalenceString[i]);
			if (prevs[i] == null) {
				prevs[i] = 0.0;
			}
		}
		sumPrevs += prevs[i];
		if (categoryState[i]==Constants.TARGET) {
			sumTargetPrevs += prevs[i];
		}
	}
	if (sumPrevs==0) { sumPrevs = 1; }
	for (i=0; i<nCategories; i++) {
		categoryPrevalence[i] = prevs[i]/sumPrevs;
	}
	//Calculate and display target prevalence
	targetPrevalence = sumTargetPrevs/sumPrevs;
	GUILayout.BeginHorizontal();
		GUILayout.Space(15); //indent a little
		GUILayout.Label("Target Prevalence");
		GUILayout.Label("" + Mathf.Round(targetPrevalence*100)/100,GUILayout.Width(50));
	GUILayout.EndHorizontal();
	
	
	/*//~ imageCoherence = GuiTools.NumberBox("Image Coherence",image);
	GUILayout.Label("Target Category");
	iTargetFolder = GUILayout.SelectionGrid(iTargetFolder,targetCategories,3);
	targetFolder = targetCategories[iTargetFolder];
	//~ targetFolder = targetCategories[iTargetFolder] + "_coh_" + imageCoherence;
	GUILayout.Label("Distractor Category");
	iDistractorFolder = GUILayout.SelectionGrid(iDistractorFolder,distractorCategories,3);
	distractorFolder = distractorCategories[iDistractorFolder];
	//~ distractorFolder = distractorCategories[iDistractorFolder] + "_coh_" + imageCoherence;*/	
	objectPrevalence = GuiTools.NumberBox("Object Prevalence",objectPrevalence);
	//~ targetPrevalence = GuiTools.NumberBox("Target Prevalence", targetPrevalence);						
	
	//Update category list
	for (i=nCategories-1;i>=0;i--) {
		if (killCategory[i]) {
			categories.RemoveAt(i);
			categoryState.RemoveAt(i);
			categoryPrevalence.RemoveAt(i);
			categoryPrevalenceString.RemoveAt(i);
		}
	}
	nCategories = categories.length;
						
}


// Box 3: Object Info
function doEnvironmentParams() {
	GUILayout.Label("Level");	
	// Display level info
	var killLevel = new boolean[nLevels];
	GUILayout.BeginHorizontal();
	GUILayout.BeginVertical();
	for (i=0;i<nLevels;i++) {		
		if (GUILayout.Button("-",GUILayout.Width(20))) {
			killLevel[i] = true;
		}
	}
	GUILayout.EndVertical();
	GUILayout.BeginVertical();
		levelNumber = GUILayout.SelectionGrid(levelNumber,levelNames.ToBuiltin(String),1);
	GUILayout.EndHorizontal();
	GUILayout.EndVertical();

				
	GUILayout.BeginHorizontal();	
	if (GUILayout.Button("+ New Level:",GUILayout.Width(110)) && newLevel!="") {
		levelNames.Push(newLevel);	
	}
	newLevel = GUILayout.TextField(newLevel,40,GUILayout.Width(100));
	GUILayout.EndHorizontal();
	//Update level list
	for (i=nLevels-1;i>=0;i--) {
		if (killLevel[i]) {
			levelNames.RemoveAt(i);
			if (levelNumber==i) {
				levelNumber = 0;
			}
		}
	}
	nLevels = levelNames.length;
	
	
	
	GUILayout.Label("Presentation Type");
	presentationType = GUILayout.SelectionGrid(presentationType,["0:Stationary", "1:Follow"],2);
	distanceToLeader = GuiTools.NumberBox("Distance to Leader (m)",distanceToLeader);
	minBrakeDelay = GuiTools.NumberBox("Min Brake Delay (s)",minBrakeDelay);
	maxBrakeDelay = GuiTools.NumberBox("Max Brake Delay (s)",maxBrakeDelay);
	GUILayout.Space(10);
	GUILayout.Label("Object Parameters");
	objectSize = GuiTools.NumberBox("Object Size (m)",objectSize);
	recordObjBox = GuiTools.NiceToggle(recordObjBox,"Record Object Bounding Boxes");
	GUILayout.Space(10);
	GUILayout.Label("Sync Parameters");
	isPhotodiodeUsed = GuiTools.NiceToggle(isPhotodiodeUsed,"Use Photodiode");
	photodiodeSize = GuiTools.NumberBox("Photodiode Size (pixels)",photodiodeSize);
}

// Box 4: Behavior Info
function doBehaviorParams() {
	GUILayout.Label("Response Type");
	responseType = GUILayout.SelectionGrid(responseType,["Count", "Button"],2);									
	GUILayout.Label("Use Joystick");
	isActiveSession = GUILayout.SelectionGrid(isActiveSession,["No", "Yes"],2);
	GUILayout.Label("Motion Parameters");
	moveSpeed = GuiTools.NumberBox("Move Speed (m/s)",moveSpeed);	
	if (isActiveSession) {
		spinSpeed = GuiTools.NumberBox("Spin Speed (deg/s)",spinSpeed);
		sessionTime = GuiTools.NumberBox("Session Length (s)", sessionTime);
	} else {
		nObjToSee = GuiTools.NumberBox("# Objects to See", nObjToSee);
	}
						
}

// Box 5: Eyelink Info
function doEyelinkParams() {
	GUILayout.BeginVertical();
	GUILayout.Label("Eyelink Parameters");
	GUILayout.Label("Offset");
	offset_x = GuiTools.NumberBox("X",offset_x);
	offset_y = GuiTools.NumberBox("Y",offset_y);
	GUILayout.Label("Gain");
	gain_x = GuiTools.NumberBox("X",gain_x);
	gain_y = GuiTools.NumberBox("Y",gain_y);
	GUILayout.EndVertical();	
}

// Waypoint route parameters
function doWaypointRouteParams() {

	GUILayout.Label("Experiment Name");		
	experimentName = GUILayout.TextField(experimentName,GUILayout.Width(150)); 	
	subject = GuiTools.NumberBox("Subject",subject);
	//session = GuiTools.NumberBox("Session",session);
	inputFilename = experimentName + "-" + subject + "-waypoints.txt";
	GUILayout.Label("Input Filename = " + inputFilename);
	
}


// Replay session parameters
function doReplayParams() {
	 
	GUILayout.Label("Experiment Name");		
	experimentName = GUILayout.TextField(experimentName,GUILayout.Width(150)); 								
	GUILayout.Label("Session To Replay");
	subject = GuiTools.NumberBox("Subject",subject);
	GUILayout.Label("# of sessions = " + nSessions);
	nSessions = Mathf.Round(GUILayout.HorizontalSlider(nSessions, 1, 10));
	for (i=0; i<nSessions; i++) { //set the sessions
		sessions[i] = GuiTools.NumberBox("session "+(i+1), sessions[i]);
	}				
	session = sessions[iSession];

	inputFilename = experimentName + "-" + subject + "-" + session + ".asc";
	GUILayout.Label("Input Filename = " + inputFilename);
	recordOutputFile = GuiTools.NiceToggle(recordOutputFile, "Record TXT File");
	outputFilename = experimentName + "-" + subject + "-" + session + "-post.txt";
	if (recordOutputFile) GUILayout.Label("Output Filename = " + outputFilename);
	else GUILayout.Label("");
	GuiIsOn = GuiTools.NiceToggle(GuiIsOn, "GUI is on");		
	keepCalibration = GuiTools.NiceToggle(keepCalibration, "Keep Calibration");
	if (!keepCalibration) {
		if(GUILayout.Button("Populate From File")) { //read the file's session parameters
			if (!ReadLog.FileExists(inputFilename)) //if we're asked to read a file that doesn't exist
				InstructionsPage=FILENOTFOUND; //go to File Not Found page
			else //everything's ok
				GetInfo();
		}
		offset_x = GuiTools.NumberBox("offset_x",offset_x);
		offset_y = GuiTools.NumberBox("offset_y",offset_y);
		gain_x = GuiTools.NumberBox("gain_x",gain_x);
		gain_y = GuiTools.NumberBox("gain_y",gain_y);
	}

}



//--------------------//
//---MAIN GUI CODE ----//
//--------------------//
function OnGUI () {
	var i=0;
	if (InstructionsPage==SESSIONOVER) { //Just-finished-a-level page
		GUI.skin = instructionsSkin;
		if (GuiTools.SessionOver(SessionType)) 
			InstructionsPage++;
		
	} else if (InstructionsPage==LOADGUI) { //loading page
		GUI.skin = loadingSkin;
		
		//TOP AREA - TRIAL TYPE SELECTION	
		//Logos
		GUILayout.BeginArea(Rect(0,3,150,100));
		GUILayout.Label(logoImage,GUILayout.Height(35));
		GUILayout.EndArea();
		GUILayout.BeginArea(Rect(Screen.width-140,3,150,100));
		GUILayout.Label(logoImage,GUILayout.Height(35));
		GUILayout.EndArea();
		//Heading
		GUILayout.BeginArea(Rect(0,0,Screen.width,100));			
			GUILayout.BeginHorizontal();						
				GUI.skin = headingSkin;
				GUILayout.Label(" <<<<<   NEDE Control Center   >>>>>");
				GUI.skin = loadingSkin;								
			GUILayout.EndHorizontal();
			// Buttons
			GUILayout.BeginHorizontal();
				SessionType = GUILayout.SelectionGrid(SessionType,["Normal", "WaypointRoute", "Replay"],3);
			GUILayout.EndHorizontal();
		GUILayout.EndArea();
		
		//BOTTOM AREA - ACTIONS
		GUILayout.BeginArea(Rect(0,Screen.height-20,Screen.width,20));				
			GUILayout.BeginHorizontal();
				if (GUILayout.Button("Start Session")) { //pressing this button starts the instructions (see InstructionsPage==1 area below) that lead to loading level.
					if(SessionType != NORMALSESSION && !ReadLog.FileExists(inputFilename)) { //if we're asked to read a file that doesn't exist
						InstructionsPage=FILENOTFOUND; //go to File Not Found page
					} else if(recordOutputFile && ReadLog.FileExists(outputFilename)) { //if we're asked to record to a file that already exists
						InstructionsPage=OVERWRITEFILE; //go to Overwrite File page
					} else { //everything's ok to begin
						if (SessionType==NORMALSESSION) {
							InstructionsPage++;
						} else if (SessionType==WAYPOINTROUTESESSION) {
							StartWaypointRoute();							
						} else if (SessionType==REPLAYSESSION) { //assume user meant "Load NOW"
							StartReplay();
						}
					}
				}
				if (GUILayout.Button("Start NOW")) {
					if(SessionType != NORMALSESSION && !ReadLog.FileExists(inputFilename)) { //if we're asked to read a file that doesn't exist
						InstructionsPage=FILENOTFOUND; //go to File Not Found page
					} else if (SessionType==WAYPOINTROUTESESSION) {
						StartWaypointRoute();
					} else if (SessionType==REPLAYSESSION) { //everything's ok to begin (don't ask about overwriting)
						StartReplay(); 
					} else {
						loadTime = Time.time + fixationTime; //display fixation for this long
						InstructionsPage = LOADGUI+nPrompts+1;
					}
				}
				if (GUILayout.Button("Calibrate Eye")) {
					Application.LoadLevel("Calibration"); //Note that the build settings (File -> BuildSettings) must include this level.
				}
				if (GUILayout.Button("Browse Objects")) {
					Application.LoadLevel("ObjectBrowser"); //Note that the build settings (File -> BuildSettings) must include this level.
				}
				if (GUILayout.Button("Exit Experiment")) { 
					Application.Quit();
				}
			GUILayout.EndHorizontal();
		GUILayout.EndArea();
		
		//MIDDLE AREA - OPTIONS WINDOWS
		if (SessionType==NORMALSESSION) {

			GUI.Window(1,Rect(10,60,(Screen.width-30)/4,(Screen.height-90)*2/3),doExperimentParams,"Experiment");
			GUI.Window(2,Rect((Screen.width-30)/4+15,60,(Screen.width-30)/2,(Screen.height-90)*2/3),doCategoryParams, "Category");
			GUI.Window(3,Rect((Screen.width-30)*3/4+20,60,(Screen.width-30)/4,(Screen.height-90)*2/3),doEnvironmentParams, "Environment");
			GUI.Window(4,Rect(10,(Screen.height-90)*2/3+65,(Screen.width-30)/4,(Screen.height-90)*1/3),doBehaviorParams, "Behavior");
			GUI.Window(5,Rect((Screen.width-30)*3/4+20,(Screen.height-90)*2/3+65,(Screen.width-30)/4,(Screen.height-90)*1/3),doEyelinkParams, "Eyelink");
				
								
			
		} else if (SessionType==WAYPOINTROUTESESSION) {
			//WAYPOINT ROUTE TRAVERSAL AREA
			GUI.Window(6,Rect(Screen.width*0.5-100,Screen.height*0.5-100, 200, 200),doWaypointRouteParams, "Waypoint Route Session");

						
			
		} else if (SessionType==REPLAYSESSION) {
			//REPLAY AREA
			GUI.Window(7,Rect(Screen.width*0.5-100, Screen.height*0.5-250, 200, 500),doReplayParams, "Replay Session");
		}
		
		
		
	// DISPLAY INSTRUCTIONS
	} else if (InstructionsPage > LOADGUI && InstructionsPage <= (LOADGUI + nPrompts)) {
		GUI.skin = instructionsSkin;
		// Assemble list of target categories for display to subject
		var targetCatList = new Array();
		for (i=0; i<nCategories; i++) {
			if (categoryState[i] == Constants.TARGET) {
				targetCatList.Push(categories[i]);
			}
		}
		// Display Instructions
		var newString = GuiTools.InsertTargetList(promptText[InstructionsPage-LOADGUI-1],targetCatList);
		var choice = GuiTools.ShowChoice(newString,"Continue","CANCEL");
		if (choice==1) {
			if (InstructionsPage == (LOADGUI + nPrompts)) // if this is the last one
				loadTime = Time.time + fixationTime; // Set time when level should load
			InstructionsPage++;
		} else if (choice==2) {
			InstructionsPage = LOADGUI;
		}
	
	// DISPLAY FIXATION CROSS AND LOAD SESSION
	} else if (InstructionsPage==(LOADGUI + nPrompts + 1)) { 
		GUI.skin = instructionsSkin;
		// Put fixation cross in the middle of the screen
		GuiTools.ShowAtCenter(fixationCross);		
		if (Time.time>loadTime) { //once we've displayed the fixation cross for long enough
				loadTime = Mathf.Infinity; //so we don't reach this point repeatedly
				Application.LoadLevel(levelNames[levelNumber]); //Note that the build settings (File -> BuildSettings) must include the level you have chosen.  We usually put all the possible levels in the build.
		}		
		
			
	//Ask about overwriting an existing file	
	} else if (InstructionsPage==OVERWRITEFILE) {
		GUI.skin = instructionsSkin;
		var buttonPress = GuiTools.OverwriteCheck(outputFilename);
		if (buttonPress==GuiTools.YES) { //Yes, overwrite	
			if (SessionType==NORMALSESSION) {
				InstructionsPage = LOADGUI+1;
			} else if (SessionType==WAYPOINTROUTESESSION) {				
				StartReplay();
			} else if (SessionType==REPLAYSESSION) { //assume user meant "Load NOW"
				StartReplay();
			}
		} else if (buttonPress==GuiTools.NO) { //No, don't overwrite
			InstructionsPage=LOADGUI;
		}
		
			
	//Alert the user that a requested file was not found	
	} else if (InstructionsPage==FILENOTFOUND) {
		GUI.skin = instructionsSkin;
		if (GuiTools.FileNotFound(inputFilename)) 
			InstructionsPage=LOADGUI;		
		
	}
}