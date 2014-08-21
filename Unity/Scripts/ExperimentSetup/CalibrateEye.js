// CalibrateEye.js
//
// >>> This script runs the Calibration scene.  It is in 
//     charge of the GUI, the only visible thing in the scene.
// >>> The variables offset_x, offset_y, gain_x, and gain_y are set with
//     sliders on the GUI, and will be transferred back to the LoadLevel
//     script when we're done.
// >>> To use this scene, just ask the subject to look at one of the numbered 
//     dots (each of which you can highlight by pressing the corresponding
//     number key) or follow the mouse with his/her eyes. Then move the sliders 
//     accordingly so that the small dot indicating eye position falls on or near 
//     the pointer. 
//
// Created ~5/2012 by DJ.
// Updated 10/22/13 by DJ - added numbered dots, slider labels, comments.
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

// Calibration parameters
var offset_x = 0.0;
var offset_y = 0.0;
var gain_x = 1.0;
var gain_y = 1.0;

// Calibration limits
static var MIN_OFFSET_X = -200;
static var MAX_OFFSET_X = 200;
static var MIN_OFFSET_Y = -200;
static var MAX_OFFSET_Y = 200;
static var MIN_GAIN_X = 0.0;
static var MAX_GAIN_X = 2.0;
static var MIN_GAIN_Y = 0.0;
static var MAX_GAIN_Y = 2.0;

// Other variables
var FlashBox: Texture; // what the box the subject is asked to look at should look like (e.g. fixation cross)
private var eyelinkScript; //make this script's id global so we don't have to reload every Update
static var MARGIN = 20; // bring dots in this many pixels from edges

// Load scripts so we don't have to reload every Update
function Start () {
	eyelinkScript = gameObject.GetComponent(eyelink);
	eyelinkScript.StartTracker(""); //Open a link, but do not record an EDF file
}

// Get the updated eye position every frame
function LateUpdate() {
	eyelinkScript.UpdateEye_fixupdate(); //get latest fixupdate location
}


// Plot the controls, eye position, and dots for guided fixations
function OnGUI () {
	
	// Set up numbered dots
	var iDot = 0;
	var xdot = 0;
	var ydot = 0;
	// Make a series of boxes across the screen.
	for (var i=0;i<3;i++) {
		for (var j=0;j<3;j++) {
			// Get index and position of dot
			iDot = 3*i+j+1;
			xdot = (Screen.width-MARGIN*2-20)/2*j + MARGIN;
			ydot = (Screen.height-MARGIN*2-20)/2*i + MARGIN;
			// If an arrow key is pressed, flash that box.
			if (Input.GetKey(iDot + "")) {
				GUI.Label(Rect(xdot,ydot,20,20),FlashBox);
			} else {
				GUI.Box(Rect(xdot,ydot,20,20),iDot + "");
			}
		}
	}
	
	
	
	//CONTROLS	
	offset_x = GUI.HorizontalSlider(Rect(60,10,200,20),offset_x,MAX_OFFSET_X,MIN_OFFSET_X);
	offset_x = Mathf.Round(offset_x); //Round off
	GUI.Label(Rect(60,20,200,20),MAX_OFFSET_X + "");
	GUI.Label(Rect(120,20,200,20),"X offset = " + offset_x);
	GUI.Label(Rect(230,20,200,20),MIN_OFFSET_X + "");
	
	gain_x = GUI.HorizontalSlider(Rect(Screen.width-260,10,200,20),gain_x,MIN_GAIN_X,MAX_GAIN_X);
	gain_x = Mathf.Round(100*gain_x)/100; //Round to nearest .01
	GUI.Label(Rect(Screen.width-260,20,200,20),MIN_GAIN_X + "");
	GUI.Label(Rect(Screen.width-200,20,200,20),"X gain = " + gain_x);
	GUI.Label(Rect(Screen.width-70,20,200,20),MAX_GAIN_X + "");
			
	offset_y = GUI.VerticalSlider(Rect(10,50,20,200),offset_y,200.0,-200.0);
	offset_y = Mathf.Round(offset_y); //Round off
	GUI.Label(Rect(25,50,200,20),MAX_OFFSET_Y + "");
	GUI.Label(Rect(25,140,200,20),"Y offset = " + offset_y);
	GUI.Label(Rect(25,230,200,20),MIN_OFFSET_Y + "");
	
	gain_y = GUI.VerticalSlider(Rect(10,Screen.height-250,20,200),gain_y,0.0,2.0);
	gain_y = Mathf.Round(100*gain_y)/100; //Round to nearest .01
	GUI.Label(Rect(25,Screen.height-250,200,20),MIN_GAIN_Y + "");
	GUI.Label(Rect(25,Screen.height-160,200,20),"Y gain = " + gain_y);
	GUI.Label(Rect(25,Screen.height-70,200,20),MAX_GAIN_Y + "");
		
	//END CALIBRATION BUTTON
	if (GUI.Button(Rect(Screen.width-210,Screen.height-30,150,20),"End Calibration")) {
		var loaderObject = GameObject.Find("StartupObject");
		if (loaderObject!=null) {
			// Send the parameters we learned back to the loader script
			var loaderScript = loaderObject.GetComponent(LevelLoader);
			loaderScript.offset_x = offset_x+"";
			loaderScript.offset_y = offset_y+"";
			loaderScript.gain_x = gain_x+"";
			loaderScript.gain_y = gain_y+"";
			// Go back to loader scene
			Application.LoadLevel("Loader");
		} else
			Application.Quit();
	}

	
	//EYE DOT
	//Set gain and eye
	eyelinkScript.offset_x = offset_x;
	eyelinkScript.offset_y = offset_y;
	eyelinkScript.gain_x = gain_x;
	eyelinkScript.gain_y = gain_y;
	//get eye position (end of last saccade) from eye tracker script
	var x = eyelinkScript.x;
	var y = eyelinkScript.y;	
	//place a tiny box on the screen where the user's eyes are
	GUI.Box(Rect(x-1,y-1,10,10),"");
	
}

// When this script is disabled (e.g., exit calibration), stop the eye tracker.
function OnDisable() {
	eyelinkScript.StopTracker("");
}