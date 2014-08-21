// GuiSpeed.js
//
// This script controls a GUI in the top left corner of the screen that
// controls the speed at which time passes in the level. It can be 
// revealed or hidden using a small toggle button in the upper left corner
// of the screen.
//
// - Created 9/2010 by DJ.
// - Updated 12/2013 by DJ - changed to GuiSpeed, simplified.
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

// boolean variable to decide whether to show the window or not.
// Change this from the in-game GUI, scripting, the inspector or anywhere else to
// decide whether the window is visible at level startup.
var doWindow = false;
var placerScript;


// Make the contents of the Trial Type window.
function DoWindow (windowID : int) {
	
	// Speed slider (changes time scale)
	Time.timeScale = GUILayout.HorizontalSlider(Time.timeScale,0.0,5.0); // use to slow down or speed up
	GUILayout.BeginHorizontal();
		GUILayout.Label("TimeScale = " + Mathf.Round(10*Time.timeScale)/10);
	GUILayout.EndHorizontal();		
	GUILayout.BeginHorizontal();
		if(GUILayout.Button("Pause")) Time.timeScale=0;
		if(GUILayout.Button("Run")) Time.timeScale=1; 
	GUILayout.EndHorizontal();

	// Button to end level
	if (GUILayout.Button("Exit Level")) {
//		print(placerScript + "");
		placerScript.EndLevel();		
		Application.LoadLevel("Loader");
	}
	
}

// Display GUI elements (runs every time the GUI is displayed on the screen)
function OnGUI () { 
	// Make a toggle button for hiding and showing the window
	doWindow = GUILayout.Toggle (doWindow, "");
	
	//When the user clicks the toggle button, doWindow is set to true.
	//Then create the trial type window with GUILayout and specify the contents with function DoWindow
	if (doWindow)
	GUILayout.Window (0, Rect (0,20,200,120), DoWindow, "Speed Controls");
}