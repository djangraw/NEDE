// WriteLog.cs
//
// This script is in charge of creating a "Log File," a .txt file that contains
// important info about each trial and can be used for analysis at the end
// of the experiment.  This script is just the messenger - other scripts like
// ReplaySession tell it what to write.
//    It's written in C-sharp because that language allows "StreamWriters"
// to write to text files, and JavaScript does not.
//    This script should be placed in the "Standard Assets" folder because 
// Javascript functions can only reference C-Sharp functions if they're  
// compiled first, and the Standard Assets folder is compiled before the
// rest of the project.
//
// Created ~5/2010 by DJ.
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

//Not sure if all these "using" commands are necessary.
using UnityEngine;
using System.Collections;
using System.IO;
using System; //important for DLLs (see Unity manual page on Plugins)
using System.Runtime.InteropServices; //important for DLLs

public class WriteLog : MonoBehaviour {
	
	//Declare global private variables (info about the text file to be written).
	private FileInfo theSourceFile = null; //for text file writing
	private StreamWriter writer = null; //for text file writing
	private bool recordFile = true;
	
	//Check if file exists (to avoid overwriting)
	public static bool CheckFile(string filename) {
		return File.Exists(filename);
	}
	
	// Use this for initialization
	public void StartLog (string filename) { //'filename' is the name of the LogFile to be saved in the project's home directory
		if (filename=="") { //code for "do not record"
			recordFile = false;
		} else {
			recordFile = true;
			// create a writer and open the file
			theSourceFile = new FileInfo (filename);
			writer = theSourceFile.CreateText();
			
			// write a line of text to the file
			writer.WriteLine(DateTime.Now);
			writer.WriteLine("START LOG");
		}		
	}
	
	public void write (string printtext) {
		if (recordFile) {
			//Write the specified line of text to the file
			writer.WriteLine(printtext);
		}
	}
	
	public void StopLog () {
		if (recordFile) {
			//Write a final line of text to the file, then close the file.
			//(IMPORTANT: the log will not be saved unless it's closed properly!)
			writer.WriteLine("END LOG");
			writer.Close();
		}
	}
	
}