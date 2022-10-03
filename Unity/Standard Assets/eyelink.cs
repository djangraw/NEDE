// eyelink.cs
//
// This script is in charge of communicating with the EyeLink eyetracker.
// To do this, it makes use of a C code DLL we created using VisualStudio 
// to interface with the EyeLink API.  (We couldn't interface directly 
// because some EyeLink data types aren't recognized by Unity.)
//    This script first receives output from the eyetracker (eye position in
// the form of saccade endpoints) to be used in scripts that recognize 
// saccades to targets (i.e. GetScreenBounds_cubby).  
//    Then it relays info from these and other scripts to the EEG through 
// the eye tracker's parallel port in the form of 'event codes' (specified in
// the Numbers script).  These indirect means are used so we can compare 
// the exact time the event was sent (we tell EyeLink to log this in the DLL) 
// to the exact time it was received by the EEG.  We can use this info in
// analysis to match up the EyeLink and EEG data files' timing.
//    It can also receive the eyelink time in ms (a trusted clock), and write 
// text (for general logging purposes) to the EDF file.
//    This script is just the messenger - other scripts tell it what events to write.
//    It's written in C-sharp because that language allows interfacing with 
//  Plugins, and Javascript does not.
//    This script should be placed in the "Standard Assets" folder because 
// Javascript functions can only reference C-Sharp functions if they're  
// compiled first, and the Standard Assets folder is compiled before the
// rest of the project.
//    See the Unity Scripting manual's page on Plugins for more info on DLLs.
//
// *** NOTE: There is a "debug" version for use when an eyelink connection is not available.
// *** It will automatically be used on a non-windows machine. If you wish to override
// *** this option, see the preprocessor directives (#if, etc.) at the top of this script.
//
// - Created ~5/2010 by DJ.
// - Updated 10/30/13 by DJ - added sample_eye from dll and UpdateEye_raw as wrapper for it
// - Updated 11/7/13 by DJ - upgraded to wrapper 1.8, added get_fixupdate, replaced UpdateEye_raw with UpdateEye_fixupdate
// - Updated 1/9/14 by DJ - select debug version automatically using preprocessor directives
// - Updated 1/23/14 by DJ - upgraded to wrapper 1.9 (release configuration doesn't rely on debug dependencies)
// - Updated 7/8/14 by DJ - upgraded to wrapper 2.0 (cleaner code)
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


//---ASSUME THE EYELINK PLUGIN ONLY WORKS ON A STANDALONE WINDOWS SETUP---//
#if UNITY_STANDALONE_WIN
	#define USE_TRACKER
#endif
//---IF YOU WANT TO OVERRIDE THIS AND USE THE PLUGIN, UNCOMMENT:
//#define USE_TRACKER
//---IF YOU WANT TO OVERRIDE THIS AND NOT USE THE PLUGIN, UNCOMMENT:
//#undef USE_TRACKER

//Declare the libraries to be used in this script
using UnityEngine;
using System.Collections;
using System.IO; // for writing to file (when tracker isn't used)
using System; //important for DLLs (see Unity manual page on Plugins)
using System.Runtime.InteropServices; //important for DLLs


#if USE_TRACKER

//---USE THIS VERSION IF YOU DO HAVE AN EYELINK CONNECTION---//
public class eyelink : MonoBehaviour {
	
	//Declare the EyeLink wrapper DLL's funcions (as private static extern)
	[DllImport ("eyelink_wrapper_2pt0")]
	private static extern int startEyeTracker(string filename);
	
	[DllImport ("eyelink_wrapper_2pt0")]
	private static extern int get_saccades(ref float x, ref float y, ref ulong t, int eye_used);
	
	[DllImport ("eyelink_wrapper_2pt0")]
	private static extern int get_buttonpress();
	
	[DllImport ("eyelink_wrapper_2pt0")]
	private static extern int flush_buttonpress();
		
	[DllImport ("eyelink_wrapper_2pt0")]
	private static extern int sample_eye(ref float x, ref float y, int eye_used);
	
	[DllImport ("eyelink_wrapper_2pt0")]
	private static extern int send_parallel_port(int data);
	
