// GuiTools.js
//
// This script offers functions to simplify the bulky GUI code for task prompts
// and other text display screens.
// Functions include:
// - Display a GUI number input box with a label string next to it.
// Static function NumberBox(labelText: String, fieldText: String)
// - Display A GUI toggle button with a label string next to it.
// static function NiceToggle(variable: boolean, labelText: String)
// - Display a set of instructions and a single button.
// static function ShowInstructions(displayText: String, buttonText: String)
// - Display a set of instructions and a pair of buttons.
// static function ShowChoice(displayText: String, button1Text: String, button2Text: String)
// - Display a 2D texture at the center of the screen.
// static function ShowAtCenter(img: Texture2D)
// - Tell the subject to take a break.
// static function SessionOver(sessionType: int)
// - Ask the experimenter if they really want to use the specified file.
// static function OverwriteCheck(filename: String)
// - Display a prompt saying that the specified file was not found
// static function FileNotFound(filename: String)
// - Find points in the prompt where <targetString> is present, and insert a list of targets separated by ',' and 'or'.
// static function InsertTargetList(prompt: String, targetFolder: Array)
// - Read in a text file and and separate into an array of prompts.
// static function ParsePromptFile(logReadScript: ReadLog, promptFilename: String)
// 
// - Created ~5/2012 by DJ.
// - Updated 11/20/13 by DJ - simplified for custom prompts.
// - Updated 11/22/13 by DJ - comments.
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

//Constants
static var NO = 0;
static var YES = 1;


//---GUI TEMPLATES
// Display A GUI number input box with a label string next to it.
static function NumberBox(labelText: String, fieldText: String) {
	GUILayout.BeginHorizontal();
		GUILayout.Space(15); //indent a little
		GUILayout.Label(labelText);
		fieldText = GUILayout.TextField(fieldText,5,GUILayout.Width(50));
	GUILayout.EndHorizontal();
	return fieldText;
}

// Display A GUI toggle button with a label string next to it.
static function NiceToggle(variable: boolean, labelText: String) {
	GUILayout.BeginHorizontal();
		GUILayout.Space(15); //indent a little
		variable = GUILayout.Toggle(variable,"  " + labelText);
	GUILayout.EndHorizontal();
	return variable;
}

// Display a set of instructions and a single button.
static function ShowInstructions(displayText: String, buttonText: String) {
	var pressedButton = false;
	GUILayout.BeginArea(Rect(Screen.width*0.15,Screen.height*0.15,Screen.width*0.7,Screen.height*0.7));
		GUILayout.Label(displayText);
		if (GUILayout.Button(buttonText)) {
			pressedButton = true;
		}
	GUILayout.EndArea();
	return pressedButton;
}

// Display a set of instructions and a pair of buttons.
static function ShowChoice(displayText: String, button1Text: String, button2Text: String) {
	var pressedButton = 0;
	GUILayout.BeginArea(Rect(Screen.width*0.15,Screen.height*0.15,Screen.width*0.7,Screen.height*0.7));
		GUILayout.Label(displayText);
		GUILayout.BeginHorizontal();
			if (GUILayout.Button(button1Text)) {
				pressedButton = 1;
			}
			if (GUILayout.Button(button2Text)) {
				pressedButton = 2;
			}
		GUILayout.EndHorizontal();
	GUILayout.EndArea();
	return pressedButton;
}

// Display a 2D texture at the center of the screen.
static function ShowAtCenter(img: Texture2D) {
	GUILayout.BeginArea(Rect(0,0,Screen.width,Screen.height));
		GUILayout.BeginVertical();
		GUILayout.FlexibleSpace();
			GUILayout.BeginHorizontal();
			GUILayout.FlexibleSpace(); 
				GUILayout.Box(img);
			GUILayout.FlexibleSpace(); 	
			GUILayout.EndHorizontal();
		GUILayout.FlexibleSpace(); 	
		GUILayout.EndVertical();
	GUILayout.EndArea();		
}


//--- HARD-CODED TEXT DISPLAYS
// Tell the subject to take a break.
static function SessionOver(sessionType: int) {
	return ShowInstructions("That's the end of this session -  take a short break.  \n\n" + 
	"When you are ready to begin the next session, click the button below. \n\n", 
	"Next");
}

// Ask the experimenter if they really want to use the specified file.
static function OverwriteCheck(filename: String) {
	return ShowChoice("The file " + filename + " already exists.  Do you want to overwrite it?", 
	"Yes","No");
}

// Display a prompt saying that the specified file was not found
static function FileNotFound(filename: String) {
	return ShowInstructions("The input file " + filename + " was not found!", "Back");
}

//--- DYNAMIC TASK PROMPTS
// Find points in the prompt where <targetString> is present, and insert a list of targets separated by ',' and 'or'.
static function InsertTargetList(prompt: String, targetFolder: Array) {
	
	// append target forlder array into single string
	var targetString = "";
	if (targetFolder.length == 0) {
		targetString = "NONE";
	} else if (targetFolder.length == 1) {
		targetString = targetFolder[0];
	} else if (targetFolder.length == 2) {
		targetString = targetFolder[0] + " or " + targetFolder[1];
	} else {
		for (i=0; i<targetFolder.length-1; i++) {
			targetString = targetString + targetFolder[i] + ", ";
		}
		targetString = targetString + "or " + targetFolder[targetFolder.length-1];
	}

	// insert target string into proper place in prompt
	var splitPrompt = ReadLog.splitString(prompt, "<>");
	var newPrompt = "";
	for(i=0;i<splitPrompt.length;i++) {
		if (splitPrompt[i]=="targetString") {
			newPrompt = newPrompt + targetString;
		} else {
			newPrompt = newPrompt + splitPrompt[i];
		}
	}
	return newPrompt;

}

// Read in a text file and and separate into an array of prompts.
static function ParsePromptFile(logReadScript: ReadLog, promptFilename: String) {
	// Open file
	logReadScript.OpenLog(promptFilename);	
	
	var promptArray = new Array();
	// Read in file
	var thisLine = logReadScript.readLine();
	var currentPrompt = "";
	while(thisLine != null) {		
		if (thisLine=="<ENDPAGE>") {
			promptArray.Push(currentPrompt);
			currentPrompt = "";
		} else {
			currentPrompt = currentPrompt + "\n" + thisLine;			
		}
		thisLine = logReadScript.readLine();
	}
	// If the user forgot the final <ENDPAGE>, add currentPrompt to array anyway.
	if (currentPrompt != "") {
		promptArray.Push(currentPrompt);
	}
	
	// Close file
	logReadScript.CloseLog();		
	// Return array of prompts
	return promptArray;
}