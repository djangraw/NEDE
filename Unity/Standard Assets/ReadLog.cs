// ReadLog.cs
//
// This script handles all reading of text files, mostly for replays.
//    Most text files read here are .asc files, which have been converted to 
// text from the .edf format by the Visual EDF2ASC application.
//    This script is just the messenger - other scripts tell it when to read.
//    It's written in C-sharp because that language allows "StreamWriters"
// to write to text files, and JavaScript does not.
//    This script should be placed in the "Standard Assets" folder because 
// Javascript functions can only reference C-Sharp functions if they're  
// compiled first, and the Standard Assets folder is compiled before the
// rest of the project.
//
// - Created 5/12 by DJ.
// - Updated 11/21/13 by DJ - Fixed EndOfStream check, added comments.
// - Updated 1/8/14 by DJ - Switched to FileStream, added RewindLog function
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

using UnityEngine;
using System.Collections;
using System.IO;

public class ReadLog : MonoBehaviour {

	//---READER BASICS---//
	//Declare global private variables (info about the text file to be read).
	private FileStream fs = null;
	private StreamReader reader = null;
	
	//Check if file exists (to avoid trying to reference something that isn't there)
	public static bool FileExists(string filename) {
		return File.Exists(filename);
	}
	
	// Use this for initialization
	public void OpenLog (string filename) { //'filename' is the name of the LogFile, to be saved in the project's home directory
		// open the file and create a reader
		fs = new FileStream(filename, FileMode.Open, FileAccess.Read);
		reader = new StreamReader(fs);
	}
		
	//Read the next line of text from the file
	public string readLine () {		
		string line = null;
		if (!reader.EndOfStream) {
			line = reader.ReadLine();
		}
		return line;
	}

	// Close the file
	public void CloseLog() {
		reader.Close();
	}
	
	// Use FileStream position to go back to start of log.
	public void RewindLog() {
		fs.Position = 0; // change position in file
		reader.DiscardBufferedData(); // register change in StreamReader
	}

	
	//---SUBSTRING WRAPPERS---//
	// Javascript is not as good at string manipulation, so we make C# wrappers here.
	public static int findIndex(string findThis, string findIn) {
		int ind = findIn.IndexOf(findThis);
		return ind;
	}
	
	// Find substring starting at specified index
	public static string substring(string longString, int iStart) {
		string shortString = longString.Substring(iStart);
		return shortString;
	}
	
	// Find substring between specified indices
	public static string substring(string longString, int iStart, int iEnd) {
		string shortString = longString.Substring(iStart, iEnd);
		return shortString;
	}
	
	// Return array of substrings delimited by given separator characters
	public static string[] splitString(string longString, string separators){
		string[] shorties = longString.Split(separators.ToCharArray());
		return shorties;
	}
	
	//---MORE COMPLEX FUNCTIONS---//
	//Search the current log until you find the string you're looking for.
	//The next readLine will continue just after wherever the string was found.
	//Example usage: levelName = findValue("level: ");
	public string findValue(string stringIn) {
		int spot = -1; //point in the current line where the string starts
		string line = readLine(); //read in the next line
		while (line != null) {
			//print(line);
			spot = findIndex(stringIn,line); //search the line for stringIn
			if (spot != -1) { //if stringIn was found
				string val = substring(line,spot+stringIn.Length); //find the substring after  stringIn
				return val; //return that substring
			} else //if stringIn wasn't found in this line	
				line = readLine(); //read in the next line
		}
		//If we didn't find the desired string...
		CloseLog();
		//print(stringIn + " Not Found!");
		return null;
	}
}