	[DllImport ("eyelink_wrapper_2pt0")]
	private static extern ulong get_time();
	
	[DllImport ("eyelink_wrapper_2pt0")]
	private static extern int log_message(string message);	
	
	[DllImport ("eyelink_wrapper_2pt0")]
	private static extern int stopEyeTracker(string filename);

	[DllImport ("eyelink_wrapper_2pt0")]
	private static extern int get_fixupdate(ref float x, ref float y, ref ulong t, int eye_used);

	//Declare global private variables
	private float raw_x; //raw eye position from tracker
	private float raw_y;
	private ulong raw_t;
	private int eye_used; // StartTracker will set this to 0 for left, 1 for right.
	//Declare constants
	private static int SACCADE_END = 6; //EyeLink event code for end-saccade
	private static int FIXUPDATE = 9;
	//Declare global public variables (usable by other scripts).
	public float x; // final eye position after using calibration
	public float y;
	public ulong t; // time of saccade
	public float offset_x = 0.0f; //calibration offset values (set by experimenter)
	public float offset_y = 0.0f;
	public float gain_x = 1.0f; // calibration gain values (set by experimenter)
	public float gain_y = 1.0f;
	
	// Tracker initialization
	public int StartTracker (string filename) {
		eye_used = startEyeTracker(filename); // returns 0 if initialization runs ok
		//print("startEyeTracker returned " + eye_used); //print the initialization to debugger		
		return eye_used;
	}
	
	//If a saccade has taken place, get new eye position.
	void UpdateEye () {
		int i = get_saccades(ref raw_x, ref raw_y, ref raw_t, eye_used); // (only) if an end-saccade event is received, sets raw_x and raw_y to the spot where the saccade ended.
		//print("get_saccades: " + i); //print the received event type to debugger
		//Adjust to calibration results 
		if(i==SACCADE_END) { //the saccade end events are specified in the DLL as the only ones that will change raw_x and raw_y values.
			x = (raw_x - offset_x) * gain_x;
			y = (raw_y - offset_y) * gain_y;
			t = raw_t;
			//print("eyePos: " + x + "," +y); //print eye position to debugger
		} 
		
	}
	
	//Get new RAW eye position.
	void UpdateEye_fixupdate () {
		int i = get_fixupdate(ref raw_x, ref raw_y, ref raw_t, eye_used); // (only) if an end-saccade event is received, sets raw_x and raw_y to the spot where the saccade ended.
		//print("get_saccades: " + i); //print the received event type to debugger
		//Adjust to calibration results 
		if(i==FIXUPDATE) { //if the dll function executed successfully
			x = (raw_x - offset_x) * gain_x;
			y = (raw_y - offset_y) * gain_y;
			t = raw_t;
			print("eyePos: " + x + "," +y); //print eye position to debugger
		} 
		
	}
	
	//If a button press has taken place, get its number.
	public static int UpdateButton() {
		int buttonnumber = get_buttonpress(); //returns the number of the button that was pressed
		return buttonnumber;
	}
	
	public void FlushBuffer() {
		//Flush any built up info out of the button buffer
		flush_buttonpress();
		
		int i=SACCADE_END;
		//Flush any built up info out of the eyelink event buffer
		while (i != 0)
			i = get_saccades(ref raw_x, ref raw_y, ref raw_t, eye_used);
		
		//Now find the endpoint of the last saccade
		if(i==SACCADE_END) { //the saccade end events are specified in the DLL as the only ones that will change raw_x and raw_y values.
			x = (raw_x - offset_x) * gain_x;
			y = (raw_y - offset_y) * gain_y;
			t = raw_t;
			//print("eyePos: " + x + "," +y); //print eye position to debugger
		}
		
		
	}
	
	public static int SendToEEG(int data) {
		int i = send_parallel_port(data); //Send the specified int out through the Eye Tracker computer's parallel port AND log the time we did so in the Eye Tracker's .EDF output file.
		//if (i!=0) //if fail, log it!
			// print("Failed to write " + data + " to EEG at time " + get_time());		
		return i;
	}

	public static int write (string printtext) {
		//Write the specified line of text to the file
		int i = log_message(printtext);
		//if (i!=0) //if fail, log it!
			//print("Failed to write " + printtext + " to eyelink at time " + get_time());		
		return i;
	}

	public static float getTime() {
		return (float)get_time()*(float)0.001;//convert to float, in seconds
	}
		
	//Tracker shutdown
	public static int StopTracker(string filename) {
		int output = stopEyeTracker(filename); // returns 0 if shutdown runs ok
		//print("stopEyeTracker returned " + output); //print the result to debugger
		return output;
	}
	
}


#else

//---USE THIS VERSION IF YOU DON'T HAVE AN EYELINK CONNECTION---//
public class eyelink : MonoBehaviour {
	
	//Declare global private variables
	//Declare global public variables (usable by other scripts).
	
	private float raw_x; //raw eye position from tracker or mouse
	private float raw_y;
	public float x; // final eye position after using calibration
	public float y;
	public ulong t; // time of saccade
	public float offset_x = 0.0f; //calibration offset values (set by experimenter)
	public float offset_y = 0.0f;
	public float gain_x = 1.0f; // calibration gain values (set by experimenter)
	public float gain_y = 1.0f;
	
	// Declare data file variables
	private FileInfo theSourceFile = null; //for text file writing
	private StreamWriter writer = null; //for text file writing
	private bool recordFile = true;
	
	// Tracker initialization
	public int StartTracker (string filename) {	
		if (filename=="") { //code for "do not record"
			recordFile = false;
			return -1;
		} else {
			recordFile = true;
			// create a writer and open the file
			print(filename);
			theSourceFile = new FileInfo (filename);
			writer = theSourceFile.CreateText();
			
			// write a line of text to the file
			writer.WriteLine(DateTime.Now);
			writer.WriteLine("START LOG");
			return 1;
		}
	}
	
	//If a saccade has taken place, get new eye position.
	void UpdateEye () {
		raw_x = Input.mousePosition.x;
		raw_y = camera.pixelHeight - Input.mousePosition.y;
		x = (raw_x - offset_x) * gain_x;
		y = (raw_y - offset_y) * gain_y;
		t = (ulong)(Time.time * 1000);
		//print("eyePos: " + x + "," +y); //print eye position to debugger
	}

	//If a saccade has taken place, get new eye position.
	void UpdateEye_fixupdate () {
		raw_x = Input.mousePosition.x;
		raw_y = camera.pixelHeight - Input.mousePosition.y;
		x = (raw_x - offset_x) * gain_x;
		y = (raw_y - offset_y) * gain_y;
		t = (ulong)(Time.time * 1000);
		//print("eyePos: " + x + "," +y); //print eye position to debugger
	}
	
	//If a button press has taken place, get its number.
	public static int UpdateButton() {
		int buttonnumber = 0;
		if(Input.GetMouseButton(0)) {
			buttonnumber = 4; //Numbers.BRAKEBUTTON
		} else if(Input.GetMouseButton(1)) {
			buttonnumber = 3; //Numbers.TARGETBUTTON
		}			
		return buttonnumber;
	}

	public void FlushBuffer() {
//		print("FlushBuffer was called");
	}
	
	// Write the specified number to the file or log
	public void SendToEEG(int data) {
		if (recordFile) {
			writer.WriteLine("MSG\t" + t + "\t!CMD 0 write_ioport 0x378 " + data); // write to file
		} else {
			print("SendToEEG: " + data); // write to log
		}
	}

	//Write the specified line of text to the file or log
	public void write (string printtext) {
		if (recordFile) {
			t = (ulong)(Time.time * 1000);
			writer.WriteLine("MSG\t" + t + "\t" +printtext); // write to file
		} else {			
			print(printtext); // write to log
		}
	}

	public static float getTime() {
		return Time.time;
	}
		
	//Tracker shutdown
	public int StopTracker(string filename) {
		if (recordFile) {
			//Write a final line of text to the file, then close the file.
			//(IMPORTANT: the log will not be saved unless it's closed properly!)
			writer.WriteLine("END LOG");
			writer.Close();
			// Move file to new filename
			theSourceFile.CopyTo(filename);
			return 1;
		} else {
			print("END LOG");
			return -1;
		}
	}
	
}

#endif

